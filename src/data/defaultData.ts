import { ScheduleItem, StudentItem, TeacherItem, DatabaseSyncConfig } from '../types/cbt';

export const SUBJECT_OPTIONS = [
  'Etika Syariah Islam',
  'Kewirausahaan',
  'Seni Budaya & Prakarya',
  'Matematika',
  'Bahasa Jawa',
  'Bahasa Inggris',
  'PAI-BP',
  'Bahasa Arab',
  'BTA Tahfidz',
  'Sains',
  'PJOK',
  'Informatika',
  'Bahasa Indonesia',
  'IPA',
  'IPS',
  'Pendidikan Pancasila',
];

// Seeded from updated MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_f5f5b44b
export const DEFAULT_TEACHERS: TeacherItem[] = [
  { id: 't-1', teacher_name: 'Istiqomah, S. Pd. I, M. Pd.', subject_name: 'Etika Syariah Islam' },
  { id: 't-2', teacher_name: 'Ika Yuli Setyaningrum, S. Psi', subject_name: 'Kewirausahaan' },
  { id: 't-3', teacher_name: 'Ika Yuli Setyaningrum, S. Psi', subject_name: 'Seni Budaya & Prakarya' },
  { id: 't-4', teacher_name: 'Sumiyatun, S. Pd', subject_name: 'Matematika' },
  { id: 't-5', teacher_name: 'Sumiyatun, S. Pd', subject_name: 'Bahasa Jawa' },
  { id: 't-6', teacher_name: "Ma'rifah Auliyanto, S. Pd", subject_name: 'Bahasa Inggris' },
  { id: 't-7', teacher_name: 'Arif Khakim, S. Pd', subject_name: 'PAI-BP' },
  { id: 't-8', teacher_name: 'Arif Khakim, S. Pd', subject_name: 'Bahasa Arab' },
  { id: 't-9', teacher_name: 'Najwatus Suffa, AH', subject_name: 'BTA Tahfidz' },
  { id: 't-10', teacher_name: 'Diah Ayu Puspitasari, SKM', subject_name: 'Sains' },
  { id: 't-11', teacher_name: 'Arif Setawan, S. Pd', subject_name: 'PJOK' },
  { id: 't-12', teacher_name: 'Muhammad Ali Ilzam', subject_name: 'Informatika' },
  { id: 't-13', teacher_name: 'Bidayatul Ilmi, S. E.', subject_name: 'Bahasa Indonesia' },
  { id: 't-14', teacher_name: 'Nabil Akila, S. Pd.', subject_name: 'IPA' },
  { id: 't-15', teacher_name: 'Novita Saadatul Hidayah, SE. ', subject_name: 'IPS' },
  { id: 't-16', teacher_name: 'Novita Saadatul Hidayah, SE. ', subject_name: 'Pendidikan Pancasila' },
];

