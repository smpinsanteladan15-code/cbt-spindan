export type ExamStatus = 'Belum aktif' | 'Aktif' | 'Selesai';

export interface ScheduleItem {
  id: string;
  schedule_class: string; // '7' | '8' | '9'
  subject_name: string;
  schedule_date: string; // YYYY-MM-DD
  schedule_start: string; // HH:mm
  schedule_end: string; // HH:mm
  schedule_session: string; // 'Sesi 1' | 'Sesi 2' | 'Sesi 3'
  schedule_open?: boolean;
  schedule_exam_url?: string;
  created_at?: string;
}

export interface StudentItem {
  id: string;
  student_nisn: string;
  student_name: string;
  student_class: string;
  student_absence_number: string;
  student_exam_room?: string; // Ruang Ujian (e.g. Ruang 1)
}

export interface TeacherItem {
  id: string;
  teacher_name: string;
  subject_name: string;
}

export interface DatabaseSyncConfig {
  database_name: string;
  database_source: string;
  last_synced: string;
  is_connected: boolean;
}

export type MainView = 'home' | 'student' | 'guru';

export type GuruTab = 'dashboard' | 'master' | 'schedule' | 'poster' | 'monitoring' | 'results';

export type MasterSubTab = 'students' | 'teachers';

export type ExamParticipantStatus = 'Sedang Mengerjakan' | 'Peringatan' | 'Terkunci' | 'Selesai';

export interface ExamViolationEvent {
  id: string;
  student_nisn: string;
  student_name: string;
  student_class: string;
  student_exam_room: string;
  subject_name: string;
  schedule_id: string;
  exit_count: number;
  reason: string;
  timestamp: string; // HH:mm:ss WIB
  full_date: string;
}

export interface StudentViolationRecord {
  student_nisn: string;
  student_name: string;
  student_class: string;
  student_absence_number: string;
  student_exam_room: string;
  subject_name: string;
  schedule_id: string;
  exit_count: number;
  is_locked: boolean; // True if exit_count >= 5
  status?: ExamParticipantStatus;
  entered_at?: string;
  last_exit_time: string;
  last_exit_reason: string;
  events: ExamViolationEvent[];
  reset_by_proctor?: boolean;
  last_reset_time?: string;
}

export interface MonitoringStats {
  total_violations: number;
  total_locked: number;
  total_warning: number;
  total_active_students: number;
  total_finished: number;
  total_flagged_students: number;
  last_alert_id?: string;
}

export interface ExamResultItem {
  id: string;
  student_nisn: string;
  student_name: string;
  student_class: string;
  student_absence_number: string;
  student_exam_room: string;
  subject_name: string;
  schedule_id: string;
  status: ExamParticipantStatus;
  exit_count: number;
  entered_at: string;
  finished_at: string;
  score?: number | null; // Nilai ujian jika tersedia
  verified_by_proctor: boolean;
  proctor_notes?: string;
  synced_to_sheets?: boolean;
  last_sheets_sync?: string;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  autoSyncEnabled: boolean;
  lastSyncTime?: string;
  lastSyncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncError?: string;
}

