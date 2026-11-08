import { ExamResultItem, ExamViolationEvent, StudentViolationRecord, TeacherItem, StudentItem, ScheduleItem } from '../types/cbt';

export const SHEET_TAB_RESULTS = 'Hasil Ujian CBT';
export const SHEET_TAB_MONITORING = 'Log Monitoring Siswa';
export const SHEET_TAB_REKAP = 'Rekap Peserta CBT';
export const SHEET_TAB_TEACHERS = 'Master Guru';
export const SHEET_TAB_STUDENTS = 'Master Siswa';
export const SHEET_TAB_SCHEDULES = 'Jadwal & Link Ujian';

const RESULTS_HEADERS = [
  'No.',
  'Timestamp Selesai',
  'NISN',
  'Nama Siswa',
  'Kelas',
  'Ruang Ujian',
  'No. Absen',
  'Mata Pelajaran',
  'Status Ujian',
  'Total Keluar',
  'Waktu Masuk (WIB)',
  'Waktu Selesai (WIB)',
  'Token Keluar Pengawas',
  'Catatan Pengawas',
];

const MONITORING_HEADERS = [
  'ID Kejadian',
  'Waktu (WIB)',
  'Tanggal',
  'NISN',
  'Nama Siswa',
  'Kelas',
  'Ruang Ujian',
  'Mata Pelajaran',
  'Frekuensi Keluar',
  'Status Terkini',
  'Keterangan / Alasan Keluar',
];

const REKAP_HEADERS = [
  'No.',
  'NISN',
  'Nama Siswa',
  'Kelas',
  'Ruang Ujian',
  'Status Kehadiran',
  'Status Akhir Ujian',
  'Waktu Diperbarui',
];

const TEACHER_HEADERS = ['No.', 'Nama', 'Mata pelajaran'];
const STUDENT_HEADERS = ['matematika (NISN)', 'Nama Siswa', 'Kelas', 'Nomer Absen', 'Ruang Ujian'];
const SCHEDULE_HEADERS = ['No.', 'Tanggal', 'Mata Pelajaran', 'Kelas', 'Sesi', 'Jam Mulai', 'Jam Selesai', 'Link Ujian (HTTPS)'];

/**
 * Creates a brand new Google Spreadsheet with pre-formatted sheets and headers
 */
