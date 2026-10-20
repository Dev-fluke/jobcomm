import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { StaffMember } from '../types';
import { copyTextToClipboard } from '../utils/thaiDate';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Briefcase,
  Camera,
  X,
  Check,
  Copy,
  User,
  Upload,
  RefreshCw,
  Shield
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface StaffDirectoryViewProps {
  onToast?: (text: string, type?: 'success' | 'error') => void;
}

export const StaffDirectoryView: React.FC<StaffDirectoryViewProps> = ({ onToast }) => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedPhoneId, setCopiedPhoneId] = useState<number | null>(null);
  const [uploadingCardId, setUploadingCardId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [formOrderIndex, setFormOrderIndex] = useState<number>(1);
  const [formFullName, setFormFullName] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formNickname, setFormNickname] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [isModalUploading, setIsModalUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const fetchStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/staff`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setStaffList(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch staff directory:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filteredStaff = staffList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.full_name.toLowerCase().includes(term) ||
      (item.note || '').toLowerCase().includes(term) ||
      (item.nickname || '').toLowerCase().includes(term) ||
      (item.phone || '').toLowerCase().includes(term) ||
      (item.position || '').toLowerCase().includes(term) ||
      String(item.order_index).includes(term)
    );
  });

  const openAddModal = () => {
    const nextOrder =
      staffList.length > 0
        ? Math.max(...staffList.map((s) => s.order_index || 0)) + 1
        : 1;
    setEditingMember(null);
    setFormOrderIndex(nextOrder);
    setFormFullName('');
    setFormNote('');
    setFormNickname('');
    setFormPhone('');
    setFormPosition('');
    setFormImageUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (member: StaffMember) => {
    setEditingMember(member);
    setFormOrderIndex(member.order_index);
    setFormFullName(member.full_name);
    setFormNote(member.note || '');
    setFormNickname(member.nickname === '-' ? '' : member.nickname);
    setFormPhone(member.phone === '-' ? '' : member.phone);
    setFormPosition(member.position);
    setFormImageUrl(member.image_url || '');
    setIsModalOpen(true);
  };

  const uploadImageFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'อัปโหลดรูปภาพไม่สำเร็จ');
    }
    return data.url || data.data?.url || null;
  };

  const handleModalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsModalUploading(true);
      const url = await uploadImageFile(file);
      if (url) {
        setFormImageUrl(url);
        onToast?.('อัปโหลดรูปภาพเรียบร้อยแล้ว', 'success');
      }
    } catch (err: any) {
      onToast?.(err.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ', 'error');
    } finally {
      setIsModalUploading(false);
      if (modalFileInputRef.current) modalFileInputRef.current.value = '';
    }
  };

  const handleDirectCardPhotoUpload = async (member: StaffMember, file: File) => {
    try {
      setUploadingCardId(member.id);
      const url = await uploadImageFile(file);
      if (url) {
        const res = await fetch(`${API_BASE}/staff/${member.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...member,
            image_url: url
          })
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'บันทึกรูปภาพไม่สำเร็จ');
        }
        await fetchStaff();
        onToast?.(`อัปเดตรูปภาพของ "${member.full_name}" เรียบร้อยแล้ว`, 'success');
      }
    } catch (err: any) {
      onToast?.(err.message || 'เกิดข้อผิดพลาดในการอัปเดตรูปภาพ', 'error');
    } finally {
      setUploadingCardId(null);
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim()) {
      onToast?.('กรุณากรอก ยศ - ชื่อ - สกุล', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        order_index: Number(formOrderIndex) || 1,
        full_name: formFullName.trim(),
        note: formNote.trim(),
        nickname: formNickname.trim() || '-',
        phone: formPhone.trim() || '-',
        position: formPosition.trim() || '-',
        image_url: formImageUrl
      };

      const url = editingMember
        ? `${API_BASE}/staff/${editingMember.id}`
        : `${API_BASE}/staff`;
      const method = editingMember ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }

      await fetchStaff();
      setIsModalOpen(false);
      onToast?.(
        editingMember
          ? `แก้ไขข้อมูล "${payload.full_name}" เรียบร้อยแล้ว`
          : `เพิ่มข้อมูล "${payload.full_name}" เรียบร้อยแล้ว`,
        'success'
      );
    } catch (err: any) {
      onToast?.(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStaff = async (member: StaffMember) => {
    if (!confirm(`ยืนยันการลบรายชื่อ "${member.full_name}" ออกจากทำเนียบข้าราชการหรือไม่?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/staff/${member.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('ไม่สามารถลบข้อมูลได้');
      }
      await fetchStaff();
      onToast?.(`ลบข้อมูล "${member.full_name}" เรียบร้อยแล้ว`, 'success');
    } catch (err: any) {
      onToast?.(err.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
    }
  };

  const handleCopyPhone = async (member: StaffMember) => {
    if (!member.phone || member.phone === '-') return;
    const ok = await copyTextToClipboard(member.phone);
    if (ok) {
      setCopiedPhoneId(member.id);
      onToast?.(`คัดลอกเบอร์โทร ${member.phone} (${member.full_name}) แล้ว`, 'success');
      setTimeout(() => setCopiedPhoneId(null), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white rounded-xl p-5 shadow-md border border-blue-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-800/80 border border-blue-400/30 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-bold tracking-wide">
                รายชื่อข้าราชการแผนกสื่อสาร
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-950">
                ทั้งหมด {staffList.length} นาย
              </span>
            </div>
            <p className="text-xs sm:text-sm text-blue-200 mt-0.5">
              หน่วยบัญชาการอากาศโยธิน (อย.) • ทำเนียบข้อมูลและเบอร์ติดต่อข้าราชการ
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>เพิ่มข้าราชการ</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหา ยศ-ชื่อ-สกุล, ชื่อเล่น, ตำแหน่ง หรือเบอร์โทรศัพท์..."
            className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:bg-white transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-500">
          <span>แสดง {filteredStaff.length} จาก {staffList.length} รายการ</span>
          <button
            type="button"
            onClick={fetchStaff}
            disabled={isLoading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {isLoading && staffList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-8 h-8 mx-auto text-blue-700 animate-spin mb-2" />
          <p className="text-sm font-semibold text-slate-600">กำลังโหลดข้อมูลข้าราชการ...</p>
        </div>
      ) : filteredStaff.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((member) => {
            const hasPhone = member.phone && member.phone !== '-';
            const cleanTel = hasPhone ? member.phone.replace(/[^0-9+]/g, '') : '';
            const isUploadingThisCard = uploadingCardId === member.id;

            return (
              <div
                key={member.id}
                className="bg-white rounded-xl border-2 border-slate-200 hover:border-blue-800/70 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
              >
                {/* Top Card Header Bar */}
                <div>
                  <div className="bg-slate-900 text-white px-3.5 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[11px]">
                        ลำดับที่ {member.order_index}
                      </span>
                      {member.nickname && member.nickname !== '-' && (
                        <span className="px-2 py-0.5 rounded bg-blue-800 text-blue-100 font-semibold text-[11px]">
                          ชื่อเล่น: {member.nickname}
                        </span>
                      )}
                    </div>

                    {/* Edit & Delete Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(member)}
                        className="p-1 rounded hover:bg-white/15 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
                        title="แก้ไขข้อมูล"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(member)}
                        className="p-1 rounded hover:bg-white/15 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
                        title="ลบรายชื่อ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Body: Photo + Details */}
                  <div className="p-4 flex gap-4 items-start">
                    {/* Photo / Avatar Slot */}
                    <div className="relative shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        ref={(el) => {
                          cardFileInputRefs.current[member.id] = el;
                        }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleDirectCardPhotoUpload(member, file);
                            e.target.value = '';
                          }
                        }}
                        className="hidden"
                      />

                      {member.image_url ? (
                        <div className="relative w-20 h-26 sm:w-24 sm:h-30 rounded-xl overflow-hidden border-2 border-slate-300 shadow-xs bg-slate-100 group/photo">
                          <img
                            src={member.image_url}
                            alt={member.full_name}
                            onClick={() =>
                              setPreviewImage({ url: member.image_url!, name: member.full_name })
                            }
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          />
                          <button
                            type="button"
                            onClick={() => cardFileInputRefs.current[member.id]?.click()}
                            disabled={isUploadingThisCard}
                            className="absolute bottom-1 right-1 p-1.5 rounded-lg bg-slate-900/80 hover:bg-blue-800 text-white shadow-xs transition-all cursor-pointer"
                            title="เปลี่ยนรูปภาพ"
                          >
                            {isUploadingThisCard ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Camera className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => cardFileInputRefs.current[member.id]?.click()}
                          disabled={isUploadingThisCard}
                          className="w-20 h-26 sm:w-24 sm:h-30 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-600 bg-slate-50 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-blue-700 transition-all cursor-pointer p-2 text-center"
                          title="คลิกเพื่ออัปโหลดรูปภาพข้าราชการ"
                        >
                          {isUploadingThisCard ? (
                            <RefreshCw className="w-6 h-6 animate-spin text-blue-700" />
                          ) : (
                            <>
                              <div className="w-9 h-9 rounded-full bg-slate-200/80 flex items-center justify-center">
                                <User className="w-5 h-5 text-slate-500" />
                              </div>
                              <span className="text-[10px] font-semibold leading-tight flex items-center gap-0.5">
                                <Camera className="w-3 h-3 shrink-0" />
                                <span>ใส่รูปภาพ</span>
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Right Info Column */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug break-words">
                          {member.full_name}
                        </h3>
                        {member.note && (
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              member.note.includes('มาช่วยราชการ')
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {member.note}
                          </span>
                        )}
                      </div>

                      {/* Position */}
                      <div className="flex items-start gap-1.5 text-xs text-slate-700">
                        <Briefcase className="w-3.5 h-3.5 text-blue-800 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-500">ตำแหน่ง: </span>
                          <span className="font-semibold text-slate-800">{member.position || '-'}</span>
                        </div>
                      </div>

                      {/* Nickname (also shown in body for clarity) */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>ชื่อเล่น: </span>
                        <span className="font-bold text-slate-800">{member.nickname || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Phone Action Footer */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        hasPhone
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block leading-none">เบอร์โทรศัพท์</span>
                      {hasPhone ? (
                        <a
                          href={`tel:${cleanTel}`}
                          className="text-xs sm:text-sm font-bold text-blue-900 hover:underline truncate block mt-0.5"
                          title="คลิกเพื่อโทรออก"
                        >
                          {member.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium block mt-0.5">
                          ไม่ระบุเบอร์โทร (-)
                        </span>
                      )}
                    </div>
                  </div>

                  {hasPhone && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(member)}
                        className="px-2 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="คัดลอกเบอร์โทรศัพท์"
                      >
                        {copiedPhoneId === member.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">คัดลอกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>คัดลอก</span>
                          </>
                        )}
                      </button>
                      <a
                        href={`tel:${cleanTel}`}
                        className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        <span>โทร</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 px-4 bg-white border-2 border-dashed border-slate-300 rounded-xl">
          <Users className="w-12 h-12 mx-auto text-slate-400 mb-2" />
          <h3 className="text-base font-bold text-slate-700">ไม่พบรายชื่อข้าราชการที่ค้นหา</h3>
          <p className="text-xs text-slate-500 mt-1">
            ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่มข้าราชการ" ด้านบนเพื่อเพิ่มข้อมูลใหม่
          </p>
        </div>
      )}

      {/* Full Image Preview Lightbox */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
          >
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-sm truncate">{previewImage.name}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-300 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex items-center justify-center">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[70vh] w-auto rounded-lg object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-amber-400" />
                <h2 className="font-bold text-base">
                  {editingMember ? 'แก้ไขข้อมูลข้าราชการ' : 'เพิ่มข้อมูลข้าราชการใหม่'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-5 space-y-4">
              {/* Photo Upload Section */}
              <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-slate-300 bg-white flex items-center justify-center shrink-0">
                  {formImageUrl ? (
                    <img
                      src={formImageUrl}
                      alt="ตัวอย่างรูปภาพ"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-slate-300" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    รูปภาพข้าราชการ (ไม่บังคับ)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    ref={modalFileInputRef}
                    onChange={handleModalFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => modalFileInputRef.current?.click()}
                      disabled={isModalUploading}
                      className="px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isModalUploading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{formImageUrl ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ'}</span>
                    </button>
                    {formImageUrl && (
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        ลบรูป
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    รองรับไฟล์ JPG, PNG, WEBP (เก็บบนคลาวด์ถาวร)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ลำดับที่
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formOrderIndex}
                    onChange={(e) => setFormOrderIndex(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อเล่น
                  </label>
                  <input
                    type="text"
                    value={formNickname}
                    onChange={(e) => setFormNickname(e.target.value)}
                    placeholder="เช่น โอ, เล็ก, บอล (หรือเว้นว่าง)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ยศ - ชื่อ - สกุล <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="เช่น น.ต.สารัตน์ สุภาบุญ"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุ / สถานะช่วยราชการ (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="เช่น (มาช่วยราชการ) หรือ (ไปช่วยราชการ นทสส.อย.)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="เช่น 081-426-5691"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ตำแหน่ง
                  </label>
                  <input
                    type="text"
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    placeholder="เช่น นปส.ผสส.อย."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isModalUploading}
                  className="px-5 py-2 rounded-lg bg-blue-800 hover:bg-blue-900 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
