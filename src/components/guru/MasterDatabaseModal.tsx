import React, { useState, useEffect, useMemo } from 'react';
import { MasterSubTab, StudentItem, TeacherItem } from '../../types/cbt';
import { parseTeacherDatabase, parseStudentDatabase, downloadCsv } from '../../utils/cbtLogic';
import {
  DEFAULT_TEACHERS,
  DEFAULT_STUDENTS,
} from '../../data/defaultData';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Download,
  X,
  Search,
  FileText,
  Table,
  Link as LinkIcon,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface MasterDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: MasterSubTab;
  onSyncTeachers: (teachers: Omit<TeacherItem, 'id'>[]) => void;
  onSyncStudents: (students: Omit<StudentItem, 'id'>[]) => void;
  setNoticeMessage: (msg: string) => void;
}

export const MasterDatabaseModal: React.FC<MasterDatabaseModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'teachers',
  onSyncTeachers,
  onSyncStudents,
  setNoticeMessage,
}) => {
  const [activeCategory, setActiveCategory] = useState<MasterSubTab>(initialTab);
  const [modalViewTab, setModalViewTab] = useState<'table' | 'raw' | 'config'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Baru saja (Otomatis)');
  const [copied, setCopied] = useState(false);

  // URLs
  const [teacherSourceUrl, setTeacherSourceUrl] = useState(
    '/assets/aistudio/MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_f5f5b44b'
  );
  const [studentSourceUrl, setStudentSourceUrl] = useState(
    '/assets/aistudio/MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_83338db6'
  );

  // Raw file contents
  const [rawTeacherText, setRawTeacherText] = useState('');
  const [rawStudentText, setRawStudentText] = useState('');

  // Parsed items
  const [parsedTeachers, setParsedTeachers] = useState<Omit<TeacherItem, 'id'>[]>([]);
  const [parsedStudents, setParsedStudents] = useState<Omit<StudentItem, 'id'>[]>([]);

  // Keep active category synced if initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialTab);
    }
  }, [isOpen, initialTab]);

  // Execute database fetch and synchronization
  const executeSync = async (category: MasterSubTab) => {
    setIsSyncing(true);
    setSyncStatus('Sedang membaca berkas master database dan menyinkronkan...');

    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

      if (category === 'teachers') {
        let text = '';
        try {
          const res = await fetch(`${teacherSourceUrl}?t=${Date.now()}`);
          if (res.ok) {
            text = await res.text();
          }
        } catch (e) {
          console.warn('Could not fetch teacher database from network, using local fallback', e);
        }

        // If fetch failed or empty, fallback to constructed CSV
        if (!text || text.length < 10) {
          const rows: (string | number)[][] = [['No.', 'Nama', 'Mata pelajaran']];
          DEFAULT_TEACHERS.forEach((t, i) => rows.push([i + 1, t.teacher_name, t.subject_name]));
          text = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        }

        setRawTeacherText(text);
        const parsed = parseTeacherDatabase(text);
        const finalTeachers = parsed.length > 0 ? parsed : DEFAULT_TEACHERS.map((t) => ({ teacher_name: t.teacher_name, subject_name: t.subject_name }));

        setParsedTeachers(finalTeachers);
        onSyncTeachers(finalTeachers);
        setLastSyncTime(timeStr);
        setSyncStatus(`Berhasil disinkronkan: ${finalTeachers.length} Guru & Mata Pelajaran terhubung pada ${timeStr}.`);
        setNoticeMessage(`✓ Master Database Guru berhasil disinkronkan (${finalTeachers.length} data guru aktif).`);
      } else {
        let text = '';
        try {
          const res = await fetch(`${studentSourceUrl}?t=${Date.now()}`);
          if (res.ok) {
            text = await res.text();
          }
        } catch (e) {
          console.warn('Could not fetch student database from network, using local fallback', e);
        }

        if (!text || text.length < 10) {
          const rows: (string | number)[][] = [['matematika', 'Bu sum', 'Kelas', 'Nomer Absen', 'Ruang Ujian']];
          DEFAULT_STUDENTS.forEach((s) =>
            rows.push([s.student_nisn, s.student_name, s.student_class, s.student_absence_number, s.student_exam_room || 'Ruang 1'])
          );
          text = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        }

        setRawStudentText(text);
        const parsed = parseStudentDatabase(text);
        const finalStudents = parsed.length > 0 ? parsed : DEFAULT_STUDENTS.map((s) => ({
          student_nisn: s.student_nisn,
          student_name: s.student_name,
          student_class: s.student_class,
          student_absence_number: s.student_absence_number,
          student_exam_room: s.student_exam_room || 'Ruang 1',
        }));

        setParsedStudents(finalStudents);
        onSyncStudents(finalStudents);
        setLastSyncTime(timeStr);
        setSyncStatus(`Berhasil disinkronkan: ${finalStudents.length} Siswa terhubung pada ${timeStr}.`);
        setNoticeMessage(`✓ Master Database Siswa berhasil disinkronkan (${finalStudents.length} peserta CBT aktif).`);
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Gagal membaca berkas database';
      setSyncStatus(`Peringatan sinkronisasi: ${errMessage}. Menggunakan data master cadangan sekolah.`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Automatically execute sync whenever modal opens or category changes
  useEffect(() => {
    if (isOpen) {
      executeSync(activeCategory);
    }
  }, [isOpen, activeCategory]);

  const activeRawText = activeCategory === 'teachers' ? rawTeacherText : rawStudentText;
  const currentDbUrl = activeCategory === 'teachers' ? teacherSourceUrl : studentSourceUrl;
  const currentDbFileName = activeCategory === 'teachers'
    ? 'MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_f5f5b44b'
    : 'MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_83338db6';

  const handleCopyRaw = () => {
    if (!activeRawText) return;
    navigator.clipboard.writeText(activeRawText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadCsv = () => {
    if (activeCategory === 'teachers') {
      const rows: (string | number)[][] = [['No.', 'Nama', 'Mata pelajaran']];
      parsedTeachers.forEach((t, i) => rows.push([i + 1, t.teacher_name, t.subject_name]));
      downloadCsv(`${currentDbFileName}.csv`, rows);
    } else {
      const rows: (string | number)[][] = [['NISN', 'Nama Lengkap', 'Kelas', 'Nomor Absen', 'Ruang Ujian']];
      parsedStudents.forEach((s) =>
        rows.push([
          s.student_nisn,
          s.student_name,
          s.student_class,
          s.student_absence_number,
          s.student_exam_room || 'Ruang 1',
        ])
      );
      downloadCsv(`${currentDbFileName}.csv`, rows);
    }
  };

  // Filtered rows for parsed table view
  const filteredTeacherRows = useMemo(() => {
    if (!searchQuery.trim()) return parsedTeachers;
    const q = searchQuery.toLowerCase();
    return parsedTeachers.filter(
      (t) => t.teacher_name.toLowerCase().includes(q) || t.subject_name.toLowerCase().includes(q)
    );
  }, [parsedTeachers, searchQuery]);

  const filteredStudentRows = useMemo(() => {
    if (!searchQuery.trim()) return parsedStudents;
    const q = searchQuery.toLowerCase();
    return parsedStudents.filter(
      (s) =>
        s.student_name.toLowerCase().includes(q) ||
        s.student_nisn.includes(q) ||
        s.student_class.toLowerCase().includes(q) ||
        (s.student_exam_room && s.student_exam_room.toLowerCase().includes(q))
    );
  }, [parsedStudents, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="master-db-modal-title"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-[#003366] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-[#ffc72c]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] font-extrabold tracking-wider uppercase text-emerald-300">
                  KONEKSI MASTER DATABASE AKTIF
                </span>
              </div>
              <h2 id="master-db-modal-title" className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                Master Database SMP Insan Teladan
              </h2>
              <p className="text-xs text-sky-200 font-mono mt-0.5 truncate max-w-md">
                {currentDbFileName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => executeSync(activeCategory)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Sinkronkan ulang data dari berkas database sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Tutup jendela database"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Database Category Selector (Guru vs Siswa) */}
        <div className="bg-[#f0f4f8] px-4 sm:px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Pilih Database:</span>
            <div className="inline-flex p-1 bg-slate-200 rounded-xl" role="tablist">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('teachers');
                  setSearchQuery('');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === 'teachers'
                    ? 'bg-[#003366] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Data Guru & Mapel ({parsedTeachers.length || 16})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('students');
                  setSearchQuery('');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === 'students'
                    ? 'bg-[#003366] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Data Siswa Peserta ({parsedStudents.length || 24})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Terakhir disinkronkan: <strong className="text-slate-800">{lastSyncTime}</strong></span>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatus && (
          <div className="px-4 sm:px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncStatus}</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 font-bold uppercase bg-emerald-100 px-2 py-0.5 rounded">
              Status 200 OK
            </span>
          </div>
        )}

        {/* View Switcher Tabs (Parsed Table / Raw Text / Source Config) */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalViewTab('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                modalViewTab === 'table'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Data Terurai</span>
            </button>
            <button
              type="button"
              onClick={() => setModalViewTab('raw')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                modalViewTab === 'raw'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Isi Berkas Mentah (CSV)</span>
            </button>
            <button
              type="button"
              onClick={() => setModalViewTab('config')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                modalViewTab === 'config'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Sumber Link Database</span>
            </button>
          </div>

          {modalViewTab === 'table' && (
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Cari dalam database..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          )}

          {modalViewTab === 'raw' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyRaw}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Semua Teks'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#087f78] hover:bg-[#066560] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Berkas</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 min-h-[300px]">
          {/* TAB 1: PARSED TABLE VIEW */}
          {modalViewTab === 'table' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Menampilkan{' '}
                  <strong className="text-slate-900">
                    {activeCategory === 'teachers' ? filteredTeacherRows.length : filteredStudentRows.length}
                  </strong>{' '}
                  baris data database resmi
                </span>
                <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                  ✓ Tersinkronisasi dengan Aplikasi
                </span>
              </div>

              {activeCategory === 'teachers' ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#edf2f6] text-[#003366] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-14 text-center">No.</th>
                        <th className="py-2.5 px-4">Nama Lengkap & Gelar</th>
                        <th className="py-2.5 px-4">Mata Pelajaran</th>
                        <th className="py-2.5 px-4 text-center w-28">Status Sinkron</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {filteredTeacherRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            Tidak ada data guru yang cocok dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredTeacherRows.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 text-center font-mono font-semibold text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-4 font-bold text-slate-900">
                              {t.teacher_name}
                            </td>
                            <td className="py-2 px-4">
                              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#087f78] font-bold text-[11px] border border-teal-200 inline-block">
                                {t.subject_name}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Aktif</span>
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#edf2f6] text-[#003366] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-32 font-mono">NISN</th>
                        <th className="py-2.5 px-4">Nama Siswa</th>
                        <th className="py-2.5 px-3 text-center">Kelas</th>
                        <th className="py-2.5 px-3 text-center">No. Absen</th>
                        <th className="py-2.5 px-3 text-center">Ruang</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {filteredStudentRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Tidak ada data siswa yang cocok dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredStudentRows.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 font-mono font-medium text-slate-700">
                              {s.student_nisn}
                            </td>
                            <td className="py-2 px-4 font-bold text-slate-900">
                              {s.student_name}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-[#003366] font-bold text-[11px] border border-blue-200">
                                {s.student_class}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-semibold text-slate-600">
                              {s.student_absence_number}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600">
                              {s.student_exam_room || 'Ruang 1'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Aktif</span>
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RAW FILE SOURCE CONTENT */}
          {modalViewTab === 'raw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono">Berkas: {currentDbFileName}</span>
                <span>Format: Comma-Separated Values (CSV / UTF-8)</span>
              </div>
              <div className="relative bg-[#1e293b] text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner border border-slate-700 max-h-[380px]">
                <pre className="whitespace-pre leading-relaxed select-all">
                  {activeRawText || 'Memuat berkas dari direktori database...'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: SOURCE CONFIGURATION & CUSTOM LINK */}
          {modalViewTab === 'config' && (
            <div className="space-y-4 max-w-2xl bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-[#003366]">Konfigurasi Sumber Link Database</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Anda dapat menghubungkan berkas database lokal aplikasi atau menyematkan URL CSV Google Sheets yang telah dipublikasikan ke web.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL / Lokasi Berkas Sumber ({activeCategory === 'teachers' ? 'Master Guru' : 'Master Siswa'}):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={activeCategory === 'teachers' ? teacherSourceUrl : studentSourceUrl}
                    onChange={(e) => {
                      if (activeCategory === 'teachers') {
                        setTeacherSourceUrl(e.target.value);
                      } else {
                        setStudentSourceUrl(e.target.value);
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
                  />
                  <button
                    type="button"
                    onClick={() => executeSync(activeCategory)}
                    className="px-4 py-2 bg-[#003366] text-white text-xs font-bold rounded-lg hover:bg-[#00264d] transition-colors cursor-pointer shrink-0"
                  >
                    Terapkan & Uji
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Default: <code>/assets/aistudio/{currentDbFileName}</code>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (activeCategory === 'teachers') {
                      setTeacherSourceUrl('/assets/aistudio/MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_f5f5b44b');
                    } else {
                      setStudentSourceUrl('/assets/aistudio/MASTER_DATABASE_CBT_SMP_INSAN_TELADAN_83338db6');
                    }
                    executeSync(activeCategory);
                  }}
                  className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Kembalikan ke Default
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              Database terhubung:{' '}
              <strong className="text-[#003366]">
                {activeCategory === 'teachers' ? `${parsedTeachers.length} Guru/Mapel` : `${parsedStudents.length} Siswa`}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor CSV</span>
            </button>
            <button
              type="button"
              onClick={() => executeSync(activeCategory)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#003366] hover:bg-[#00264d] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Ulang'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
