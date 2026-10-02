import React, { useState, useEffect } from 'react';
import type { Mission } from '../types';
import { MissionCard } from './MissionCard';
import { formatThaiDateFull, formatThaiDateShort, sortMissionsForDisplay, getAutomaticMissionStatus } from '../utils/thaiDate';
import {
  Tv,
  Maximize2,
  Minimize2,
  X,
  Radio,
  Clock,
  Shield,
  Volume2,
  VolumeX,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';

interface TvDisplayViewProps {
  missions: Mission[];
  todayDateStr: string;
  now: Date;
  onExit: () => void;
}

export const TvDisplayView: React.FC<TvDisplayViewProps> = ({
  missions,
  todayDateStr,
  now,
  onExit
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [themeMode, setThemeMode] = useState<'military-dark' | 'clean-light'>('military-dark');
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);

  // Toggle browser fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Format digital clock time: HH:MM:SS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const fullThaiDate = formatThaiDateFull(todayDateStr);

  const activeMissions = missions.filter((m) => {
    if (m.status === 'cancelled') return false;
    if (hideCompleted && getAutomaticMissionStatus(m, now) === 'completed') {
      return false;
    }
    return true;
  });
  const sortedTvMissions = sortMissionsForDisplay(activeMissions, now);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        themeMode === 'military-dark'
          ? 'bg-slate-950 text-white'
          : 'bg-slate-100 text-slate-900'
      } flex flex-col p-4 sm:p-6 lg:p-8 select-none`}
    >
      {/* Top TV Command Header */}
      <header
        className={`rounded-2xl p-5 mb-6 border transition-all ${
          themeMode === 'military-dark'
            ? 'bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 border-blue-900/60 shadow-2xl'
            : 'bg-white border-slate-300 shadow-md'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Logo & Unit Name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-700/40 border-2 border-blue-400 flex items-center justify-center text-amber-400 shadow-lg">
              <Radio className="w-9 h-9 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                  ระบบแสดงผลสถานะภารกิจสด (LIVE MISSION MONITOR)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
                แผนกสื่อสาร หน่วยบัญชาการอากาศโยธิน
              </h1>
            </div>
          </div>

          {/* Large Digital Clock & Date */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-8">
            <div
              className={`p-3 rounded-xl border text-center ${
                themeMode === 'military-dark'
                  ? 'bg-slate-900/90 border-blue-800'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="text-3xl sm:text-4xl font-mono font-bold tracking-wider text-amber-400">
                {hours}:{minutes}
                <span className="text-xl sm:text-2xl opacity-75">:{seconds}</span>
                <span className="text-xs ml-1 font-sans font-medium text-slate-300">น.</span>
              </div>
              <div
                className={`text-xs sm:text-sm font-semibold mt-0.5 ${
                  themeMode === 'military-dark' ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {fullThaiDate}
              </div>
            </div>

            {/* TV Controls Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setThemeMode(themeMode === 'military-dark' ? 'clean-light' : 'military-dark')
                }
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-blue-800/60 hover:bg-blue-700 text-blue-100 border border-blue-700 transition-colors"
                title="เปลี่ยนธีมหน้าจอทีวี"
              >
                {themeMode === 'military-dark' ? 'ธีมสว่าง' : 'ธีมมืด'}
              </button>

              {/* ปุ่มเปิด-ปิด เพื่อซ่อนภารกิจที่เสร็จสิ้นแล้ว */}
              <button
                onClick={() => setHideCompleted(!hideCompleted)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  hideCompleted
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 font-bold shadow-xs'
                    : 'bg-blue-800/60 hover:bg-blue-700 text-blue-100 border border-blue-700'
                }`}
                title={hideCompleted ? 'กำลังซ่อนภารกิจที่เสร็จสิ้นแล้ว (คลิกเพื่อแสดงทั้งหมด)' : 'คลิกเพื่อซ่อนภารกิจที่เสร็จสิ้นแล้ว'}
              >
                {hideCompleted ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                    <span>ซ่อนที่เสร็จแล้ว : เปิด</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                    <span>ซ่อนที่เสร็จแล้ว : ปิด</span>
                  </>
                )}
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2.5 rounded-lg bg-blue-800/60 hover:bg-blue-700 text-blue-100 border border-blue-700 transition-colors"
                title="เปิด/ปิด เต็มจอ (Fullscreen)"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>

              <button
                onClick={onExit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow-sm"
                title="ออกจากโหมดจอทีวี"
              >
                <X className="w-4 h-4" />
                <span>ออกจากโหมดทีวี</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main TV Missions Grid */}
      <main className="flex-1">
        {sortedTvMissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
            {sortedTvMissions.map((mission) => (
              <div
                key={mission.id}
                className={`rounded-xl overflow-hidden border-2 transition-transform duration-300 tv-card h-full flex flex-col ${
                  mission.status === 'in_progress'
                    ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                    : mission.priority === 'urgent'
                    ? 'border-red-400 ring-2 ring-red-400/30'
                    : 'border-slate-800'
                } bg-white shadow-lg`}
              >
                <MissionCard
                  mission={mission}
                  now={now}
                  isTvMode={true}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-700 rounded-2xl">
            <Radio className="w-16 h-16 text-slate-500 mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-slate-300">
              ไม่มีภารกิจกำหนดไว้สำหรับวันนี้
            </h2>
            <p className="text-slate-400 mt-2 text-base max-w-md">
              ระบบกำลังเชื่อมต่อและพร้อมรับข้อมูลภารกิจใหม่จากโทรศัพท์มือถือหรือคอมพิวเตอร์แบบเรียลไทม์
            </p>
          </div>
        )}
      </main>

      {/* TV Bottom Ticker Bar */}
      <footer
        className={`mt-6 py-2 px-4 rounded-xl border text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-2 ${
          themeMode === 'military-dark'
            ? 'bg-slate-900 border-slate-800 text-slate-400'
            : 'bg-white border-slate-300 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="font-semibold text-emerald-400">STATUS:</span>
          <span>ระบบสื่อสารหลักและสำรอง พร้อมปฏิบัติงาน 24 ชั่วโมง</span>
        </div>
        <div className="font-mono text-xs opacity-80">
          ภารกิจที่แสดง: {sortedTvMissions.length} รายการ {hideCompleted && '(ซ่อนที่เสร็จสิ้นแล้ว)'}
        </div>
      </footer>
    </div>
  );
};
