import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import cron from 'node-cron';
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
import { generatePptxReport } from './pptExporter.js';

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

// Get helper for today's date formatted as YYYY-MM-DD in Bangkok timezone
function getBangkokDateString() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

function getTodayDateString(req) {
  if (req && req.query && req.query.date) return req.query.date;
  return getBangkokDateString();
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

    // Check if notify on add is enabled
    const lineConfig = await getLineConfig();
    if (lineConfig.notifyOnAdd && lineConfig.groupId) {
      try {
        const flexMessage = buildNewMissionFlexMessage(newMission);
        await sendLinePushMessage(lineConfig.groupId, flexMessage);
        console.log(`📤 Sent new mission notification for ID ${newMission.id}`);
      } catch (err) {
        console.error('❌ Error sending new mission notification:', err);
      }
    }

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

// POST export PowerPoint (.pptx) report from template
app.post('/api/export-pptx', async (req, res) => {
  try {
    const { missions } = req.body;
    const missionList = Array.isArray(missions) ? missions : [];
    const buffer = await generatePptxReport(missionList);

    const filename = `JobComm_Report_${Date.now()}.pptx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Export PPT error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// LINE Messaging API & Automation System
// ==========================================

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const THAI_DAYS_FULL = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
];

function formatThaiDateWithDay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return String(dateStr);

  const dayName = THAI_DAYS_FULL[d.getDay()];
  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const thaiYearShort = String((d.getFullYear() + 543) % 100);

  return `${dayName}ที่ ${day} ${month}${thaiYearShort}`;
}

function cleanTime(t) {
  return (t || '').replace(/:/g, '').trim();
}

function buildDailyLineMessage(dateStr, missions) {
  const dateFormatted = formatThaiDateWithDay(dateStr);

  if (!missions || missions.length === 0) {
    return `ภารกิจ${dateFormatted} ครับ\n\n- วันนี้ไม่มีภารกิจ -\n\nดูภารกิจได้ที่ https://jobcomm.onrender.com/`;
  }

  const sorted = [...missions].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  const missionBlocks = sorted.map((m) => {
    const s = cleanTime(m.start_time);
    const e = cleanTime(m.end_time);
    const timeStr = s && e ? `${s} - ${e}` : s ? s : 'ไม่ระบุเวลา';
    const locationStr = m.location ? `, ${m.location}` : '';

    // Check if mission has description or attachment
    const hasDetail = Boolean((m.description && m.description.trim()) || m.attachment_url);
    const detailSuffix = hasDetail ? ' (รายละเอียด)' : '';

    return `${timeStr} ${m.title}${locationStr}${detailSuffix}`;
  }).join('\n\n');

  return `ภารกิจ${dateFormatted} ครับ\n\n${missionBlocks}\n\nดูภารกิจได้ที่ https://jobcomm.onrender.com/`;
}

// Target Group ID & Settings storage (persisted via DB preset or fallback)
let cachedLineGroupId = process.env.LINE_GROUP_ID || null;
let cachedNotifyTime = '06:00';
let cachedNotifyEnabled = true;
let cachedNotifyOnEmpty = true;
let cachedNotifyOnAdd = false;

async function getLineConfig() {
  let groupId = cachedLineGroupId;
  let notifyTime = cachedNotifyTime;
  let notifyEnabled = cachedNotifyEnabled;
  let notifyOnEmpty = cachedNotifyOnEmpty;
  let notifyOnAdd = cachedNotifyOnAdd;

  try {
    const presets = await getPresets();
    const groupPreset = presets.categories?.find(p => p.name?.startsWith('LINE_GROUP_ID:'));
    if (groupPreset) {
      groupId = groupPreset.name.replace('LINE_GROUP_ID:', '').trim();
      cachedLineGroupId = groupId;
    }

    const timePreset = presets.categories?.find(p => p.name?.startsWith('LINE_NOTIFY_TIME:'));
    if (timePreset) {
      notifyTime = timePreset.name.replace('LINE_NOTIFY_TIME:', '').trim();
      cachedNotifyTime = notifyTime;
    }

    const enabledPreset = presets.categories?.find(p => p.name?.startsWith('LINE_NOTIFY_ENABLED:'));
    if (enabledPreset) {
      notifyEnabled = enabledPreset.name.replace('LINE_NOTIFY_ENABLED:', '').trim() === 'true';
      cachedNotifyEnabled = notifyEnabled;
    }

    const emptyPreset = presets.categories?.find(p => p.name?.startsWith('LINE_NOTIFY_ON_EMPTY:'));
    if (emptyPreset) {
      notifyOnEmpty = emptyPreset.name.replace('LINE_NOTIFY_ON_EMPTY:', '').trim() === 'true';
      cachedNotifyOnEmpty = notifyOnEmpty;
    }

    const onAddPreset = presets.categories?.find(p => p.name?.startsWith('LINE_NOTIFY_ON_ADD:'));
    if (onAddPreset) {
      notifyOnAdd = onAddPreset.name.replace('LINE_NOTIFY_ON_ADD:', '').trim() === 'true';
      cachedNotifyOnAdd = notifyOnAdd;
    }
  } catch {}

  return { groupId, notifyTime, notifyEnabled, notifyOnEmpty, notifyOnAdd };
}

async function saveStoredGroupId(groupId) {
  if (!groupId) return;
  cachedLineGroupId = groupId;
  try {
    const presets = await getPresets();
    const existing = presets.categories?.find(p => p.name?.startsWith('LINE_GROUP_ID:'));
    if (existing) {
      await updatePreset('categories', existing.id, { name: `LINE_GROUP_ID:${groupId}` });
    } else {
      await addPreset('categories', { name: `LINE_GROUP_ID:${groupId}` });
    }
    console.log(`📌 Saved LINE Group ID: ${groupId}`);
  } catch (err) {
    console.error('Failed to save LINE Group ID to presets:', err);
  }
}

async function saveLineSettings({ notifyTime, notifyEnabled, notifyOnEmpty, notifyOnAdd }) {
  try {
    const presets = await getPresets();
    if (notifyTime !== undefined) {
      cachedNotifyTime = notifyTime;
      const existing = presets.categories?.find(p => p.name?.startsWith('LINE_NOTIFY_TIME:'));
      if (existing) {
        await updatePreset('categories', existing.id, { name: `LINE_NOTIFY_TIME:${notifyTime}` });
      } else {
        await addPreset('categories', { name: `LINE_NOTIFY_TIME:${notifyTime}` });
      }
    }

    if (notifyEnabled !== undefined) {
      cachedNotifyEnabled = Boolean(notifyEnabled);
      const existing = presets.categories?.find(p => p.name?.startsWith('LINE_NOTIFY_ENABLED:'));
      if (existing) {
        await updatePreset('categories', existing.id, { name: `LINE_NOTIFY_ENABLED:${cachedNotifyEnabled}` });
      } else {
        await addPreset('categories', { name: `LINE_NOTIFY_ENABLED:${cachedNotifyEnabled}` });
      }
    }

    if (notifyOnEmpty !== undefined) {
      cachedNotifyOnEmpty = Boolean(notifyOnEmpty);
      const existing = presets.categories?.find(p => p.name?.startsWith('LINE_NOTIFY_ON_EMPTY:'));
      if (existing) {
        await updatePreset('categories', existing.id, { name: `LINE_NOTIFY_ON_EMPTY:${cachedNotifyOnEmpty}` });
      } else {
        await addPreset('categories', { name: `LINE_NOTIFY_ON_EMPTY:${cachedNotifyOnEmpty}` });
      }
    }

    if (notifyOnAdd !== undefined) {
      cachedNotifyOnAdd = Boolean(notifyOnAdd);
      const existing = presets.categories?.find(p => p.name?.startsWith('LINE_NOTIFY_ON_ADD:'));
      if (existing) {
        await updatePreset('categories', existing.id, { name: `LINE_NOTIFY_ON_ADD:${cachedNotifyOnAdd}` });
      } else {
        await addPreset('categories', { name: `LINE_NOTIFY_ON_ADD:${cachedNotifyOnAdd}` });
      }
    }

    setupDailyCronJob();
    console.log(`⚙️ Saved LINE Settings: Time=${cachedNotifyTime}, Enabled=${cachedNotifyEnabled}, NotifyOnEmpty=${cachedNotifyOnEmpty}, NotifyOnAdd=${cachedNotifyOnAdd}`);
  } catch (err) {
    console.error('Failed to save LINE settings:', err);
  }
}

function buildDailyLineFlexMessage(dateStr, missions) {
  const dateFormatted = formatThaiDateWithDay(dateStr);

  // If no missions
  if (!missions || missions.length === 0) {
    return {
      type: 'flex',
      altText: `ภารกิจ${dateFormatted} (ไม่มีภารกิจ)`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#1E3A8A',
          paddingAll: '15px',
          contents: [
            {
              type: 'text',
              text: '📋 สรุปภารกิจประจำวัน',
              color: '#93C5FD',
              size: 'xs',
              weight: 'bold'
            },
            {
              type: 'text',
              text: dateFormatted,
              color: '#FFFFFF',
              size: 'md',
              weight: 'bold',
              margin: 'xs'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '20px',
          contents: [
            {
              type: 'text',
              text: '- วันนี้ไม่มีภารกิจ -',
              color: '#64748B',
              size: 'sm',
              align: 'center'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '12px',
          contents: [
            {
              type: 'button',
              style: 'link',
              height: 'sm',
              action: {
                type: 'uri',
                label: '🌐 เปิดดูระบบ JobComm',
                uri: 'https://jobcomm.onrender.com/'
              }
            }
          ]
        }
      }
    };
  }

  const sorted = [...missions].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  const missionBoxes = [];

  sorted.forEach((m, idx) => {
    const s = cleanTime(m.start_time);
    const e = cleanTime(m.end_time);
    const timeStr = s && e ? `${s} - ${e}` : s ? s : 'ไม่ระบุเวลา';
    const locText = m.location ? `📍 ${m.location}` : '';

    // Check if mission has attachment or description
    const hasAttachment = Boolean(m.attachment_url);
    const hasDescription = Boolean(m.description && m.description.trim());

    // Resolve URL: attachment file URL if exists, else web app
    let actionUrl = 'https://jobcomm.onrender.com/';
    if (hasAttachment) {
      if (m.attachment_url.startsWith('http://') || m.attachment_url.startsWith('https://')) {
        actionUrl = m.attachment_url;
      } else {
        actionUrl = `https://jobcomm.onrender.com${m.attachment_url}`;
      }
    }

    const itemContents = [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: `⏰ ${timeStr}`,
            weight: 'bold',
            size: 'xs',
            color: '#1E40AF',
            flex: 0
          }
        ]
      },
      {
        type: 'text',
        text: m.title,
        weight: 'bold',
        size: 'sm',
        color: '#1E293B',
        wrap: true,
        margin: 'xs'
      }
    ];

    if (locText) {
      itemContents.push({
        type: 'text',
        text: locText,
        size: 'xs',
        color: '#64748B',
        wrap: true,
        margin: 'xs'
      });
    }

    if (m.assignee) {
      itemContents.push({
        type: 'text',
        text: `👤 ผู้รับผิดชอบ: ${m.assignee}`,
        size: 'xs',
        color: '#334155',
        wrap: true,
        margin: 'xs'
      });
    }

    if (hasDescription) {
      itemContents.push({
        type: 'text',
        text: `📝 ${m.description}`,
        size: 'xs',
        color: '#475569',
        wrap: true,
        margin: 'xs'
      });
    }

    // If has attachment or description, add direct button
    if (hasAttachment) {
      itemContents.push({
        type: 'button',
        style: 'secondary',
        height: 'sm',
        color: '#EFF6FF',
        margin: 'sm',
        action: {
          type: 'uri',
          label: '📎 ดูรายละเอียด / เปิดไฟล์',
          uri: actionUrl
        }
      });
    }

    const boxContainer = {
      type: 'box',
      layout: 'vertical',
      paddingAll: '10px',
      backgroundColor: '#F8FAFC',
      cornerRadius: '8px',
      borderColor: '#E2E8F0',
      borderWidth: '1px',
      contents: itemContents
    };

    if (idx > 0) {
      boxContainer.margin = 'md';
    }

    missionBoxes.push(boxContainer);
  });

  return {
    type: 'flex',
    altText: `ภารกิจ${dateFormatted} (${missions.length} รายการ)`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1E3A8A',
        paddingAll: '15px',
        contents: [
          {
            type: 'text',
            text: '📋 รายงานภารกิจประจำวัน',
            color: '#93C5FD',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: dateFormatted,
            color: '#FFFFFF',
            size: 'md',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '15px',
        contents: missionBoxes
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '10px',
        backgroundColor: '#FFFFFF',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#1E3A8A',
            height: 'sm',
            action: {
              type: 'uri',
              label: '🌐 เปิดดูระบบ JobComm ทั้งหมด',
              uri: 'https://jobcomm.onrender.com/'
            }
          }
        ]
      }
    }
  };
}

