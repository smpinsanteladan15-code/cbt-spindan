import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '10mb' }));

const TEACHER_DB_PATH = path.resolve(
  process.cwd(),
  'public/assets/aistudio/MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_f5f5b44b'
);
const STUDENT_DB_PATH = path.resolve(
  process.cwd(),
  'public/assets/aistudio/MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_83338db6'
);
const TOKEN_FILE_PATH = path.resolve(process.cwd(), '.cbt_exit_token.json');

// Default Exit Token for CBT Lockdown
let currentExitToken = 'SPINDAN2026';
try {
  if (fs.existsSync(TOKEN_FILE_PATH)) {
    const raw = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.exitToken) {
      currentExitToken = parsed.exitToken;
    }
  }
} catch (e) {
  console.warn('Could not read token file', e);
}

const VIOLATIONS_FILE_PATH = path.resolve(process.cwd(), '.cbt_violations.json');
const RESULTS_FILE_PATH = path.resolve(process.cwd(), '.cbt_results.json');
const SHEETS_CONFIG_PATH = path.resolve(process.cwd(), '.cbt_sheets_config.json');
const SCHEDULES_FILE_PATH = path.resolve(process.cwd(), '.cbt_schedules.json');

interface ServerScheduleItem {
  id: string;
  schedule_date: string;
  subject_name: string;
  schedule_class: string;
  schedule_session: string;
  schedule_start: string;
  schedule_end: string;
  schedule_open: boolean;
  schedule_exam_url?: string;
}

let serverSchedules: ServerScheduleItem[] = [];
let schedulesLastModified = Date.now();

const DEFAULT_INITIAL_SCHEDULES: ServerScheduleItem[] = [
  {
    id: 'sample-1',
    schedule_date: '2026-11-03',
    subject_name: 'Bahasa Indonesia',
    schedule_class: '7',
    schedule_session: 'Sesi 1',
    schedule_start: '07:30',
    schedule_end: '09:30',
    schedule_open: true,
    schedule_exam_url: 'https://forms.gle/sampleCbtSmpInsanTeladan7',
  },
  {
    id: 'sample-2',
    schedule_date: '2026-11-03',
    subject_name: 'Pendidikan Agama & Budi Pekerti',
    schedule_class: '8',
    schedule_session: 'Sesi 1',
    schedule_start: '07:30',
    schedule_end: '09:30',
    schedule_open: true,
    schedule_exam_url: 'https://forms.gle/sampleCbtSmpInsanTeladan8',
  },
  {
    id: 'sample-3',
    schedule_date: '2026-11-03',
    subject_name: 'Matematika',
    schedule_class: '7',
    schedule_session: 'Sesi 2',
    schedule_start: '10:00',
    schedule_end: '12:00',
    schedule_open: true,
    schedule_exam_url: 'https://forms.gle/sampleCbtSmpInsanTeladan7m',
  },
  {
    id: 'sample-4',
    schedule_date: '2026-11-04',
    subject_name: 'IPA',
    schedule_class: '8',
    schedule_session: 'Sesi 1',
    schedule_start: '07:30',
    schedule_end: '09:30',
    schedule_open: true,
    schedule_exam_url: 'https://forms.gle/sampleCbtSmpInsanTeladan8ipa',
  },
  {
    id: 'sample-5',
    schedule_date: '2026-11-04',
    subject_name: 'Bahasa Inggris',
    schedule_class: '9',
    schedule_session: 'Sesi 1',
    schedule_start: '07:30',
    schedule_end: '09:30',
    schedule_open: true,
    schedule_exam_url: 'https://forms.gle/sampleCbtSmpInsanTeladan9bing',
  },
  {
    id: 'sample-6',
    schedule_date: '2026-11-05',
    subject_name: 'IPS',
    schedule_class: '9',
    schedule_session: 'Sesi 1',
    schedule_start: '07:30',
    schedule_end: '09:30',
    schedule_open: true,
    schedule_exam_url: 'https://forms.gle/sampleCbtSmpInsanTeladan9ips',
  },
];

