// Thai month abbreviations matching Thai military / official conventions
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS_FULL = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
];

/**
 * Returns today's date formatted as YYYY-MM-DD
 */
export function getTodayDateString(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Format date to short Thai Buddhist Era (พ.ศ.), e.g. "1 ต.ค.69" matching wireframe
 */
export function formatThaiDateShort(dateStr: string | Date): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);

  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const thaiYearShort = String((d.getFullYear() + 543) % 100);

  return `${day} ${month}${thaiYearShort}`;
}

/**
 * Format date with Day name and short Thai Buddhist Era, e.g. "วันอาทิตย์ 6 ต.ค.69"
 */
export function formatThaiDateWithDay(dateStr: string | Date): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);

  const dayName = THAI_DAYS_FULL[d.getDay()];
  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const thaiYearShort = String((d.getFullYear() + 543) % 100);

  return `${dayName}ที่ ${day} ${month}${thaiYearShort}`;
}

/**
 * Format date to medium Thai Buddhist Era, e.g. "1 ต.ค. 2569"
 */
export function formatThaiDateMedium(dateStr: string | Date): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);

  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const thaiYear = d.getFullYear() + 543;

  return `${day} ${month} ${thaiYear}`;
}

/**
 * Format full Thai date, e.g. "วันพฤหัสบดีที่ 1 ตุลาคม พ.ศ. 2569"
 */
export function formatThaiDateFull(dateStr: string | Date): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);

  const dayName = THAI_DAYS_FULL[d.getDay()];
  const day = d.getDate();
  const month = THAI_MONTHS_FULL[d.getMonth()];
  const thaiYear = d.getFullYear() + 543;

  return `${dayName}ที่ ${day} ${month} ${thaiYear}`;
}

/**
 * Format date range in Thai format, e.g. "1 ต.ค. 69 - 2 ต.ค. 69"
 */
export function formatThaiDateRange(startDateStr: string, endDateStr?: string): string {
  if (!startDateStr) return '';
  if (!endDateStr || startDateStr === endDateStr) {
    return formatThaiDateShort(startDateStr);
  }
  return `${formatThaiDateShort(startDateStr)} - ${formatThaiDateShort(endDateStr)}`;
}

/**
 * Generate list of ISO date strings (YYYY-MM-DD) between start and end date (inclusive)
 */
export function getDatesInRange(startDateStr: string, endDateStr?: string): string[] {
  const effectiveEnd = endDateStr || startDateStr;
  if (!startDateStr || startDateStr === effectiveEnd) {
    return [startDateStr];
  }

  const dates: string[] = [];
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(effectiveEnd + 'T00:00:00');

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return [startDateStr];
  }

  const current = new Date(start);
  let count = 0;
  // Safety cap at 60 days
  while (current <= end && count < 60) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
    count++;
  }

  return dates.length > 0 ? dates : [startDateStr];
}

/**
 * Calculate automatic status purely based on time and multi-day date range
 * (เริ่มงานเมื่อถึงเวลาเริ่มต้น และเสร็จสิ้นเมื่อถึงเวลาสิ้นสุดของวันสุดท้าย)
 */
