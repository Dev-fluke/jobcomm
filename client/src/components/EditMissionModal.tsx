import React, { useState, useEffect } from 'react';
import type { Mission } from '../types';
import { X, Save } from 'lucide-react';

interface EditMissionModalProps {
  mission: Mission | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: Partial<Mission>) => Promise<boolean>;
}

export const EditMissionModal: React.FC<EditMissionModalProps> = ({
  mission,
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen || !mission) return null;

  const [title, setTitle] = useState(mission.title);
  const [category, setCategory] = useState(mission.category || 'ทั่วไป');
  const [startDate, setStartDate] = useState(mission.start_date);
  const [endDate, setEndDate] = useState(mission.end_date);
  const [startTime, setStartTime] = useState(mission.start_time || '');
  const [endTime, setEndTime] = useState(mission.end_time || '');
  const [location, setLocation] = useState(mission.location);
  const [description, setDescription] = useState(mission.description || '');
  const [assignee, setAssignee] = useState(mission.assignee || '');
  const [status, setStatus] = useState(mission.status);
  const [priority, setPriority] = useState(mission.priority);
  const [attachmentUrl, setAttachmentUrl] = useState(mission.attachment_url || '');
  const [attachmentName, setAttachmentName] = useState(mission.attachment_name || '');
  const [attachmentType, setAttachmentType] = useState(mission.attachment_type || '');
  const [isUploading, setIsUploading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mission) {
      setTitle(mission.title);
      setCategory(mission.category || 'ทั่วไป');
      setStartDate(mission.start_date);
      setEndDate(mission.end_date);
      setStartTime(mission.start_time || '');
      setEndTime(mission.end_time || '');
      setLocation(mission.location);
      setDescription(mission.description || '');
      setAssignee(mission.assignee || '');
      setStatus(mission.status);
      setPriority(mission.priority);
      setAttachmentUrl(mission.attachment_url || '');
      setAttachmentName(mission.attachment_name || '');
      setAttachmentType(mission.attachment_type || '');
    }
  }, [mission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onSave(mission.id, {
      title,
      category,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      location,
      description,
      assignee,
      status,
      priority,
      attachment_url: attachmentUrl || undefined,
      attachment_name: attachmentName || undefined,
      attachment_type: attachmentType || undefined
    });
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-300">
        <div className="bg-gradient-to-r from-blue-950 to-blue-900 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-base">แก้ไขข้อมูลภารกิจ</h3>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ภารกิจ :
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="ประเภท"
                className="w-28 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800"
              />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 border border-slate-300 rounded-md px-3 py-1.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วันที่เริ่ม :
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ถึงวันที่ :
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เวลาเริ่ม :
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เวลาสิ้นสุด :
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              สถานที่ :
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              รายละเอียด :
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ผู้รับผิดชอบ :
              </label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                สถานะ :
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 bg-white"
              >
                <option value="pending">รอดำเนินการ</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ไฟล์แนบ (PDF หรือ รูปภาพ):
            </label>
            {attachmentUrl ? (
              <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-300 rounded-md text-xs">
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 font-semibold truncate hover:underline"
                >
                  {attachmentName || 'ดูไฟล์แนบ'} ↗
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentUrl('');
                    setAttachmentName('');
                    setAttachmentType('');
                  }}
                  className="text-red-600 hover:text-red-800 text-xs font-semibold ml-2"
                >
                  ลบไฟล์
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append('file', file);
                  setIsUploading(true);
                  try {
                    const res = await fetch('/api/upload', {
                      method: 'POST',
                      body: formData
                    });
                    const d = await res.json();
                    if (d.success) {
                      setAttachmentUrl(d.url);
                      setAttachmentName(d.name);
                      setAttachmentType(d.type);
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsUploading(false);
                  }
                }}
                className="w-full text-xs text-slate-600 border border-slate-300 rounded-md p-1.5 bg-slate-50"
              />
            )}
            {isUploading && <p className="text-[10px] text-blue-600 mt-1">กำลังอัปโหลดไฟล์...</p>}
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-blue-800 hover:bg-blue-900 text-white rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการแก้ไข</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
