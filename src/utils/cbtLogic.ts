import { ExamStatus, ScheduleItem } from '../types/cbt';
import { getAccessToken } from '../services/googleAuth';
import { appendExamResultToSheet, appendMonitoringEventToSheet } from '../services/googleSheets';

const wibFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export interface WibTimeInfo {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  label: string; // DD/MM/YYYY HH:mm WIB
}

export function getNowWib(referenceDate: Date = new Date()): WibTimeInfo {
  const parts = wibFormatter.formatToParts(referenceDate);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = p.value;
    }
  }
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}`,
    label: `${map.day}/${map.month}/${map.year} ${map.hour}:${map.minute} WIB`,
  };
}

export function normalizeClass(value: string | number | null | undefined): string {
  const text = String(value ?? '').trim().toUpperCase().replace(/[._-]/g, ' ').replace(/\s+/g, '');
  const romanMap: Record<string, string> = { VII: '7', VIII: '8', IX: '9' };
  const match = text.match(/(?:KELAS)?(7|8|9)$/);
  if (match) return match[1];
  if (romanMap[text]) return romanMap[text];
  const charMatch = text.match(/^([789])/);
  if (charMatch) return charMatch[1];
  return '';
}

export function getScheduleStatus(
  scheduleDate: string,
  startTime: string,
  endTime: string,
  currentTime?: { date: string; time: string }
): ExamStatus {
  const date = String(scheduleDate || '').trim();
  const start = String(startTime || '').trim();
  const end = String(endTime || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    return 'Belum aktif';
  }

  const current = currentTime || getNowWib();
  const nowKey = `${current.date}T${current.time}`;
  const startKey = `${date}T${start}`;
  const endKey = `${date}T${end}`;

  if (nowKey < startKey) return 'Belum aktif';
  if (nowKey <= endKey) return 'Aktif';
  return 'Selesai';
}

export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  const row: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (c === '"') {
      if (quoted && clean[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (c === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && clean[i + 1] === '\n') {
        i++;
      }
      row.push(value.trim());
      value = '';
      if (row.some(Boolean)) {
        rows.push([...row]);
      }
      row.length = 0;
    } else {
      value += c;
    }
  }

  if (quoted) {
    throw new Error('Tanda kutip CSV belum ditutup.');
  }

  row.push(value.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const csv = '\uFEFF' + rows.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ParsedTeacherRow {
  teacher_name: string;
  subject_name: string;
}

export function parseTeacherDatabase(rawCsv: string): ParsedTeacherRow[] {
  const rows = parseCsv(rawCsv);
  if (rows.length < 2) return [];

  const results: ParsedTeacherRow[] = [];
  // Skip header: No.,Nama,Mata pelajaran
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length >= 3 && r[1] && r[2]) {
      results.push({
        teacher_name: r[1].trim(),
        subject_name: r[2].trim(),
      });
    } else if (r.length >= 2 && r[0] && r[1]) {
      // Fallback format: Nama, Mapel
      results.push({
        teacher_name: r[0].trim(),
        subject_name: r[1].trim(),
      });
    }
  }
  return results;
}

export interface ParsedStudentRow {
  student_nisn: string;
  student_name: string;
  student_class: string;
  student_absence_number: string;
  student_exam_room: string;
}

export function parseStudentDatabase(rawCsv: string): ParsedStudentRow[] {
  const rows = parseCsv(rawCsv);
  if (rows.length < 2) return [];

  const results: ParsedStudentRow[] = [];
  // Fallback map for specific items in sample file where col 0 was subject instead of NISN
  const knownNisnMap: Record<string, string> = {
    'Ahmad Ghiyast': '0130007004',
    'AISYAH NURI AHMAD': '0130007005',
    'ATHALLAH DARREN KAYANA': '0130007007',
  };

  // Header row 0: matematika,Bu sum,Kelas,Nomer Absen,Ruang Ujian
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 4) continue;

    let nisn = String(r[0] || '').trim();
    const name = String(r[1] || '').trim();
    let cls = String(r[2] || '').trim();
    const abs = String(r[3] || '').trim();
    const room = String(r[4] || 'Ruang 1').trim();

    if (!name) continue;

    // Check if NISN is 10 digits or needs fallback
    if (!/^\d{10}$/.test(nisn)) {
      if (knownNisnMap[name]) {
        nisn = knownNisnMap[name];
      } else {
        // Generate consistent 10-digit NISN based on class and absence
        const absPadded = abs.padStart(2, '0');
        nisn = `01300${cls.replace(/[^0-9]/g, '') || '7'}${absPadded.padStart(4, '0')}`;
      }
    }

    // Match exact class format from master database: 'KELAS 7', 'KELAS 8', 'KELAS 9'
    if (/^[789]$/.test(cls)) {
      cls = `KELAS ${cls}`;
    } else if (/^(?:VII|VIII|IX)$/i.test(cls)) {
      const romanMap: Record<string, string> = { VII: '7', VIII: '8', IX: '9' };
      cls = `KELAS ${romanMap[cls.toUpperCase()]}`;
    } else if (/^kelas\s*([789])/i.test(cls)) {
      const match = cls.match(/^kelas\s*([789])/i);
      cls = match ? `KELAS ${match[1]}` : cls.toUpperCase();
    } else if (/^([789])[AB]$/i.test(cls)) {
      cls = `KELAS ${cls[0]}`;
    }

    results.push({
      student_nisn: nisn,
      student_name: name,
      student_class: cls || 'KELAS 7',
      student_absence_number: abs || '1',
      student_exam_room: room || 'Ruang 1',
    });
  }

  return results;
}

export const DEFAULT_CBT_EXIT_TOKEN = 'SPINDAN2026';

export function verifyExitToken(enteredToken: string, activeToken: string = DEFAULT_CBT_EXIT_TOKEN): boolean {
  if (!enteredToken || !activeToken) return false;
  return enteredToken.trim().toUpperCase() === activeToken.trim().toUpperCase();
}

export function formatTimeRemaining(endTimeStr: string, currentTimeStr: string): {
  remainingSeconds: number;
  label: string;
  isEnded: boolean;
} {
  const [endH, endM] = (endTimeStr || '00:00').split(':').map(Number);
  const [curH, curM] = (currentTimeStr || '00:00').split(':').map(Number);

  const endMinutes = (endH || 0) * 60 + (endM || 0);
  const curMinutes = (curH || 0) * 60 + (curM || 0);
  const diffMinutes = endMinutes - curMinutes;

  if (diffMinutes <= 0) {
    return { remainingSeconds: 0, label: '00:00:00 (Waktu Habis)', isEnded: true };
  }

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  const hStr = String(hours).padStart(2, '0');
  const mStr = String(mins).padStart(2, '0');

  return {
    remainingSeconds: diffMinutes * 60,
    label: `${hStr}j ${mStr}m tersisa`,
    isEnded: false,
  };
}

export async function fetchBackendSchedules(): Promise<ScheduleItem[] | null> {
  try {
    const res = await fetch('/api/schedules');
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.schedules)) {
        return data.schedules;
      }
    }
  } catch (err) {
    console.warn('Could not fetch schedules from backend:', err);
  }
  return null;
}

export async function syncSchedulesToBackend(schedules: ScheduleItem[]): Promise<boolean> {
  try {
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedules }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not sync schedules to backend:', err);
    return false;
  }
}

export async function syncTeachersToBackend(teachers: unknown[]): Promise<boolean> {
  try {
    const res = await fetch('/api/database/save-teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teachers }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not sync teachers to backend:', err);
    return false;
  }
}

export async function syncStudentsToBackend(students: unknown[]): Promise<boolean> {
  try {
    const res = await fetch('/api/database/save-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not sync students to backend:', err);
    return false;
  }
}

export async function fetchBackendExitToken(): Promise<string> {
  try {
    const res = await fetch('/api/database/token');
    if (res.ok) {
      const data = await res.json();
      if (data?.exitToken) return data.exitToken;
    }
  } catch (err) {
    console.warn('Could not fetch token from backend:', err);
  }
  return DEFAULT_CBT_EXIT_TOKEN;
}

export async function updateBackendExitToken(exitToken: string): Promise<boolean> {
  try {
    const res = await fetch('/api/database/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exitToken }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not update token on backend:', err);
    return false;
  }
}

export const MAX_ALLOWED_EXITS = 5;

export function isStudentLocked(exitCount: number): boolean {
  return typeof exitCount === 'number' && exitCount >= MAX_ALLOWED_EXITS;
}

export function getViolationSeverity(exitCount: number): {
  level: 'safe' | 'warning' | 'danger' | 'locked';
  label: string;
  badgeClass: string;
} {
  if (exitCount >= 5) {
    return {
      level: 'locked',
      label: 'Terkunci (5x Keluar)',
      badgeClass: 'bg-rose-600 text-white animate-pulse',
    };
  }
  if (exitCount >= 3) {
    return {
      level: 'danger',
      label: `${exitCount}/5 Bahaya`,
      badgeClass: 'bg-amber-600 text-white',
    };
  }
  if (exitCount >= 1) {
    return {
      level: 'warning',
      label: `${exitCount}/5 Peringatan`,
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300',
    };
  }
  return {
    level: 'safe',
    label: '0/5 Normal',
    badgeClass: 'bg-emerald-100 text-emerald-800',
  };
}

export interface StudentViolationPayload {
  student_nisn: string;
  student_name: string;
  student_class: string;
  student_absence_number?: string;
  student_exam_room?: string;
  subject_name?: string;
  schedule_id?: string;
  reason?: string;
}

export async function reportStudentEnterExam(
  payload: StudentViolationPayload
): Promise<boolean> {
  try {
    const res = await fetch('/api/exam/enter-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not report enter-exam to backend:', err);
    return false;
  }
}

export async function reportStudentFinishExam(
  studentNisn: string,
  subjectName?: string,
  scheduleId?: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/exam/finish-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_nisn: studentNisn, subject_name: subjectName, schedule_id: scheduleId }),
    });
    if (res.ok) {
      const data = await res.json();
      // Auto-save exam result to Google Sheets if connected and enabled
      try {
        const token = await getAccessToken();
        const spreadsheetId = localStorage.getItem('cbt_google_spreadsheet_id');
        const autoSync = localStorage.getItem('cbt_google_auto_sync') !== 'false';
        if (token && spreadsheetId && autoSync && data.result) {
          appendExamResultToSheet(token, spreadsheetId, data.result).catch((e) =>
            console.warn('Auto-save exam result to Google Sheets error:', e)
          );
        }
      } catch (err) {
        console.warn('Google Sheets auto-save error on finish:', err);
      }
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Could not report finish-exam to backend:', err);
    return false;
  }
}

export async function reportStudentExit(
  payload: StudentViolationPayload
): Promise<{ success: boolean; exit_count: number; is_locked: boolean; alert_id?: string }> {
  try {
    const res = await fetch('/api/exam/record-exit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      // Auto-save monitoring incident to Google Sheets if connected and enabled
      try {
        const token = await getAccessToken();
        const spreadsheetId = localStorage.getItem('cbt_google_spreadsheet_id');
        const autoSync = localStorage.getItem('cbt_google_auto_sync') !== 'false';
        if (token && spreadsheetId && autoSync && data.alert_id) {
          appendMonitoringEventToSheet(token, spreadsheetId, {
            id: data.alert_id,
            student_nisn: payload.student_nisn,
            student_name: payload.student_name,
            student_class: payload.student_class,
            student_exam_room: payload.student_exam_room || 'Ruang 1',
            subject_name: payload.subject_name || 'Ujian CBT',
            schedule_id: payload.schedule_id || '-',
            exit_count: data.exit_count,
            reason: payload.reason || 'Keluar dari layar ujian CBT',
            timestamp: data.timestamp || new Date().toLocaleTimeString('id-ID'),
            full_date: new Date().toLocaleDateString('id-ID'),
          }).catch((e) => console.warn('Auto-save monitoring event to Google Sheets error:', e));
        }
      } catch (err) {
        console.warn('Google Sheets auto-save error on exit:', err);
      }
      return data;
    }
  } catch (err) {
    console.warn('Could not report exit to backend, saving locally:', err);
  }

  // LocalStorage fallback if server is unreachable
  const key = `cbt_violation_${payload.student_nisn}`;
  const currentCount = Number(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, String(currentCount));
  return {
    success: true,
    exit_count: currentCount,
    is_locked: currentCount >= MAX_ALLOWED_EXITS,
  };
}

export async function fetchStudentLockStatus(
  nisn: string
): Promise<{ exit_count: number; is_locked: boolean; status?: string }> {
  try {
    const res = await fetch(`/api/exam/student-status?nisn=${encodeURIComponent(nisn)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Failed to fetch student status from server, checking local:', e);
  }

  const key = `cbt_violation_${nisn}`;
  const currentCount = Number(localStorage.getItem(key) || '0');
  return {
    exit_count: currentCount,
    is_locked: currentCount >= MAX_ALLOWED_EXITS,
  };
}

export async function resetStudentViolationBackend(
  studentNisn?: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/exam/reset-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_nisn: studentNisn, reset_all: !studentNisn }),
    });
    if (studentNisn) {
      localStorage.removeItem(`cbt_violation_${studentNisn}`);
    } else {
      // Clear all local violation keys
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('cbt_violation_')) {
          localStorage.removeItem(k);
        }
      }
    }
    return res.ok;
  } catch (err) {
    console.warn('Could not reset student on backend:', err);
    if (studentNisn) {
      localStorage.removeItem(`cbt_violation_${studentNisn}`);
    }
    return false;
  }
}
