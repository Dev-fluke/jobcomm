import React, { useState } from 'react';
import type { Mission } from '../types';
import { MissionCard } from './MissionCard';
import { formatThaiDateFull, getAutomaticMissionStatus, sortMissionsForDisplay } from '../utils/thaiDate';
import { PlusCircle, Search, Clock } from 'lucide-react';

interface TodayMissionsViewProps {
  missions: Mission[];
  todayDateStr: string;
  now: Date;
  onEdit: (mission: Mission) => void;
  onDelete: (id: number) => void;
  onAddNew: () => void;
  onCompleteEarly?: (id: number, closeTimeStr: string) => void;
  onToast?: (text: string, type?: 'success' | 'error') => void;
}

export const TodayMissionsView: React.FC<TodayMissionsViewProps> = ({
  missions,
  todayDateStr,
  now,
  onEdit,
  onDelete,
  onAddNew,
  onCompleteEarly,
  onToast
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('current');
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate automatic status for each mission based on current time
  const missionsWithAutoStatus = missions.map((m) => ({
    ...m,
    autoStatus: getAutomaticMissionStatus(m, now)
  }));

  // Filter missions
  const filteredMissions = missionsWithAutoStatus.filter((m) => {
    // Status filter: 'current' hides completed missions
    if (filterStatus === 'current') {
      if (m.autoStatus === 'completed') return false;
    } else if (filterStatus !== 'all' && m.autoStatus !== filterStatus) {
      return false;
    }
    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(term);
      const matchLoc = m.location.toLowerCase().includes(term);
      const matchDesc = (m.description || '').toLowerCase().includes(term);
      const matchAssignee = (m.assignee || '').toLowerCase().includes(term);
      return matchTitle || matchLoc || matchDesc || matchAssignee;
    }
    return true;
  });

  // Always move completed missions to the very bottom
  const sortedMissions = sortMissionsForDisplay(filteredMissions, now);

  const fullThaiDate = formatThaiDateFull(todayDateStr);

  // Stats calculation based on actual current time
  const totalCount = missionsWithAutoStatus.length;
  const inProgressCount = missionsWithAutoStatus.filter((m) => m.autoStatus === 'in_progress').length;
  const completedCount = missionsWithAutoStatus.filter((m) => m.autoStatus === 'completed').length;
  const pendingCount = missionsWithAutoStatus.filter((m) => m.autoStatus === 'pending').length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      {/* Date & Quick Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>{fullThaiDate}</span>
          </h2>
        </div>

        {/* Counter Badges */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 font-semibold">
            ทั้งหมด {totalCount}
          </span>
          {inProgressCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 animate-pulse">
              ● กำลังทำ {inProgressCount}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
              รอเริ่ม {pendingCount}
            </span>
          )}
          {completedCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
              เสร็จสิ้น {completedCount}
            </span>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาภารกิจ, สถานที่, ผู้รับผิดชอบ..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Filter buttons based on automatic status */}
        <div className="flex items-center gap-1 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('current')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors shrink-0 ${
              filterStatus === 'current'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            ปัจจุบัน
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
              filterStatus === 'all'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
              filterStatus === 'pending'
                ? 'bg-blue-800 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            รอดำเนินการ
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
              filterStatus === 'in_progress'
                ? 'bg-blue-800 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            กำลังทำ
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
              filterStatus === 'completed'
                ? 'bg-blue-800 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>

      {/* Multiple Mission Cards Stack (Faithful to wireframe images 2 and 3) */}
      <div className="space-y-4 pt-1">
        {sortedMissions.length > 0 ? (
          sortedMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              now={now}
              onEdit={onEdit}
              onDelete={onDelete}
              onCompleteEarly={onCompleteEarly}
              onToast={onToast}
            />
          ))
        ) : (
          <div className="text-center py-12 px-4 bg-white border-2 border-dashed border-slate-300 rounded-lg">
            <Clock className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-bold text-slate-700">
              {searchTerm || (filterStatus !== 'all' && filterStatus !== 'current')
                ? 'ไม่พบภารกิจที่ตรงกับเงื่อนไขการค้นหา'
                : filterStatus === 'current'
                ? 'ไม่มีภารกิจค้างอยู่ (ภารกิจวันนี้เสร็จสิ้นทั้งหมดแล้ว)'
                : 'ไม่มีภารกิจที่บันทึกไว้สำหรับวันนี้'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {filterStatus === 'current' && completedCount > 0
                ? 'สามารถกดปุ่ม "ทั้งหมด" หรือ "เสร็จสิ้น" เพื่อดูภารกิจที่ปิดงานแล้วได้'
                : 'สามารถกดปุ่ม "เพิ่มภารกิจใหม่" เพื่อบันทึกข้อมูลภารกิจของแผนกสื่อสาร'}
            </p>
            <button
              onClick={onAddNew}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>เพิ่มภารกิจใหม่</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
