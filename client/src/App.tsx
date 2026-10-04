import React, { useState, useEffect, useCallback } from 'react';
import type { ActiveTab, Mission, Stats } from './types';
import { getTodayDateString } from './utils/thaiDate';
import { Header } from './components/Header';
import { SidebarDrawer } from './components/SidebarDrawer';
import { TodayMissionsView } from './components/TodayMissionsView';
import { OtherMissionsView } from './components/OtherMissionsView';
import { AddMissionView } from './components/AddMissionView';
import { TvDisplayView } from './components/TvDisplayView';
import { DesktopTableView } from './components/DesktopTableView';
import { EditMissionModal } from './components/EditMissionModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [todayMissions, setTodayMissions] = useState<Mission[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    todayCount: 0,
    inProgress: 0,
    completed: 0,
    pending: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit modal
  const [editingMission, setEditingMission] = useState<Mission | null>(null);

  // Live ticking clock for dynamic countdowns and TV mode
  const [now, setNow] = useState<Date>(new Date());
  const todayDateStr = getTodayDateString(now);

  // Date prefill for Add Mission
  const [addMissionDatePrefill, setAddMissionDatePrefill] = useState<string>(todayDateStr);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Clock ticker every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all missions, today's missions, and stats
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [allRes, todayRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/missions`),
        fetch(`${API_BASE}/missions/today?date=${todayDateStr}`),
        fetch(`${API_BASE}/stats?date=${todayDateStr}`)
      ]);

      if (allRes.ok) {
        const json = await allRes.json();
        setMissions(json.data || []);
      }
      if (todayRes.ok) {
        const json = await todayRes.json();
        setTodayMissions(json.data || []);
      }
      if (statsRes.ok) {
        const json = await statsRes.json();
        setStats(json.data || {});
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [todayDateStr]);

  // Initial fetch and Real-time SSE connection
  useEffect(() => {
    fetchData();

    // Setup Server-Sent Events (SSE) for Real-Time synchronization
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${API_BASE}/events`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.type === 'mission_created' ||
            data.type === 'mission_updated' ||
            data.type === 'mission_deleted' ||
            data.type === 'mission_status_changed'
          ) {
            fetchData();
          }
        } catch (e) {
          console.error('Error handling SSE event:', e);
        }
      };

      eventSource.onerror = () => {
        // SSE reconnects automatically
      };
    } catch (e) {
      console.warn('SSE not supported or connection error', e);
    }

    return () => {
      eventSource?.close();
    };
  }, [fetchData]);

  // Handle Add Mission
  const handleAddMission = async (missionData: Partial<Mission>): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missionData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'ไม่สามารถบันทึกภารกิจได้');
      }

      await fetchData();
      showToast('บันทึกข้อมูลภารกิจเรียบร้อยแล้ว');
      setActiveTab('today');
      return true;
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
      return false;
    }
  };

  // Handle Update Mission
  const handleUpdateMission = async (id: number, missionData: Partial<Mission>): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/missions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missionData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'ไม่สามารถแก้ไขภารกิจได้');
      }

      await fetchData();
      showToast('บันทึกการแก้ไขเรียบร้อยแล้ว');
      return true;
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการแก้ไข', 'error');
      return false;
    }
  };

  // Handle Quick Status Change
  const handleStatusChange = async (id: number, newStatus: Mission['status']) => {
    try {
      // Optimistic update
      setTodayMissions((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
      );
      setMissions((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
      );

      const res = await fetch(`${API_BASE}/missions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        throw new Error('ไม่สามารถอัปเดตสถานะได้');
      }

      await fetchData();
      showToast(
        newStatus === 'completed'
          ? 'บันทึกว่าเสร็จสิ้นแล้ว'
          : newStatus === 'in_progress'
          ? 'เริ่มปฏิบัติภารกิจ'
          : 'อัปเดตสถานะเรียบร้อย'
      );
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
      fetchData();
    }
  };

  // Handle Delete Mission
  const handleDeleteMission = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/missions/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('ไม่สามารถลบภารกิจได้');
      }

      await fetchData();
      showToast('ลบภารกิจเรียบร้อยแล้ว');
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
    }
  };

  // Handle Close Mission Early (ปิดงานก่อนเวลากำหนด)
  const handleCompleteMissionEarly = async (id: number, closeTimeStr: string) => {
    try {
      const res = await fetch(`${API_BASE}/missions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          end_time: closeTimeStr
        })
      });

      if (!res.ok) {
        throw new Error('ไม่สามารถบันทึกปิดงานได้');
      }

      await fetchData();
      showToast(`บันทึกปิดงานเสร็จสิ้นเวลา ${closeTimeStr} น. เรียบร้อยแล้ว`);
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกปิดงาน', 'error');
    }
  };

  // If in TV Mode, render dedicated TV full-screen interface
  if (activeTab === 'tv') {
    return (
      <TvDisplayView
        missions={todayMissions}
        todayDateStr={todayDateStr}
        now={now}
        onExit={() => setActiveTab('today')}
      />
    );
  }



  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
          <div
            className={`px-4 py-2.5 rounded-lg shadow-lg border text-sm font-semibold flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : 'bg-red-900 text-red-100 border-red-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Wireframe Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        todayDateStr={todayDateStr}
        onRefresh={fetchData}
        isLoading={isLoading}
      />

      {/* Left Sidebar Drawer */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'today' && (
          <TodayMissionsView
            missions={todayMissions}
            todayDateStr={todayDateStr}
            now={now}
            onEdit={(m) => setEditingMission(m)}
            onDelete={handleDeleteMission}
            onAddNew={() => {
              setAddMissionDatePrefill(todayDateStr);
              setActiveTab('add');
            }}
            onCompleteEarly={handleCompleteMissionEarly}
            onToast={showToast}
          />
        )}

        {activeTab === 'other' && (
          <OtherMissionsView
            missions={missions}
            todayDateStr={todayDateStr}
            now={now}
            onEdit={(m) => setEditingMission(m)}
            onDelete={handleDeleteMission}
            onAddNewForDate={(date) => {
              setAddMissionDatePrefill(date);
              setActiveTab('add');
            }}
            onCompleteEarly={handleCompleteMissionEarly}
            onToast={showToast}
          />
        )}

        {activeTab === 'add' && (
          <AddMissionView
            onAddMission={handleAddMission}
            onCancel={() => setActiveTab('today')}
            defaultDate={addMissionDatePrefill}
          />
        )}

        {activeTab === 'table' && (
          <DesktopTableView
            missions={missions}
            todayDateStr={todayDateStr}
            onEdit={(m) => setEditingMission(m)}
            onDelete={handleDeleteMission}
            onRefresh={fetchData}
            onCompleteEarly={handleCompleteMissionEarly}
            onToast={showToast}
          />
        )}
      </main>

      {/* Edit Mission Modal */}
      <EditMissionModal
        mission={editingMission}
        isOpen={!!editingMission}
        onClose={() => setEditingMission(null)}
        onSave={handleUpdateMission}
      />

      {/* Footer for Mobile / Desktop */}
      <footer className="bg-slate-200/80 border-t border-slate-300 py-3 text-center text-xs text-slate-600 print:hidden">
        <p className="text-[11px] text-slate-500 mt-0.5">
          พัฒนาโดย นทสส.อย. โทร.2-6366 • รองรับ โทรศัพท์มือถือ / จอทีวี / จอคอมพิวเตอร์
        </p>
      </footer>
    </div>
  );
}

export default App;
