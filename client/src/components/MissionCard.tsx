import React, { useState, useRef } from 'react';
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
  Check,
  ChevronLeft
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
  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const isPointerDown = useRef(false);
  const hasMovedHorizontally = useRef(false);

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
  const canSlideToClose = !isTvMode && !!onCompleteEarly && !isCompleted;

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

  const handleCloseMission = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentNow = new Date();
    const timeStr = `${String(currentNow.getHours()).padStart(2, '0')}:${String(currentNow.getMinutes()).padStart(2, '0')}`;
    if (confirm(`ยืนยันการปิดงาน "${mission.title}" ก่อนเวลากำหนดหรือไม่?\n(ระบบจะเปลี่ยนสถานะเป็น "เสร็จสิ้น" และอัปเดตเวลาสิ้นสุดเป็น ${timeStr} น.)`)) {
      onCompleteEarly?.(mission.id, timeStr);
      setIsOpen(false);
      setOffsetX(0);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    isPointerDown.current = true;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    dragStartOffset.current = offsetX;
    hasMovedHorizontally.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    const deltaX = e.clientX - dragStartX.current;
    const deltaY = e.clientY - dragStartY.current;

    if (!hasMovedHorizontally.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 6) {
        isPointerDown.current = false;
        setIsDragging(false);
        return;
      }
      if (Math.abs(deltaX) > 6) {
        hasMovedHorizontally.current = true;
        setIsDragging(true);
      }
    }

    if (hasMovedHorizontally.current) {
      let newOffset = dragStartOffset.current + deltaX;
      if (newOffset > 0) newOffset = newOffset * 0.15;
      if (newOffset < -130) newOffset = -130;
      setOffsetX(newOffset);
    }
  };

  const handlePointerUp = () => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    setIsDragging(false);

    if (hasMovedHorizontally.current) {
      if (offsetX < -45) {
        setOffsetX(-108);
        setIsOpen(true);
      } else {
        setOffsetX(0);
        setIsOpen(false);
      }
    }
  };

  const handlePointerCancel = () => {
    isPointerDown.current = false;
    setIsDragging(false);
    if (offsetX < -45) {
      setOffsetX(-108);
      setIsOpen(true);
    } else {
      setOffsetX(0);
      setIsOpen(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isOpen) {
      const target = e.target as HTMLElement;
      if (!target.closest('button') && !target.closest('a')) {
        setIsOpen(false);
        setOffsetX(0);
      }
    }
  };

  const handleToggleSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      setOffsetX(0);
    } else {
      setIsOpen(true);
      setOffsetX(-108);
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
    <div className="relative overflow-hidden rounded-lg group select-none h-full">
      {/* Background Slide Action (เปิดออกเมื่อสไลด์การ์ดไปทางซ้าย) */}
      {canSlideToClose && (
        <div className="absolute inset-y-0 right-0 flex items-stretch z-0">
          <button
            type="button"
            onClick={handleCloseMission}
            className="w-28 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex flex-col items-center justify-center gap-1 font-bold transition-colors select-none shadow-inner p-2 cursor-pointer focus:outline-none"
            title="คลิกเพื่อปิดงาน (เสร็จสิ้นก่อนเวลา พร้อมบันทึกเวลาปัจจุบัน)"
          >
            <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse text-white drop-shadow" />
            <span className="text-xs sm:text-sm font-bold tracking-wide">ปิดงาน</span>
            <span className="text-[10px] text-emerald-100 font-normal">กดเพื่อจบงาน</span>
          </button>
        </div>
      )}

      {/* Foreground Card */}
      <div
        style={{
          transform: canSlideToClose ? `translateX(${offsetX}px)` : 'none',
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
          touchAction: canSlideToClose ? 'pan-y' : 'auto',
          cursor: canSlideToClose ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
        onPointerDown={canSlideToClose ? handlePointerDown : undefined}
        onPointerMove={canSlideToClose ? handlePointerMove : undefined}
        onPointerUp={canSlideToClose ? handlePointerUp : undefined}
        onPointerCancel={canSlideToClose ? handlePointerCancel : undefined}
        onClick={handleCardClick}
        className={`relative z-10 bg-white border-2 transition-shadow rounded-lg overflow-hidden flex flex-col h-full ${
          isCompleted
            ? 'border-slate-300 bg-slate-50/70 opacity-75'
            : isOngoing
            ? 'border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
            : mission.priority === 'urgent'
            ? 'border-red-500 shadow-sm ring-1 ring-red-200'
            : 'border-slate-800 shadow-xs hover:shadow-md'
        } ${isTvMode ? 'p-6 text-base' : 'p-4 sm:p-5 text-sm'}`}
      >
        {/* Top Row: Countdown / Status (Left/Right) + Action buttons */}
        <div className="flex items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block px-2.5 py-1 rounded-md border text-xs sm:text-sm font-semibold tracking-wide ${getBadgeStyle()} ${
                isTvMode ? 'text-base px-4 py-2' : ''
              }`}
            >
              {countdown.text}
            </span>

            {/* Urgent priority badge */}
            {mission.priority === 'urgent' && !isCompleted && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                <AlertTriangle className="w-3 h-3" /> ด่วนที่สุด
              </span>
            )}
          </div>

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

      {/* เส้นคั่น HR */}
      <hr className="border-slate-200 my-2" />

      {/* Body Rows: เริ่มจาก ภารกิจ (บรรทัดแรก) ต่อด้วย เวลา (บรรทัดถัดมา) */}
      <div className={`space-y-2 text-slate-700 flex-1 flex flex-col ${isTvMode ? 'space-y-3.5' : ''}`}>
        {/* Row 1 ใต้ HR: ภารกิจ : (อบรม : ...) */}
        <div className="flex items-start gap-2">
          <span
            className={`font-bold shrink-0 ${
              isTvMode ? 'text-lg text-blue-950' : 'text-sm sm:text-base text-slate-900'
            }`}
          >
            {mission.category ? `${mission.category} :` : 'ภารกิจ :'}
          </span>
          <span
            className={`font-bold break-words text-slate-900 ${
              isCompleted ? 'line-through text-slate-500' : ''
            } ${isTvMode ? 'text-lg text-slate-950' : 'text-sm sm:text-base'}`}
          >
            {mission.title || '-'}
          </span>
        </div>

        {/* Row 2 ใต้ HR: เวลา : (ต่อบรรทัดถัดมาใต้ภารกิจ) */}
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
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 mt-auto pr-14">
            <a
              href={mission.attachment_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-2xs hover:shadow-xs group"
              title="คลิกเพื่อเปิดดูรายละเอียดไฟล์แนบ"
            >
              <FileText className="w-4 h-4 text-blue-700 shrink-0 group-hover:scale-110 transition-transform" />
              <span>รายละเอียด</span>
              <span className="text-blue-500 text-xs">↗</span>
            </a>
          </div>
        )}
      </div>

      {/* สัญลักษณ์ "<<<" ที่มุมขวาล่างของ card สำหรับสไลด์ปิดงาน */}
      {canSlideToClose && (
        <button
          type="button"
          onClick={handleToggleSlide}
          className={`absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded transition-all cursor-pointer flex items-center justify-center select-none z-20 ${
            isOpen
              ? 'text-slate-600 bg-slate-200/90 hover:bg-slate-300 font-bold shadow-2xs'
              : isOngoing
              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-300/80 font-black shadow-2xs animate-pulse hover:scale-105'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 font-bold'
          }`}
          title={isOpen ? 'คลิกเพื่อหุบการ์ดกลับ' : 'คลิกหรือสไลด์การ์ดไปทางซ้ายเพื่อปิดงาน'}
          aria-label="สไลด์การ์ดเพื่อปิดงาน"
        >
          <span className="text-xs sm:text-sm font-black tracking-tighter">
            {isOpen ? '>>>' : '<<<'}
          </span>
        </button>
      )}
    </div>
  </div>
);
};
