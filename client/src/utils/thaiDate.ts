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
 * Calculate automatic status purely based on time (เริ่มงานเมื่อถึงเวลา และเสร็จสิ้นเมื่อถึงเวลานั้น)
 */
export function getAutomaticMissionStatus(
  mission: { start_date: string; end_date?: string; start_time?: string; end_time?: string; status?: string },
  now: Date = new Date()
): 'pending' | 'in_progress' | 'completed' {
  if (mission.status === 'cancelled') return 'completed';
  if (mission.status === 'completed') return 'completed';

  const todayStr = getTodayDateString(now);
  const effectiveEndDate = mission.end_date || mission.start_date;

  // Past dates -> เสร็จสิ้น
  if (effectiveEndDate < todayStr) {
    return 'completed';
  }

  // Future dates -> รอดำเนินการ
  if (mission.start_date > todayStr) {
    return 'pending';
  }

  // Today!
  if (!mission.start_time) {
    return 'in_progress';
  }

  const [startHour, startMin] = mission.start_time.split(':').map(Number);
  const startDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour || 0, startMin || 0, 0);

  let endDateTime: Date;
  if (mission.end_time) {
    const [endHour, endMin] = mission.end_time.split(':').map(Number);
    endDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour || 0, endMin || 0, 0);
  } else {
    // Default duration 1 hour
    endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
  }

  const nowTime = now.getTime();

  if (nowTime < startDateTime.getTime()) {
    // ยังไม่ถึงเวลา -> รอดำเนินการ
    return 'pending';
  } else if (nowTime <= endDateTime.getTime()) {
    // ถึงเวลาเริ่มงาน -> กำลังดำเนินการ
    return 'in_progress';
  } else {
    // ถึงเวลาสิ้นสุด -> เสร็จสิ้น
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

  // If in future dates
  if (startDateStr > todayStr) {
    const start = new Date(startDateStr + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { text: `ในอีก ${diffDays} วัน`, state: 'future' };
  }

  // If in past dates -> เสร็จสิ้น
  if (effectiveEndDate < todayStr) {
    return { text: 'เสร็จสิ้นแล้ว', state: 'completed' };
  }

  // Date is today!
  if (!startTimeStr) {
    return { text: 'กำลังดำเนินการ', state: 'ongoing' };
  }

  const [startHour, startMin] = startTimeStr.split(':').map(Number);
  const startDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour || 0, startMin || 0, 0);

  let endDateTime: Date | null = null;
  if (endTimeStr) {
    const [endHour, endMin] = endTimeStr.split(':').map(Number);
    endDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour || 0, endMin || 0, 0);
  } else {
    // Default 1 hour duration
    endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
  }

  const diffMs = startDateTime.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  // Case 1: ก่อนถึงเวลา (ยังไม่เริ่ม) -> นับถอยหลัง "ในอีก ... ชม." ตามภาพสเก็ตช์
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

  // Case 2: เริ่มงานเมื่อถึงเวลา -> "กำลังดำเนินการ" (ไม่ใส่เวลานับถอยหลัง เพราะเวลานับถอยหลัง 'ในอีก...' เป็นห้วงเวลาก่อนเริ่มงาน)
  if (endDateTime && now.getTime() <= endDateTime.getTime()) {
    return { text: 'กำลังดำเนินการ', state: 'ongoing', minutesLeft: 0 };
  }

  // Case 3: เสร็จสิ้นเมื่อถึงเวลานั้น -> "เสร็จสิ้นแล้ว"
  return { text: 'เสร็จสิ้นแล้ว', state: 'completed' };
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
    attachment_name?: string | null;
  },
  _now?: Date
): string {
  const dateText = formatThaiDateRange(mission.start_date, mission.end_date);
  const timeText = mission.start_time
    ? `${mission.start_time} ${mission.end_time ? `- ${mission.end_time} น.` : 'น.'}`
    : 'ไม่ระบุเวลา';

  const categoryPrefix = mission.category ? `${mission.category} : ` : '';

  const lines = [
    `🔹 ${categoryPrefix}${mission.title}`,
    `📅 วันที่ : ${dateText}`,
    `⏰ เวลา : ${timeText}`,
    `📍 สถานที่ : ${mission.location || '-'}`
  ];

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

