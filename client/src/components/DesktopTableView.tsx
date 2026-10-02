import React, { useState } from 'react';
import type { Mission } from '../types';
import {
  formatThaiDateMedium,
  formatThaiDateShort,
  formatThaiDateFull,
  getAutomaticMissionStatus,
  formatMissionForLine,
  copyTextToClipboard
} from '../utils/thaiDate';
import {
  Download,
  Search,
  Trash2,
  Edit2,
  Calendar,
  Lock,
  AlertTriangle,
  X,
  ShieldAlert,
  FileText,
  CheckCircle2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface DesktopTableViewProps {
  missions: Mission[];
  todayDateStr: string;
  onEdit: (mission: Mission) => void;
  onDelete: (id: number) => void;
  onRefresh?: () => void;
  onCompleteEarly?: (id: number, closeTimeStr: string) => void;
  onToast?: (text: string, type?: 'success' | 'error') => void;
}

const TableSlideCloseButton: React.FC<{
  missionTitle: string;
  onConfirmClose: () => void;
}> = ({ missionTitle, onConfirmClose }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded px-1.5 py-0.5 animate-in slide-in-from-right-1 duration-150">
        <button
          type="button"
          onClick={onConfirmClose}
          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
          title={`ยืนยันปิดงาน "${missionTitle}"`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>กดปิดงาน</span>
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-0.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 cursor-pointer"
          title="ยกเลิก / หุบกลับ"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
      title="สไลด์/คลิกเพื่อเปิดปุ่มปิดงาน"
    >
      <ChevronLeft className="w-3 h-3 text-emerald-600 animate-pulse" />
      <span>สไลด์ปิดงาน</span>
    </button>
  );
};

export const DesktopTableView: React.FC<DesktopTableViewProps> = ({
  missions,
  todayDateStr,
  onEdit,
  onDelete,
  onRefresh,
  onCompleteEarly,
  onToast
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Monthly Bulk Delete Modal state
  const [isDeleteMonthModalOpen, setIsDeleteMonthModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => todayDateStr.slice(0, 7)); // YYYY-MM
  const [passwordInput, setPasswordInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered missions for table display (Support Category, Status, Date Range, Search)
  const filtered = missions.filter((m) => {
    if (filterCategory !== 'all' && m.category !== filterCategory) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    if (startDate && m.end_date < startDate) return false;
    if (endDate && m.start_date > endDate) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        m.title.toLowerCase().includes(term) ||
        m.location.toLowerCase().includes(term) ||
        (m.description || '').toLowerCase().includes(term) ||
        (m.assignee || '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ลำดับ', 'ภารกิจ', 'ประเภท', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'เวลา', 'สถานที่', 'รายละเอียด', 'ผู้รับผิดชอบ', 'สถานะ'];
    const rows = filtered.map((m, idx) => {
      const autoStatus = getAutomaticMissionStatus(m);
      const statusText = autoStatus === 'completed' ? 'เสร็จสิ้น' : autoStatus === 'in_progress' ? 'กำลังทำ' : 'รอดำเนินการ';
      return [
        idx + 1,
        `"${m.title.replace(/"/g, '""')}"`,
        `"${m.category}"`,
        m.start_date,
        m.end_date,
        `"${m.start_time} - ${m.end_time}"`,
        `"${m.location.replace(/"/g, '""')}"`,
        `"${(m.description || '').replace(/"/g, '""')}"`,
        `"${(m.assignee || '').replace(/"/g, '""')}"`,
        statusText
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateSuffix = startDate && endDate ? `${startDate}_ถึง_${endDate}` : startDate ? `ตั้งแต่_${startDate}` : endDate ? `ถึง_${endDate}` : todayDateStr;
    link.download = `รายงานภารกิจ_แผนกสื่อสาร_อย_${dateSuffix}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Count missions in selected month
  const missionsInSelectedMonth = missions.filter((m) => m.start_date.startsWith(selectedMonth));

  // Handle monthly bulk delete with password check: 26366
  const handleConfirmMonthlyDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteSuccess('');

    // Security password check
    if (passwordInput !== '26366') {
      setDeleteError('รหัสผ่านไม่ถูกต้อง! กรุณากรอกรหัสผ่าน 26366');
      return;
    }

    if (!selectedMonth) {
      setDeleteError('กรุณาเลือกเดือนที่ต้องการลบ');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/missions/delete-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          password: passwordInput
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถลบข้อมูลประจำเดือนได้');
      }

      setDeleteSuccess(data.message || `ลบข้อมูลเรียบร้อยแล้ว (${data.count || 0} รายการ)`);
      setPasswordInput('');
      onRefresh?.();

      setTimeout(() => {
        setIsDeleteMonthModalOpen(false);
        setDeleteSuccess('');
      }, 1500);
    } catch (err: any) {
      setDeleteError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5 print:p-0">
      {/* Top Action & Management Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            ตารางสรุป / ส่งออกรายงาน
          </h2>
        </div>

        {/* Buttons: Removed Add Mission and Print Report, added Monthly Delete (Password: 26366) and CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV / Excel Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            title="ดาวน์โหลดข้อมูลเป็นไฟล์ Excel/CSV"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออก Excel/CSV</span>
          </button>

          {/* Delete Missions by Month Button (Secured with password: 26366) */}
          <button
            onClick={() => {
              setIsDeleteMonthModalOpen(true);
              setPasswordInput('');
              setDeleteError('');
              setDeleteSuccess('');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            title="ลบข้อมูลภารกิจทั้งหมดในเดือนที่เลือก (ต้องใช้รหัสผ่าน 26366)"
          >
            <Trash2 className="w-4 h-4" />
            <span>ลบภารกิจแบบรายเดือน</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between print:hidden bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาตามชื่อ, สถานที่, หรือผู้รับผิดชอบ..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        {/* Date Range Selector: เลือกวันที่ ถึง วันที่นี้ */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
          <Calendar className="w-4 h-4 text-blue-700 shrink-0" />
          <span className="text-xs font-semibold text-slate-600">วันที่:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-800 font-medium focus:outline-none focus:border-blue-600"
            title="เลือกวันที่เริ่มต้น"
          />
          <span className="text-xs font-semibold text-slate-500">ถึง</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-800 font-medium focus:outline-none focus:border-blue-600"
            title="เลือกวันที่สิ้นสุด"
          />
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors"
              title="ล้างการเลือกวันที่"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category & Status Dropdowns */}
        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="all">หมวดหมู่ทั้งหมด</option>
            <option value="ประชุม">ประชุม</option>
            <option value="ซ่อมบำรุง">ซ่อมบำรุง</option>
            <option value="ตรวจเช็คระบบ">ตรวจเช็คระบบ</option>
            <option value="วางสายสัญญาณ">วางสายสัญญาณ</option>
            <option value="วิทยุสื่อสาร">วิทยุสื่อสาร</option>
            <option value="ภารกิจพิเศษ">ภารกิจพิเศษ</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="completed">เสร็จสิ้น</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase font-semibold">
              <tr>
                <th className="px-3 py-3 w-12 text-center">ลำดับ</th>
                <th className="px-4 py-3">ภารกิจ</th>
                <th className="px-3 py-3">ประเภท</th>
                <th className="px-3 py-3">วันที่ / เวลา</th>
                <th className="px-4 py-3">สถานที่</th>
                <th className="px-4 py-3">รายละเอียด</th>
                <th className="px-3 py-3">ผู้รับผิดชอบ</th>
                <th className="px-3 py-3 text-center">ไฟล์แนบ</th>
                <th className="px-3 py-3 text-center">สถานะ</th>
                <th className="px-3 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length > 0 ? (
                filtered.map((m, index) => {
                  const autoStatus = getAutomaticMissionStatus(m);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 text-center font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {m.title}
                        {m.priority === 'urgent' && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 font-bold rounded">
                            ด่วน
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs font-medium">
                          {m.category || 'ทั่วไป'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                        <div className="font-medium">{formatThaiDateShort(m.start_date)}</div>
                        <div className="text-xs text-slate-500">
                          {m.start_time ? `${m.start_time} - ${m.end_time || ''} น.` : 'ไม่ระบุเวลา'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">{m.location}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={m.description}>
                        {m.description || '-'}
                      </td>
                      <td className="px-3 py-3 text-slate-700">{m.assignee || '-'}</td>
                      <td className="px-3 py-3 text-center">
                        {m.attachment_url ? (
                          <a
                            href={m.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded text-xs font-semibold hover:underline"
                            title="คลิกเพื่อเปิดดูรายละเอียดไฟล์แนบ"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                            <span>รายละเอียด</span>
                            <span className="text-blue-500 text-2xs">↗</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            autoStatus === 'completed'
                              ? 'bg-slate-100 text-slate-700'
                              : autoStatus === 'in_progress'
                              ? 'bg-emerald-100 text-emerald-800 animate-pulse font-bold'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {autoStatus === 'completed'
                            ? 'เสร็จสิ้น'
                            : autoStatus === 'in_progress'
                            ? 'กำลังทำ'
                            : 'รอดำเนินการ'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {autoStatus === 'in_progress' && onCompleteEarly && (
                            <TableSlideCloseButton
                              missionTitle={m.title}
                              onConfirmClose={() => {
                                const currentNow = new Date();
                                const timeStr = `${String(currentNow.getHours()).padStart(2, '0')}:${String(currentNow.getMinutes()).padStart(2, '0')}`;
                                if (confirm(`ยืนยันการปิดงาน "${m.title}" ก่อนเวลากำหนดหรือไม่?\n(ระบบจะเปลี่ยนสถานะเป็น "เสร็จสิ้น" และอัปเดตเวลาสิ้นสุดเป็น ${timeStr} น.)`)) {
                                  onCompleteEarly(m.id, timeStr);
                                }
                              }}
                            />
                          )}
                          <button
                            onClick={async () => {
                              const lineText = formatMissionForLine(m, new Date());
                              const success = await copyTextToClipboard(lineText);
                              if (success) {
                                setCopiedId(m.id);
                                onToast?.(`คัดลอกข้อมูล "${m.title}" สำหรับส่ง Line เรียบร้อยแล้ว 📋`, 'success');
                                setTimeout(() => setCopiedId(null), 2000);
                              } else {
                                onToast?.('ไม่สามารถคัดลอกข้อความได้', 'error');
                              }
                            }}
                            className={`p-1 rounded transition-colors ${
                              copiedId === m.id
                                ? 'bg-emerald-100 text-emerald-700 font-bold'
                                : 'hover:bg-emerald-50 text-slate-500 hover:text-emerald-700'
                            }`}
                            title="คัดลอกข้อความสำหรับส่ง Line"
                          >
                            {copiedId === m.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => onEdit(m)}
                            className="p-1 hover:bg-slate-100 rounded text-blue-700"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`ต้องการลบ "${m.title}" หรือไม่?`)) {
                                onDelete(m.id);
                              }
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-red-600"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-400">
                    ไม่พบข้อมูลภารกิจตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ลบภารกิจแบบรายเดือน (รักษาความปลอดภัยด้วยรหัสผ่าน 26366) */}
      {isDeleteMonthModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-300 animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-900 via-red-800 to-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base sm:text-lg">
                  ลบภารกิจแบบรายเดือน
                </h3>
              </div>
              <button
                onClick={() => setIsDeleteMonthModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmMonthlyDelete} className="p-5 space-y-4">
              {/* Warning Notice */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800 leading-relaxed">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">คำเตือนสำคัญ:</span>
                  การลบข้อมูลแบบรายเดือนจะลบภารกิจทั้งหมดในเดือนที่เลือกออกจากระบบอย่างถาวร ไม่สามารถกู้คืนได้
                </div>
              </div>

              {deleteError && (
                <div className="p-2.5 bg-red-100 border border-red-400 text-red-700 text-xs font-semibold rounded-md">
                  {deleteError}
                </div>
              )}

              {deleteSuccess && (
                <div className="p-2.5 bg-emerald-100 border border-emerald-400 text-emerald-800 text-xs font-semibold rounded-md">
                  {deleteSuccess}
                </div>
              )}

              {/* Month Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-800" />
                  เลือกเดือนและปีที่ต้องการลบ:
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full border-2 border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white font-semibold focus:outline-none focus:border-red-600"
                  required
                />
                <div className="mt-1 text-xs text-slate-600 flex items-center justify-between">
                  <span>จำนวนภารกิจในเดือนนี้:</span>
                  <span className="font-bold text-red-700">
                    {missionsInSelectedMonth.length} รายการ
                  </span>
                </div>
              </div>

              {/* Security Password Input (26366) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-red-700" />
                  ใส่รหัสผ่านยืนยันความปลอดภัย:
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="กรุณากรอกรหัสผ่าน 5 หลัก"
                  className="w-full border-2 border-red-500 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400/40 bg-white"
                  required
                  autoFocus
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  * กำหนดเฉพาะผู้มีสิทธิ์ลบข้อมูลเท่านั้น
                </span>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteMonthModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || !passwordInput || missionsInSelectedMonth.length === 0}
                  className="px-5 py-2 text-xs font-bold bg-red-700 hover:bg-red-800 active:bg-red-900 disabled:opacity-50 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'กำลังลบข้อมูล...' : 'ยืนยันการลบ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