function buildNewMissionFlexMessage(mission) {
  const flex = buildDailyLineFlexMessage(mission.start_date, [mission]);
  flex.altText = `🆕 ภารกิจใหม่: ${mission.title}`;
  flex.contents.header.backgroundColor = '#047857'; // Emerald 700
  flex.contents.header.contents[0].text = '🆕 มีภารกิจใหม่เพิ่มเข้าระบบ';
  flex.contents.header.contents[0].color = '#6EE7B7'; // Emerald 300
  return flex;
}

// Push message helper (supports plain text or LINE Flex Message object)
async function sendLinePushMessage(targetId, messagePayload) {
  const token = process.env.LINE_ACCESS_TOKEN;
  if (!token) {
    console.error('❌ LINE_ACCESS_TOKEN not set in environment variables');
    return { success: false, error: 'LINE_ACCESS_TOKEN not configured' };
  }

  // Determine message structure
  let messages = [];
  if (typeof messagePayload === 'string') {
    messages = [{ type: 'text', text: messagePayload }];
  } else if (messagePayload && typeof messagePayload === 'object') {
    messages = [messagePayload];
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        to: targetId,
        messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ LINE Push Error (${response.status}):`, errText);
      return { success: false, status: response.status, error: errText };
    }

    console.log(`✅ LINE message sent successfully to ${targetId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Exception in sendLinePushMessage:', error);
    return { success: false, error: error.message };
  }
}

// Reply message helper for webhooks
async function replyLineMessage(replyToken, text) {
  const token = process.env.LINE_ACCESS_TOKEN;
  if (!token || !replyToken) return;

  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }]
      })
    });
  } catch (err) {
    console.error('Error replying LINE message:', err);
  }
}