export function getAutomaticMissionStatus(
  mission: { start_date: string; end_date?: string; start_time?: string; end_time?: string; status?: string },
  now: Date = new Date()
): 'pending' | 'in_progress' | 'completed' {
  if (mission.status === 'cancelled') return 'completed';
  if (mission.status === 'completed') return 'completed';

  const todayStr = getTodayDateString(now);
  const effectiveEndDate = mission.end_date || mission.start_date;

  // 1. If entire mission date range is in the past -> เสร็จสิ้น
  if (effectiveEndDate < todayStr) {
    return 'completed';
  }

  // 2. If mission starts in future dates -> รอดำเนินการ
  if (mission.start_date > todayStr) {
    return 'pending';
  }

  // 3. Current date is within mission range [start_date <= todayStr <= effectiveEndDate]
  const [sY, sM, sD] = mission.start_date.split('-').map(Number);
  const [sH, sMin] = mission.start_time ? mission.start_time.split(':').map(Number) : [0, 0];
  const startDateTime = new Date(sY, sM - 1, sD, sH || 0, sMin || 0, 0, 0);

  const [eY, eM, eD] = effectiveEndDate.split('-').map(Number);
  let endDateTime: Date;
  if (mission.end_time) {
    const [eH, eMin] = mission.end_time.split(':').map(Number);
    endDateTime = new Date(eY, eM - 1, eD, eH || 0, eMin || 0, 0, 0);
  } else if (mission.start_time && effectiveEndDate === mission.start_date) {
    // Single day without end time -> default 1 hour
    endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
  } else {
    // Multi-day or untimed -> end of effectiveEndDate
    endDateTime = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
  }

  const nowTime = now.getTime();

  if (nowTime < startDateTime.getTime()) {
    // ยังไม่ถึงเวลาเริ่มต้น
    return 'pending';
  } else if (nowTime <= endDateTime.getTime()) {
    // อยู่ระหว่างช่วงปฏิบัติภารกิจ
    return 'in_progress';
  } else {
    // สิ้นสุดภารกิจแล้ว
    return 'completed';
  }
}

/**
 * Calculate countdown or status text matching wireframe:
 * "ในอีก ... ชม." or "กำลังดำเนินการ" or "เสร็จสิ้น"
 */
export function getMissionCountdown(
  startDateStr: string,
  endDateStr: string,
  startTimeStr?: string,
  endTimeStr?: string,
  currentStatus?: string,
  now: Date = new Date()
): { text: string; state: 'upcoming' | 'ongoing' | 'completed' | 'future'; minutesLeft?: number } {
  if (currentStatus === 'cancelled') {
    return { text: 'ยกเลิกภารกิจ', state: 'completed' };
  }
  if (currentStatus === 'completed') {
    return { text: 'เสร็จสิ้นแล้ว', state: 'completed' };
  }

  const todayStr = getTodayDateString(now);
  const effectiveEndDate = endDateStr || startDateStr;

  // 1. If entire mission date range is in the past
  if (effectiveEndDate < todayStr) {
    return { text: 'เสร็จสิ้นแล้ว', state: 'completed' };
  }

  // Exact start and end boundaries
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [sH, sMin] = startTimeStr ? startTimeStr.split(':').map(Number) : [0, 0];
  const startDateTime = new Date(sY, sM - 1, sD, sH || 0, sMin || 0, 0, 0);

  const [eY, eM, eD] = effectiveEndDate.split('-').map(Number);
  let endDateTime: Date;
  if (endTimeStr) {
    const [eH, eMin] = endTimeStr.split(':').map(Number);
    endDateTime = new Date(eY, eM - 1, eD, eH || 0, eMin || 0, 0, 0);
  } else if (startTimeStr && effectiveEndDate === startDateStr) {
    endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
  } else {
    endDateTime = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
  }

  const nowTime = now.getTime();

  // If already past endDateTime
  if (nowTime > endDateTime.getTime()) {
    return { text: 'เสร็จสิ้นแล้ว', state: 'completed' };
  }

  // If before startDateTime
  if (nowTime < startDateTime.getTime()) {
    // If starts in future dates
    if (startDateStr > todayStr) {
      const today = new Date(todayStr + 'T00:00:00');
      const startDay = new Date(startDateStr + 'T00:00:00');
      const diffDays = Math.ceil((startDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { text: `ในอีก ${diffDays} วัน`, state: 'future' };
    }

    // Starts today in the future
    const diffMs = startDateTime.getTime() - nowTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes > 0) {
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      let countdownText = '';
      if (hours > 0) {
        countdownText = mins > 0 ? `ในอีก ${hours} ชม. ${mins} นาที` : `ในอีก ${hours} ชม.`;
      } else {
        countdownText = `ในอีก ${mins} นาที`;
      }
      return { text: countdownText, state: 'upcoming', minutesLeft: diffMinutes };
    }
  }

  // Currently active / in progress
  return { text: 'กำลังดำเนินการ', state: 'ongoing', minutesLeft: 0 };
}

/**
 * Sort missions so completed missions are always placed at the bottom,
 * while in_progress (กำลังดำเนินการ) and pending (รอดำเนินการ / ในอีก...) are at the top.
 */
export function sortMissionsForDisplay<T extends { start_date?: string; end_date?: string; start_time?: string; end_time?: string; status?: string; id?: number }>(
  missions: T[],
  now: Date = new Date()
): T[] {
  return [...missions].sort((a, b) => {
    const statusA = getAutomaticMissionStatus(a as any, now);
    const statusB = getAutomaticMissionStatus(b as any, now);

    const isCompletedA = statusA === 'completed' ? 1 : 0;
    const isCompletedB = statusB === 'completed' ? 1 : 0;

    // 1. Completed missions always moved to the bottom
    if (isCompletedA !== isCompletedB) {
      return isCompletedA - isCompletedB;
    }

    // 2. in_progress comes before pending
    if (statusA !== statusB) {
      if (statusA === 'in_progress') return -1;
      if (statusB === 'in_progress') return 1;
    }

    // 3. Chronological by start_time
    const timeA = a.start_time || '99:99';
    const timeB = b.start_time || '99:99';
    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }

    return (a.id || 0) - (b.id || 0);
  });
}