export async function createCbtSpreadsheet(
  accessToken: string,
  customTitle?: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const dateStr = new Date().toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-');

  const title = customTitle || `CBT SMP Insan Teladan - Hasil & Monitoring (${dateStr})`;

  const requestBody = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: SHEET_TAB_RESULTS,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: SHEET_TAB_MONITORING,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: SHEET_TAB_REKAP,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: SHEET_TAB_TEACHERS,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: SHEET_TAB_STUDENTS,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: SHEET_TAB_SCHEDULES,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal membuat Google Spreadsheet: ${res.status} ${res.statusText} - ${errorText}`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write header rows and format headers
  await initializeSheetHeaders(accessToken, spreadsheetId);

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
}

/**
 * Initializes header rows for all 6 sheets
 */
export async function initializeSheetHeaders(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  const valueData = [
    {
      range: `'${SHEET_TAB_RESULTS}'!A1:N1`,
      values: [RESULTS_HEADERS],
    },
    {
      range: `'${SHEET_TAB_MONITORING}'!A1:K1`,
      values: [MONITORING_HEADERS],
    },
    {
      range: `'${SHEET_TAB_REKAP}'!A1:H1`,
      values: [REKAP_HEADERS],
    },
    {
      range: `'${SHEET_TAB_TEACHERS}'!A1:C1`,
      values: [TEACHER_HEADERS],
    },
    {
      range: `'${SHEET_TAB_STUDENTS}'!A1:E1`,
      values: [STUDENT_HEADERS],
    },
    {
      range: `'${SHEET_TAB_SCHEDULES}'!A1:H1`,
      values: [SCHEDULE_HEADERS],
    },
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueData,
      }),
    }
  );
}

/**
 * Appends a single exam result to the Hasil Ujian sheet automatically
 */
export async function appendExamResultToSheet(
  accessToken: string,
  spreadsheetId: string,
  result: ExamResultItem,
  rowIndex = 1
): Promise<boolean> {
  const rowValues = [
    rowIndex,
    new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }),
    result.student_nisn,
    result.student_name,
    result.student_class,
    result.student_exam_room,
    result.student_absence_number,
    result.subject_name,
    result.status,
    result.exit_count,
    result.entered_at || '-',
    result.finished_at || '-',
    result.verified_by_proctor ? 'Terverifikasi (Resmi)' : 'Paksa Keluar / Belum Resmi',
    result.proctor_notes || 'Tersimpan otomatis dari sistem CBT',
  ];

  const range = `'${SHEET_TAB_RESULTS}'!A:N`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  return res.ok;
}

/**
 * Appends a monitoring violation event to the Log Monitoring sheet automatically
 */
export async function appendMonitoringEventToSheet(
  accessToken: string,
  spreadsheetId: string,
  event: ExamViolationEvent
): Promise<boolean> {
  const rowValues = [
    event.id,
    event.timestamp,
    event.full_date,
    event.student_nisn,
    event.student_name,
    event.student_class,
    event.student_exam_room || 'Ruang 1',
    event.subject_name,
    `${event.exit_count}x`,
    event.exit_count >= 5 ? 'Terkunci ⛔' : event.exit_count > 0 ? 'Peringatan ⚠️' : 'Normal / Masuk',
    event.reason,
  ];

  const range = `'${SHEET_TAB_MONITORING}'!A:K`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  return res.ok;
}

/**
 * Batch sync entire exam results table to Google Sheets
 */
export async function syncAllExamResultsToSheet(
  accessToken: string,
  spreadsheetId: string,
  results: ExamResultItem[]
): Promise<{ success: boolean; rowCount: number }> {
  // First ensure sheet exists & headers are present
  await initializeSheetHeaders(accessToken, spreadsheetId);

  const rows = results.map((r, idx) => [
    idx + 1,
    r.finished_at || r.last_sheets_sync || '-',
    r.student_nisn,
    r.student_name,
    r.student_class,
    r.student_exam_room,
    r.student_absence_number,
    r.subject_name,
    r.status,
    r.exit_count,
    r.entered_at || '-',
    r.finished_at || '-',
    r.verified_by_proctor ? 'Terverifikasi (Resmi)' : 'Paksa Keluar / Belum Resmi',
    r.proctor_notes || 'Tersimpan dari sistem CBT SMP Insan Teladan',
  ]);

  // Overwrite rows from A2 onwards
  const range = `'${SHEET_TAB_RESULTS}'!A2:N${Math.max(rows.length + 1, 2)}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: rows.length > 0 ? rows : [['', '', '', '', '', '', '', '', '', '', '', '', '', '']],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal menyinkronkan hasil ujian: ${err}`);
  }

  return { success: true, rowCount: rows.length };
}

/**
 * Batch sync live monitoring events & student status to Google Sheets
 */
export async function syncAllMonitoringToSheet(
  accessToken: string,
  spreadsheetId: string,
  records: StudentViolationRecord[],
  recentEvents: ExamViolationEvent[]
): Promise<{ success: boolean; eventCount: number; recordCount: number }> {
  await initializeSheetHeaders(accessToken, spreadsheetId);

  // Sync recent events to Log Monitoring Siswa
  const eventRows = recentEvents.map((evt) => [
    evt.id,
    evt.timestamp,
    evt.full_date,
    evt.student_nisn,
    evt.student_name,
    evt.student_class,
    evt.student_exam_room || 'Ruang 1',
    evt.subject_name,
    `${evt.exit_count}x`,
    evt.exit_count >= 5 ? 'TERKUNCI ⛔' : evt.exit_count > 0 ? 'Peringatan ⚠️' : 'Sedang Mengerjakan / Masuk',
    evt.reason,
  ]);

  if (eventRows.length > 0) {
    const rangeEvents = `'${SHEET_TAB_MONITORING}'!A2:K${eventRows.length + 1}`;
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeEvents)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: rangeEvents,
          majorDimension: 'ROWS',
          values: eventRows,
        }),
      }
    );
  }

  // Sync Rekapitulasi Peserta
  const rekapRows = records.map((rec, idx) => [
    idx + 1,
    rec.student_nisn,
    rec.student_name,
    rec.student_class,
    rec.student_exam_room || 'Ruang 1',
    rec.status === 'Selesai' ? 'Hadir & Selesai' : 'Sedang Mengikuti Ujian',
    rec.is_locked ? 'Terkunci (5x Keluar)' : rec.status || 'Aktif',
    new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }),
  ]);

  if (rekapRows.length > 0) {
    const rangeRekap = `'${SHEET_TAB_REKAP}'!A2:H${rekapRows.length + 1}`;
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeRekap)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: rangeRekap,
          majorDimension: 'ROWS',
          values: rekapRows,
        }),
      }
    );
  }

  return {
    success: true,
    eventCount: eventRows.length,
    recordCount: rekapRows.length,
  };
}

/**
 * Verify spreadsheet exists and can be accessed
 */
export async function getSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheets: string[] }> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Tidak dapat mengakses spreadsheet (ID: ${spreadsheetId}). Pastikan ID benar dan izin akses sudah aktif.`);
  }

  const data = await res.json();
  const sheets = (data.sheets || []).map((s: { properties?: { title?: string } }) => s.properties?.title || '');

  return {
    title: data.properties?.title || 'Google Spreadsheet CBT',
    sheets,
  };
}