function loadSchedulesData() {
  try {
    if (fs.existsSync(SCHEDULES_FILE_PATH)) {
      const raw = fs.readFileSync(SCHEDULES_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        serverSchedules = parsed;
        return;
      }
    }
    serverSchedules = DEFAULT_INITIAL_SCHEDULES;
    saveSchedulesData();
  } catch (e) {
    console.warn('Could not read schedules file:', e);
    serverSchedules = DEFAULT_INITIAL_SCHEDULES;
  }
}

function saveSchedulesData() {
  try {
    fs.writeFileSync(SCHEDULES_FILE_PATH, JSON.stringify(serverSchedules, null, 2), 'utf-8');
    schedulesLastModified = Date.now();
  } catch (e) {
    console.error('Failed to write schedules file:', e);
  }
}

interface ServerViolationEvent {
  id: string;
  student_nisn: string;
  student_name: string;
  student_class: string;
  student_exam_room: string;
  subject_name: string;
  schedule_id: string;
  exit_count: number;
  reason: string;
  timestamp: string;
  full_date: string;
}

interface ServerViolationRecord {
  student_nisn: string;
  student_name: string;
  student_class: string;
  student_absence_number: string;
  student_exam_room: string;
  subject_name: string;
  schedule_id: string;
  exit_count: number;
  is_locked: boolean;
  status?: 'Sedang Mengerjakan' | 'Peringatan' | 'Terkunci' | 'Selesai';
  entered_at?: string;
  last_exit_time: string;
  last_exit_reason: string;
  events: ServerViolationEvent[];
  reset_by_proctor?: boolean;
  last_reset_time?: string;
}

interface ServerMonitoringData {
  records: Record<string, ServerViolationRecord>;
  recentEvents: ServerViolationEvent[];
  lastAlertId: string;
}

interface ServerExamResult {
  id: string;
  student_nisn: string;
  student_name: string;
  student_class: string;
  student_absence_number: string;
  student_exam_room: string;
  subject_name: string;
  schedule_id: string;
  status: 'Sedang Mengerjakan' | 'Peringatan' | 'Terkunci' | 'Selesai';
  exit_count: number;
  entered_at: string;
  finished_at: string;
  score?: number | null;
  verified_by_proctor: boolean;
  proctor_notes?: string;
  synced_to_sheets?: boolean;
  last_sheets_sync?: string;
}

interface ServerSheetsConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  autoSyncEnabled: boolean;
  lastSyncTime?: string;
}

let monitoringData: ServerMonitoringData = {
  records: {},
  recentEvents: [],
  lastAlertId: '',
};

let examResults: Record<string, ServerExamResult> = {};

let sheetsConfig: ServerSheetsConfig = {
  spreadsheetId: '',
  spreadsheetTitle: 'CBT SMP Insan Teladan - Hasil Ujian & Monitoring 2026',
  spreadsheetUrl: '',
  autoSyncEnabled: true,
  lastSyncTime: '',
};

