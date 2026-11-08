import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  Edit3,
  Lock,
  UserCheck,
  Send,
  Zap,
  Trash2,
} from 'lucide-react';
import { ExamResultItem, GoogleSheetsConfig, ScheduleItem, StudentItem } from '../../types/cbt';
import { GoogleSheetsSyncBar } from './GoogleSheetsSyncBar';
import { appendExamResultToSheet, syncAllExamResultsToSheet } from '../../services/googleSheets';

interface ExamResultsViewProps {
  schedules: ScheduleItem[];
  students: StudentItem[];
  currentUser: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  hasAccessToken: boolean;
  accessToken: string | null;
  sheetsConfig: GoogleSheetsConfig;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onCreateNewSpreadsheet: () => Promise<void>;
  onSyncAll: () => Promise<void>;
  onUpdateSpreadsheetId: (id: string) => Promise<void>;
  onToggleAutoSync: (enabled: boolean) => Promise<void>;
  setNoticeMessage?: (msg: string) => void;
}

export const ExamResultsView: React.FC<ExamResultsViewProps> = ({
  schedules,
  students,
  currentUser,
  hasAccessToken,
  accessToken,
  sheetsConfig,
  onSignIn,
  onSignOut,
  onCreateNewSpreadsheet,
  onSyncAll,
  onUpdateSpreadsheetId,
  onToggleAutoSync,
  setNoticeMessage,
}) => {
  const [results, setResults] = useState<ExamResultItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncingResults, setIsSyncingResults] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal to edit score / proctor notes
  const [editingResult, setEditingResult] = useState<ExamResultItem | null>(null);
  const [scoreInput, setScoreInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);

  const handleClearResultsSession = async () => {
    try {
      const res = await fetch('/api/exam/clear-session', { method: 'POST' });
      if (res.ok) {
        if (setNoticeMessage) {
          setNoticeMessage('Data hasil ujian & sesi monitoring berhasil dikosongkan (0 peserta).');
        }
        setIsClearConfirmOpen(false);
        await fetchResults();
      }
    } catch (e) {
      console.warn('Failed to clear session:', e);
    }
  };

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/exam/results');
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (err) {
      console.warn('Error fetching exam results:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 4000);
    return () => clearInterval(interval);
  }, []);

  // Quick single-student sync to Google Sheets
  const handleSyncSingleRow = async (result: ExamResultItem) => {
    if (!hasAccessToken || !accessToken || !sheetsConfig.spreadsheetId) {
      if (setNoticeMessage) {
        setNoticeMessage('Harap hubungkan akun Google Sheets dan buat spreadsheet terlebih dahulu.');
      }
      return;
    }

    try {
      setIsSyncingResults(true);
      const ok = await appendExamResultToSheet(accessToken, sheetsConfig.spreadsheetId, result);
      if (ok) {
        // mark synced in backend
        await fetch('/api/exam/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_nisn: result.student_nisn,
            synced_to_sheets: true,
          }),
        });
        await fetchResults();
        if (setNoticeMessage) {
          setNoticeMessage(`Hasil ujian siswa ${result.student_name} berhasil disimpan ke Google Sheets!`);
        }
      }
    } catch (err) {
      console.error('Failed to sync single result:', err);
      if (setNoticeMessage) {
        setNoticeMessage('Gagal menyimpan hasil ujian ke Google Sheets.');
      }
    } finally {
      setIsSyncingResults(false);
    }
  };

  // Sync all results table to Google Sheets
  const handleSyncAllResults = async () => {
    if (!hasAccessToken || !accessToken || !sheetsConfig.spreadsheetId) {
      if (setNoticeMessage) {
        setNoticeMessage('Harap hubungkan akun Google Sheets terlebih dahulu.');
      }
      return;
    }

    try {
      setIsSyncingResults(true);
      const { rowCount } = await syncAllExamResultsToSheet(accessToken, sheetsConfig.spreadsheetId, results);
      // mark all as synced
      for (const r of results) {
        await fetch('/api/exam/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_nisn: r.student_nisn,
            synced_to_sheets: true,
          }),
        });
      }
      await fetchResults();
      if (setNoticeMessage) {
        setNoticeMessage(`Berhasil menyinkronkan ${rowCount} data hasil ujian ke tab 'Hasil Ujian CBT' di Google Sheets!`);
      }
    } catch (err: unknown) {
      console.error('Error syncing all results:', err);
      if (setNoticeMessage) {
        setNoticeMessage(`Gagal menyinkronkan data: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setIsSyncingResults(false);
    }
  };

  const handleSaveScoreAndNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResult) return;

    try {
      const numScore = scoreInput.trim() !== '' ? Number(scoreInput) : null;
      const res = await fetch('/api/exam/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_nisn: editingResult.student_nisn,
          score: numScore,
          proctor_notes: notesInput.trim(),
        }),
      });

      if (res.ok) {
        if (setNoticeMessage) {
          setNoticeMessage(`Nilai & catatan untuk ${editingResult.student_name} berhasil diperbarui.`);
        }
        setEditingResult(null);
        await fetchResults();
      }
    } catch (e) {
      console.warn('Failed to update result:', e);
    }
  };

  // Export to CSV local fallback
  const handleExportCsv = () => {
    if (results.length === 0) return;
    const headers = [
      'No',
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Ruang Ujian',
      'No Absen',
      'Mata Pelajaran',
      'Status Ujian',
      'Jumlah Keluar',
      'Waktu Masuk',
      'Waktu Selesai',
      'Nilai',
      'Catatan Pengawas',
    ];
    const rows = results.map((r, i) => [
      i + 1,
      r.student_nisn,
      `"${r.student_name.replace(/"/g, '""')}"`,
      r.student_class,
      r.student_exam_room,
      r.student_absence_number,
      `"${r.subject_name}"`,
      r.status,
      r.exit_count,
      r.entered_at,
      r.finished_at,
      r.score ?? '-',
      `"${(r.proctor_notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CBT_SMP_Insan_Teladan_Hasil_Ujian_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered list
  const filteredResults = results.filter((r) => {
    const matchesSearch =
      r.student_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.student_nisn.includes(searchFilter.trim()) ||
      r.subject_name.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesClass =
      classFilter === 'all' ||
      r.student_class.includes(classFilter) ||
      r.student_class === classFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'finished' && r.status === 'Selesai') ||
      (statusFilter === 'locked' && (r.status === 'Terkunci' || r.exit_count >= 5)) ||
      (statusFilter === 'working' && r.status === 'Sedang Mengerjakan');

    return matchesSearch && matchesClass && matchesStatus;
  });

  const completedCount = results.filter((r) => r.status === 'Selesai').length;
  const lockedCount = results.filter((r) => r.status === 'Terkunci' || r.exit_count >= 5).length;
  const workingCount = results.filter((r) => r.status === 'Sedang Mengerjakan').length;
  const syncedCount = results.filter((r) => r.synced_to_sheets).length;

  return (
    <div className="space-y-6">
      {/* Google Sheets Integration Control Bar */}
      <GoogleSheetsSyncBar
        currentUser={currentUser}
        hasAccessToken={hasAccessToken}
        sheetsConfig={sheetsConfig}
        isSyncing={isSyncingResults}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        onCreateNewSpreadsheet={onCreateNewSpreadsheet}
        onSyncAll={onSyncAll}
        onUpdateSpreadsheetId={onUpdateSpreadsheetId}
        onToggleAutoSync={onToggleAutoSync}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#003366]">
              DATABASE HASIL UJIAN
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003366] mt-1 flex items-center gap-2.5">
            <GraduationCap className="w-8 h-8 text-[#087f78]" />
            <span>DATA HASIL UJIAN & REKAP CBT</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Data hasil pengerjaan soal peserta CBT yang tersimpan otomatis dan disinkronkan ke Google Sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasAccessToken && sheetsConfig.spreadsheetId && (
            <button
              type="button"
              onClick={handleSyncAllResults}
              disabled={isSyncingResults}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isSyncingResults ? 'Menyinkronkan...' : 'Simpan Semua ke Google Sheets'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={results.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClearConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            title="Kosongkan seluruh data ujian agar mulai bersih dari 0"
          >
            <Trash2 className="w-4 h-4 text-slate-500" />
            <span>Kosongkan Data (Mulai Baru)</span>
          </button>

          <button
            type="button"
            onClick={fetchResults}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Hasil */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Peserta Terdata</p>
            <p className="text-2xl font-extrabold text-[#003366] mt-1 font-mono">{results.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Siswa yang mengakses CBT</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        {/* Ujian Selesai */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm flex items-center justify-between bg-emerald-50/20">
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Selesai Resmi</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1 font-mono">{completedCount}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Verifikasi token pengawas</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Sedang Mengerjakan */}
        <div className="bg-white rounded-2xl p-4 border border-sky-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-sky-800 uppercase tracking-wider">Sedang Mengerjakan</p>
            <p className="text-2xl font-extrabold text-sky-700 mt-1 font-mono">{workingCount}</p>
            <p className="text-[11px] text-sky-600 mt-0.5">Sesi ujian masih aktif</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Terkunci 5x Keluar */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-sm flex items-center justify-between bg-rose-50/20">
          <div>
            <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Ujian Terkunci</p>
            <p className="text-2xl font-extrabold text-rose-700 mt-1 font-mono">{lockedCount}</p>
            <p className="text-[11px] text-rose-600 mt-0.5">Mencapai 5x toleransi keluar</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Results Table */}
      <div className="bg-white rounded-2xl border border-[#dce6ed] shadow-sm p-5 sm:p-6 space-y-4">
        {/* Table Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#003366] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>REKAPITULASI HASIL UJIAN SISWA ({filteredResults.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap penyelesaian ujian dicatat dengan timestamp resmi dan siap disimpan ke Google Sheets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari siswa / NISN..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003366] focus:outline-none w-44 sm:w-52"
              />
            </div>

            {/* Class Filter */}
            <select
              aria-label="Filter Berdasarkan Kelas"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003366] focus:outline-none bg-white font-medium text-slate-700"
            >
              <option value="all">Semua Kelas</option>
              <option value="7">Kelas 7</option>
              <option value="8">Kelas 8</option>
              <option value="9">Kelas 9</option>
            </select>

            {/* Status Filter */}
            <select
              aria-label="Filter Berdasarkan Status Ujian"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003366] focus:outline-none bg-white font-medium text-slate-700"
            >
              <option value="all">Semua Status</option>
              <option value="finished">Selesai Resmi</option>
              <option value="working">Sedang Mengerjakan</option>
              <option value="locked">Terkunci (5x Keluar)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#edf2f6] text-[#003366] font-bold">
              <tr>
                <th className="py-3 px-3">No.</th>
                <th className="py-3 px-3">Nama Siswa / NISN</th>
                <th className="py-3 px-3">Kelas & Ruang</th>
                <th className="py-3 px-3">Mata Pelajaran</th>
                <th className="py-3 px-3">Status Ujian</th>
                <th className="py-3 px-3">Waktu Masuk / Selesai</th>
                <th className="py-3 px-3">Keluar / Pelanggaran</th>
                <th className="py-3 px-3">Nilai / Catatan</th>
                <th className="py-3 px-3 text-center">Google Sheets</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <GraduationCap className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Belum ada data hasil ujian yang cocok.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Data akan tercatat otomatis saat siswa masuk dan menyelesaikan lembar ujian CBT.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredResults.map((res, idx) => {
                  const isLocked = res.status === 'Terkunci' || res.exit_count >= 5;
                  const isDone = res.status === 'Selesai';

                  return (
                    <tr
                      key={res.id || res.student_nisn}
                      className={`hover:bg-slate-50 transition-colors ${
                        isLocked ? 'bg-rose-50/50' : isDone ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3 font-mono text-slate-400">{idx + 1}</td>

                      {/* Student info */}
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-slate-900">{res.student_name}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          NISN: {res.student_nisn} · Absen {res.student_absence_number || '-'}
                        </div>
                      </td>

                      {/* Class & Room */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">Kelas {res.student_class}</span>
                        <div className="text-[11px] text-slate-500">{res.student_exam_room || 'Ruang 1'}</div>
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-[#003366]">{res.subject_name}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs shadow-2xs">
                            <Lock className="w-3 h-3" />
                            <span>Terkunci ⛔</span>
                          </span>
                        ) : isDone ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Selesai Resmi</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-semibold text-xs border border-sky-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
                            <span>Mengerjakan</span>
                          </span>
                        )}
                      </td>

                      {/* Timestamps */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-xs font-mono text-slate-600">
                        <div>Msk: {res.entered_at || '-'}</div>
                        <div className="text-[11px] text-slate-500">Sls: {res.finished_at || '-'}</div>
                      </td>

                      {/* Exit count */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            res.exit_count >= 5
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : res.exit_count > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {res.exit_count}x Keluar
                        </span>
                      </td>

                      {/* Score / Notes */}
                      <td className="py-3.5 px-3 max-w-xs">
                        {res.score !== null && res.score !== undefined ? (
                          <div className="font-mono font-extrabold text-sm text-[#003366]">
                            Nilai: {res.score}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum dinilai</span>
                        )}
                        {res.proctor_notes && (
                          <div className="text-[11px] text-slate-500 truncate" title={res.proctor_notes}>
                            {res.proctor_notes}
                          </div>
                        )}
                      </td>

                      {/* Sheets sync status badge */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {res.synced_to_sheets ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Tersimpan</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Belum sync</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingResult(res);
                              setScoreInput(res.score !== null && res.score !== undefined ? String(res.score) : '');
                              setNotesInput(res.proctor_notes || '');
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Edit nilai atau catatan pengawas"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {hasAccessToken && sheetsConfig.spreadsheetId && (
                            <button
                              type="button"
                              onClick={() => handleSyncSingleRow(res)}
                              disabled={isSyncingResults}
                              className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer disabled:opacity-50"
                              title="Kirim data baris ini ke Google Sheets"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Score & Notes Modal */}
      {editingResult && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#003366]">
                <Edit3 className="w-5 h-5 text-[#087f78]" />
                <h3 className="font-extrabold text-base">EDIT NILAI & CATATAN PENGAWAS</h3>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <p>
                <strong>Peserta:</strong> {editingResult.student_name}
              </p>
              <p>
                <strong>NISN / Kelas:</strong> {editingResult.student_nisn} · Kelas {editingResult.student_class}
              </p>
              <p>
                <strong>Mata Pelajaran:</strong> {editingResult.subject_name}
              </p>
            </div>

            <form onSubmit={handleSaveScoreAndNotes} className="space-y-4">
              <div>
                <label htmlFor="score-input-field" className="block text-xs font-bold text-slate-700 mb-1">
                  Nilai Hasil Ujian (0 - 100):
                </label>
                <input
                  id="score-input-field"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Contoh: 85"
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#003366] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="notes-input-field" className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Pengawas Ruang:
                </label>
                <textarea
                  id="notes-input-field"
                  rows={3}
                  placeholder="Catatan tambahan hasil pengerjaan atau verifikasi..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#003366] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingResult(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear Entire Results / Start Fresh */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-slate-800">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">KOSONGKAN DATA HASIL UJIAN</h3>
                <p className="text-xs text-slate-500">Mulai sesi baru bersih dengan 0 data peserta</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
              Apakah Anda ingin <strong>mengosongkan seluruh rekap hasil ujian dan monitoring</strong> saat ini? Gunakan opsi ini sebelum ujian dimulai agar papan tabel kembali bersih dari awal (0 peserta).
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearResultsSession}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Ya, Kosongkan Data (0 Peserta)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