/**
 * Ensures a specific sheet tab exists, adding it if missing
 */
export async function ensureSheetTabExists(
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string
): Promise<void> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      const existingTitles = (data.sheets || []).map((s: { properties?: { title?: string } }) => s.properties?.title);
      if (existingTitles.includes(tabTitle)) {
        return;
      }
    }

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: tabTitle,
                gridProperties: { frozenRowCount: 1 },
              },
            },
          },
        ],
      }),
    });
  } catch (err) {
    console.warn(`Could not ensure tab ${tabTitle} exists:`, err);
  }
}

/**
 * Uploads/syncs teachers directly to Google Sheet tab 'Master Guru'
 */
export async function syncTeachersToSheet(
  accessToken: string,
  spreadsheetId: string,
  teachers: TeacherItem[]
): Promise<{ success: boolean; rowCount: number }> {
  await ensureSheetTabExists(accessToken, spreadsheetId, SHEET_TAB_TEACHERS);

  // Set header
  const headerRange = `'${SHEET_TAB_TEACHERS}'!A1:C1`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(headerRange)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: headerRange,
        majorDimension: 'ROWS',
        values: [TEACHER_HEADERS],
      }),
    }
  );

  const rows = teachers.map((t, idx) => [
    idx + 1,
    t.teacher_name,
    t.subject_name,
  ]);

  const range = `'${SHEET_TAB_TEACHERS}'!A2:C${Math.max(rows.length + 1, 2)}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: rows.length > 0 ? rows : [['', '', '']],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal menyinkronkan data guru ke Google Sheets: ${err}`);
  }

  return { success: true, rowCount: rows.length };
}

/**
 * Reads Master Guru directly from Google Sheets tab 'Master Guru'
 */