/**
 * Format mission details into a clean, concise 4-line LINE message pattern
 */
export function formatDayMissionsForLine(dateKey: string, items: any[]): string {
  const dateFormatted = formatThaiDateWithDay(dateKey);
  const sortedItems = [...items].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  const cleanTime = (t?: string) => (t || '').replace(/:/g, '').trim();

  const missionBlocks = sortedItems.map((m) => {
    const s = cleanTime(m.start_time);
    const e = cleanTime(m.end_time);
    const timeStr = s && e ? `${s} - ${e}` : s ? s : 'ไม่ระบุเวลา';
    const locationStr = m.location ? `, ${m.location}` : '';
    
    let block = `${timeStr} ${m.title}${locationStr}`;
    if (m.assignee) {
      block += `\nผู้รับผิดชอบ : ${m.assignee}`;
    }
    
    if (m.description && m.description.trim()) {
      block += `\nรายละเอียด : ${m.description.trim()}`;
    }

    if (m.attachment_url) {
      const attachLink = m.attachment_url.startsWith('http') ? m.attachment_url : `https://jobcomm.onrender.com${m.attachment_url}`;
      block += `\nเอกสารแนบ : ${attachLink}`;
    }
    
    return block;
  }).join('\n\n');

  return `ภารกิจ${dateFormatted} ครับ\n\n${missionBlocks}\n\nดูภารกิจทั้งหมดได้ที่ https://jobcomm.onrender.com/`;
}

/**
 * Format mission details into a clean, concise LINE message pattern
 */
export function formatMissionForLine(
  mission: {
    title: string;
    category?: string;
    start_date: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    description?: string;
    assignee?: string;
    status?: string;
    attachment_url?: string | null;
  },
  _now?: Date
): string {
  const dateText = formatThaiDateRange(mission.start_date, mission.end_date);
  const timeText = mission.start_time
    ? `${mission.start_time} ${mission.end_time ? `- ${mission.end_time} น.` : 'น.'}`
    : 'ไม่ระบุเวลา';

  const lines = [
    `🔹 ${mission.title}`,
    `📅 วันที่ : ${dateText}`,
    `⏰ เวลา : ${timeText}`,
    `📍 สถานที่ : ${mission.location || '-'}`
  ];
  
  if (mission.assignee) {
    lines.push(`ผู้รับผิดชอบ : ${mission.assignee}`);
  }
  
  if (mission.description && mission.description.trim()) {
    lines.push(`รายละเอียด : ${mission.description.trim()}`);
  }
  
  if (mission.attachment_url) {
    const attachLink = mission.attachment_url.startsWith('http') ? mission.attachment_url : `https://jobcomm.onrender.com${mission.attachment_url}`;
    lines.push(`เอกสารแนบ : ${attachLink}`);
  }

  return lines.join('\n');
}

/**
 * Copy text to clipboard with fallback for non-HTTPS / local network environments
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    textArea.remove();
    return successful;
  } catch {
    return false;
  }
}