export const DEFAULT_SCHEDULES: ScheduleItem[] = [
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

// Seeded with official student master database from MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_83338db6
export const DEFAULT_STUDENTS: StudentItem[] = [
  {
    id: 'db-std-1',
    student_nisn: '0130007004',
    student_name: 'Ahmad Ghiyast',
    student_class: 'KELAS 7',
    student_absence_number: '4',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-2',
    student_nisn: '0130007005',
    student_name: 'AISYAH NURI AHMAD',
    student_class: 'KELAS 7',
    student_absence_number: '5',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-3',
    student_nisn: '0130007007',
    student_name: 'ATHALLAH DARREN KAYANA',
    student_class: 'KELAS 7',
    student_absence_number: '7',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-4',
    student_nisn: '0132001009',
    student_name: 'DEWI ZAHRA GANI',
    student_class: 'KELAS 7',
    student_absence_number: '9',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-5',
    student_nisn: '3149587132',
    student_name: 'LATISYA AVRINIA PUTRI',
    student_class: 'KELAS 7',
    student_absence_number: '14',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-6',
    student_nisn: '0123861075',
    student_name: 'LUTHFI AZKA ZAIDAN',
    student_class: 'KELAS 7',
    student_absence_number: '15',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-7',
    student_nisn: '3141947085',
    student_name: 'MUHAMMAD ZHAFRAN NOOR VIDYANTO',
    student_class: 'KELAS 7',
    student_absence_number: '19',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-8',
    student_nisn: '0135985455',
    student_name: 'AJENG SISTRI SANDI AULIYA',
    student_class: 'KELAS 8',
    student_absence_number: '6',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-9',
    student_nisn: '0083976488',
    student_name: 'DONI SETIAWAN NUGROHO',
    student_class: 'KELAS 8',
    student_absence_number: '10',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-10',
    student_nisn: '0129052112',
    student_name: 'Muhammad Haikal Ulul Azmi',
    student_class: 'KELAS 8',
    student_absence_number: '18',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-11',
    student_nisn: '0107813872',
    student_name: 'Rasikh Faiz Setyo Wibowo',
    student_class: 'KELAS 8',
    student_absence_number: '21',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-12',
    student_nisn: '3121057080',
    student_name: 'VENSA PUTRI ASSYFA',
    student_class: 'KELAS 8',
    student_absence_number: '24',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-13',
    student_nisn: '3117503818',
    student_name: 'Adellio Farhan Pratama',
    student_class: 'KELAS 9',
    student_absence_number: '1',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-14',
    student_nisn: '0127970011',
    student_name: 'Ahmad Faiz Abdillah',
    student_class: 'KELAS 9',
    student_absence_number: '2',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-15',
    student_nisn: '0126866348',
    student_name: 'AHMAD FELLAINI ROYYAN AL KHULD',
    student_class: 'KELAS 9',
    student_absence_number: '3',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-16',
    student_nisn: '0114927722',
    student_name: 'AXEL ADELIO NUGRAHA',
    student_class: 'KELAS 9',
    student_absence_number: '8',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-17',
    student_nisn: '0124890839',
    student_name: 'Gilang Restu Ramadhan',
    student_class: 'KELAS 9',
    student_absence_number: '11',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-18',
    student_nisn: '3115242395',
    student_name: 'HUMAM ZADA AR RASYID',
    student_class: 'KELAS 9',
    student_absence_number: '12',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-19',
    student_nisn: '0123373142',
    student_name: 'JIBRAN ALI MUZAFFAR',
    student_class: 'KELAS 9',
    student_absence_number: '13',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-20',
    student_nisn: '3118757538',
    student_name: 'MUCHAMMAD LABIB NADZLIFATIR RIDHO',
    student_class: 'KELAS 9',
    student_absence_number: '16',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-21',
    student_nisn: '0105512376',
    student_name: 'MUHAMMAD FAIZ',
    student_class: 'KELAS 9',
    student_absence_number: '17',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-22',
    student_nisn: '0116778051',
    student_name: 'Muhammad Zidan Faturahman Al Ghozali',
    student_class: 'KELAS 9',
    student_absence_number: '20',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-23',
    student_nisn: '0106519182',
    student_name: 'Risq Nurul Fajar',
    student_class: 'KELAS 9',
    student_absence_number: '22',
    student_exam_room: 'Ruang 1',
  },
  {
    id: 'db-std-24',
    student_nisn: '0126838152',
    student_name: 'SATRIA ANGGER WIJAYA KUSUMA',
    student_class: 'KELAS 9',
    student_absence_number: '23',
    student_exam_room: 'Ruang 1',
  },
];

export const DEFAULT_DATABASE_CONFIG: DatabaseSyncConfig = {
  database_name: 'MASTER DATABASE CBT SMP INSAN TELADAN',
  database_source: '/public/assets/aistudio/MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_f5f5b44b',
  last_synced: 'Real-time Otomatis',
  is_connected: true,
};

const STORAGE_KEYS = {
  SCHEDULES: 'cbt_spindan_schedules',
  TEACHERS: 'cbt_spindan_teachers_v2',
  STUDENTS: 'cbt_spindan_students_v2',
  DATABASE_CONFIG: 'cbt_spindan_database_config_v2',
};

export function loadSchedules(): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(DEFAULT_SCHEDULES));
      return DEFAULT_SCHEDULES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SCHEDULES;
  }
}

export function saveSchedules(schedules: ScheduleItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  } catch (err) {
    console.error('Failed to save schedules', err);
  }
}

export function loadTeachers(): TeacherItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEACHERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(DEFAULT_TEACHERS));
      return DEFAULT_TEACHERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 16) {
      return parsed;
    }
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(DEFAULT_TEACHERS));
    return DEFAULT_TEACHERS;
  } catch {
    return DEFAULT_TEACHERS;
  }
}

export function saveTeachers(teachers: TeacherItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
  } catch (err) {
    console.error('Failed to save teachers', err);
  }
}

export function loadStudents(): StudentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(DEFAULT_STUDENTS));
      return DEFAULT_STUDENTS;
    }
    const parsed: StudentItem[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 24) {
      // Ensure student_class matches master database format (KELAS 7, KELAS 8, KELAS 9)
      const adjusted = parsed.map((s) => {
        let cls = String(s.student_class || '').trim();
        if (/^[789]$/.test(cls)) {
          cls = `KELAS ${cls}`;
        } else if (/^([789])[AB]$/i.test(cls)) {
          cls = `KELAS ${cls[0]}`;
        } else if (/^kelas\s*([789])/i.test(cls)) {
          const m = cls.match(/^kelas\s*([789])/i);
          cls = m ? `KELAS ${m[1]}` : cls.toUpperCase();
        }
        return { ...s, student_class: cls || 'KELAS 7' };
      });
      return adjusted;
    }
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(DEFAULT_STUDENTS));
    return DEFAULT_STUDENTS;
  } catch {
    return DEFAULT_STUDENTS;
  }
}

export function saveStudents(students: StudentItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  } catch (err) {
    console.error('Failed to save students', err);
  }
}

export function loadDatabaseConfig(): DatabaseSyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DATABASE_CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DATABASE_CONFIG, JSON.stringify(DEFAULT_DATABASE_CONFIG));
      return DEFAULT_DATABASE_CONFIG;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DATABASE_CONFIG;
  }
}

export function saveDatabaseConfig(config: DatabaseSyncConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DATABASE_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save database config', err);
  }
}