// Webhook endpoint for LINE Bot events
app.post('/api/line/webhook', async (req, res) => {
  // Always respond 200 OK to LINE immediately
  res.status(200).send('OK');

  try {
    const events = req.body?.events || [];
    for (const event of events) {
      console.log('📨 Received LINE Webhook event:', event.type, event.source);

      let detectedGroupId = null;
      if (event.source?.type === 'group' && event.source?.groupId) {
        detectedGroupId = event.source.groupId;
      } else if (event.source?.type === 'room' && event.source?.roomId) {
        detectedGroupId = event.source.roomId;
      }

      if (detectedGroupId) {
        await saveStoredGroupId(detectedGroupId);

        // If user typed 'กลุ่มนี้' or joined group, reply confirmation
        if (event.type === 'join') {
          await replyLineMessage(
            event.replyToken,
            `สวัสดีครับ! บอทส่งภารกิจพร้อมทำงานครับ ผมจะคอยแจ้งเตือนงานที่คุณบันทึกไว้ทุกเช้าเวลา ${cachedNotifyTime} น. อัตโนมัติครับ`
          );
        } else if (event.type === 'message' && event.message?.text?.trim() === '#jobcomm') {
          await replyLineMessage(
            event.replyToken,
            `✅ บอท JobComm ทำงานปกติครับ\nพร้อมส่งภารกิจอัตโนมัติทุก ${cachedNotifyTime} น.`
          );
        }
      }
    }
  } catch (err) {
    console.error('Error handling webhook:', err);
  }
});

