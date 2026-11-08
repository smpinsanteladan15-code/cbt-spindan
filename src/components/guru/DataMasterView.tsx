import React, { useState } from 'react';
import { MasterSubTab, StudentItem, TeacherItem, GoogleSheetsConfig } from '../../types/cbt';
import { SUBJECT_OPTIONS } from '../../data/defaultData';
import { downloadCsv, parseCsv } from '../../utils/cbtLogic';
import {
  UserPlus,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Database,
  CheckCircle2,
  FileText,
  Search,
  ExternalLink,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  syncTeachersToSheet,
  fetchTeachersFromSheet,
  syncStudentsToSheet,
  fetchStudentsFromSheet,
} from '../../services/googleSheets';

interface DataMasterViewProps {
  students: StudentItem[];
  teachers: TeacherItem[];
  onSaveStudent: (student: Omit<StudentItem, 'id'>) => void;
  onDeleteStudent: (id: string) => void;
  onSaveTeacher: (teacher: Omit<TeacherItem, 'id'>) => void;
  onDeleteTeacher: (id: string) => void;
  onBatchImportStudents: (students: Omit<StudentItem, 'id'>[]) => void;
  onBatchImportTeachers: (teachers: Omit<TeacherItem, 'id'>[]) => void;
  onSyncTeachers?: (teachers: Omit<TeacherItem, 'id'>[]) => void;
  onSyncStudents?: (students: Omit<StudentItem, 'id'>[]) => void;
  onOpenDatabaseModal?: (tab?: MasterSubTab) => void;
  onResetData: () => void;
  setNoticeMessage: (msg: string) => void;
  hasAccessToken?: boolean;
  accessToken?: string | null;
  sheetsConfig?: GoogleSheetsConfig;
  onSignIn?: () => Promise<void>;
}

