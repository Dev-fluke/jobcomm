import React, { useState, useMemo } from 'react';
import type { Mission } from '../types';
import { MissionCard } from './MissionCard';
import { formatThaiDateMedium, formatThaiDateShort, getTodayDateString, sortMissionsForDisplay } from '../utils/thaiDate';
import { Calendar, Search, Filter, Plus, ArrowRight } from 'lucide-react';

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
  const [dateFilterMode, setDateFilterMode] = useState<'upcoming' | 'past' | 'specific' | 'all'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');

  // Group missions or filter
  const displayedMissions = useMemo(() => {
    return missions.filter((m) => {
      // Exclude or include based on mode
      if (dateFilterMode === 'specific' && selectedDate) {
        return m.start_date <= selectedDate && m.end_date >= selectedDate;
      }
      if (dateFilterMode === 'upcoming') {
        return m.start_date > todayDateStr;
      }
      if (dateFilterMode === 'past') {
        return m.end_date < todayDateStr;
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
              ภารกิจล่วงหน้า (Upcoming)
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
              onClick={() => setDateFilterMode('past')}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${
                dateFilterMode === 'past'
                  ? 'bg-blue-800 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              ประวัติภารกิจที่ผ่านมา
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

          <button
            onClick={() => onAddNewForDate(selectedDate || todayDateStr)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มภารกิจล่วงหน้า</span>
          </button>
        </div>

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
              {/* Date Header Badge */}
              <div className="sticky top-20 z-10 bg-slate-200/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-300 flex items-center justify-between shadow-xs">
                <span className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-900" />
                  ภารกิจประจำวันที่ {formatThaiDateMedium(dateKey)}
                </span>
                <span className="text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-300">
                  {items.length} ภารกิจ
                </span>
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
              ไม่พบภารกิจตามช่วงวันที่เลือก
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              สามารถกดปุ่ม "เพิ่มภารกิจล่วงหน้า" เพื่อบันทึกกำหนดการงานในอนาคตได้ทันที
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
