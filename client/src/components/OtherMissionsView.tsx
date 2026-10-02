import React, { useState, useMemo } from 'react';
import type { Mission } from '../types';
import { MissionCard } from './MissionCard';
import {
  formatThaiDateMedium,
  formatThaiDateShort,
  formatThaiDateFull,
  getTodayDateString,
  sortMissionsForDisplay,
  copyTextToClipboard
} from '../utils/thaiDate';
import { Calendar, Search, Filter, Plus, ArrowRight, Copy, Check } from 'lucide-react';

interface OtherMissionsViewProps {
  missions: Mission[];
  todayDateStr: string;
  now: Date;
  onEdit: (mission: Mission) => void;
  onDelete: (id: number) => void;
  onAddNewForDate: (date: string) => void;
  onCompleteEarly?: (id: number, closeTimeStr: string) => void;
  onToast?: (text: string, type?: 'success' | 'error') => void;
}

export const OtherMissionsView: React.FC<OtherMissionsViewProps> = ({
  missions,
  todayDateStr,
  now,
  onEdit,
  onDelete,
  onAddNewForDate,
  onCompleteEarly,
  onToast
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateFilterMode, setDateFilterMode] = useState<'upcoming' | 'tomorrow' | 'specific' | 'all'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');

  // Compute tomorrow date string (YYYY-MM-DD)
  const tomorrowDateStr = useMemo(() => {
    const base = todayDateStr
      ? new Date(todayDateStr + 'T00:00:00')
      : new Date(now);
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [todayDateStr, now]);

  // Group missions or filter
  const displayedMissions = useMemo(() => {
    return missions.filter((m) => {
      // Exclude or include based on mode
      if (dateFilterMode === 'tomorrow') {
        const end = m.end_date || m.start_date;
        return m.start_date <= tomorrowDateStr && end >= tomorrowDateStr;
      }
      if (dateFilterMode === 'specific' && selectedDate) {
        const end = m.end_date || m.start_date;
        return m.start_date <= selectedDate && end >= selectedDate;
      }
      if (dateFilterMode === 'upcoming') {
        return m.start_date > todayDateStr;
      }
      // 'all'
      return true;
    }).filter((m) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        m.title.toLowerCase().includes(term) ||
        m.location.toLowerCase().includes(term) ||
        (m.description || '').toLowerCase().includes(term) ||
        (m.assignee || '').toLowerCase().includes(term)
      );
    });
  }, [missions, dateFilterMode, selectedDate, todayDateStr, searchTerm]);

  // Group missions by start_date for nice chronological presentation
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Mission[]>();
    for (const m of displayedMissions) {
      const key = m.start_date;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(m);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, list]) => [date, sortMissionsForDisplay(list, now)] as [string, Mission[]]);
  }, [displayedMissions, now]);

  const [copiedDate, setCopiedDate] = useState<string | null>(null);

  // Copy full day missions text formatted for LINE
  const handleCopyDayMissions = async (dateKey: string, items: Mission[]) => {
    const dateFormatted = formatThaiDateShort(dateKey);

    // Sort items by start_time ASC
    const sortedItems = [...items].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    const cleanTime = (t?: string) => (t || '').replace(/:/g, '').trim();

    const missionBlocks = sortedItems.map((m) => {
      const s = cleanTime(m.start_time);
      const e = cleanTime(m.end_time);
      const timeStr = s && e ? `${s} - ${e}` : s ? s : 'ไม่ระบุเวลา';
      const locationStr = m.location ? `, ${m.location}` : '';
      return `${timeStr} ${m.title}${locationStr}`;
    }).join('\n\n');

    const fullText = `ภารกิจวันที่ ${dateFormatted} ครับ\n\n${missionBlocks}\n\nดูภารกิจได้ที่ https://jobcomm.onrender.com/`;

    const success = await copyTextToClipboard(fullText);
    if (success) {
      setCopiedDate(dateKey);
      onToast?.('คัดลอกข้อความสรุปภารกิจสำหรับส่ง LINE เรียบร้อยแล้ว', 'success');
      setTimeout(() => {
        setCopiedDate((curr) => (curr === dateKey ? null : curr));
      }, 2000);
    } else {
      onToast?.('ไม่สามารถคัดลอกข้อความได้', 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      {/* Mode Selector Tabs */}
      <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setDateFilterMode('upcoming')}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${
                dateFilterMode === 'upcoming'
                  ? 'bg-blue-800 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              ภารกิจล่วงหน้า
            </button>
            <button
              onClick={() => setDateFilterMode('tomorrow')}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${
                dateFilterMode === 'tomorrow'
                  ? 'bg-blue-800 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              ภารกิจพรุ่งนี้
            </button>
            <button
              onClick={() => setDateFilterMode('specific')}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${
                dateFilterMode === 'specific'
                  ? 'bg-blue-800 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              เลือกวันที่เจาะจง
            </button>
            <button
              onClick={() => setDateFilterMode('all')}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${
                dateFilterMode === 'all'
                  ? 'bg-blue-800 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              ทั้งหมด
            </button>
          </div>
        </div>

        {/* Date details banner if in 'tomorrow' mode */}
        {dateFilterMode === 'tomorrow' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-blue-800" />
                ภารกิจวันพรุ่งนี้ :
              </span>
              <span className="text-xs sm:text-sm text-blue-900 font-bold bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md shadow-2xs">
                {formatThaiDateFull(tomorrowDateStr)}
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              พบ {displayedMissions.length} ภารกิจ
            </span>
          </div>
        )}

        {/* Date picker if in 'specific' mode */}
        {dateFilterMode === 'specific' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-4 h-4 text-blue-700" />
              เลือกวันที่:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-2 border-slate-700 rounded-md px-3 py-1 text-sm bg-white font-medium"
            />
            {selectedDate && (
              <span className="text-xs text-blue-800 font-semibold">
                ({formatThaiDateMedium(selectedDate)})
              </span>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาภารกิจในวันอื่นๆ..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Grouped Mission Cards */}
      <div className="space-y-6">
        {groupedByDate.length > 0 ? (
          groupedByDate.map(([dateKey, items]) => (
            <div key={dateKey} className="space-y-3">
              {/* Date Header Badge - Deep Navy Blue with high-contrast white text */}
              <div className="sticky top-20 z-10 bg-blue-900/95 backdrop-blur-md px-3.5 py-2 rounded-lg border border-blue-950 flex items-center justify-between shadow-md">
                <span className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-200 shrink-0" />
                  {formatThaiDateShort(dateKey)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-950 bg-white px-2.5 py-0.5 rounded-full shadow-xs">
                    {items.length} ภารกิจ
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyDayMissions(dateKey, items)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer ${
                      copiedDate === dateKey
                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                        : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                    }`}
                    title="คัดลอกข้อความสรุปภารกิจของวันนี้สำหรับส่งต่อเข้า LINE"
                  >
                    {copiedDate === dateKey ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                        <span>คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-blue-200" />
                        <span>คัดลอก</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {items.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    now={now}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onCompleteEarly={onCompleteEarly}
                    onToast={onToast}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 px-4 bg-white border-2 border-dashed border-slate-300 rounded-lg">
            <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-bold text-slate-700">
              {dateFilterMode === 'tomorrow'
                ? `ยังไม่มีภารกิจในวันพรุ่งนี้ (${formatThaiDateMedium(tomorrowDateStr)})`
                : 'ไม่พบภารกิจตามช่วงวันที่เลือก'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {dateFilterMode === 'tomorrow'
                ? 'สามารถเพิ่มภารกิจล่วงหน้าสำหรับวันพรุ่งนี้ได้จากเมนู "เพิ่มภารกิจใหม่"'
                : 'สามารถตรวจสอบช่วงเวลาอื่นๆ หรือเพิ่มภารกิจใหม่ได้จากเมนู "เพิ่มภารกิจใหม่"'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