export const DataMasterView: React.FC<DataMasterViewProps> = ({
  students,
  teachers,
  onSaveStudent,
  onDeleteStudent,
  onSaveTeacher,
  onDeleteTeacher,
  onBatchImportStudents,
  onBatchImportTeachers,
  onSyncTeachers,
  onSyncStudents,
  onOpenDatabaseModal,
  onResetData,
  setNoticeMessage,
  hasAccessToken = false,
  accessToken = null,
  sheetsConfig,
  onSignIn,
}) => {
  const [activeTab, setActiveTab] = useState<MasterSubTab>('teachers');
  const [isSheetsBusy, setIsSheetsBusy] = useState(false);

  // Form State for Student
  const [studentNisn, setStudentNisn] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentAbsence, setStudentAbsence] = useState('');
  const [studentExamRoom, setStudentExamRoom] = useState('Ruang 1');

  // Form State for Teacher
  const [teacherName, setTeacherName] = useState('');
  const [teacherSubject, setTeacherSubject] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Connected Master Database Source Links
  const [teacherDbUrl, setTeacherDbUrl] = useState(
    '/public/assets/aistudio/MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_f5f5b44b'
  );
  const [studentDbUrl, setStudentDbUrl] = useState(
    '/public/assets/aistudio/MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_83338db6'
  );

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNisn || !studentName || !studentClass || !studentAbsence) {
      setNoticeMessage('Mohon lengkapi semua kolom data siswa.');
      return;
    }
    if (!/^\d{10}$/.test(studentNisn)) {
      setNoticeMessage('NISN harus berupa 10 digit angka.');
      return;
    }

    onSaveStudent({
      student_nisn: studentNisn,
      student_name: studentName,
      student_class: studentClass,
      student_absence_number: studentAbsence,
      student_exam_room: studentExamRoom || 'Ruang 1',
    });

    setStudentNisn('');
    setStudentName('');
    setStudentClass('');
    setStudentAbsence('');
    setNoticeMessage(`Data siswa "${studentName}" berhasil disimpan dan otomatis terhubung ke Master Database.`);
  };

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName || !teacherSubject) {
      setNoticeMessage('Mohon lengkapi nama guru dan mata pelajaran.');
      return;
    }

    onSaveTeacher({
      teacher_name: teacherName.trim(),
      subject_name: teacherSubject.trim(),
    });

    setTeacherName('');
    setTeacherSubject('');
    setNoticeMessage(`Data guru "${teacherName}" berhasil disimpan dan otomatis disinkronkan ke Master Database.`);
  };

  // Google Sheets Direct Sync Handlers
  const handlePushTeachersToSheets = async () => {
    if (!accessToken || !sheetsConfig?.spreadsheetId) {
      if (onSignIn) {
        await onSignIn();
      } else {
        setNoticeMessage('Silakan hubungkan akun Google Sheets terlebih dahulu.');
      }
      return;
    }
    setIsSheetsBusy(true);
    try {
      const res = await syncTeachersToSheet(accessToken, sheetsConfig.spreadsheetId, teachers);
      setNoticeMessage(`Berhasil mengirim ${res.rowCount} data Master Guru ke tab "Master Guru" di Google Sheets!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim data ke Google Sheets';
      setNoticeMessage(`Error: ${msg}`);
    } finally {
      setIsSheetsBusy(false);
    }
  };

  const handlePullTeachersFromSheets = async () => {
    if (!accessToken || !sheetsConfig?.spreadsheetId) {
      if (onSignIn) {
        await onSignIn();
      } else {
        setNoticeMessage('Silakan hubungkan akun Google Sheets terlebih dahulu.');
      }
      return;
    }
    setIsSheetsBusy(true);
    try {
      const imported = await fetchTeachersFromSheet(accessToken, sheetsConfig.spreadsheetId);
      if (imported.length === 0) {
        setNoticeMessage('Tidak ada data guru ditemukan di tab "Master Guru" Google Sheets.');
      } else {
        if (onSyncTeachers) {
          onSyncTeachers(imported);
        } else {
          onBatchImportTeachers(imported);
        }
        setNoticeMessage(`Berhasil menarik ${imported.length} data guru dari Google Sheets dan memperbarui Master Database!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca data dari Google Sheets';
      setNoticeMessage(`Error: ${msg}`);
    } finally {
      setIsSheetsBusy(false);
    }
  };

  const handlePushStudentsToSheets = async () => {
    if (!accessToken || !sheetsConfig?.spreadsheetId) {
      if (onSignIn) {
        await onSignIn();
      } else {
        setNoticeMessage('Silakan hubungkan akun Google Sheets terlebih dahulu.');
      }
      return;
    }
    setIsSheetsBusy(true);
    try {
      const res = await syncStudentsToSheet(accessToken, sheetsConfig.spreadsheetId, students);
      setNoticeMessage(`Berhasil mengirim ${res.rowCount} data Master Siswa ke tab "Master Siswa" di Google Sheets!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim data ke Google Sheets';
      setNoticeMessage(`Error: ${msg}`);
    } finally {
      setIsSheetsBusy(false);
    }
  };

  const handlePullStudentsFromSheets = async () => {
    if (!accessToken || !sheetsConfig?.spreadsheetId) {
      if (onSignIn) {
        await onSignIn();
      } else {
        setNoticeMessage('Silakan hubungkan akun Google Sheets terlebih dahulu.');
      }
      return;
    }
    setIsSheetsBusy(true);
    try {
      const imported = await fetchStudentsFromSheet(accessToken, sheetsConfig.spreadsheetId);
      if (imported.length === 0) {
        setNoticeMessage('Tidak ada data siswa ditemukan di tab "Master Siswa" Google Sheets.');
      } else {
        if (onSyncStudents) {
          onSyncStudents(imported);
        } else {
          onBatchImportStudents(imported);
        }
        setNoticeMessage(`Berhasil menarik ${imported.length} data siswa dari Google Sheets dan memperbarui Master Database!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca data dari Google Sheets';
      setNoticeMessage(`Error: ${msg}`);
    } finally {
      setIsSheetsBusy(false);
    }
  };

  // Export Teacher Database in the exact format: No.,Nama,Mata pelajaran
  const handleExportTeacherDatabase = () => {
    const rows: (string | number)[][] = [
      ['No.', 'Nama', 'Mata pelajaran'],
    ];

    teachers.forEach((t, idx) => {
      rows.push([
        idx + 1,
        t.teacher_name,
        t.subject_name,
      ]);
    });

    downloadCsv('MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_f5f5b44b.csv', rows);
    setNoticeMessage('Master Database Guru berhasil diekspor sesuai format No.,Nama,Mata pelajaran.');
  };

  // Export Student Database in the exact format
  const handleExportStudentDatabase = () => {
    const rows: (string | number)[][] = [
      ['matematika', 'Bu sum', 'Kelas', 'Nomer Absen', 'Ruang Ujian'],
    ];

    students.forEach((s) => {
      rows.push([
        s.student_nisn,
        s.student_name,
        s.student_class,
        s.student_absence_number,
        s.student_exam_room || 'Ruang 1',
      ]);
    });

    downloadCsv('MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_83338db6.csv', rows);
    setNoticeMessage('Master Database Siswa berhasil diekspor dan disinkronkan.');
  };

  // Download Templates
  const handleDownloadTeacherTemplate = () => {
    downloadCsv('template-guru-mapel.csv', [
      ['No.', 'Nama', 'Mata pelajaran'],
      ['1', 'Istiqomah, S. Pd. I, M. Pd.', 'Etika Syariah Islam'],
      ['2', 'Sumiyatun, S. Pd', 'Matematika'],
      ['3', "Ma'rifah Auliyanto, S. Pd", 'Bahasa Inggris'],
    ]);
    setNoticeMessage('Template CSV guru & mapel berhasil diunduh.');
  };

  const handleDownloadStudentTemplate = () => {
    downloadCsv('template-siswa.csv', [
      ['matematika', 'Bu sum', 'Kelas', 'Nomer Absen', 'Ruang Ujian'],
      ['0132001009', 'DEWI ZAHRA GANI', 'KELAS 7', '9', 'Ruang 1'],
      ['0135985455', 'AJENG SISTRI SANDI AULIYA', 'KELAS 8', '6', 'Ruang 1'],
      ['3117503818', 'Adellio Farhan Pratama', 'KELAS 9', '1', 'Ruang 1'],
    ]);
    setNoticeMessage('Template CSV siswa berhasil diunduh.');
  };

  // CSV Import Handlers
  const handleImportTeacherCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const rows = parseCsv(text);
        if (rows.length < 2) {
          setNoticeMessage('Berkas CSV tidak memiliki baris data.');
          return;
        }

        const dataRows = rows.slice(1);
        const imported: Omit<TeacherItem, 'id'>[] = [];

        for (const r of dataRows) {
          // If CSV has No.,Nama,Mata pelajaran (3 columns)
          if (r.length >= 3 && r[1] && r[2]) {
            imported.push({
              teacher_name: r[1],
              subject_name: r[2],
            });
          } else if (r.length >= 2 && r[0] && r[1]) {
            imported.push({
              teacher_name: r[0],
              subject_name: r[1],
            });
          }
        }

        if (imported.length === 0) {
          setNoticeMessage('Format baris CSV tidak sesuai template guru.');
          return;
        }

        onBatchImportTeachers(imported);
        setNoticeMessage(`Berhasil mengimpor ${imported.length} data guru & mapel dari CSV ke Master Database.`);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Gagal memproses file CSV';
        setNoticeMessage(`Gagal mengimpor CSV guru: ${errorMsg}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportStudentCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const rows = parseCsv(text);
        if (rows.length < 2) {
          setNoticeMessage('Berkas CSV tidak memiliki baris data.');
          return;
        }

        const dataRows = rows.slice(1);
        const imported: Omit<StudentItem, 'id'>[] = [];

        for (const r of dataRows) {
          if (r.length >= 4 && r[0] && r[1]) {
            let cls = String(r[2] || '').trim();
            if (/^[789]$/.test(cls)) {
              cls = `KELAS ${cls}`;
            } else if (/^([789])[AB]$/i.test(cls)) {
              cls = `KELAS ${cls[0]}`;
            } else if (/^kelas\s*([789])/i.test(cls)) {
              const m = cls.match(/^kelas\s*([789])/i);
              cls = m ? `KELAS ${m[1]}` : cls.toUpperCase();
            }
            imported.push({
              student_nisn: r[0],
              student_name: r[1],
              student_class: cls || 'KELAS 7',
              student_absence_number: r[3] || '1',
              student_exam_room: r[4] || 'Ruang 1',
            });
          }
        }

        if (imported.length === 0) {
          setNoticeMessage('Format baris CSV tidak sesuai template siswa.');
          return;
        }

        onBatchImportStudents(imported);
        setNoticeMessage(`Berhasil mengimpor ${imported.length} data siswa dari CSV ke Master Database.`);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Gagal memproses file CSV';
        setNoticeMessage(`Gagal mengimpor CSV siswa: ${errorMsg}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students.filter(
    (s) =>
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_nisn.includes(searchQuery) ||
      s.student_class.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.student_exam_room && s.student_exam_room.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="pb-4 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003366]">
              DATA MASTER CBT
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Kelola basis data resmi guru pengampu dan siswa peserta CBT SMP Insan Teladan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDatabaseModal?.(activeTab)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#003366] hover:bg-[#00264d] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              title="Buka master database dan langsung sinkronkan ke aplikasi"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Buka & Sinkronkan Database</span>
            </button>

            {activeTab === 'teachers' ? (
              <button
                type="button"
                onClick={handleExportTeacherDatabase}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#087f78] hover:bg-[#066560] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Master Guru (No.,Nama,Mapel)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportStudentDatabase}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#087f78] hover:bg-[#066560] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Master Siswa CSV</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Google Sheets Direct Integration Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-emerald-400 shadow-sm bg-gradient-to-br from-emerald-50/60 to-teal-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-[#003366]">
                  INTEGRASI GOOGLE SHEETS API LANGSUNG (MASTER DATABASE)
                </span>
                {hasAccessToken ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Terhubung Aktif</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Perlu Login Google</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mt-1">
                {activeTab === 'teachers'
                  ? 'Sinkronkan data Master Guru (No., Nama, Mata pelajaran) langsung dengan Google Sheet tab "Master Guru".'
                  : 'Sinkronkan data Master Siswa (NISN, Nama, Kelas, Absen, Ruang) langsung dengan Google Sheet tab "Master Siswa".'}
              </p>

              {sheetsConfig?.spreadsheetId && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[11px] font-bold text-slate-500">File Spreadsheet:</span>
                  <a
                    href={sheetsConfig.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sheetsConfig.spreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#003366] hover:text-[#087f78] underline decoration-dotted"
                  >
                    <span>{sheetsConfig.spreadsheetTitle || sheetsConfig.spreadsheetId}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!hasAccessToken ? (
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Hubungkan Google Sheets</span>
              </button>
            ) : activeTab === 'teachers' ? (
              <>
                <button
                  type="button"
                  disabled={isSheetsBusy}
                  onClick={handlePushTeachersToSheets}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  title="Kirim 16 data guru ke tab Master Guru di Google Sheets"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{isSheetsBusy ? 'Mengirim...' : 'Kirim Guru ke Google Sheet'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSheetsBusy}
                  onClick={handlePullTeachersFromSheets}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  title="Tarik data guru dari tab Master Guru di Google Sheets ke aplikasi CBT"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{isSheetsBusy ? 'Menarik...' : 'Tarik dari Google Sheet'}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSheetsBusy}
                  onClick={handlePushStudentsToSheets}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  title="Kirim seluruh data siswa ke tab Master Siswa di Google Sheets"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{isSheetsBusy ? 'Mengirim...' : 'Kirim Siswa ke Google Sheet'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSheetsBusy}
                  onClick={handlePullStudentsFromSheets}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  title="Tarik data siswa dari tab Master Siswa di Google Sheets ke aplikasi CBT"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{isSheetsBusy ? 'Menarik...' : 'Tarik Siswa dari Google Sheet'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Database Connection Status Card with Clickable Source Link */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 shadow-sm bg-gradient-to-r from-emerald-50/70 to-teal-50/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Database className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                  DATABASE TERHUBUNG & DISESUAIKAN PER TAB
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenDatabaseModal?.(activeTab)}
                className="font-bold text-sm text-[#003366] hover:text-[#087f78] mt-0.5 text-left flex items-center gap-1.5 group cursor-pointer"
                title="Klik untuk membuka & menyinkronkan data base ini"
              >
                <span className="underline decoration-dotted underline-offset-2">
                  {activeTab === 'teachers'
                    ? 'MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_f5f5b44b (Tab Guru & Mapel)'
                    : 'MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_83338db6 (Tab Siswa)'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#087f78]" />
              </button>
              <p className="text-xs text-slate-600 mt-1">
                Data yang diisi pada aplikasi ini <strong>otomatis tersimpan & disinkronkan</strong>. Klik tautan sumber database untuk melihat isinya secara langsung.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDatabaseModal?.(activeTab)}
              className="group flex flex-wrap items-center gap-2 text-xs font-mono bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300 hover:border-emerald-500 transition-all cursor-pointer shadow-2xs text-left"
              title="Klik untuk membuka database ini dan langsung disinkronkan ke aplikasi"
            >
              <span className="text-slate-500 font-sans font-bold">Source:</span>
              <span className="text-blue-700 underline font-semibold truncate max-w-[200px] sm:max-w-xs group-hover:text-blue-900 flex items-center gap-1">
                {activeTab === 'teachers' ? teacherDbUrl : studentDbUrl}
                <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-sans font-bold text-[11px] bg-emerald-100 group-hover:bg-emerald-200 px-2 py-0.5 rounded transition-colors">
                <RefreshCw className="w-3 h-3 text-emerald-600" />
                <span>Buka & Sinkronkan</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Kategori Data Master">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'teachers'}
          onClick={() => setActiveTab('teachers')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'teachers'
              ? 'bg-[#003366] text-white shadow-md ring-2 ring-[#ffc72c]/40'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          DATA GURU & MAPEL ({teachers.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'students'}
          onClick={() => setActiveTab('students')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'students'
              ? 'bg-[#003366] text-white shadow-md ring-2 ring-[#ffc72c]/40'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          DATA SISWA ({students.length})
        </button>
      </div>

      {/* Tab 1: DATA GURU & MAPEL (Updated Layout: No., Nama, Mata pelajaran) */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-2xl p-6 border border-[#dce6ed] shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#003366]" />
              <h2 className="text-lg font-bold text-[#003366]">Tambah Guru & Mata Pelajaran</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">Format: No., Nama, Mata pelajaran</span>
          </div>

          <form onSubmit={handleTeacherSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="teacher-name" className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap & Gelar Guru
              </label>
              <input
                id="teacher-name"
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Contoh: Sumiyatun, S. Pd"
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div>
              <label htmlFor="teacher-subject" className="block text-xs font-bold text-slate-700 mb-1">
                Mata Pelajaran yang Diampu
              </label>
              <input
                id="teacher-subject"
                type="text"
                value={teacherSubject}
                onChange={(e) => setTeacherSubject(e.target.value)}
                list="subject-list"
                placeholder="Contoh: Matematika"
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
              <datalist id="subject-list">
                {SUBJECT_OPTIONS.map((subj) => (
                  <option key={subj} value={subj} />
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-[#003366] hover:bg-[#00264d] text-white font-bold text-sm rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Simpan Guru / Mapel ke Database
              </button>
            </div>
          </form>

          {/* Import / Export Controls */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadTeacherTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#003366] font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Template CSV Guru</span>
            </button>

            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#087f78] hover:bg-[#066560] text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>Impor Berkas CSV Guru (No.,Nama,Mapel)</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportTeacherCsv}
                className="hidden"
              />
            </label>
          </div>

          {/* Teacher Table with Exact Layout Matching MASTER_DATABASE */}
          <div className="pt-2">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-bold text-sm text-[#003366]">
                  Daftar Guru & Mata Pelajaran ({teachers.length})
                </h3>
                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1 mt-0.5">
                  <span>Sesuai Master Database:</span>
                  <button
                    type="button"
                    onClick={() => onOpenDatabaseModal?.('teachers')}
                    className="font-mono text-blue-700 hover:text-blue-900 underline font-semibold cursor-pointer inline-flex items-center gap-0.5"
                    title="Klik untuk membuka isi database guru dan langsung sinkronkan"
                  >
                    <span>MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_f5f5b44b</span>
                    <ExternalLink className="w-3 h-3 inline" />
                  </button>
                </div>
              </div>
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Cari guru atau mapel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-full focus:ring-2 focus:ring-[#003366] focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#edf2f6] text-[#003366] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">No.</th>
                    <th className="py-3 px-4">Nama</th>
                    <th className="py-3 px-4">Mata pelajaran</th>
                    <th className="py-3 px-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        Belum ada guru & mata pelajaran terdaftar.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {t.teacher_name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-3 py-1 rounded-full bg-teal-100 text-[#087f78] font-bold text-xs inline-block">
                            {t.subject_name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => onDeleteTeacher(t.id)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus guru"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: DATA SISWA */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl p-6 border border-[#dce6ed] shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#003366]" />
              <h2 className="text-lg font-bold text-[#003366]">Tambah Siswa Baru ke Master Database</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">Format: NISN, Nama, Kelas, Absen, Ruang</span>
          </div>

          <form onSubmit={handleStudentSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="student-nisn" className="block text-xs font-bold text-slate-700 mb-1">
                NISN (10 Digit Angka)
              </label>
              <input
                id="student-nisn"
                type="text"
                pattern="[0-9]{10}"
                maxLength={10}
                value={studentNisn}
                onChange={(e) => setStudentNisn(e.target.value)}
                placeholder="Contoh: 0132001009"
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div>
              <label htmlFor="student-name" className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap Siswa
              </label>
              <input
                id="student-name"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Contoh: DEWI ZAHRA GANI"
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div>
              <label htmlFor="student-class" className="block text-xs font-bold text-slate-700 mb-1">
                Kelas
              </label>
              <select
                id="student-class"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366] bg-white font-semibold"
              >
                <option value="">Pilih Kelas</option>
                <option value="KELAS 7">KELAS 7</option>
                <option value="KELAS 8">KELAS 8</option>
                <option value="KELAS 9">KELAS 9</option>
              </select>
            </div>

            <div>
              <label htmlFor="student-absence" className="block text-xs font-bold text-slate-700 mb-1">
                Nomor Absen
              </label>
              <input
                id="student-absence"
                type="text"
                pattern="[0-9]{1,3}"
                maxLength={3}
                value={studentAbsence}
                onChange={(e) => setStudentAbsence(e.target.value)}
                placeholder="Contoh: 9"
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div>
              <label htmlFor="student-exam-room" className="block text-xs font-bold text-slate-700 mb-1">
                Ruang Ujian
              </label>
              <input
                id="student-exam-room"
                type="text"
                value={studentExamRoom}
                onChange={(e) => setStudentExamRoom(e.target.value)}
                placeholder="Contoh: Ruang 1"
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 bg-[#003366] hover:bg-[#00264d] text-white font-bold text-sm rounded-xl shadow-sm transition-all cursor-pointer h-[42px]"
              >
                Simpan Siswa ke Database
              </button>
            </div>
          </form>

          {/* Import / Export Controls */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadStudentTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#003366] font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Template CSV Siswa</span>
            </button>

            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#087f78] hover:bg-[#066560] text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>Impor Berkas CSV Siswa</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportStudentCsv}
                className="hidden"
              />
            </label>
          </div>

          {/* Student Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-bold text-sm text-[#003366]">
                  Daftar Siswa Master Database ({students.length})
                </h3>
                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1 mt-0.5">
                  <span>Data otomatis terhubung ke:</span>
                  <button
                    type="button"
                    onClick={() => onOpenDatabaseModal?.('students')}
                    className="font-mono text-blue-700 hover:text-blue-900 underline font-semibold cursor-pointer inline-flex items-center gap-0.5"
                    title="Klik untuk membuka isi database siswa dan langsung sinkronkan"
                  >
                    <span>MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_83338db6</span>
                    <ExternalLink className="w-3 h-3 inline" />
                  </button>
                </div>
              </div>
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Cari siswa, NISN, atau kelas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-full focus:ring-2 focus:ring-[#003366] focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#edf2f6] text-[#003366] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">NISN</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Absen</th>
                    <th className="py-3 px-4">Ruang Ujian</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Tidak ada data siswa ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((std) => (
                      <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium">{std.student_nisn}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">{std.student_name}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-[#003366] font-semibold text-xs">
                            {std.student_class}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono">{std.student_absence_number}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-xs">
                            {std.student_exam_room || 'Ruang 1'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => onDeleteStudent(std.id)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus siswa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sync and Reset Action Panel */}
      <aside className="bg-white rounded-2xl p-6 border border-[#dce6ed] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[#003366] flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#087f78]" />
            <span>Sinkronisasi Data Master</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Data tersimpan aktif di peramban dan terhubung ke berkas master database. Klik untuk melihat isi berkas atau sinkronkan ulang kapan saja.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenDatabaseModal?.(activeTab)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Buka & Sinkronkan Master Database</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onResetData();
              setNoticeMessage('Data master sekolah berhasil disinkronkan kembali.');
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Muat Ulang Data Bawaan Sekolah
          </button>
        </div>
      </aside>
    </div>
  );
};