// Test trigger endpoint for manual test
app.post('/api/line/test-send', async (req, res) => {
  try {
    const { groupId } = await getLineConfig();
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'ยังไม่พบรหัสกลุ่ม (Group ID) กรุณาเชิญบอทเข้ากลุ่ม LINE หรือพิมพ์ #jobcomm ในกลุ่มก่อนครับ'
      });
    }

    const todayStr = getTodayDateString(req);
    const missions = await getTodayMissions(todayStr);
    const flexMessage = buildDailyLineFlexMessage(todayStr, missions);

    const result = await sendLinePushMessage(groupId, flexMessage);
    res.json({ success: result.success, groupId, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET current line config & status
app.get('/api/line/status', async (req, res) => {
  try {
    const config = await getLineConfig();
    res.json({
      success: true,
      hasToken: Boolean(process.env.LINE_ACCESS_TOKEN),
      hasSecret: Boolean(process.env.LINE_CHANNEL_SECRET),
      groupId: config.groupId || null,
      notifyTime: config.notifyTime,
      notifyEnabled: config.notifyEnabled,
      notifyOnEmpty: config.notifyOnEmpty,
      notifyOnAdd: config.notifyOnAdd
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update line settings
app.put('/api/line/settings', async (req, res) => {
  try {
    const { notifyTime, notifyEnabled, notifyOnEmpty, notifyOnAdd } = req.body;
    await saveLineSettings({ notifyTime, notifyEnabled, notifyOnEmpty, notifyOnAdd });
    res.json({
      success: true,
      message: 'บันทึกการตั้งค่า LINE สำเร็จ',
      notifyTime,
      notifyEnabled,
      notifyOnEmpty,
      notifyOnAdd
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CRON JOB SETUP: Dynamic based on settings
let currentCronTask = null;

async function setupDailyCronJob() {
  if (currentCronTask) {
    currentCronTask.stop();
    currentCronTask = null;
  }

  const { groupId, notifyTime, notifyEnabled } = await getLineConfig();

  if (!notifyEnabled) {
    console.log('⏸️ [CRON] Daily LINE notifications are currently DISABLED.');
    return;
  }

  const [hourStr, minStr] = (notifyTime || '06:00').split(':');
  const hour = parseInt(hourStr || '6', 10);
  const min = parseInt(minStr || '0', 10);

  const cronPattern = `${min} ${hour} * * *`;
  console.log(`⏰ [CRON] Scheduled daily LINE notification at ${notifyTime} (Pattern: "${cronPattern}")`);

  currentCronTask = cron.schedule(cronPattern, async () => {
    console.log(`⏰ [CRON ${notifyTime}] Triggering daily LINE mission notification...`);
    try {
      const activeConfig = await getLineConfig();
      if (!activeConfig.notifyEnabled) {
        console.log('⏸️ [CRON] Notification is disabled.');
        return;
      }
      if (!activeConfig.groupId) {
        console.warn('⚠️ [CRON] Skipped: No LINE Group ID registered yet.');
        return;
      }

      const todayStr = getBangkokDateString();

      const missions = await getTodayMissions(todayStr);

      // Check if no missions and notifyOnEmpty is false -> skip sending
      if ((!missions || missions.length === 0) && !activeConfig.notifyOnEmpty) {
        console.log(`ℹ️ [CRON ${notifyTime}] Skipped: No missions for ${todayStr} and notifyOnEmpty is disabled.`);
        return;
      }

      const flexMessage = buildDailyLineFlexMessage(todayStr, missions);

      await sendLinePushMessage(activeConfig.groupId, flexMessage);
      console.log(`🚀 [CRON ${notifyTime}] Successfully sent missions for ${todayStr} to ${activeConfig.groupId}`);
    } catch (err) {
      console.error(`❌ [CRON ${notifyTime}] Error sending daily mission notification:`, err);
    }
  }, {
    timezone: 'Asia/Bangkok'
  });
}

// Initialize Cron on startup
setupDailyCronJob();

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