function loadMonitoringData() {
  try {
    if (fs.existsSync(VIOLATIONS_FILE_PATH)) {
      const raw = fs.readFileSync(VIOLATIONS_FILE_PATH, 'utf-8');
      monitoringData = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not read violations file:', e);
  }
}

function saveMonitoringData() {
  try {
    fs.writeFileSync(VIOLATIONS_FILE_PATH, JSON.stringify(monitoringData, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write violations file:', e);
  }
}

function loadResultsData() {
  try {
    if (fs.existsSync(RESULTS_FILE_PATH)) {
      const raw = fs.readFileSync(RESULTS_FILE_PATH, 'utf-8');
      examResults = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not read results file:', e);
  }
}

function saveResultsData() {
  try {
    fs.writeFileSync(RESULTS_FILE_PATH, JSON.stringify(examResults, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write results file:', e);
  }
}

function loadSheetsConfig() {
  try {
    if (fs.existsSync(SHEETS_CONFIG_PATH)) {
      const raw = fs.readFileSync(SHEETS_CONFIG_PATH, 'utf-8');
      sheetsConfig = { ...sheetsConfig, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Could not read sheets config file:', e);
  }
}

function saveSheetsConfig() {
  try {
    fs.writeFileSync(SHEETS_CONFIG_PATH, JSON.stringify(sheetsConfig, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write sheets config file:', e);
  }
}

loadMonitoringData();
loadResultsData();
loadSheetsConfig();
loadSchedulesData();

function getServerWibTime(): { time: string; full_date: string } {
  const d = new Date();
  const time = d.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const full_date = d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return { time: `${time} WIB`, full_date };
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET /api/schedules: Returns current persisted schedules
app.get('/api/schedules', (req, res) => {
  res.json({
    success: true,
    schedules: serverSchedules,
    lastModified: schedulesLastModified,
    count: serverSchedules.length,
  });
});

// POST /api/schedules: Update or replace persisted schedules across all teachers and students
app.post('/api/schedules', (req, res) => {
  const { schedules } = req.body;
  if (!Array.isArray(schedules)) {
    return res.status(400).json({ error: 'Data jadwal harus berupa array' });
  }

  serverSchedules = schedules;
  saveSchedulesData();
  console.log(`[Schedules Sync] Terkini ${serverSchedules.length} jadwal berhasil disimpan secara terpusat.`);
  res.json({
    success: true,
    count: serverSchedules.length,
    schedules: serverSchedules,
    lastModified: schedulesLastModified,
  });
});

// POST /api/schedules/reset: Reset schedules to initial default
app.post('/api/schedules/reset', (req, res) => {
  serverSchedules = DEFAULT_INITIAL_SCHEDULES;
  saveSchedulesData();
  console.log('[Schedules Sync] Jadwal berhasil di-reset ke default.');
  res.json({
    success: true,
    count: serverSchedules.length,
    schedules: serverSchedules,
    lastModified: schedulesLastModified,
  });
});

// Get & Update Exit Token
app.get('/api/database/token', (req, res) => {
  res.json({ exitToken: currentExitToken });
});

app.post('/api/database/token', (req, res) => {
  const { exitToken } = req.body;
  if (!exitToken || typeof exitToken !== 'string') {
    return res.status(400).json({ error: 'Token tidak valid' });
  }
  currentExitToken = exitToken.trim().toUpperCase();
  try {
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify({ exitToken: currentExitToken }), 'utf-8');
  } catch (e) {
    console.error('Failed to write token file', e);
  }
  res.json({ success: true, exitToken: currentExitToken });
});

// POST /api/exam/enter-exam: Register or update student starting the actual exam
app.post('/api/exam/enter-exam', (req, res) => {
  const {
    student_nisn,
    student_name,
    student_class,
    student_absence_number,
    student_exam_room,
    subject_name,
    schedule_id,
  } = req.body;

  const nisn = String(student_nisn || 'UNKNOWN').trim();
  const name = String(student_name || 'Peserta Ujian').trim();
  const cls = String(student_class || '-').trim();
  const room = String(student_exam_room || 'Ruang 1').trim();
  const abs = String(student_absence_number || '-').trim();
  const subject = String(subject_name || 'Ujian CBT').trim();
  const schId = String(schedule_id || '-').trim();

  const { time, full_date } = getServerWibTime();
  const existing = monitoringData.records[nisn];

  const exitCount = existing ? existing.exit_count || 0 : 0;
  const isLocked = existing ? existing.is_locked || exitCount >= 5 : false;
  let status: 'Sedang Mengerjakan' | 'Peringatan' | 'Terkunci' | 'Selesai' = 'Sedang Mengerjakan';

  if (isLocked) {
    status = 'Terkunci';
  } else if (exitCount > 0) {
    status = 'Peringatan';
  } else {
    status = 'Sedang Mengerjakan';
  }

  const updatedRecord: ServerViolationRecord = {
    student_nisn: nisn,
    student_name: name,
    student_class: cls,
    student_absence_number: abs,
    student_exam_room: room,
    subject_name: subject,
    schedule_id: schId,
    exit_count: exitCount,
    is_locked: isLocked,
    status,
    entered_at: existing?.entered_at || time,
    last_exit_time: existing?.last_exit_time || '-',
    last_exit_reason: existing?.last_exit_reason || '-',
    events: existing?.events || [],
  };

  // If newly entering or was finished previously, add an entry log
  if (!existing || existing.status === 'Selesai') {
    const enterEvt: ServerViolationEvent = {
      id: `ENT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      student_nisn: nisn,
      student_name: name,
      student_class: cls,
      student_exam_room: room,
      subject_name: subject,
      schedule_id: schId,
      exit_count: exitCount,
      reason: 'Masuk dan mulai mengerjakan lembar ujian CBT',
      timestamp: time,
      full_date,
    };
    updatedRecord.events.unshift(enterEvt);
    monitoringData.recentEvents.unshift(enterEvt);
    if (monitoringData.recentEvents.length > 50) {
      monitoringData.recentEvents = monitoringData.recentEvents.slice(0, 50);
    }
  }

  monitoringData.records[nisn] = updatedRecord;
  saveMonitoringData();

  console.log(`[CBT Enter] Siswa ${name} (${nisn}) masuk ujian ${subject}. Status=${status}`);
  res.json({ success: true, record: updatedRecord });
});

// POST /api/exam/finish-exam: Mark exam completed with verified exit token
app.post('/api/exam/finish-exam', (req, res) => {
  const { student_nisn } = req.body;
  const nisn = String(student_nisn || '').trim();
  const { time, full_date } = getServerWibTime();

  if (nisn && monitoringData.records[nisn]) {
    const rec = monitoringData.records[nisn];
    rec.status = 'Selesai';
    const finishEvt: ServerViolationEvent = {
      id: `FIN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      student_nisn: rec.student_nisn,
      student_name: rec.student_name,
      student_class: rec.student_class,
      student_exam_room: rec.student_exam_room,
      subject_name: rec.subject_name,
      schedule_id: rec.schedule_id,
      exit_count: rec.exit_count,
      reason: 'Menyelesaikan ujian & keluar resmi dengan token pengawas',
      timestamp: time,
      full_date,
    };
    rec.events.unshift(finishEvt);
    monitoringData.recentEvents.unshift(finishEvt);
    if (monitoringData.recentEvents.length > 50) {
      monitoringData.recentEvents = monitoringData.recentEvents.slice(0, 50);
    }
    saveMonitoringData();

    // Create or update result record
    const resultItem: ServerExamResult = {
      id: `RES-${nisn}-${Date.now()}`,
      student_nisn: rec.student_nisn,
      student_name: rec.student_name,
      student_class: rec.student_class,
      student_absence_number: rec.student_absence_number,
      student_exam_room: rec.student_exam_room,
      subject_name: rec.subject_name,
      schedule_id: rec.schedule_id,
      status: 'Selesai',
      exit_count: rec.exit_count,
      entered_at: rec.entered_at || time,
      finished_at: time,
      score: null,
      verified_by_proctor: true,
      proctor_notes: 'Ujian selesai secara tertib dengan token pengawas',
      synced_to_sheets: false,
    };
    examResults[nisn] = resultItem;
    saveResultsData();

    console.log(`[CBT Finish] Siswa ${rec.student_name} (${nisn}) menyelesaikan ujian CBT.`);
    return res.json({ success: true, result: resultItem });
  }

  res.json({ success: true });
});

// GET /api/exam/results: Get all student exam results and summaries
app.get('/api/exam/results', (req, res) => {
  // Sync any active or finished records from monitoringData into examResults if missing
  const records = Object.values(monitoringData.records);
  for (const r of records) {
    if (!examResults[r.student_nisn]) {
      examResults[r.student_nisn] = {
        id: `RES-${r.student_nisn}-${Date.now()}`,
        student_nisn: r.student_nisn,
        student_name: r.student_name,
        student_class: r.student_class,
        student_absence_number: r.student_absence_number,
        student_exam_room: r.student_exam_room,
        subject_name: r.subject_name,
        schedule_id: r.schedule_id,
        status: r.status || (r.is_locked ? 'Terkunci' : 'Sedang Mengerjakan'),
        exit_count: r.exit_count,
        entered_at: r.entered_at || '-',
        finished_at: r.status === 'Selesai' ? r.last_exit_time : '-',
        score: null,
        verified_by_proctor: r.status === 'Selesai',
        proctor_notes: r.is_locked ? 'Terkunci otomatis (5x keluar)' : '',
        synced_to_sheets: false,
      };
    } else {
      // update status & exit count
      examResults[r.student_nisn].status = r.status || examResults[r.student_nisn].status;
      examResults[r.student_nisn].exit_count = r.exit_count;
      if (r.status === 'Selesai') {
        examResults[r.student_nisn].verified_by_proctor = true;
      }
    }
  }

  const resultsList = Object.values(examResults);
  res.json({
    results: resultsList,
    total: resultsList.length,
    completedCount: resultsList.filter((r) => r.status === 'Selesai').length,
    lockedCount: resultsList.filter((r) => r.status === 'Terkunci' || r.exit_count >= 5).length,
    sheetsConfig,
  });
});

// POST /api/exam/results: Update score or notes for a student
app.post('/api/exam/results', (req, res) => {
  const { student_nisn, score, proctor_notes, synced_to_sheets } = req.body;
  const nisn = String(student_nisn || '').trim();
  if (!nisn) {
    return res.status(400).json({ error: 'NISN tidak valid' });
  }

  if (examResults[nisn]) {
    if (score !== undefined) examResults[nisn].score = score;
    if (proctor_notes !== undefined) examResults[nisn].proctor_notes = proctor_notes;
    if (synced_to_sheets !== undefined) {
      examResults[nisn].synced_to_sheets = synced_to_sheets;
      const { time } = getServerWibTime();
      examResults[nisn].last_sheets_sync = time;
    }
    saveResultsData();
    return res.json({ success: true, result: examResults[nisn] });
  }

  res.status(404).json({ error: 'Data hasil ujian tidak ditemukan' });
});

// GET /api/sheets/config: Get Google Sheets sync configuration
app.get('/api/sheets/config', (req, res) => {
  res.json({ success: true, config: sheetsConfig });
});

// POST /api/sheets/config: Update Google Sheets sync configuration
app.post('/api/sheets/config', (req, res) => {
  const { spreadsheetId, spreadsheetTitle, spreadsheetUrl, autoSyncEnabled, lastSyncTime } = req.body;
  if (spreadsheetId !== undefined) {
    let cleanId = String(spreadsheetId).trim();
    const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) cleanId = match[1];
    sheetsConfig.spreadsheetId = cleanId;
    sheetsConfig.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
  }
  if (spreadsheetTitle !== undefined) sheetsConfig.spreadsheetTitle = String(spreadsheetTitle).trim();
  if (spreadsheetUrl !== undefined && !sheetsConfig.spreadsheetUrl) sheetsConfig.spreadsheetUrl = String(spreadsheetUrl).trim();
  if (autoSyncEnabled !== undefined) sheetsConfig.autoSyncEnabled = Boolean(autoSyncEnabled);
  if (lastSyncTime !== undefined) sheetsConfig.lastSyncTime = String(lastSyncTime);

  saveSheetsConfig();
  console.log(`[Google Sheets] Updated config: ID=${sheetsConfig.spreadsheetId}, AutoSync=${sheetsConfig.autoSyncEnabled}`);
  res.json({ success: true, config: sheetsConfig });
});

// GET /api/exam/monitoring: Full monitoring state for teacher panel
app.get('/api/exam/monitoring', (req, res) => {
  const recordsList = Object.values(monitoringData.records);
  const totalViolations = recordsList.reduce((acc, r) => acc + (r.exit_count || 0), 0);
  const totalLocked = recordsList.filter((r) => r.is_locked || r.exit_count >= 5).length;
  const totalWarning = recordsList.filter((r) => r.exit_count > 0 && r.exit_count < 5).length;
  const totalActive = recordsList.filter((r) => r.status === 'Sedang Mengerjakan').length;
  const totalFinished = recordsList.filter((r) => r.status === 'Selesai').length;

  // Extract lists of locked and warning students for immediate identification
  const lockedStudents = recordsList
    .filter((r) => r.is_locked || r.exit_count >= 5)
    .map((r) => ({
      student_nisn: r.student_nisn,
      student_name: r.student_name,
      student_class: r.student_class,
      student_exam_room: r.student_exam_room,
      exit_count: r.exit_count,
      last_exit_time: r.last_exit_time,
    }));

  const warningStudents = recordsList
    .filter((r) => r.exit_count > 0 && r.exit_count < 5)
    .map((r) => ({
      student_nisn: r.student_nisn,
      student_name: r.student_name,
      student_class: r.student_class,
      student_exam_room: r.student_exam_room,
      exit_count: r.exit_count,
      last_exit_time: r.last_exit_time,
    }));

  res.json({
    records: recordsList,
    recentEvents: monitoringData.recentEvents || [],
    lastAlertId: monitoringData.lastAlertId || '',
    stats: {
      total_violations: totalViolations,
      total_locked: totalLocked,
      total_warning: totalWarning,
      total_active_students: totalActive,
      total_finished: totalFinished,
      total_flagged_students: recordsList.length,
    },
    lockedStudents,
    warningStudents,
  });
});

// GET /api/exam/student-status: Check single student lock/exit count
app.get('/api/exam/student-status', (req, res) => {
  const nisn = String(req.query.nisn || '').trim();
  if (!nisn) {
    return res.json({ exit_count: 0, is_locked: false });
  }
  const record = monitoringData.records[nisn];
  if (!record) {
    return res.json({ exit_count: 0, is_locked: false });
  }
  res.json({
    exit_count: record.exit_count,
    is_locked: record.is_locked || record.exit_count >= 5,
    status: record.status || (record.exit_count >= 5 ? 'Terkunci' : record.exit_count > 0 ? 'Peringatan' : 'Sedang Mengerjakan'),
    student_name: record.student_name,
  });
});

// POST /api/exam/record-exit: Records student forced-exit / security violation
app.post('/api/exam/record-exit', (req, res) => {
  const {
    student_nisn,
    student_name,
    student_class,
    student_absence_number,
    student_exam_room,
    subject_name,
    schedule_id,
    reason,
  } = req.body;

  const nisn = String(student_nisn || 'UNKNOWN').trim();
  const name = String(student_name || 'Siswa Tanpa Nama').trim();
  const cls = String(student_class || '-').trim();
  const room = String(student_exam_room || 'Ruang 1').trim();
  const abs = String(student_absence_number || '-').trim();
  const subject = String(subject_name || 'Ujian CBT').trim();
  const schId = String(schedule_id || '-').trim();
  const exitReason = String(reason || 'Memaksa keluar dari layar ujian CBT').trim();

  const { time, full_date } = getServerWibTime();
  const alertId = `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const existingRecord = monitoringData.records[nisn] || {
    student_nisn: nisn,
    student_name: name,
    student_class: cls,
    student_absence_number: abs,
    student_exam_room: room,
    subject_name: subject,
    schedule_id: schId,
    exit_count: 0,
    is_locked: false,
    status: 'Sedang Mengerjakan',
    entered_at: time,
    last_exit_time: time,
    last_exit_reason: exitReason,
    events: [],
  };

  const newExitCount = (existingRecord.exit_count || 0) + 1;
  const isLocked = newExitCount >= 5;

  const eventItem: ServerViolationEvent = {
    id: alertId,
    student_nisn: nisn,
    student_name: name,
    student_class: cls,
    student_exam_room: room,
    subject_name: subject,
    schedule_id: schId,
    exit_count: newExitCount,
    reason: exitReason,
    timestamp: time,
    full_date,
  };

  existingRecord.student_name = name;
  existingRecord.student_class = cls;
  existingRecord.student_exam_room = room;
  existingRecord.subject_name = subject;
  existingRecord.schedule_id = schId;
  existingRecord.exit_count = newExitCount;
  existingRecord.is_locked = isLocked;
  existingRecord.status = isLocked ? 'Terkunci' : 'Peringatan';
  existingRecord.last_exit_time = time;
  existingRecord.last_exit_reason = exitReason;
  existingRecord.reset_by_proctor = false;
  existingRecord.events.unshift(eventItem);
  if (existingRecord.events.length > 20) {
    existingRecord.events = existingRecord.events.slice(0, 20);
  }

  monitoringData.records[nisn] = existingRecord;
  monitoringData.recentEvents.unshift(eventItem);
  if (monitoringData.recentEvents.length > 50) {
    monitoringData.recentEvents = monitoringData.recentEvents.slice(0, 50);
  }
  monitoringData.lastAlertId = alertId;

  saveMonitoringData();

  console.log(`[CBT Alert] Siswa ${name} (${nisn}) keluar ujian ke-${newExitCount}x (${exitReason}). Locked=${isLocked}`);

  res.json({
    success: true,
    exit_count: newExitCount,
    is_locked: isLocked,
    status: existingRecord.status,
    alert_id: alertId,
    timestamp: time,
  });
});

// POST /api/exam/reset-student: Reset a student's violation count & unlock them
app.post('/api/exam/reset-student', (req, res) => {
  const { student_nisn, reset_all } = req.body;
  const { time, full_date } = getServerWibTime();

  if (reset_all) {
    // Reset all students
    Object.keys(monitoringData.records).forEach((k) => {
      monitoringData.records[k].exit_count = 0;
      monitoringData.records[k].is_locked = false;
      monitoringData.records[k].status = 'Sedang Mengerjakan';
      monitoringData.records[k].reset_by_proctor = true;
      monitoringData.records[k].last_reset_time = time;
    });
    monitoringData.recentEvents.unshift({
      id: `RST-ALL-${Date.now()}`,
      student_nisn: 'ALL',
      student_name: 'Seluruh Siswa',
      student_class: '-',
      student_exam_room: '-',
      subject_name: 'Semua Mapel',
      schedule_id: '-',
      exit_count: 0,
      reason: 'Pengawas Ruang mereset status & kunci seluruh siswa',
      timestamp: time,
      full_date,
    });
    saveMonitoringData();
    console.log(`[CBT Reset] Seluruh siswa telah di-reset oleh pengawas pada ${time}`);
    return res.json({ success: true, message: 'Semua siswa berhasil di-reset' });
  }

  const nisn = String(student_nisn || '').trim();
  if (!nisn) {
    return res.status(400).json({ error: 'NISN tidak valid' });
  }

  let rec = monitoringData.records[nisn];
  if (!rec) {
    rec = {
      student_nisn: nisn,
      student_name: 'Siswa',
      student_class: '-',
      student_absence_number: '-',
      student_exam_room: 'Ruang 1',
      subject_name: '-',
      schedule_id: '-',
      exit_count: 0,
      is_locked: false,
      status: 'Sedang Mengerjakan',
      entered_at: time,
      last_exit_time: time,
      last_exit_reason: 'Status dibersihkan',
      events: [],
      reset_by_proctor: true,
      last_reset_time: time,
    };
    monitoringData.records[nisn] = rec;
  } else {
    rec.exit_count = 0;
    rec.is_locked = false;
    rec.status = 'Sedang Mengerjakan';
    rec.reset_by_proctor = true;
    rec.last_reset_time = time;
  }

  const resetEvt: ServerViolationEvent = {
    id: `RST-${Date.now()}`,
    student_nisn: nisn,
    student_name: rec.student_name,
    student_class: rec.student_class,
    student_exam_room: rec.student_exam_room,
    subject_name: rec.subject_name,
    schedule_id: rec.schedule_id,
    exit_count: 0,
    reason: 'Status ujian dibuka & di-reset oleh Pengawas Ruang',
    timestamp: time,
    full_date,
  };
  rec.events.unshift(resetEvt);
  monitoringData.recentEvents.unshift(resetEvt);

  saveMonitoringData();
  console.log(`[CBT Reset] Siswa ${rec.student_name} (${nisn}) berhasil di-reset & dibuka kuncinya pada ${time}`);

  res.json({
    success: true,
    message: `Siswa ${rec.student_name} berhasil di-reset. Ujian dapat dilanjutkan kembali.`,
    student_nisn: nisn,
  });
});

// POST /api/exam/clear-session: Clear all monitoring records and start fresh session (0 students)
app.post('/api/exam/clear-session', (req, res) => {
  monitoringData = {
    records: {},
    recentEvents: [],
    lastAlertId: '',
  };
  examResults = {};
  saveMonitoringData();
  saveResultsData();
  console.log('[CBT Session] Seluruh sesi dan rekap monitoring telah dibersihkan menjadi 0 peserta.');
  res.json({ success: true, message: 'Sesi monitoring berhasil dibersihkan ke kondisi awal (0 peserta).' });
});

// Save Teachers to disk file
app.post('/api/database/save-teachers', async (req, res) => {
  try {
    const { teachers } = req.body;
    if (!Array.isArray(teachers)) {
      return res.status(400).json({ error: 'Data guru harus berupa array' });
    }

    const lines: string[] = ['No.,Nama,Mata pelajaran'];
    teachers.forEach((t: { teacher_name: string; subject_name: string }, idx: number) => {
      const name = String(t.teacher_name || '').replace(/"/g, '""');
      const subject = String(t.subject_name || '').replace(/"/g, '""');
      lines.push(`${idx + 1},"${name}",${subject}`);
    });

    const csvContent = lines.join('\n');
    await fs.promises.mkdir(path.dirname(TEACHER_DB_PATH), { recursive: true });
    await fs.promises.writeFile(TEACHER_DB_PATH, csvContent, 'utf-8');

    console.log(`[Database Sync] Updated ${teachers.length} teachers to ${TEACHER_DB_PATH}`);
    res.json({ success: true, count: teachers.length, path: TEACHER_DB_PATH });
  } catch (error) {
    console.error('Failed to save teacher database file:', error);
    res.status(500).json({ error: 'Gagal memperbarui file database guru' });
  }
});

// Save Students to disk file
app.post('/api/database/save-students', async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students)) {
      return res.status(400).json({ error: 'Data siswa harus berupa array' });
    }

    const lines: string[] = ['matematika,Bu sum,Kelas,Nomer Absen,Ruang Ujian'];
    students.forEach((s: {
      student_nisn: string;
      student_name: string;
      student_class: string;
      student_absence_number: string;
      student_exam_room?: string;
    }) => {
      const nisn = String(s.student_nisn || '').trim();
      const name = String(s.student_name || '').trim();
      let cls = String(s.student_class || 'KELAS 7').trim();
      if (/^[789]$/.test(cls)) {
        cls = `KELAS ${cls}`;
      } else if (/^([789])[AB]$/i.test(cls)) {
        cls = `KELAS ${cls[0]}`;
      }
      const abs = String(s.student_absence_number || '1').trim();
      const room = String(s.student_exam_room || 'Ruang 1').trim();

      lines.push(`${nisn},${name},${cls},${abs},${room}`);
    });

    const csvContent = lines.join('\n');
    await fs.promises.mkdir(path.dirname(STUDENT_DB_PATH), { recursive: true });
    await fs.promises.writeFile(STUDENT_DB_PATH, csvContent, 'utf-8');

    console.log(`[Database Sync] Updated ${students.length} students to ${STUDENT_DB_PATH}`);
    res.json({ success: true, count: students.length, path: STUDENT_DB_PATH });
  } catch (error) {
    console.error('Failed to save student database file:', error);
    res.status(500).json({ error: 'Gagal memperbarui file database siswa' });
  }
});

// Setup Vite Dev Server / Static Serve
async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 CBT SMP Insan Teladan Fullstack Server running at http://${HOST}:${PORT}`);
  });

  const cleanup = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap server', err);
});
