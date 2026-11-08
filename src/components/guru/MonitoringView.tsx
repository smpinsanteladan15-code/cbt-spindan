import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserX,
  Radio,
  Search,
  Filter,
  RefreshCw,
  Eye,
  UserCheck,
  GraduationCap,
  Sparkles,
  FileSpreadsheet,
  ExternalLink,
  Zap,
  Trash2,
} from 'lucide-react';
import { StudentViolationRecord, ExamViolationEvent, GoogleSheetsConfig } from '../../types/cbt';
import { audioAlertService } from '../../utils/audioAlert';
import { WibTimeInfo, resetStudentViolationBackend, getViolationSeverity } from '../../utils/cbtLogic';
import { appendMonitoringEventToSheet } from '../../services/googleSheets';

interface MonitoringViewProps {
  currentTime: WibTimeInfo;
  setNoticeMessage?: (msg: string) => void;
  hasAccessToken?: boolean;
  accessToken?: string | null;
  sheetsConfig?: GoogleSheetsConfig;
  onSignIn?: () => Promise<void>;
  onSyncMonitoringToSheet?: () => Promise<void>;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({
  currentTime,
  setNoticeMessage,
  hasAccessToken = false,
  accessToken = null,
  sheetsConfig,
  onSignIn,
  onSyncMonitoringToSheet,
}) => {
  const [records, setRecords] = useState<StudentViolationRecord[]>([]);
  const [recentEvents, setRecentEvents] = useState<ExamViolationEvent[]>([]);
  const [lastAlertId, setLastAlertId] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(() => audioAlertService.isMuted());
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'working' | 'locked' | 'warning' | 'finished'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [latestAlertToast, setLatestAlertToast] = useState<ExamViolationEvent | null>(null);
  const [resetConfirmNisn, setResetConfirmNisn] = useState<string | null>(null);
  const [isResetAllConfirmOpen, setIsResetAllConfirmOpen] = useState<boolean>(false);
  const [isClearSessionConfirmOpen, setIsClearSessionConfirmOpen] = useState<boolean>(false);

  const prevLastAlertIdRef = useRef<string>('');
  const isInitialMount = useRef<boolean>(true);

  // Poll monitoring data from server every 2 seconds
  const fetchMonitoring = async (isManual = false) => {
    if (isManual) setIsLoading(true);
    try {
      const res = await fetch('/api/exam/monitoring');
      if (res.ok) {
        const data = await res.json();
        const incomingRecords: StudentViolationRecord[] = data.records || [];
        const incomingEvents: ExamViolationEvent[] = data.recentEvents || [];
        const incomingAlertId: string = data.lastAlertId || '';

        setRecords(incomingRecords);
        setRecentEvents(incomingEvents);

        // Check if a new forced-exit event happened
        if (
          !isInitialMount.current &&
          incomingAlertId &&
          incomingAlertId !== prevLastAlertIdRef.current &&
          incomingEvents.length > 0
        ) {
          const topEvent = incomingEvents[0];
          // Trigger audio chime if it's an exit violation
          if (topEvent.exit_count > 0) {
            audioAlertService.playStudentExitAlarm();
            setLatestAlertToast(topEvent);
            setTimeout(() => setLatestAlertToast(null), 8000);
          }

          // Auto-sync event to Google Sheets if enabled
          if (
            hasAccessToken &&
            accessToken &&
            sheetsConfig?.spreadsheetId &&
            sheetsConfig?.autoSyncEnabled
          ) {
            appendMonitoringEventToSheet(accessToken, sheetsConfig.spreadsheetId, topEvent).catch(
              (err) => console.warn('Auto-sync event to Google Sheets error:', err)
            );
          }
        }

        prevLastAlertIdRef.current = incomingAlertId;
        setLastAlertId(incomingAlertId);
        isInitialMount.current = false;
      }
    } catch (err) {
      console.warn('Error fetching monitoring data:', err);
    } finally {
      if (isManual) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoring();
    const interval = setInterval(() => {
      fetchMonitoring();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioAlertService.setMuted(nextMuted);
    if (!nextMuted) {
      audioAlertService.testSound();
    }
  };

  const handleTestSound = () => {
    audioAlertService.testSound();
    if (setNoticeMessage) {
      setNoticeMessage('Suara alarm peringatan CBT diuji (berbunyi normal).');
    }
  };

  const handleResetSingle = async (nisn: string, studentName: string) => {
    const success = await resetStudentViolationBackend(nisn);
    if (success) {
      if (setNoticeMessage) {
        setNoticeMessage(`Status siswa "${studentName}" berhasil di-reset. Ujian kini dapat dikerjakan kembali.`);
      }
      setResetConfirmNisn(null);
      await fetchMonitoring(true);
    }
  };

  const handleResetAll = async () => {
    const success = await resetStudentViolationBackend();
    if (success) {
      if (setNoticeMessage) {
        setNoticeMessage('Seluruh status pelanggaran & kunci ujian siswa berhasil di-reset oleh pengawas.');
      }
      setIsResetAllConfirmOpen(false);
      await fetchMonitoring(true);
    }
  };

  const handleClearSession = async () => {
    try {
      const res = await fetch('/api/exam/clear-session', { method: 'POST' });
      if (res.ok) {
        if (setNoticeMessage) {
          setNoticeMessage('Sesi ujian berhasil dibersihkan ke kondisi awal (0 peserta). Sistem siap untuk pengerjaan baru.');
        }
        setIsClearSessionConfirmOpen(false);
        await fetchMonitoring(true);
      }
    } catch (e) {
      console.warn('Failed to clear session:', e);
    }
  };

  // Grouped lists for fast identification
  const lockedList = records.filter((r) => r.is_locked || r.exit_count >= 5);
  const warningList = records.filter((r) => r.exit_count > 0 && r.exit_count < 5);
  const workingList = records.filter((r) => r.status === 'Sedang Mengerjakan');
  const finishedList = records.filter((r) => r.status === 'Selesai');
  const totalViolations = records.reduce((acc, r) => acc + (r.exit_count || 0), 0);

  // Filtered list for the main table
  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.student_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      rec.student_nisn.includes(searchFilter.trim()) ||
      rec.student_class.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (rec.student_exam_room || '').toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'locked') return rec.is_locked || rec.exit_count >= 5;
    if (statusFilter === 'warning') return rec.exit_count > 0 && rec.exit_count < 5;
    if (statusFilter === 'working') return rec.status === 'Sedang Mengerjakan';
    if (statusFilter === 'finished') return rec.status === 'Selesai';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Real-time Audio Alert Toast */}
      {latestAlertToast && (
        <div className="bg-rose-700 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 border-2 border-rose-300 animate-bounce">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <p className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>PERINGATAN: SISWA MEMAKSA KELUAR!</span>
                <span className="bg-rose-900 px-2.5 py-0.5 rounded text-xs uppercase font-bold text-rose-200">
                  {latestAlertToast.exit_count >= 5 ? '5x (TERKUNCI)' : `Ke-${latestAlertToast.exit_count}x`}
                </span>
              </p>
              <p className="text-xs text-rose-100 mt-0.5">
                <strong>{latestAlertToast.student_name}</strong> (Kelas {latestAlertToast.student_class} · Ruang {latestAlertToast.student_exam_room || '1'}) · {latestAlertToast.reason} · {latestAlertToast.timestamp}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLatestAlertToast(null)}
            className="px-3 py-1.5 bg-white text-rose-800 hover:bg-rose-100 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#003366]">
              PENGAWASAN REAL-TIME CBT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003366] mt-1 flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-rose-600" />
            <span>MONITORING STATUS & KUNCI UJIAN SISWA</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Mendeteksi langsung siswa yang masuk ujian, peringatan keluar, serta pemblokiran otomatis pada 5x toleransi.
          </p>
        </div>

        {/* Audio, Sheets & Monitoring Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Google Sheets Status / Sync Button */}
          {hasAccessToken && sheetsConfig?.spreadsheetId ? (
            <button
              type="button"
              onClick={async () => {
                if (onSyncMonitoringToSheet) {
                  setIsSyncingSheets(true);
                  try {
                    await onSyncMonitoringToSheet();
                  } finally {
                    setIsSyncingSheets(false);
                  }
                }
              }}
              disabled={isSyncingSheets}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Sinkronkan seluruh data monitoring peserta ke tab 'Log Monitoring Siswa' di Google Sheets"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
              <span>{isSyncingSheets ? 'Menyinkronkan...' : 'Sinkronkan ke Sheets'}</span>
            </button>
          ) : (
            onSignIn && (
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Hubungkan akun Google Sheets untuk pencatatan otomatis"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hubungkan Sheets</span>
              </button>
            )
          )}

          {hasAccessToken && sheetsConfig?.spreadsheetUrl && (
            <a
              href={sheetsConfig.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition-colors cursor-pointer"
              title="Buka Google Sheets di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
            </a>
          )}

          <button
            type="button"
            onClick={handleTestSound}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-[#003366] text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            title="Bunyikan suara untuk menguji volume speaker pengawas"
          >
            <Play className="w-3.5 h-3.5 text-sky-700" />
            <span>Uji Suara Alarm</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              isMuted
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
            title={isMuted ? 'Alarm suara dibisukan (Klik untuk aktifkan)' : 'Alarm suara aktif (Klik untuk bisukan)'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-600" />
                <span>Alarm: Bisu</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-200" />
                <span>Alarm: Berbunyi Aktif</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => fetchMonitoring(true)}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Perbarui data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Critical Banner: When Any Student is Locked Out */}
      {lockedList.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-500 p-4 sm:p-5 rounded-2xl shadow-md space-y-3 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-rose-800">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-base sm:text-lg text-rose-950 flex items-center gap-2">
                  <span>PERINGATAN: ADA {lockedList.length} SISWA TERKUNCI (5X KELUAR)</span>
                </h2>
                <p className="text-xs text-rose-800">
                  Siswa berikut tidak dapat melanjutkan ujian hingga pengawas menekan tombol <strong>Buka Kunci / Reset</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsResetAllConfirmOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 shadow flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Semua Siswa</span>
            </button>
          </div>

          {/* Quick Roster of Locked Students */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {lockedList.map((st) => (
              <div
                key={st.student_nisn}
                className="p-2.5 rounded-xl bg-white border border-rose-300 flex items-center justify-between gap-2 shadow-xs"
              >
                <div className="min-w-0">
                  <p className="font-extrabold text-slate-900 text-xs truncate">{st.student_name}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    NISN: {st.student_nisn} · Kelas {st.student_class} ({st.student_exam_room || 'Ruang 1'})
                  </p>
                  <p className="text-[10px] text-rose-600 font-bold">
                    Keluar: {st.exit_count}x (Terkunci) · {st.last_exit_time}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResetConfirmNisn(st.student_nisn)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <Unlock className="w-3 h-3" />
                  <span>Buka Kunci</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards: Detailed with Names & Participants */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Siswa Terkunci (5x Keluar) with Name List */}
        <article className="bg-white rounded-2xl p-5 border-2 border-rose-300 shadow-sm flex flex-col justify-between bg-gradient-to-br from-white to-rose-50/60">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                <span>Siswa Terkunci (5x Keluar)</span>
              </h2>
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                <UserX className="w-5 h-5" />
              </div>
            </div>

            <p className="text-3xl font-extrabold text-rose-700 mt-2 font-mono">
              {lockedList.length} <span className="text-sm font-semibold text-rose-600">Siswa</span>
            </p>
            <p className="text-[11px] text-rose-600 mt-0.5 font-semibold">
              Tidak bisa mengerjakan sebelum di-reset
            </p>
          </div>

          {/* Student Names in Terkunci */}
          <div className="mt-3 pt-3 border-t border-rose-200">
            {lockedList.length === 0 ? (
              <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Aman: Tidak ada siswa yang terkunci</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <p className="text-[10px] uppercase font-bold text-rose-900 tracking-wider">
                  Daftar Nama Siswa Terkunci:
                </p>
                {lockedList.map((st) => (
                  <div
                    key={st.student_nisn}
                    className="p-1.5 rounded-lg bg-rose-100/80 text-[11px] flex items-center justify-between gap-1 border border-rose-200"
                  >
                    <div className="min-w-0">
                      <p className="font-extrabold text-rose-950 truncate">{st.student_name}</p>
                      <p className="text-[9px] text-rose-800 font-mono">
                        {st.student_class} · Ruang {st.student_exam_room || '1'} · NISN: {st.student_nisn}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResetConfirmNisn(st.student_nisn)}
                      className="px-2 py-0.5 rounded bg-rose-700 hover:bg-rose-800 text-white text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      Reset
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        {/* Card 2: Siswa Peringatan (1-4x Keluar) with Name List */}
        <article className="bg-white rounded-2xl p-5 border border-amber-300 shadow-sm flex flex-col justify-between bg-gradient-to-br from-white to-amber-50/50">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Siswa Peringatan (1-4x)</span>
              </h2>
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <p className="text-3xl font-extrabold text-amber-700 mt-2 font-mono">
              {warningList.length} <span className="text-sm font-semibold text-amber-600">Siswa</span>
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Mendekati batas 5x toleransi keluar
            </p>
          </div>

          {/* Student Names in Peringatan */}
          <div className="mt-3 pt-3 border-t border-amber-200">
            {warningList.length === 0 ? (
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Belum ada siswa dengan peringatan</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <p className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">
                  Daftar Siswa Mendapat Peringatan:
                </p>
                {warningList.map((st) => (
                  <div
                    key={st.student_nisn}
                    className="p-1.5 rounded-lg bg-amber-100/80 text-[11px] flex items-center justify-between gap-1 border border-amber-200"
                  >
                    <div className="min-w-0">
                      <p className="font-extrabold text-amber-950 truncate">{st.student_name}</p>
                      <p className="text-[9px] text-amber-800 font-mono">
                        Kelas {st.student_class} · Ruang {st.student_exam_room || '1'} · <strong className="text-amber-900">{st.exit_count}/5x</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResetConfirmNisn(st.student_nisn)}
                      className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      Reset
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        {/* Card 3: Sedang Mengerjakan Ujian Real-time */}
        <article className="bg-white rounded-2xl p-5 border border-emerald-300 shadow-sm flex flex-col justify-between bg-gradient-to-br from-white to-emerald-50/40">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Sedang Mengerjakan</span>
              </h2>
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <p className="text-3xl font-extrabold text-emerald-700 mt-2 font-mono">
              {workingList.length} <span className="text-sm font-semibold text-emerald-600">Aktif</span>
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Siswa yang sudah masuk lembar ujian
            </p>
          </div>

          {/* Student Names in Sedang Mengerjakan */}
          <div className="mt-3 pt-3 border-t border-emerald-200">
            {workingList.length === 0 ? (
              <div className="text-[11px] text-slate-400">
                Belum ada siswa yang masuk ke ujian saat ini.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <p className="text-[10px] uppercase font-bold text-emerald-900 tracking-wider">
                  Siswa Sedang Aktif Mengerjakan:
                </p>
                {workingList.map((st) => (
                  <div
                    key={st.student_nisn}
                    className="p-1.5 rounded-lg bg-emerald-50 text-[11px] flex items-center justify-between gap-1 border border-emerald-200"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-emerald-950 truncate">{st.student_name}</p>
                      <p className="text-[9px] text-emerald-700 font-mono">
                        Kelas {st.student_class} ({st.student_exam_room || 'Ruang 1'}) · Jam Masuk: {st.entered_at || '-'}
                      </p>
                    </div>
                    <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-900 rounded text-[9px] font-bold shrink-0">
                      Aktif
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        {/* Card 4: Selesai & Total Aktivitas */}
        <article className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#003366]" />
                <span>Selesai & Total Sesi</span>
              </h2>
              <div className="w-9 h-9 rounded-xl bg-[#003366] text-white flex items-center justify-center shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>

            <p className="text-3xl font-extrabold text-[#003366] mt-2 font-mono">
              {records.length} <span className="text-sm font-semibold text-slate-500">Terpantau</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {finishedList.length} siswa telah selesai mengerjakan
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1 text-[11px] text-slate-600">
            <div className="flex justify-between">
              <span>Total Insiden Keluar:</span>
              <strong className="text-rose-600 font-mono">{totalViolations}x</strong>
            </div>
            <div className="flex justify-between">
              <span>Toleransi Maksimal:</span>
              <strong className="text-slate-800">5x (Kunci Otomatis)</strong>
            </div>
            <div className="flex justify-between">
              <span>Status Sistem:</span>
              <span className="text-emerald-700 font-bold">Aktif & Terhubung</span>
            </div>
          </div>
        </article>
      </div>

      {/* Main Monitoring Table */}
      <section aria-labelledby="monitoring-table-title" className="bg-white rounded-2xl p-6 border border-[#dce6ed] shadow-sm">
        {/* Table Top Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 id="monitoring-table-title" className="text-lg font-bold text-[#003366] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>DAFTAR REAL-TIME PESERTA UJIAN ({filteredRecords.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Memantau siapa yang sedang mengerjakan, siapa yang keluar/peringatan, dan siapa yang terkunci 5x.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama siswa / NISN..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#003366] focus:outline-none w-48 sm:w-56"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-[#003366] shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Semua ({records.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('working')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'working' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:text-emerald-700'
                }`}
              >
                Mengerjakan ({workingList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('locked')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'locked' ? 'bg-rose-600 text-white shadow-xs' : 'hover:text-rose-700'
                }`}
              >
                Terkunci ({lockedList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('warning')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'warning' ? 'bg-amber-500 text-white shadow-xs' : 'hover:text-amber-800'
                }`}
              >
                Peringatan ({warningList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('finished')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'finished' ? 'bg-sky-600 text-white shadow-xs' : 'hover:text-sky-700'
                }`}
              >
                Selesai ({finishedList.length})
              </button>
            </div>

            {/* Clear Session / Start Fresh Button */}
            <button
              type="button"
              onClick={() => setIsClearSessionConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="Bersihkan seluruh data sesi agar mulai dari 0 peserta (saat belum ada yang mulai)"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Kosongkan Sesi (0 Peserta)</span>
            </button>

            {/* Reset All Button */}
            {records.length > 0 && (
              <button
                type="button"
                onClick={() => setIsResetAllConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Semua</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#edf2f6] text-[#003366] font-bold">
              <tr>
                <th className="py-3 px-3">Nama Siswa / Peserta</th>
                <th className="py-3 px-3">Kelas & Ruang</th>
                <th className="py-3 px-3">Mata Pelajaran & Masuk</th>
                <th className="py-3 px-3 text-center">Frekuensi Keluar</th>
                <th className="py-3 px-3">Status Terkini</th>
                <th className="py-3 px-3">Waktu & Catatan Terakhir</th>
                <th className="py-3 px-3 text-center min-w-[130px]">Aksi Pengawas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Tidak ada peserta yang cocok dengan filter.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Data peserta akan muncul secara real-time saat siswa mulai mengerjakan lembar ujian CBT.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isLocked = rec.is_locked || rec.exit_count >= 5;
                  const severity = getViolationSeverity(rec.exit_count);

                  return (
                    <tr
                      key={rec.student_nisn}
                      className={`transition-colors ${
                        isLocked
                          ? 'bg-rose-50/70 hover:bg-rose-50'
                          : rec.exit_count >= 3
                          ? 'bg-amber-50/40 hover:bg-amber-50/70'
                          : rec.status === 'Selesai'
                          ? 'bg-slate-50/60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Student Name & NISN */}
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-slate-900 text-sm">{rec.student_name}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          NISN: {rec.student_nisn} · Absen {rec.student_absence_number || '-'}
                        </div>
                      </td>

                      {/* Class & Exam Room */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">Kelas {rec.student_class}</div>
                        <div className="text-[11px] text-slate-500">
                          {rec.student_exam_room || 'Ruang 1'}
                        </div>
                      </td>

                      {/* Subject & Start Time */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-[#003366]">{rec.subject_name || 'Ujian CBT'}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Masuk: {rec.entered_at || '-'}</span>
                        </div>
                      </td>

                      {/* Exit Counter Meter */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-extrabold ${severity.badgeClass}`}
                          >
                            {rec.exit_count} / 5x Keluar
                          </span>
                          {/* Mini 5-bar progress dots */}
                          <div className="flex items-center gap-1 mt-1.5">
                            {[1, 2, 3, 4, 5].map((step) => (
                              <span
                                key={step}
                                className={`w-2 h-2 rounded-full ${
                                  step <= rec.exit_count
                                    ? isLocked
                                      ? 'bg-rose-600'
                                      : 'bg-amber-500'
                                    : 'bg-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Current Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isLocked ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-extrabold text-xs shadow-xs">
                            <Lock className="w-3.5 h-3.5" />
                            <span>TERKUNCI ⛔</span>
                          </div>
                        ) : rec.status === 'Selesai' ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                            <span>Selesai Ujian</span>
                          </div>
                        ) : rec.exit_count > 0 ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-semibold text-xs border border-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Peringatan ({5 - rec.exit_count}x lagi)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Sedang Mengerjakan</span>
                          </div>
                        )}
                      </td>

                      {/* Last Event / Reason */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-xs font-semibold text-slate-700">
                          {rec.last_exit_time !== '-' ? rec.last_exit_time : rec.entered_at || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs" title={rec.last_exit_reason}>
                          {rec.last_exit_reason !== '-' ? rec.last_exit_reason : 'Sedang mengerjakan dengan tertib'}
                        </div>
                      </td>

                      {/* Action: Reset Button */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setResetConfirmNisn(rec.student_nisn)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
                            isLocked
                              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                              : 'bg-slate-200 hover:bg-[#003366] hover:text-white text-slate-700'
                          }`}
                          title="Buka kunci ujian dan reset hitungan keluar siswa menjadi 0"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Reset Siswa</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Real-time Event Stream Log */}
      <section aria-labelledby="live-log-title" className="bg-white rounded-2xl p-6 border border-[#dce6ed] shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#003366]" />
            <h2 id="live-log-title" className="text-sm font-bold text-[#003366] uppercase tracking-wider">
              RIWAYAT AKTIVITAS UJIAN REAL-TIME ({recentEvents.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Pembaruan otomatis real-time
          </span>
        </div>

        <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
          {recentEvents.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">
              Belum ada riwayat aktivitas ujian pada sesi ini.
            </p>
          ) : (
            recentEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5 ${
                      evt.exit_count >= 5
                        ? 'bg-rose-600 text-white'
                        : evt.reason.includes('Masuk')
                        ? 'bg-emerald-600 text-white'
                        : evt.reason.includes('selesai')
                        ? 'bg-sky-600 text-white'
                        : evt.exit_count === 0
                        ? 'bg-emerald-700 text-white'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {evt.exit_count >= 5
                      ? '5x TERKUNCI'
                      : evt.reason.includes('Masuk')
                      ? 'MASUK'
                      : evt.reason.includes('selesai')
                      ? 'SELESAI'
                      : evt.exit_count === 0
                      ? 'RESET'
                      : `${evt.exit_count}x KELUAR`}
                  </span>
                  <div>
                    <p className="font-bold text-slate-800">
                      {evt.student_name}{' '}
                      <span className="font-normal text-slate-500">
                        (Kelas {evt.student_class} · Ruang {evt.student_exam_room || '1'})
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{evt.reason}</p>
                  </div>
                </div>
                <div className="font-mono text-[11px] font-semibold text-slate-500 shrink-0">
                  {evt.timestamp}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Confirmation Modal: Reset Single Student */}
      {resetConfirmNisn && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">KONFIRMASI BUKA KUNCI & RESET</h3>
                <p className="text-xs text-slate-500">Aksi pengawas untuk membuka kembali ujian siswa</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {(() => {
                const target = records.find((r) => r.student_nisn === resetConfirmNisn);
                return (
                  <div>
                    <p className="font-bold text-slate-900 text-sm mb-1">{target?.student_name || 'Peserta Ujian'}</p>
                    <p className="font-mono text-[11px] text-slate-500 mb-2">
                      NISN: {target?.student_nisn} · Kelas {target?.student_class} ({target?.student_exam_room || 'Ruang 1'})
                    </p>
                    <p>
                      Hitungan keluar siswa akan dikembalikan ke <strong>0</strong> dan status <strong>Terkunci akan dibuka</strong>, sehingga siswa dapat kembali mengerjakan lembar soal ujian CBT.
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetConfirmNisn(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = records.find((r) => r.student_nisn === resetConfirmNisn);
                  handleResetSingle(resetConfirmNisn, target?.student_name || 'Siswa');
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <Unlock className="w-4 h-4" />
                <span>Ya, Buka Kunci & Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reset All Students */}
      {isResetAllConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">RESET SEMUA SISWA</h3>
                <p className="text-xs text-slate-500">Buka kunci seluruh peserta ruangan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              Tindakan ini akan <strong>mereset semua hitungan keluar dan membuka kunci seluruh siswa</strong> di ruang ujian menjadi 0. Gunakan ini saat memulai sesi baru atau atas instruksi ketua proktor.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetAllConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Semua Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear Entire Session to 0 */}
      {isClearSessionConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-slate-800">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">KOSONGKAN SESI MONITORING</h3>
                <p className="text-xs text-slate-500">Mulai sesi baru bersih dengan 0 siswa</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              Apakah Anda ingin <strong>mengosongkan data sesi monitoring saat ini</strong>? Gunakan opsi ini saat belum ada siswa yang mengerjakan ujian agar papan monitoring kembali bersih pada angka <strong>0 Siswa</strong>.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearSessionConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearSession}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Ya, Kosongkan Sesi (0 Peserta)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
