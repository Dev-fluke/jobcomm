export interface Mission {
  id: number;
  title: string;
  category: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  location: string;
  description: string;
  assignee?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  created_at?: string;
  updated_at?: string;
}

export type ActiveTab = 'today' | 'other' | 'add' | 'tv' | 'table' | 'settings';

export interface Stats {
  total: number;
  todayCount: number;
  inProgress: number;
  completed: number;
  pending: number;
}

export interface PresetItem {
  id: number;
  name: string;
  role?: string;
}

export interface Presets {
  categories: PresetItem[];
  locations: PresetItem[];
  personnel: PresetItem[];
}

export const MISSION_CATEGORIES = [
  'ประชุม',
  'ซ่อมบำรุง',
  'ตรวจเช็คระบบ',
  'วางสายสัญญาณ',
  'วิทยุสื่อสาร',
  'ภารกิจพิเศษ'
] as const;
