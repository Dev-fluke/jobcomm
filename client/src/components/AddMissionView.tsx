import React, { useState, useEffect, useRef } from 'react';
import type { Mission } from '../types';
import { getTodayDateString } from '../utils/thaiDate';
import {
  Save,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Upload,
  Paperclip,
  FileText,
  Users,
  MapPin,
  Tag,
  Settings
} from 'lucide-react';

interface AddMissionViewProps {
  onAddMission: (data: Partial<Mission>) => Promise<boolean>;
  onCancel: () => void;
  defaultDate?: string;
}

interface PresetItem {
  id: number;
  name: string;
  role?: string;
}

export const AddMissionView: React.FC<AddMissionViewProps> = ({
  onAddMission,
  onCancel,
  defaultDate
}) => {
  const today = defaultDate || getTodayDateString();

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ประชุม');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [isCustomAssignee, setIsCustomAssignee] = useState(false);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  // Attachment (PDF or Image)
  const [attachment, setAttachment] = useState<{
    url: string;
    name: string;
    type: string;
    size?: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Presets (Categories, Locations, Personnel)
  const [categories, setCategories] = useState<PresetItem[]>([
    { id: 1, name: 'ประชุม' },
    { id: 2, name: 'ซ่อมบำรุง' },
    { id: 3, name: 'ตรวจเช็คระบบ' },
    { id: 4, name: 'วางสายสัญญาณ' },
    { id: 5, name: 'วิทยุสื่อสาร' },
    { id: 6, name: 'ภารกิจพิเศษ' }
  ]);

  const [locations, setLocations] = useState<PresetItem[]>([
    { id: 1, name: 'ห้องประชุม บก.อย. 1' },
    { id: 2, name: 'ห้องประชุม บก.อย. 2' },
    { id: 3, name: 'ศูนย์ปฏิบัติการสื่อสาร อย.' },
    { id: 4, name: 'อาคารฝ่ายการสื่อสาร' },
    { id: 5, name: 'เสาส่งสัญญาณวิทยุสื่อสาร อย.' },
    { id: 6, name: 'ลานจอดอากาศยาน กองบิน 6' },
    { id: 7, name: 'สนามฝึกทางยุทธวิธี อย.' }
  ]);

  const [personnel, setPersonnel] = useState<PresetItem[]>([
    { id: 1, name: 'น.ต. สุรชัย ช่างสื่อสาร', role: 'หน.แผนกสื่อสาร' },
    { id: 2, name: 'ร.อ. เกียรติศักดิ์ พลสื่อสาร', role: 'รอง หน.แผนก' },
    { id: 3, name: 'ร.ท. วรพงษ์ นายทหารวิทยุ', role: 'นายทหารวิทยุ' },
    { id: 4, name: 'พ.อ.อ. ธนกฤต ช่างสายสัญญาณ', role: 'ช่างสายสัญญาณ' },
    { id: 5, name: 'จ.ส.อ. สมเกียรติ พลสื่อสาร', role: 'เจ้าหน้าที่สื่อสาร' },
    { id: 6, name: 'จ.ส.อ. วินัย ช่างวิทยุ', role: 'ช่างซ่อมวิทยุ' },
    { id: 7, name: 'ส.อ. อนุชา ช่างเทคนิค', role: 'ช่างเทคนิค' },
    { id: 8, name: 'ส.ท. ปฏิบัติการ เวรวิทยุ', role: 'เวรวิทยุ' }
  ]);

  // Management drawer state
  const [managingType, setManagingType] = useState<'categories' | 'locations' | 'personnel' | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetRole, setNewPresetRole] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<number | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');
  const [editingPresetRole, setEditingPresetRole] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch presets from server on mount
  useEffect(() => {
    fetch('/api/presets')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          if (data.data.categories?.length) {
            setCategories(data.data.categories);
            if (!category && data.data.categories[0]) {
              setCategory(data.data.categories[0].name);
            }
          }
          if (data.data.locations?.length) {
            setLocations(data.data.locations);
          }
          if (data.data.personnel?.length) {
            setPersonnel(data.data.personnel);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Handle file selection (PDF or Image)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 25MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'อัปโหลดไฟล์ไม่สำเร็จ');
      }

      setAttachment({
        url: data.url,
        name: data.name,
        type: data.type,
        size: data.size
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add preset (Category, Location, Personnel)
  const handleAddPreset = async (type: 'categories' | 'locations' | 'personnel') => {
    if (!newPresetName.trim()) return;

    try {
      const res = await fetch(`/api/presets/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPresetName.trim(), role: newPresetRole.trim() })
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (type === 'categories') {
          setCategories((prev) => [...prev, data.data]);
          setCategory(data.data.name);
        } else if (type === 'locations') {
          setLocations((prev) => [...prev, data.data]);
          setLocation(data.data.name);
          setIsCustomLocation(false);
        } else if (type === 'personnel') {
          setPersonnel((prev) => [...prev, data.data]);
          setAssignee(data.data.name);
          setIsCustomAssignee(false);
        }
        setNewPresetName('');
        setNewPresetRole('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update preset
  const handleUpdatePreset = async (type: 'categories' | 'locations' | 'personnel', id: number) => {
    if (!editingPresetName.trim()) return;
    try {
      const res = await fetch(`/api/presets/${type}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingPresetName.trim(), role: editingPresetRole.trim() })
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (type === 'categories') {
          setCategories((prev) => prev.map((item) => (item.id === id ? data.data : item)));
        } else if (type === 'locations') {
          setLocations((prev) => prev.map((item) => (item.id === id ? data.data : item)));
        } else if (type === 'personnel') {
          setPersonnel((prev) => prev.map((item) => (item.id === id ? data.data : item)));
        }
        setEditingPresetId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete preset
  const handleDeletePreset = async (type: 'categories' | 'locations' | 'personnel', id: number) => {
    try {
      const res = await fetch(`/api/presets/${type}/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (type === 'categories') {
          setCategories((prev) => prev.filter((item) => item.id !== id));
        } else if (type === 'locations') {
          setLocations((prev) => prev.filter((item) => item.id !== id));
        } else if (type === 'personnel') {
          setPersonnel((prev) => prev.filter((item) => item.id !== id));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('กรุณาระบุชื่อภารกิจ');
      return;
    }
    if (!startDate) {
      setErrorMessage('กรุณาระบุวันที่เริ่มต้น');
      return;
    }
    if (!location.trim()) {
      setErrorMessage('กรุณาระบุหรือเลือกสถานที่');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const success = await onAddMission({
        title: title.trim(),
        category,
        start_date: startDate,
        end_date: endDate || startDate,
        start_time: startTime,
        end_time: endTime,
        location: location.trim(),
        description: description.trim(),
        assignee: assignee.trim(),
        priority,
        status: 'pending',
        attachment_url: attachment?.url,
        attachment_name: attachment?.name,
        attachment_type: attachment?.type
      });

      if (!success) {
        setErrorMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Wireframe Box: Border container matching sketch 1 */}
        <div className="bg-white border-2 border-slate-900 rounded-lg p-5 sm:p-7 shadow-xs space-y-5 w-full max-w-full overflow-hidden box-border">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-700 text-sm rounded-md">
              {errorMessage}
            </div>
          )}

          {/* Row 1: ภารกิจ : (เลือกแบบดรอปดาวอย่างเดียว ตัดแบบคลิกปุ่มออก ตามสั่ง) */}
          <div className="w-full max-w-full">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-base font-bold text-slate-900">
                ภารกิจ : <span className="text-red-600">*</span>
              </label>
              <button
                type="button"
                onClick={() => setManagingType(managingType === 'categories' ? null : 'categories')}
                className="text-xs text-blue-800 hover:text-blue-900 font-semibold flex items-center gap-1 hover:underline"
                title="จัดการหมวดหมู่ภารกิจ (เพิ่ม/ลบ/แก้ไข)"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>จัดการตัวเลือกภารกิจ</span>
              </button>
            </div>

            {/* Pure Dropdown for Category + Title Input (No button chips!) */}
            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-full">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full sm:w-44 bg-slate-50 border-2 border-slate-800 rounded-md px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-700 shrink-0"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ระบุชื่อภารกิจ เช่น ประชุมเตรียมความพร้อม..."
                className="w-full flex-1 min-w-0 border-2 border-slate-800 rounded-md px-3 py-2 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 bg-white"
                required
                autoFocus
              />
            </div>

            {/* Inline Category Manager Drawer if toggled */}
            {managingType === 'categories' && (
              <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2 animate-in fade-in duration-150 w-full max-w-full">
                <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                  <span>+ จัดการประเภทภารกิจ (เพิ่ม / แก้ไข / ลบ)</span>
                  <button
                    type="button"
                    onClick={() => setManagingType(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="พิมพ์ชื่อประเภทใหม่..."
                    className="flex-1 min-w-0 text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddPreset('categories')}
                    className="px-3 py-1.5 bg-blue-800 text-white rounded text-xs font-semibold hover:bg-blue-900 shrink-0"
                  >
                    เพิ่ม
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto">
                  {categories.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs flex items-center gap-1.5 text-slate-800"
                    >
                      {editingPresetId === item.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingPresetName}
                            onChange={(e) => setEditingPresetName(e.target.value)}
                            className="border border-blue-500 rounded px-1 text-xs w-20"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdatePreset('categories', item.id)}
                            className="text-emerald-700 font-bold"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPresetId(null)}
                            className="text-slate-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span>{item.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPresetId(item.id);
                              setEditingPresetName(item.name);
                            }}
                            className="text-slate-400 hover:text-blue-700"
                            title="แก้ไขชื่อ"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePreset('categories', item.id)}
                            className="text-slate-400 hover:text-red-700"
                            title="ลบ"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row 2: วันที่ : ถึง วันที่ */}
          <div className="w-full max-w-full">
            <label className="block text-base font-bold text-slate-900 mb-1.5">
              วันที่ : ถึง วันที่ <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center w-full max-w-full">
              <div className="w-full min-w-0">
                <span className="text-xs text-slate-500 mb-1 block">วันเริ่มต้น:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate < e.target.value) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="w-full border-2 border-slate-800 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-700 bg-white"
                  required
                />
              </div>

              <div className="w-full min-w-0">
                <span className="text-xs text-slate-500 mb-1 block">ถึงวันที่:</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border-2 border-slate-800 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-700 bg-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Row 3: เวลา : */}
          <div className="w-full max-w-full">
            <label className="block text-base font-bold text-slate-900 mb-1.5">
              เวลา :
            </label>
            <div className="grid grid-cols-2 gap-3 w-full max-w-full">
              <div className="min-w-0">
                <span className="text-xs text-slate-500 mb-1 block">เวลาเริ่ม (น.):</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border-2 border-slate-800 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-700 bg-white"
                />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-slate-500 mb-1 block">เวลาสิ้นสุด (น.):</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border-2 border-slate-800 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-700 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Row 4: สถานที่ : (เลือกแบบดรอปดาวอย่างเดียว ตัดแบบคลิกปุ่มออก ตามสั่ง) */}
          <div className="w-full max-w-full">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-base font-bold text-slate-900">
                สถานที่ : <span className="text-red-600">*</span>
              </label>
              <button
                type="button"
                onClick={() => setManagingType(managingType === 'locations' ? null : 'locations')}
                className="text-xs text-blue-800 hover:text-blue-900 font-semibold flex items-center gap-1 hover:underline"
                title="จัดการรายการสถานที่"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>จัดการตัวเลือกสถานที่</span>
              </button>
            </div>

            {/* Pure Dropdown for Location (No button chips!) */}
            <div className="w-full max-w-full space-y-2">
              <select
                value={isCustomLocation ? 'custom' : location}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomLocation(true);
                    setLocation('');
                  } else {
                    setIsCustomLocation(false);
                    setLocation(e.target.value);
                  }
                }}
                className="w-full max-w-full border-2 border-slate-800 rounded-md px-3 py-2 text-sm sm:text-base text-slate-900 bg-white focus:outline-none focus:border-blue-700 truncate"
                required={!isCustomLocation}
              >
                <option value="">-- กรุณาเลือกสถานที่ --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
                <option value="custom">✏️ พิมพ์สถานที่อื่นด้วยตนเอง...</option>
              </select>

              {/* Show text input only when typing custom location */}
              {isCustomLocation && (
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="พิมพ์ระบุสถานที่..."
                  className="w-full max-w-full border-2 border-slate-800 rounded-md px-3 py-2 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 bg-white animate-in fade-in duration-150"
                  required
                  autoFocus
                />
              )}
            </div>

            {/* Inline Location Manager if toggled */}
            {managingType === 'locations' && (
              <div className="mt-3 p-3 bg-red-50/60 border border-red-200 rounded-lg space-y-2 animate-in fade-in duration-150 w-full max-w-full">
                <div className="flex items-center justify-between text-xs font-bold text-red-950">
                  <span>+ จัดการรายชื่อสถานที่ (เพิ่ม / แก้ไข / ลบ)</span>
                  <button
                    type="button"
                    onClick={() => setManagingType(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="พิมพ์ชื่อสถานที่ใหม่..."
                    className="flex-1 min-w-0 text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddPreset('locations')}
                    className="px-3 py-1.5 bg-blue-800 text-white rounded text-xs font-semibold hover:bg-blue-900 shrink-0"
                  >
                    เพิ่ม
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto">
                  {locations.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs flex items-center gap-1.5 text-slate-800"
                    >
                      {editingPresetId === item.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingPresetName}
                            onChange={(e) => setEditingPresetName(e.target.value)}
                            className="border border-blue-500 rounded px-1 text-xs w-28"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdatePreset('locations', item.id)}
                            className="text-emerald-700 font-bold"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPresetId(null)}
                            className="text-slate-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span>{item.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPresetId(item.id);
                              setEditingPresetName(item.name);
                            }}
                            className="text-slate-400 hover:text-blue-700"
                            title="แก้ไขชื่อสถานที่"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePreset('locations', item.id)}
                            className="text-slate-400 hover:text-red-700"
                            title="ลบสถานที่"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row 5: รายละเอียด : */}
          <div className="w-full max-w-full">
            <label className="block text-base font-bold text-slate-900 mb-1.5">
              รายละเอียด :
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ระบุรายละเอียดของภารกิจ วัตถุประสงค์ หรืออุปกรณ์ที่เกี่ยวข้อง..."
              className="w-full max-w-full border-2 border-slate-800 rounded-md p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 box-border"
            />
          </div>

          {/* Row 6: ผู้รับผิดชอบ (ดรอบดาวน์ ไม่เกินกรอบ div อยู่ในกรอบ 100% พร้อมตัวเลือกพิมพ์เอง) */}
          <div className="pt-2 border-t border-slate-200 w-full max-w-full">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-800" />
                ผู้รับผิดชอบ (ดรอปดาวน์เลือก หรือพิมพ์ชื่อเอง):
              </label>
              <button
                type="button"
                onClick={() => setManagingType(managingType === 'personnel' ? null : 'personnel')}
                className="text-xs text-blue-800 hover:text-blue-900 font-semibold flex items-center gap-1 hover:underline"
                title="จัดการรายชื่อผู้รับผิดชอบ"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>จัดการรายชื่อ</span>
              </button>
            </div>

            {/* Single clean Full-width Dropdown strictly inside div */}
            <div className="w-full max-w-full space-y-2">
              <select
                value={isCustomAssignee ? 'custom' : assignee}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomAssignee(true);
                    setAssignee('');
                  } else {
                    setIsCustomAssignee(false);
                    setAssignee(e.target.value);
                  }
                }}
                className="w-full max-w-full border-2 border-slate-800 rounded-md px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-700 truncate"
              >
                <option value="">-- กรุณาเลือกผู้รับผิดชอบ --</option>
                {personnel.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} {p.role ? `(${p.role})` : ''}
                  </option>
                ))}
                <option value="custom">✏️ พิมพ์ยศ-ชื่อผู้รับผิดชอบเอง...</option>
              </select>

              {/* Show text input only when typing custom assignee */}
              {isCustomAssignee && (
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="พิมพ์ยศ-ชื่อ-สกุล (เช่น ร.อ. สมชาย / เจ้าหน้าที่เวร)..."
                  className="w-full max-w-full border-2 border-slate-800 rounded-md px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 bg-white animate-in fade-in duration-150"
                  autoFocus
                />
              )}
            </div>

            {/* Inline Personnel Manager if toggled */}
            {managingType === 'personnel' && (
              <div className="mt-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2 animate-in fade-in duration-150 w-full max-w-full">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span>+ จัดการรายชื่อผู้รับผิดชอบ (เพิ่ม / แก้ไข / ลบ)</span>
                  <button
                    type="button"
                    onClick={() => setManagingType(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-full">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="ยศ-ชื่อ-สกุล..."
                    className="flex-1 min-w-0 text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-700"
                  />
                  <input
                    type="text"
                    value={newPresetRole}
                    onChange={(e) => setNewPresetRole(e.target.value)}
                    placeholder="ตำแหน่ง"
                    className="w-full sm:w-28 text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddPreset('personnel')}
                    className="px-3 py-1.5 bg-blue-800 text-white rounded text-xs font-semibold hover:bg-blue-900 shrink-0"
                  >
                    เพิ่ม
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto">
                  {personnel.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs flex items-center gap-1.5 text-slate-800"
                    >
                      {editingPresetId === item.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingPresetName}
                            onChange={(e) => setEditingPresetName(e.target.value)}
                            className="border border-blue-500 rounded px-1 text-xs w-28"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editingPresetRole}
                            onChange={(e) => setEditingPresetRole(e.target.value)}
                            placeholder="ตำแหน่ง"
                            className="border border-blue-500 rounded px-1 text-xs w-20"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdatePreset('personnel', item.id)}
                            className="text-emerald-700 font-bold"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPresetId(null)}
                            className="text-slate-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span>{item.name}</span>
                          {item.role && <span className="text-slate-400">({item.role})</span>}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPresetId(item.id);
                              setEditingPresetName(item.name);
                              setEditingPresetRole(item.role || '');
                            }}
                            className="text-slate-400 hover:text-blue-700"
                            title="แก้ไขชื่อ"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePreset('personnel', item.id)}
                            className="text-slate-400 hover:text-red-700"
                            title="ลบ"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row 7: แนบไฟล์ PDF หรือ รูปภาพ */}
          <div className="pt-2 border-t border-slate-200 w-full max-w-full">
            <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-blue-800" />
              แนบไฟล์เอกสาร PDF หรือรูปภาพ (ไม่เกิน 25MB):
            </label>

            {attachment ? (
              <div className="p-3 bg-slate-50 border-2 border-blue-200 rounded-lg flex items-center justify-between gap-3 w-full max-w-full">
                <div className="flex items-center gap-3 min-w-0">
                  {attachment.type.includes('image') ? (
                    <div className="w-12 h-12 rounded bg-slate-200 border overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={attachment.url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded bg-red-100 border border-red-300 shrink-0 flex items-center justify-center text-red-700">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>รายละเอียด</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {attachment.type.includes('pdf') ? 'เอกสาร PDF' : 'ไฟล์รูปภาพ'}
                      {attachment.size ? ` • ${(attachment.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                    </p>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-700 hover:underline font-medium"
                    >
                      เปิดดูรายละเอียด ↗
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  title="ลบไฟล์แนบ"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-400 hover:border-blue-700 rounded-lg p-4 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30 w-full max-w-full"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800">
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800">
                    {isUploading ? 'กำลังอัปโหลดไฟล์...' : 'คลิกเพื่อเลือกไฟล์ PDF หรือ รูปภาพ'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    รองรับเอกสาร (.pdf) และรูปภาพ (.jpg, .png, .webp) ขนาดไม่เกิน 25MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Row 8: ระดับความสำคัญ */}
          <div className="pt-2 border-t border-slate-200 w-full max-w-full">
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              ระดับความสำคัญของภารกิจ:
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full sm:w-60 border border-slate-400 rounded-md px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-700 bg-white"
            >
              <option value="normal">ปกติ (Normal)</option>
              <option value="high">สำคัญ (High)</option>
              <option value="urgent">ด่วนที่สุด (Urgent)</option>
              <option value="low">ทั่วไป (Low)</option>
            </select>
          </div>
        </div>

        {/* Wireframe Button: "บันทึก" */}
        <div className="space-y-2 w-full max-w-full">
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="w-full py-3.5 px-6 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-950 font-bold text-lg sm:text-xl border-2 border-slate-900 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            <Save className="w-5 h-5 text-blue-900 group-hover:scale-110 transition-transform" />
            <span>{isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'บันทึก'}</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-center text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            ยกเลิกและย้อนกลับ
          </button>
        </div>
      </form>
    </div>
  );
};
