import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import {
  isSupabase,
  supabase,
  getAllMissions,
  getTodayMissions,
  getOtherMissions,
  getMissionById,
  createMission,
  updateMission,
  updateMissionStatus,
  deleteMission,
  deleteMissionsByMonth,
  getStats,
  getPresets,
  addPreset,
  updatePreset,
  deletePreset
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically (for local fallback)
app.use('/uploads', express.static(uploadsDir));

// Multer storage configuration for PDF and Images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Fix UTF-8 encoding for Thai filenames in multer
    let originalName = file.originalname;
    try {
      const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8');
      if (decoded && !decoded.includes('')) {
        originalName = decoded;
        file.originalname = decoded;
      }
    } catch {}

    const ext = path.extname(originalName);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    // Sanitize name for filesystem
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_\u0E00-\u0E7F]/g, '_');
    cb(null, `${uniqueSuffix}-${baseName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedMime = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'image/gif'
    ];
    if (allowedMime.includes(file.mimetype) || file.originalname.match(/\.(pdf|jpg|jpeg|png|webp|gif)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) หรือไฟล์ PDF เท่านั้น'));
    }
  }
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' });
    }

    let fileUrl = `/uploads/${req.file.filename}`;

    // If Supabase is active, upload to Supabase Storage Bucket 'attachments'
    if (isSupabase && supabase) {
      const fileExt = path.extname(req.file.originalname);
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${fileExt}`;
      const fileBuffer = fs.readFileSync(req.file.path);

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('attachments')
        .upload(uniqueName, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (uploadErr) {
        console.error('Supabase storage upload error:', uploadErr);
        throw uploadErr;
      }

      const { data: publicUrlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(uniqueName);

      fileUrl = publicUrlData.publicUrl;

      // Clean up local temp file
      try { fs.unlinkSync(req.file.path); } catch {}
    }

    res.json({
      success: true,
      url: fileUrl,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Server-Sent Events (SSE) for Real-Time Sync across TV / Phone / PC
let clients = [];

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = Date.now();
  clients.push({ id: clientId, res });

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
});

function broadcastUpdate(action, payload) {
  const message = `data: ${JSON.stringify({ type: action, payload, timestamp: new Date().toISOString() })}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(message);
    } catch {
      // client dropped
    }
  }
}

// Get helper for today's date formatted as YYYY-MM-DD
function getTodayDateString(req) {
  if (req.query.date) return req.query.date;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// PRESETS API (Categories, Locations, Personnel)
app.get('/api/presets', async (req, res) => {
  try {
    const presets = await getPresets();
    res.json({ success: true, data: presets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/presets/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { name, role } = req.body;
    const item = await addPreset(type, { name, role });
    broadcastUpdate('presets_updated', { type, item });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.put('/api/presets/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { name, role } = req.body;
    const item = await updatePreset(type, Number(id), { name, role });
    broadcastUpdate('presets_updated', { type, item });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.delete('/api/presets/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const item = await deletePreset(type, Number(id));
    broadcastUpdate('presets_updated', { type, id });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET all missions with filters
app.get('/api/missions', async (req, res) => {
  try {
    const { date, status, search, category } = req.query;
    const missions = await getAllMissions({ date, status, search, category });
    res.json({ success: true, data: missions });
  } catch (error) {
    console.error('Error fetching missions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET today's missions
app.get('/api/missions/today', async (req, res) => {
  try {
    const todayStr = getTodayDateString(req);
    const missions = await getTodayMissions(todayStr);
    res.json({ success: true, date: todayStr, data: missions });
  } catch (error) {
    console.error('Error fetching today missions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET other days' missions
app.get('/api/missions/other', async (req, res) => {
  try {
    const todayStr = getTodayDateString(req);
    const missions = await getOtherMissions(todayStr);
    res.json({ success: true, date: todayStr, data: missions });
  } catch (error) {
    console.error('Error fetching other missions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single mission
app.get('/api/missions/:id', async (req, res) => {
  try {
    const mission = await getMissionById(Number(req.params.id));
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission not found' });
    }
    res.json({ success: true, data: mission });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST new mission
app.post('/api/missions', async (req, res) => {
  try {
    const {
      title,
      category,
      start_date,
      end_date,
      start_time,
      end_time,
      location,
      description,
      assignee,
      status,
      priority,
      notes,
      attachment_url,
      attachment_name,
      attachment_type
    } = req.body;

    if (!title || !start_date || !location) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอกข้อมูลที่จำเป็น: ภารกิจ, วันที่, และสถานที่'
      });
    }

    const newMission = await createMission({
      title,
      category: category || 'ทั่วไป',
      start_date,
      end_date: end_date || start_date,
      start_time: start_time || '',
      end_time: end_time || '',
      location,
      description: description || '',
      assignee: assignee || '',
      status: status || 'pending',
      priority: priority || 'normal',
      notes: notes || '',
      attachment_url: attachment_url || null,
      attachment_name: attachment_name || null,
      attachment_type: attachment_type || null
    });

    broadcastUpdate('mission_created', newMission);
    res.status(201).json({ success: true, data: newMission });
  } catch (error) {
    console.error('Error creating mission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update mission
app.put('/api/missions/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await getMissionById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Mission not found' });
    }

    const updated = await updateMission(id, {
      ...existing,
      ...req.body
    });

    broadcastUpdate('mission_updated', updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating mission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH mission status
app.patch('/api/missions/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const updated = await updateMissionStatus(id, status);
    broadcastUpdate('mission_status_changed', updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE mission
app.delete('/api/missions/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await deleteMission(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Mission not found' });
    }
    broadcastUpdate('mission_deleted', { id });
    res.json({ success: true, data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE missions by month with password protection (26366)
app.post('/api/missions/delete-month', async (req, res) => {
  try {
    const { month, password } = req.body;
    if (password !== '26366') {
      return res.status(401).json({
        success: false,
        error: 'รหัสผ่านไม่ถูกต้อง! (กรุณาระบุรหัสผ่าน 26366)'
      });
    }

    if (!month || !month.match(/^\d{4}-\d{2}$/)) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุเดือนในรูปแบบ YYYY-MM'
      });
    }

    const result = await deleteMissionsByMonth(month);
    broadcastUpdate('missions_month_deleted', { month, deletedCount: result.deletedCount });
    res.json({
      success: true,
      message: `ลบข้อมูลภารกิจประจำเดือน ${month} เรียบร้อยแล้ว (จำนวน ${result.deletedCount} รายการ)`,
      count: result.deletedCount
    });
  } catch (error) {
    console.error('Delete month error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET stats
app.get('/api/stats', async (req, res) => {
  try {
    const todayStr = getTodayDateString(req);
    const stats = await getStats(todayStr);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve frontend static files
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 JobComm Server running at http://localhost:${PORT}`);
});
