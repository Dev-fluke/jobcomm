import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new DatabaseSync(dbPath);

// Initialize schema
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

// Add attachment columns to existing database if missing
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

// Seed sample missions if empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM missions');
const currentCount = countStmt.get();

if (currentCount.count === 0) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

  const sampleMissions = [
    {
      title: 'ประชุมเตรียมความพร้อมระบบสื่อสาร บก.อย.',
      category: 'ประชุม',
      start_date: todayStr,
      end_date: todayStr,
      start_time: '13:30',
      end_time: '15:30',
      location: 'ห้องประชุม บก.อย. 1',
      description: 'ประชุมชี้แจงแผนปฏิบัติการสื่อสารและการเชื่อมโยงสัญญาณวิทยุและเครือข่าย IP ประจำไตรมาส',
      assignee: 'ร.อ. เกียรติศักดิ์ พลสื่อสาร',
      status: 'pending',
      priority: 'high'
    },
    {
      title: 'ตรวจเช็คระบบแม่ข่ายวิทยุสื่อสาร VHF/UHF',
      category: 'ซ่อมบำรุง',
      start_date: todayStr,
      end_date: todayStr,
      start_time: '15:00',
      end_time: '16:30',
      location: 'เสาส่งสัญญาณวิทยุสื่อสาร อย.',
      description: 'ทดสอบกำลังส่ง วัดค่า SWR และตรวจสอบแบตเตอรี่สำรองระบบวิทยุสื่อสารหลัก',
      assignee: 'จ.ส.อ. วินัย ช่างวิทยุ',
      status: 'pending',
      priority: 'normal'
    },
    {
      title: 'ติดตั้งและทดสอบระบบถ่ายทอดภาพการฝึกภาคสนาม',
      category: 'ภารกิจพิเศษ',
      start_date: tomorrowStr,
      end_date: tomorrowStr,
      start_time: '08:30',
      end_time: '16:00',
      location: 'สนามฝึกทางยุทธวิธี อย.',
      description: 'วางสายสัญญาณใยแก้วนำแสงและตั้งจุดกระจายสัญญาณ Wi-Fi Mesh รองรับการควบคุมการฝึก',
      assignee: 'พ.อ.อ. ธนกฤต ช่างสายสัญญาณ',
      status: 'pending',
      priority: 'urgent'
    }
  ];

  const insertStmt = db.prepare(`
    INSERT INTO missions (title, category, start_date, end_date, start_time, end_time, location, description, assignee, status, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const m of sampleMissions) {
    insertStmt.run(
      m.title,
      m.category,
      m.start_date,
      m.end_date,
      m.start_time,
      m.end_time,
      m.location,
      m.description,
      m.assignee,
      m.status,
      m.priority
    );
  }
}

// Preset CRUD operations
export function getPresets() {
  const categories = db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
  const locations = db.prepare('SELECT * FROM locations ORDER BY id ASC').all();
  const personnel = db.prepare('SELECT * FROM personnel ORDER BY id ASC').all();
  return { categories, locations, personnel };
}

export function addPreset(type, { name, role }) {
  if (!name) throw new Error('Name is required');
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

export function updatePreset(type, id, { name, role }) {
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

export function deletePreset(type, id) {
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
export function getAllMissions({ date, status, search, category } = {}) {
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

export function getTodayMissions(todayStr) {
  const query = `
    SELECT * FROM missions 
    WHERE (start_date <= ? AND end_date >= ?)
    ORDER BY start_time ASC, id ASC
  `;
  return db.prepare(query).all(todayStr, todayStr);
}

export function getOtherMissions(todayStr) {
  const query = `
    SELECT * FROM missions 
    WHERE start_date > ? OR end_date < ?
    ORDER BY start_date ASC, start_time ASC
  `;
  return db.prepare(query).all(todayStr, todayStr);
}

export function getMissionById(id) {
  return db.prepare('SELECT * FROM missions WHERE id = ?').get(id);
}

export function createMission(data) {
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

export function updateMission(id, data) {
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

export function updateMissionStatus(id, status) {
  db.prepare('UPDATE missions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  return getMissionById(id);
}

export function deleteMission(id) {
  const mission = getMissionById(id);
  db.prepare('DELETE FROM missions WHERE id = ?').run(id);
  return mission;
}

export function deleteMissionsByMonth(monthStr) {
  const countBefore = db.prepare("SELECT COUNT(*) as c FROM missions WHERE start_date LIKE ?").get(`${monthStr}%`).c;
  const res = db.prepare("DELETE FROM missions WHERE start_date LIKE ?").run(`${monthStr}%`);
  return { deletedCount: res.changes !== undefined ? res.changes : countBefore };
}

export function getStats(todayStr) {
  const total = db.prepare('SELECT COUNT(*) as c FROM missions').get().c;
  const todayCount = db.prepare('SELECT COUNT(*) as c FROM missions WHERE start_date <= ? AND end_date >= ?').get(todayStr, todayStr).c;
  const inProgress = db.prepare("SELECT COUNT(*) as c FROM missions WHERE status = 'in_progress'").get().c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM missions WHERE status = 'completed'").get().c;
  const pending = db.prepare("SELECT COUNT(*) as c FROM missions WHERE status = 'pending'").get().c;

  return { total, todayCount, inProgress, completed, pending };
}

export default db;