export async function fetchTeachersFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Omit<TeacherItem, 'id'>[]> {
  const range = `'${SHEET_TAB_TEACHERS}'!A1:C100`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal membaca tab Master Guru dari Google Sheets: ${err}`);
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];
  if (rows.length < 2) return [];

  const results: Omit<TeacherItem, 'id'>[] = [];
  const startIndex =
    rows[0][0]?.toString().toLowerCase().includes('no') ||
    rows[0][1]?.toString().toLowerCase().includes('nama')
      ? 1
      : 0;

  for (let i = startIndex; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 2) continue;
    const name = (r[1] || r[0] || '').trim();
    const subject = (r[2] || r[1] || '').trim();
    if (name && subject) {
      results.push({
        teacher_name: name,
        subject_name: subject,
      });
    }
  }

  return results;
}

/**
 * Uploads/syncs students directly to Google Sheet tab 'Master Siswa'
 */
export async function syncStudentsToSheet(
  accessToken: string,
  spreadsheetId: string,
  students: StudentItem[]
): Promise<{ success: boolean; rowCount: number }> {
  await ensureSheetTabExists(accessToken, spreadsheetId, SHEET_TAB_STUDENTS);

  const headerRange = `'${SHEET_TAB_STUDENTS}'!A1:E1`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(headerRange)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: headerRange,
        majorDimension: 'ROWS',
        values: [STUDENT_HEADERS],
      }),
    }
  );

  const rows = students.map((s) => [
    s.student_nisn,
    s.student_name,
    s.student_class,
    s.student_absence_number,
    s.student_exam_room || 'Ruang 1',
  ]);

  const range = `'${SHEET_TAB_STUDENTS}'!A2:E${Math.max(rows.length + 1, 2)}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: rows.length > 0 ? rows : [['', '', '', '', '']],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal menyinkronkan data siswa ke Google Sheets: ${err}`);
  }

  return { success: true, rowCount: rows.length };
}

/**
 * Reads Master Siswa directly from Google Sheets tab 'Master Siswa'
 */
export async function fetchStudentsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Omit<StudentItem, 'id'>[]> {
  const range = `'${SHEET_TAB_STUDENTS}'!A1:E500`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal membaca tab Master Siswa dari Google Sheets: ${err}`);
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];
  if (rows.length < 2) return [];

  const results: Omit<StudentItem, 'id'>[] = [];
  const startIndex =
    rows[0][0]?.toString().toLowerCase().includes('matematika') ||
    rows[0][0]?.toString().toLowerCase().includes('nisn') ||
    rows[0][1]?.toString().toLowerCase().includes('nama')
      ? 1
      : 0;

  for (let i = startIndex; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 4) continue;
    const nisn = (r[0] || '').trim();
    const name = (r[1] || '').trim();
    let cls = (r[2] || '').trim();
    if (/^[789]$/.test(cls)) {
      cls = `KELAS ${cls}`;
    }
    const abs = (r[3] || '').trim();
    const room = (r[4] || 'Ruang 1').trim();
    if (name) {
      results.push({
        student_nisn: nisn,
        student_name: name,
        student_class: cls || 'KELAS 7',
        student_absence_number: abs || '1',
        student_exam_room: room,
      });
    }
  }

  return results;
}

/**
 * Uploads/syncs schedules and exam links to Google Sheets tab 'Jadwal & Link Ujian'
 */
export async function syncSchedulesToSheet(
  accessToken: string,
  spreadsheetId: string,
  schedules: ScheduleItem[]
): Promise<{ success: boolean; rowCount: number }> {
  await ensureSheetTabExists(accessToken, spreadsheetId, SHEET_TAB_SCHEDULES);

  const headerRange = `'${SHEET_TAB_SCHEDULES}'!A1:H1`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(headerRange)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: headerRange,
        majorDimension: 'ROWS',
        values: [SCHEDULE_HEADERS],
      }),
    }
  );

  const rows = schedules.map((s, idx) => [
    idx + 1,
    s.schedule_date,
    s.subject_name,
    `Kelas ${s.schedule_class}`,
    s.schedule_session,
    s.schedule_start,
    s.schedule_end,
    s.schedule_exam_url || '',
  ]);

  const range = `'${SHEET_TAB_SCHEDULES}'!A2:H${Math.max(rows.length + 1, 2)}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: rows.length > 0 ? rows : [['', '', '', '', '', '', '', '']],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal menyinkronkan jadwal ke Google Sheets: ${err}`);
  }

  return { success: true, rowCount: rows.length };
}

/**
 * Reads schedules and exam links from Google Sheets tab 'Jadwal & Link Ujian'
 */
export async function fetchSchedulesFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Omit<ScheduleItem, 'id'>[]> {
  const range = `'${SHEET_TAB_SCHEDULES}'!A1:H100`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal membaca tab Jadwal dari Google Sheets: ${err}`);
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];
  if (rows.length < 2) return [];

  const results: Omit<ScheduleItem, 'id'>[] = [];
  const startIndex =
    rows[0][0]?.toString().toLowerCase().includes('no') ||
    rows[0][1]?.toString().toLowerCase().includes('tanggal')
      ? 1
      : 0;

  for (let i = startIndex; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 7) continue;
    const date = (r[1] || '').trim();
    const subject = (r[2] || '').trim();
    const clsRaw = (r[3] || '7').replace(/[^0-9]/g, '');
    const session = (r[4] || 'Sesi 1').trim();
    const start = (r[5] || '07:30').trim();
    const end = (r[6] || '09:30').trim();
    const examUrl = (r[7] || '').trim();

    if (subject && date) {
      results.push({
        schedule_date: date,
        subject_name: subject,
        schedule_class: clsRaw || '7',
        schedule_session: session,
        schedule_start: start,
        schedule_end: end,
        schedule_open: true,
        schedule_exam_url: examUrl,
      });
    }
  }

  return results;
}
