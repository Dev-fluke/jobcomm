import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
  Lock,
  KeyRound,
  ArrowLeft
} from 'lucide-react';


interface LineSettingsViewProps {
  onToast?: (text: string, type?: 'success' | 'error') => void;
  onBack?: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const LineSettingsView: React.FC<LineSettingsViewProps> = ({ onToast, onBack }) => {
  // Password protection state (26366)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('jobcomm_settings_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  const [notifyTime, setNotifyTime] = useState<string>('06:00');
  const [notifyEnabled, setNotifyEnabled] = useState<boolean>(true);
  const [notifyOnEmpty, setNotifyOnEmpty] = useState<boolean>(true);
  const [notifyOnAdd, setNotifyOnAdd] = useState<boolean>(false);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [hasSecret, setHasSecret] = useState<boolean>(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  // Fetch current LINE config
  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/line/status`);
      if (res.ok) {
        const data = await res.json();
        setHasToken(data.hasToken);
        setHasSecret(data.hasSecret);
        setGroupId(data.groupId);
        if (data.notifyTime) setNotifyTime(data.notifyTime);
        if (data.notifyEnabled !== undefined) setNotifyEnabled(data.notifyEnabled);
        if (data.notifyOnEmpty !== undefined) setNotifyOnEmpty(data.notifyOnEmpty);
        if (data.notifyOnAdd !== undefined) setNotifyOnAdd(data.notifyOnAdd);
      }
    } catch (err) {
      console.error('Error fetching LINE status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Save Settings
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`${API_BASE}/line/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyTime, notifyEnabled, notifyOnEmpty, notifyOnAdd })
      });

      if (res.ok) {
        onToast?.('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
      } else {
        throw new Error('ไม่สามารถบันทึกการตั้งค่าได้');
      }
    } catch (err: any) {
      onToast?.(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Test Send
  const handleTestSend = async () => {
    try {
      setIsTesting(true);
      const res = await fetch(`${API_BASE}/line/test-send`, {
        method: 'POST'
      });

      const data = await res.json();
      if (data.success) {
        onToast?.('ส่งข้อความทดสอบเข้ากลุ่ม LINE สำเร็จแล้ว!', 'success');
      } else {
        throw new Error(data.error || 'ส่งข้อความไม่สำเร็จ');
      }
    } catch (err: any) {
      onToast?.(err.message || 'ส่งข้อความไม่สำเร็จ กรุณาตรวจสอบรหัสกลุ่มและการตั้งค่า', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '26366') {
      setIsAuthenticated(true);
      sessionStorage.setItem('jobcomm_settings_auth', 'true');
      setPasswordError('');
      onToast?.('ยืนยันรหัสผ่านถูกต้อง ยินดีต้อนรับสู่หน้าตั้งค่า');
    } else {
      setPasswordError('รหัสผ่านไม่ถูกต้อง (กรุณาระบุรหัสผ่าน 26366)');
    }
  };

  const timePresets = ['05:30', '06:00', '06:30', '07:00', '07:30', '08:00'];

  // If not authenticated, show password prompt modal/screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-300 shadow-lg p-6 sm:p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-8 h-8 text-blue-800" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-800">
              ระบบรักษาความปลอดภัย
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              กรุณากรอกรหัสผ่านเพื่อเข้าสู่หน้าตั้งค่าการส่งภารกิจเข้า LINE
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="กรอกรหัสผ่าน..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 text-center text-sm font-semibold tracking-wider bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-800 focus:bg-white transition-all"
                />
              </div>
              {passwordError && (
                <p className="text-xs text-red-600 font-medium mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{passwordError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-800 hover:bg-blue-900 active:bg-blue-950 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>ยืนยันรหัสผ่าน</span>
            </button>
          </form>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ยกเลิกและกลับหน้าหลัก</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-300">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-800 text-white flex items-center justify-center shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">
              ตั้งค่าการส่งภารกิจเข้า LINE อัตโนมัติ
            </h1>
            <p className="text-xs text-slate-500">
              กำหนดเวลาให้ระบบสรุปภารกิจประจำวันและแจ้งเตือนเข้ากลุ่มอัตโนมัติ
            </p>
          </div>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline underline-offset-4"
          >
            กลับหน้าหลัก
          </button>
        )}
      </div>

      {/* Main Settings Card */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-5 space-y-6">
        {/* Toggle On/Off Switch: แจ้งเตือนประจำวัน */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <span className="font-semibold text-sm text-slate-800 block">
              เปิดการส่งแจ้งเตือนอัตโนมัติประจำวัน
            </span>
            <span className="text-xs text-slate-500">
              เมื่อเปิด ระบบจะส่งสรุปภารกิจประจำวันเข้ากลุ่ม LINE ตามเวลาที่กำหนดทุกเช้า
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifyEnabled}
              onChange={(e) => setNotifyEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-800"></div>
          </label>
        </div>

        {/* Toggle On/Off Switch: ส่งข้อความกรณีไม่มีภารกิจ */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <span className="font-semibold text-sm text-slate-800 block">
              ส่งข้อความแจ้งเตือนกรณี "ไม่มีภารกิจ"
            </span>
            <span className="text-xs text-slate-500">
              {notifyOnEmpty
                ? 'เปิดใช้งาน: หากวันนั้นไม่มีภารกิจ ระบบจะส่งข้อความแจ้งว่า "- วันนี้ไม่มีภารกิจ -"'
                : 'ปิดใช้งาน: หากวันนั้นไม่มีภารกิจ ระบบจะไม่ส่งข้อความใดๆ เข้ากลุ่ม'}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnEmpty}
              onChange={(e) => setNotifyOnEmpty(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-800"></div>
          </label>
        </div>

        {/* Toggle On/Off Switch: แจ้งเตือนเมื่อมีการเพิ่มภารกิจใหม่ */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <span className="font-semibold text-sm text-slate-800 block">
              แจ้งเตือนอัตโนมัติเมื่อมีการเพิ่มภารกิจใหม่
            </span>
            <span className="text-xs text-slate-500">
              {notifyOnAdd
                ? 'เปิดใช้งาน: เมื่อมีการกดบันทึกภารกิจใหม่ ระบบจะส่งการ์ดภารกิจนั้นเข้ากลุ่มทันที'
                : 'ปิดใช้งาน: ไม่ส่งข้อความเข้ากลุ่มเมื่อมีการเพิ่มภารกิจใหม่'}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnAdd}
              onChange={(e) => setNotifyOnAdd(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-emerald-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-emerald-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Time Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-800" />
            <span>เวลาที่ต้องการให้ส่งข้อความ (ทุกวัน)</span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {timePresets.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setNotifyTime(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  notifyTime === t
                    ? 'bg-blue-800 text-white border-blue-900 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                {t} น.
              </button>
            ))}
          </div>

          <div className="pt-2">
            <span className="text-xs text-slate-500 block mb-1">หรือระบุเวลาเอง:</span>
            <input
              type="time"
              value={notifyTime}
              onChange={(e) => setNotifyTime(e.target.value)}
              className="w-40 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 font-semibold text-slate-800"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 border-t border-slate-200 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-lg bg-blue-800 hover:bg-blue-900 active:bg-blue-950 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>บันทึกการตั้งค่า</span>
          </button>
        </div>
      </div>

      {/* Bot & Connection Status Card */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>สถานะการเชื่อมต่อ LINE Messaging API</span>
          </h2>
          <button
            onClick={fetchStatus}
            disabled={isLoading}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            title="รีเฟรชสถานะ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-600 font-medium">Channel Access Token:</span>
            {hasToken ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> ติดตั้งเรียบร้อย
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> ยังไม่พบใน Render
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-600 font-medium">กลุ่ม LINE ปลายทาง (Group ID):</span>
            {groupId ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> เชื่อมต่อแล้ว ({groupId.slice(0, 8)}...)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> ยังไม่พบรหัสกลุ่ม
              </span>
            )}
          </div>
        </div>

        {/* Manual Test Trigger */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            คุณสามารถกดปุ่มนี้เพื่อทดสอบให้บอทส่งภารกิจของวันนี้เข้ากลุ่มทันที
          </p>
          <button
            onClick={handleTestSend}
            disabled={isTesting || !groupId}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 ${
              groupId
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isTesting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>ทดลองส่งข้อความเดี๋ยวนี้</span>
          </button>
        </div>
      </div>

      {/* Guide Card */}
      <div className="bg-blue-50/60 rounded-xl border border-blue-200 p-4 text-xs text-blue-900 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-blue-950">
          <HelpCircle className="w-4 h-4 text-blue-700" />
          <span>วิธีเชื่อมต่อบอทเข้ากลุ่ม (สำหรับกลุ่มใหม่ หรือกรณีที่ยังไม่พบรหัสกลุ่ม):</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-blue-800 pl-1 leading-relaxed">
          <li>เปิดแอป LINE ในกลุ่มที่ต้องการให้ส่งแจ้งเตือน</li>
          <li>กด <strong>เชิญเพื่อน (Invite)</strong> แล้วเลือกเชิญบอท JobComm เข้ามาในกลุ่ม</li>
          <li>เมื่อบอทเข้ากลุ่มแล้ว ให้พิมพ์ข้อความในกลุ่มว่า: <code className="bg-blue-200/80 px-1.5 py-0.5 rounded font-mono font-bold text-blue-950">#jobcomm</code></li>
          <li>บอทจะตอบกลับยืนยัน และรหัสกลุ่มจะถูกบันทึกเพื่อใช้ส่งภารกิจอัตโนมัติทันทีครับ</li>
        </ol>
      </div>
    </div>
  );
};
