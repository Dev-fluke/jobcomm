import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if Supabase credentials are provided
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

export let supabase = null;
let db = null;

// Helper function to extract storage file path from URL
export function extractStoragePath(url) {
  if (!url) return null;
  const match = url.match(/\/attachments\/([^?#]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

// Helper function to remove attachment file from Supabase Storage or local disk
export async function removeAttachment(url) {
  if (!url) return;
  try {
    if (isSupabase && supabase) {
      const storagePath = extractStoragePath(url);
      if (storagePath) {
        const { error } = await supabase.storage.from('attachments').remove([storagePath]);
        if (error) {
          console.error(`Failed to remove file from Supabase storage: ${storagePath}`, error);
        } else {
          console.log(`🗑️ Successfully deleted from Supabase storage: ${storagePath}`);
        }
      }
    } else {
      const match = url.match(/\/uploads\/([^?#]+)/);
      if (match) {
        const localPath = path.join(__dirname, 'uploads', decodeURIComponent(match[1]));
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
          console.log(`🗑️ Successfully deleted local file: ${localPath}`);
        }
      }
    }
  } catch (err) {
    console.error('Error removing attachment file:', err);
  }
}

if (isSupabase) {
  console.log('⚡ Connected to Supabase Cloud Database:', SUPABASE_URL);
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.log('📦 Using Local SQLite Database');
  const dbPath = path.join(__dirname, 'database.sqlite');
  db = new DatabaseSync(dbPath);

  // Initialize SQLite schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'ทั่วไป',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      location TEXT NOT NULL,
      description TEXT,
      assignee TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
      notes TEXT,
      attachment_url TEXT,
      attachment_name TEXT,
      attachment_type TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      role TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  try { db.exec('ALTER TABLE missions ADD COLUMN attachment_url TEXT;'); } catch {}
  try { db.exec('ALTER TABLE missions ADD COLUMN attachment_name TEXT;'); } catch {}
  try { db.exec('ALTER TABLE missions ADD COLUMN attachment_type TEXT;'); } catch {}

  // Seed Default Categories
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (catCount === 0) {
    const defaultCats = [
      'ประชุม',
      'ซ่อมบำรุง',
      'ตรวจเช็คระบบ',
      'วางสายสัญญาณ',
      'วิทยุสื่อสาร',
      'ภารกิจพิเศษ',
      'ฝึกอบรม',
      'สื่อสารสนับสนุน'
    ];
    const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
    for (const c of defaultCats) insertCat.run(c);
  }

  // Seed Default Locations
  const locCount = db.prepare('SELECT COUNT(*) as count FROM locations').get().count;
  if (locCount === 0) {
    const defaultLocs = [
      'ห้องประชุม บก.อย. 1',
      'ห้องประชุม บก.อย. 2',
      'ศูนย์ปฏิบัติการสื่อสาร อย.',
      'อาคารฝ่ายการสื่อสาร',
      'เสาส่งสัญญาณวิทยุสื่อสาร อย.',
      'ลานจอดอากาศยาน กองบิน 6',
      'สนามฝึกทางยุทธวิธี อย.',
      'ห้องสื่อสารเฉพาะกิจ'
    ];
    const insertLoc = db.prepare('INSERT OR IGNORE INTO locations (name) VALUES (?)');
    for (const l of defaultLocs) insertLoc.run(l);
  }

  // Seed Default Personnel
  const persCount = db.prepare('SELECT COUNT(*) as count FROM personnel').get().count;
  if (persCount === 0) {
    const defaultPersonnel = [
      { name: 'น.ต. สุรชัย ช่างสื่อสาร', role: 'หน.แผนกสื่อสาร' },
      { name: 'ร.อ. เกียรติศักดิ์ พลสื่อสาร', role: 'รอง หน.แผนก' },
      { name: 'ร.ท. วรพงษ์ นายทหารวิทยุ', role: 'นายทหารวิทยุสื่อสาร' },
      { name: 'พ.อ.อ. ธนกฤต ช่างสายสัญญาณ', role: 'เจ้าหน้าที่โครงข่าย' },
      { name: 'จ.ส.อ. สมเกียรติ พลสื่อสาร', role: 'เจ้าหน้าที่สื่อสาร' },
      { name: 'จ.ส.อ. วินัย ช่างวิทยุ', role: 'ช่างซ่อมบำรุงวิทยุ' },
      { name: 'ส.อ. อนุชา ช่างเทคนิค', role: 'ช่างเทคนิคคอมพิวเตอร์' },
      { name: 'ส.ท. ปฏิบัติการ เวรวิทยุ', role: 'เจ้าหน้าที่ประจำเวร' }
    ];
    const insertPers = db.prepare('INSERT OR IGNORE INTO personnel (name, role) VALUES (?, ?)');
    for (const p of defaultPersonnel) insertPers.run(p.name, p.role);
  }
}

// Preset CRUD operations
export async function getPresets() {
  if (isSupabase) {
    const [catsRes, locsRes, persRes] = await Promise.all([
      supabase.from('categories').select('*').order('id', { ascending: true }),
      supabase.from('locations').select('*').order('id', { ascending: true }),
      supabase.from('personnel').select('*').order('id', { ascending: true })
    ]);
    return {
      categories: catsRes.data || [],
      locations: locsRes.data || [],
      personnel: persRes.data || []
    };
  }

  const categories = db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
  const locations = db.prepare('SELECT * FROM locations ORDER BY id ASC').all();
  const personnel = db.prepare('SELECT * FROM personnel ORDER BY id ASC').all();
  return { categories, locations, personnel };
}

export async function addPreset(type, { name, role }) {
  if (!name) throw new Error('Name is required');

  if (isSupabase) {
    const payload = { name: name.trim() };
    if (type === 'personnel') payload.role = (role || '').trim();
    const { data, error } = await supabase.from(type).insert(payload).select().single();
    if (error) throw error;
    return data;
  }

  if (type === 'categories') {
    const res = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name.trim());
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(res.lastInsertRowid);
  } else if (type === 'locations') {
    const res = db.prepare('INSERT INTO locations (name) VALUES (?)').run(name.trim());
    return db.prepare('SELECT * FROM locations WHERE id = ?').get(res.lastInsertRowid);
  } else if (type === 'personnel') {
    const res = db.prepare('INSERT INTO personnel (name, role) VALUES (?, ?)').run(name.trim(), (role || '').trim());
    return db.prepare('SELECT * FROM personnel WHERE id = ?').get(res.lastInsertRowid);
  }
  throw new Error(`Invalid preset type: ${type}`);
}

export async function updatePreset(type, id, { name, role }) {
  if (isSupabase) {
    const payload = { name: name.trim() };
    if (type === 'personnel') payload.role = (role || '').trim();
    const { data, error } = await supabase.from(type).update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  if (type === 'categories') {
    db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name.trim(), id);
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  } else if (type === 'locations') {
    db.prepare('UPDATE locations SET name = ? WHERE id = ?').run(name.trim(), id);
    return db.prepare('SELECT * FROM locations WHERE id = ?').get(id);
  } else if (type === 'personnel') {
    db.prepare('UPDATE personnel SET name = ?, role = ? WHERE id = ?').run(name.trim(), (role || '').trim(), id);
    return db.prepare('SELECT * FROM personnel WHERE id = ?').get(id);
  }
  throw new Error(`Invalid preset type: ${type}`);
}

export async function deletePreset(type, id) {
  if (isSupabase) {
    const { data, error } = await supabase.from(type).delete().eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  }

  if (type === 'categories') {
    const item = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return item;
  } else if (type === 'locations') {
    const item = db.prepare('SELECT * FROM locations WHERE id = ?').get(id);
    db.prepare('DELETE FROM locations WHERE id = ?').run(id);
    return item;
  } else if (type === 'personnel') {
    const item = db.prepare('SELECT * FROM personnel WHERE id = ?').get(id);
    db.prepare('DELETE FROM personnel WHERE id = ?').run(id);
    return item;
  }
  throw new Error(`Invalid preset type: ${type}`);
}

// Missions queries
export async function getAllMissions({ date, status, search, category } = {}) {
  if (isSupabase) {
    let q = supabase.from('missions').select('*');
    if (date) q = q.lte('start_date', date).gte('end_date', date);
    if (status && status !== 'all') q = q.eq('status', status);
    if (category && category !== 'all') q = q.eq('category', category);
    if (search) {
      q = q.or(`title.ilike.%${search}%,location.ilike.%${search}%,description.ilike.%${search}%,assignee.ilike.%${search}%`);
    }
    q = q.order('start_date', { ascending: true }).order('start_time', { ascending: true }).order('id', { ascending: true });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  let query = 'SELECT * FROM missions WHERE 1=1';
  const params = [];

  if (date) {
    query += ' AND (start_date <= ? AND end_date >= ?)';
    params.push(date, date);
  }

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (title LIKE ? OR location LIKE ? OR description LIKE ? OR assignee LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY start_date ASC, start_time ASC, id ASC';
  return db.prepare(query).all(...params);
}

export async function getTodayMissions(todayStr) {
  if (isSupabase) {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .lte('start_date', todayStr)
      .gte('end_date', todayStr)
      .order('start_time', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  const query = `
    SELECT * FROM missions 
    WHERE (start_date <= ? AND end_date >= ?)
    ORDER BY start_time ASC, id ASC
  `;
  return db.prepare(query).all(todayStr, todayStr);
}

export async function getOtherMissions(todayStr) {
  if (isSupabase) {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .or(`start_date.gt.${todayStr},end_date.lt.${todayStr}`)
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  const query = `
    SELECT * FROM missions 
    WHERE start_date > ? OR end_date < ?
    ORDER BY start_date ASC, start_time ASC
  `;
  return db.prepare(query).all(todayStr, todayStr);
}

export async function getMissionById(id) {
  if (isSupabase) {
    const { data, error } = await supabase.from('missions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }

  return db.prepare('SELECT * FROM missions WHERE id = ?').get(id);
}

export async function createMission(data) {
  if (isSupabase) {
    const payload = {
      title: data.title || '',
      category: data.category || 'ทั่วไป',
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      end_date: data.end_date || data.start_date || new Date().toISOString().split('T')[0],
      start_time: data.start_time || '',
      end_time: data.end_time || '',
      location: data.location || '',
      description: data.description || '',
      assignee: data.assignee || '',
      status: data.status || 'pending',
      priority: data.priority || 'normal',
      notes: data.notes || '',
      attachment_url: data.attachment_url || null,
      attachment_name: data.attachment_name || null,
      attachment_type: data.attachment_type || null
    };
    const { data: created, error } = await supabase.from('missions').insert([payload]).select().single();
    if (error) throw error;
    return created;
  }

  const stmt = db.prepare(`
    INSERT INTO missions (
      title, category, start_date, end_date, start_time, end_time,
      location, description, assignee, status, priority, notes,
      attachment_url, attachment_name, attachment_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const res = stmt.run(
    data.title || '',
    data.category || 'ทั่วไป',
    data.start_date || new Date().toISOString().split('T')[0],
    data.end_date || data.start_date || new Date().toISOString().split('T')[0],
    data.start_time || '',
    data.end_time || '',
    data.location || '',
    data.description || '',
    data.assignee || '',
    data.status || 'pending',
    data.priority || 'normal',
    data.notes || '',
    data.attachment_url || null,
    data.attachment_name || null,
    data.attachment_type || null
  );

  return getMissionById(res.lastInsertRowid);
}

export async function updateMission(id, data) {
  const existing = await getMissionById(id);
  if (existing && existing.attachment_url && data.attachment_url !== undefined && data.attachment_url !== existing.attachment_url) {
    // Old attachment changed or removed -> delete previous file
    await removeAttachment(existing.attachment_url);
  }

  if (isSupabase) {
    const payload = {
      title: data.title,
      category: data.category,
      start_date: data.start_date,
      end_date: data.end_date,
      start_time: data.start_time,
      end_time: data.end_time,
      location: data.location,
      description: data.description,
      assignee: data.assignee,
      status: data.status,
      priority: data.priority,
      notes: data.notes,
      attachment_url: data.attachment_url !== undefined ? data.attachment_url : null,
      attachment_name: data.attachment_name !== undefined ? data.attachment_name : null,
      attachment_type: data.attachment_type !== undefined ? data.attachment_type : null,
      updated_at: new Date().toISOString()
    };
    const { data: updated, error } = await supabase.from('missions').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return updated;
  }

  const stmt = db.prepare(`
    UPDATE missions SET
      title = ?,
      category = ?,
      start_date = ?,
      end_date = ?,
      start_time = ?,
      end_time = ?,
      location = ?,
      description = ?,
      assignee = ?,
      status = ?,
      priority = ?,
      notes = ?,
      attachment_url = ?,
      attachment_name = ?,
      attachment_type = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(
    data.title,
    data.category,
    data.start_date,
    data.end_date,
    data.start_time,
    data.end_time,
    data.location,
    data.description,
    data.assignee,
    data.status,
    data.priority,
    data.notes,
    data.attachment_url !== undefined ? data.attachment_url : null,
    data.attachment_name !== undefined ? data.attachment_name : null,
    data.attachment_type !== undefined ? data.attachment_type : null,
    id
  );

  return getMissionById(id);
}

export async function updateMissionStatus(id, status) {
  if (isSupabase) {
    const { data: updated, error } = await supabase
      .from('missions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }

  db.prepare('UPDATE missions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  return getMissionById(id);
}

export async function deleteMission(id) {
  const mission = await getMissionById(id);
  if (mission && mission.attachment_url) {
    await removeAttachment(mission.attachment_url);
  }

  if (isSupabase) {
    const { data, error } = await supabase.from('missions').delete().eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data || mission;
  }

  db.prepare('DELETE FROM missions WHERE id = ?').run(id);
  return mission;
}

export async function deleteMissionsByMonth(monthStr) {
  if (isSupabase) {
    const { data: missionsToDelete } = await supabase
      .from('missions')
      .select('attachment_url')
      .like('start_date', `${monthStr}%`);

    if (missionsToDelete && missionsToDelete.length > 0) {
      for (const m of missionsToDelete) {
        if (m.attachment_url) {
          await removeAttachment(m.attachment_url);
        }
      }
    }

    const { data, error } = await supabase.from('missions').delete().like('start_date', `${monthStr}%`).select();
    if (error) throw error;
    return { deletedCount: data ? data.length : 0 };
  }

  const missions = db.prepare("SELECT attachment_url FROM missions WHERE start_date LIKE ?").all(`${monthStr}%`);
  for (const m of missions) {
    if (m.attachment_url) {
      await removeAttachment(m.attachment_url);
    }
  }

  const countBefore = db.prepare("SELECT COUNT(*) as c FROM missions WHERE start_date LIKE ?").get(`${monthStr}%`).c;
  const res = db.prepare("DELETE FROM missions WHERE start_date LIKE ?").run(`${monthStr}%`);
  return { deletedCount: res.changes !== undefined ? res.changes : countBefore };
}

export async function getStats(todayStr) {
  if (isSupabase) {
    const [totalRes, todayRes, inProgRes, compRes, pendRes] = await Promise.all([
      supabase.from('missions').select('*', { count: 'exact', head: true }),
      supabase.from('missions').select('*', { count: 'exact', head: true }).lte('start_date', todayStr).gte('end_date', todayStr),
      supabase.from('missions').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('missions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('missions').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);
    return {
      total: totalRes.count || 0,
      todayCount: todayRes.count || 0,
      inProgress: inProgRes.count || 0,
      completed: compRes.count || 0,
      pending: pendRes.count || 0
    };
  }

  const total = db.prepare('SELECT COUNT(*) as c FROM missions').get().c;
  const todayCount = db.prepare('SELECT COUNT(*) as c FROM missions WHERE start_date <= ? AND end_date >= ?').get(todayStr, todayStr).c;
  const inProgress = db.prepare("SELECT COUNT(*) as c FROM missions WHERE status = 'in_progress'").get().c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM missions WHERE status = 'completed'").get().c;
  const pending = db.prepare("SELECT COUNT(*) as c FROM missions WHERE status = 'pending'").get().c;

  return { total, todayCount, inProgress, completed, pending };
}

export default db;
