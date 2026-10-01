import React from 'react';
import { Menu, Plus, Tv, Calendar, RefreshCw } from 'lucide-react';
import type { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSidebar: () => void;
  todayDateStr?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSidebar,
  todayDateStr: _todayDateStr,
  onRefresh,
  isLoading
}) => {

  return (
    <header className="sticky top-0 z-30 bg-white border-b-2 border-slate-300 shadow-xs select-none">
      {/* Top Banner with Air Force Navy accent */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white px-3 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="font-medium tracking-wide">
            แผนกสื่อสาร หน่วยบัญชาการอากาศโยธิน (อย.)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('tv')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              activeTab === 'tv'
                ? 'bg-amber-400 text-slate-950 font-semibold'
                : 'bg-blue-800/80 hover:bg-blue-700 text-blue-100'
            }`}
            title="เปิดโหมดแสดงผลจอทีวี (TV Digital Signage)"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">โหมดจอทีวี</span>
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="text-blue-200 hover:text-white transition-colors"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Bar faithfully reproducing wireframe header structure */}
      <div className="flex items-stretch border-b border-slate-200 h-14 sm:h-16">
        {/* Left Hamburger Button */}
        <button
          onClick={onOpenSidebar}
          aria-label="เมนูหลัก"
          className="w-14 sm:w-16 flex items-center justify-center border-r-2 border-slate-300 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <Menu className="w-7 h-7 text-slate-700 stroke-[2]" />
        </button>

        {/* Content depending on current page */}
        {activeTab === 'add' ? (
          /* Wireframe 1 Header: "เพิ่มข้อมูลภารกิจ" */
          <div className="flex-1 flex items-center justify-between px-4 sm:px-6">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight">
              เพิ่มข้อมูลภารกิจ
            </h1>
            <button
              onClick={() => setActiveTab('today')}
              className="text-xs sm:text-sm text-blue-700 hover:text-blue-900 font-medium underline underline-offset-4"
            >
              กลับหน้ารายการ
            </button>
          </div>
        ) : (
          /* Wireframe 2 & 3 Header: [ภารกิจวันนี้ 1 ต.ค.69] | [วันอื่นๆ] */
          <div className="flex-1 flex items-stretch">
            {/* Today Tab / Title */}
            <button
              onClick={() => setActiveTab('today')}
              className={`flex-1 flex items-center justify-center px-2 sm:px-6 text-sm sm:text-lg font-semibold transition-all border-r-2 border-slate-300 ${
                activeTab === 'today'
                  ? 'bg-blue-50/50 text-blue-950 font-bold border-b-4 border-b-blue-800'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="truncate">ภารกิจวันนี้</span>
            </button>

            {/* Other Days Tab */}
            <button
              onClick={() => setActiveTab('other')}
              className={`w-28 sm:w-36 flex items-center justify-center px-2 text-sm sm:text-base font-medium transition-all ${
                activeTab === 'other'
                  ? 'bg-blue-50/50 text-blue-950 font-bold border-b-4 border-b-blue-800'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 mr-1.5 hidden sm:inline text-slate-500" />
              <span>วันอื่นๆ</span>
            </button>

            {/* Quick Add Button */}
            <button
              onClick={() => setActiveTab('add')}
              className="px-4 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white flex items-center justify-center transition-colors"
              title="เพิ่มภารกิจใหม่"
            >
              <Plus className="w-5 h-5 sm:mr-1 stroke-[2.5]" />
              <span className="hidden md:inline text-sm font-medium">เพิ่มภารกิจ</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
