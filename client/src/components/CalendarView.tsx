import React, { useState, useMemo } from 'react';
import type { Mission } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarViewProps {
  missions: Mission[];
  todayDateStr: string;
  onDateClick: (dateStr: string) => void;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const DAYS_OF_WEEK = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export const CalendarView: React.FC<CalendarViewProps> = ({ missions, todayDateStr, onDateClick }) => {
  const initialDate = new Date(todayDateStr);
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(initialDate.getFullYear());
    setCurrentMonth(initialDate.getMonth());
  };

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dayNumber: i, dateStr });
    }
    return days;
  }, [currentYear, currentMonth]);

  const getMissionsForDate = (dateStr: string) => {
    return missions.filter(m => {
      const d = dateStr;
      const s = m.start_date;
      const e = m.end_date || m.start_date;
      return d >= s && d <= e;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">ปฏิทินภารกิจ</h1>
            <p className="text-sm text-slate-500">ดูภาพรวมภารกิจตลอดทั้งเดือน</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="px-4 py-2 bg-blue-50 text-blue-800 font-bold rounded-lg min-w-[160px] text-center border border-blue-100">
            {THAI_MONTHS[currentMonth]} {currentYear + 543}
          </div>

          <button onClick={handleNextMonth} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>

          <button onClick={handleToday} className="ml-2 px-4 py-2 text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
            เดือนปัจจุบัน
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {DAYS_OF_WEEK.map((day, idx) => (
            <div key={day} className={`py-3 text-center text-sm font-bold ${idx === 0 || idx === 6 ? 'text-red-600' : 'text-slate-600'}`}>
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((dayObj, idx) => {
            if (!dayObj) return <div key={`empty-${idx}`} className="min-h-[120px] bg-slate-50/50 border-r border-b border-slate-100 last:border-r-0" />;

            const { dayNumber, dateStr } = dayObj;
            const isToday = dateStr === todayDateStr;
            const dayMissions = getMissionsForDate(dateStr);
            const isWeekend = (idx % 7 === 0) || (idx % 7 === 6);

            return (
              <div 
                key={dateStr}
                onClick={() => onDateClick(dateStr)}
                className={`min-h-[120px] p-2 border-r border-b border-slate-100 last:border-r-0 hover:bg-blue-50/50 transition-colors cursor-pointer group flex flex-col ${isToday ? 'bg-blue-50/30' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${isToday ? 'bg-blue-600 text-white shadow-md' : isWeekend ? 'text-red-500' : 'text-slate-700'}`}>
                    {dayNumber}
                  </span>
                  
                  {dayMissions.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                      {dayMissions.length} งาน
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 flex-1 overflow-y-auto no-scrollbar max-h-[100px]">
                  {dayMissions.slice(0, 3).map(m => {
                    const isCompleted = m.status === 'completed';
                    return (
                      <div 
                        key={m.id}
                        className={`text-[11px] px-1.5 py-1 rounded border leading-tight truncate ${isCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700'}`}
                        title={m.title}
                      >
                        {m.start_time ? <span className="font-semibold mr-1">{m.start_time}</span> : null}
                        {m.title}
                      </div>
                    )
                  })}
                  {dayMissions.length > 3 && (
                    <div className="text-[10px] text-slate-500 font-medium text-center pt-0.5">
                      + อีก {dayMissions.length - 3} งาน
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
