import React, { useState } from 'react';
import type { Mission } from '../types';
import {
  getMissionCountdown,
  formatThaiDateShort,
  getAutomaticMissionStatus,
  formatMissionForLine,
  copyTextToClipboard
} from '../utils/thaiDate';
import {
  Clock,
  MapPin,
  FileText,
  User,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';

interface MissionCardProps {
  mission: Mission;
  now: Date;
  onEdit?: (mission: Mission) => void;
  onDelete?: (id: number) => void;
  onCompleteEarly?: (id: number, closeTimeStr: string) => void;
  onToast?: (text: string, type?: 'success' | 'error') => void;
  isTvMode?: boolean;
}

export const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  now,
  onEdit,
  onDelete,
  onCompleteEarly,
  onToast,
  isTvMode = false
}) => {
  const [isCopied, setIsCopied] = useState(false);
  // Automatic time-based countdown and status
  const countdown = getMissionCountdown(
    mission.start_date,
    mission.end_date,
    mission.start_time,
    mission.end_time,
    mission.status,
    now
  );

  const autoStatus = getAutomaticMissionStatus(mission, now);
  const isCompleted = autoStatus === 'completed';
  const isOngoing = autoStatus === 'in_progress';

  // Status badge styling matching military wireframe aesthetic
  const getBadgeStyle = () => {
    if (isCompleted) {
      return 'bg-slate-100 text-slate-600 border-slate-300';
    }
    if (isOngoing) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold animate-pulse';
    }
    if (countdown.state === 'upcoming') {
      if (countdown.minutesLeft !== undefined && countdown.minutesLeft <= 60) {
        return 'bg-amber-100 text-amber-900 border-amber-400 font-bold';
      }
      return 'bg-blue-50 text-blue-900 border-blue-300 font-medium';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const handleCloseMission = () => {
    const currentNow = new Date();
    const timeStr = `${String(currentNow.getHours()).padStart(2, '0')}:${String(currentNow.getMinutes()).padStart(2, '0')}`;
    if (confirm(`ยืนยันการปิดงาน "${mission.title}" ก่อนเวลากำหนดหรือไม่?\n(ระบบจะเปลี่ยนสถานะเป็น "เสร็จสิ้น" และอัปเดตเวลาสิ้นสุดเป็น ${timeStr} น.)`)) {
      onCompleteEarly?.(mission.id, timeStr);
    }
  };

  const handleCopyForLine = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const lineText = formatMissionForLine(mission, now);
    const success = await copyTextToClipboard(lineText);
    if (success) {
      setIsCopied(true);
      onToast?.(`คัดลอกข้อมูล "${mission.title}" สำหรับส่ง Line เรียบร้อยแล้ว 📋`, 'success');
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } else {
      onToast?.('ไม่สามารถคัดลอกข้อความได้', 'error');
    }
  };

  return (
    <div
      className={`relative bg-white border-2 transition-all rounded-lg overflow-hidden flex flex-col h-full ${
        isCompleted
          ? 'border-slate-300 bg-slate-50/70 opacity-75'
          : isOngoing
          ? 'border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
          : mission.priority === 'urgent'
          ? 'border-red-500 shadow-sm ring-1 ring-red-200'
          : 'border-slate-800 shadow-xs hover:shadow-md'
      } ${isTvMode ? 'p-6 text-base' : 'p-4 sm:p-5 text-sm'}`}
    >
      {/* Top Row: Mission Title (Left) + Countdown / Status (Right) - Faithful to wireframe */}
      <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-200">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline flex-wrap gap-1.5">
            <span
              className={`font-bold shrink-0 ${
                isTvMode ? 'text-xl text-blue-950' : 'text-base sm:text-lg text-slate-900'
              }`}
            >
              {mission.category ? `${mission.category} :` : 'ภารกิจ :'}
            </span>
            <span
              className={`font-bold break-words text-slate-900 ${
                isCompleted ? 'line-through text-slate-500' : ''
              } ${isTvMode ? 'text-xl text-slate-950' : 'text-base sm:text-lg'}`}
            >
              {mission.title || '-'}
            </span>
          </div>

          {/* Urgent priority badge */}
          {mission.priority === 'urgent' && !isCompleted && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded mt-1">
              <AlertTriangle className="w-3 h-3" /> ด่วนที่สุด
            </span>
          )}
        </div>

        {/* Wireframe top-right label: "ในอีก ... ชม." / "กำลังดำเนินการ" / "เสร็จสิ้นแล้ว" */}
        <div className="shrink-0 text-right flex items-center gap-2">
          {/* ปุ่มปิดงาน: แสดงเมื่อสถานะคือกำลังดำเนินการ และไม่ใช่โหมดทีวี */}
          {isOngoing && !isTvMode && onCompleteEarly && (
            <button
              type="button"
              onClick={handleCloseMission}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-md text-xs sm:text-sm font-bold shadow-xs transition-all hover:scale-105"
              title="คลิกเพื่อปิดงาน (เสร็จสิ้นก่อนเวลา พร้อมบันทึกเวลาปัจจุบัน)"
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>ปิดงาน</span>
            </button>
          )}

          <span
            className={`inline-block px-2.5 py-1 rounded-md border text-xs sm:text-sm font-semibold tracking-wide ${getBadgeStyle()} ${
              isTvMode ? 'text-base px-4 py-2' : ''
            }`}
          >
            {countdown.text}
          </span>

          {/* Discreet Copy / Edit / Delete icons (hidden in TV mode) */}
          {!isTvMode && (
            <div className="flex items-center gap-1 print:hidden">
              <button
                type="button"
                onClick={handleCopyForLine}
                className={`p-1.5 rounded transition-all flex items-center gap-1 ${
                  isCopied
                    ? 'bg-emerald-100 text-emerald-700 font-bold'
                    : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
                title="คัดลอกข้อความสำหรับส่ง Line"
                aria-label="คัดลอกข้อความสำหรับส่ง Line"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in" />
                    <span className="text-[10px] text-emerald-700 font-semibold hidden sm:inline">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {onEdit && (
                <button
                  onClick={() => onEdit(mission)}
                  className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded transition-colors"
                  title="แก้ไขภารกิจ"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm(`ต้องการลบภารกิจ "${mission.title}" หรือไม่?`)) {
                      onDelete(mission.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-slate-100 rounded transition-colors"
                  title="ลบภารกิจ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body Rows faithfully matching wireframe layout */}
      <div className={`mt-3 space-y-2 text-slate-700 flex-1 flex flex-col ${isTvMode ? 'space-y-3.5' : ''}`}>
        {/* Row 2: เวลา : */}
        <div className="flex items-start gap-2">
          <span className="font-bold text-slate-900 shrink-0 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-900 shrink-0" />
            เวลา :
          </span>
          <span className="font-medium text-slate-800">
            {mission.start_time ? (
              <>
                {mission.start_time} {mission.end_time ? `- ${mission.end_time} น.` : 'น.'}
              </>
            ) : (
              'ไม่ระบุเวลา'
            )}
            {/* Show date if different day */}
            {mission.start_date && (
              <span className="ml-2 text-xs text-slate-500 font-normal">
                ({formatThaiDateShort(mission.start_date)})
              </span>
            )}
          </span>
        </div>

        {/* Row 3: สถานที่ : */}
        <div className="flex items-start gap-2">
          <span className="font-bold text-slate-900 shrink-0 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-red-700 shrink-0" />
            สถานที่ :
          </span>
          <span className="font-medium text-slate-800">{mission.location || '-'}</span>
        </div>

        {/* Row 4: รายละเอียด : (แสดงเสมอตาม Wireframe ไม่ให้หายไป แม้ไม่ได้กรอกจะแสดงขีด - หรือชื่อเอกสารแนบ) */}
        <div className="flex items-start gap-2 pt-0.5">
          <span className="font-bold text-slate-900 shrink-0 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-600 shrink-0" />
            รายละเอียด :
          </span>
          <p className="text-slate-700 font-normal leading-relaxed whitespace-pre-line flex-1">
            {mission.description?.trim()
              ? mission.description
              : mission.attachment_name
              ? `แนบเอกสาร: ${mission.attachment_name}`
              : '-'}
          </p>
        </div>

        {/* Optional Row 5: ผู้รับผิดชอบ (if present) */}
        {mission.assignee && (
          <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 pt-0.5">
            <span className="font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-700" />
              ผู้รับผิดชอบ :
            </span>
            <span className="text-slate-800">{mission.assignee}</span>
          </div>
        )}

        {/* Attachment (PDF or Image) */}
        {mission.attachment_url && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 mt-auto">
            {mission.attachment_type?.includes('image') ? (
              <a
                href={mission.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-300 rounded-lg text-xs font-semibold text-blue-800 transition-colors group"
                title="คลิกเพื่อดูรูปภาพขนาดเต็ม"
              >
                <img
                  src={mission.attachment_url}
                  alt={mission.attachment_name || 'ภาพแนบ'}
                  className="w-8 h-8 rounded object-cover border border-slate-300 group-hover:scale-105 transition-transform"
                />
                <span className="truncate max-w-[200px]">{mission.attachment_name || 'ดูรูปภาพแนบ'} ↗</span>
              </a>
            ) : (
              <a
                href={mission.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                title="คลิกเพื่อเปิดเอกสาร PDF"
              >
                <FileText className="w-4 h-4 text-red-700" />
                <span className="truncate max-w-[220px]">{mission.attachment_name || 'เปิดดูเอกสาร PDF'} ↗</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
