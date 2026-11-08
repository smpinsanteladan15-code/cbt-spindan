import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  ShieldAlert,
  Clock,
  Maximize2,
  Minimize2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  XCircle,
  HelpCircle,
  RefreshCw,
  LogOut,
  User,
} from 'lucide-react';
import { ScheduleItem, StudentItem } from '../../types/cbt';
import {
  formatTimeRemaining,
  verifyExitToken,
  WibTimeInfo,
  reportStudentExit,
  reportStudentEnterExam,
  reportStudentFinishExam,
  fetchStudentLockStatus,
  isStudentLocked,
  MAX_ALLOWED_EXITS,
} from '../../utils/cbtLogic';
import { SchoolLogo } from '../common/SchoolLogo';

interface CbtExamLockdownModalProps {
  isOpen: boolean;
  schedule: ScheduleItem;
  currentTime: WibTimeInfo;
  activeToken: string;
  students: StudentItem[];
  selectedStudent: StudentItem | null;
  onSelectStudent: (student: StudentItem | null) => void;
  onExitExam: () => void;
}

export const CbtExamLockdownModal: React.FC<CbtExamLockdownModalProps> = ({
  isOpen,
  schedule,
  currentTime,
  activeToken,
  students,
  selectedStudent,
  onSelectStudent,
  onExitExam,
}) => {
  if (!isOpen) return null;

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenNotice, setFullscreenNotice] = useState<boolean>(false);

  // Security violations (tab blur / visibility change)
  const [violations, setViolations] = useState<number>(0);
  const [showViolationAlert, setShowViolationAlert] = useState<boolean>(false);

  // Exit Token Modal state
  const [showTokenDialog, setShowTokenDialog] = useState<boolean>(false);
  const [showForceExitConfirm, setShowForceExitConfirm] = useState<boolean>(false);
  const [tokenInput, setTokenInput] = useState<string>('');
  const [tokenError, setTokenError] = useState<string>('');
  const [isExamCompleted, setIsExamCompleted] = useState<boolean>(false);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [isCheckingReset, setIsCheckingReset] = useState<boolean>(false);

  // Iframe loading & fallback state
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const [iframeErrorTimeout, setIframeErrorTimeout] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Check student initial lock status on mount or when student is selected
  const checkStatus = async () => {
    if (!selectedStudent?.student_nisn) return;
    setIsCheckingReset(true);
    try {
      const res = await fetchStudentLockStatus(selectedStudent.student_nisn);
      setViolations(res.exit_count);
      if (res.is_locked || res.exit_count >= 5) {
        setIsLockedOut(true);
      } else {
        setIsLockedOut(false);
      }
    } finally {
      setIsCheckingReset(false);
    }
  };

  useEffect(() => {
    checkStatus();
    if (selectedStudent?.student_nisn) {
      reportStudentEnterExam({
        student_nisn: selectedStudent.student_nisn,
        student_name: selectedStudent.student_name,
        student_class: selectedStudent.student_class || schedule.schedule_class,
        student_absence_number: selectedStudent.student_absence_number || '-',
        student_exam_room: selectedStudent.student_exam_room || 'Ruang 1',
        subject_name: schedule.subject_name,
        schedule_id: schedule.id,
      });
    }
  }, [selectedStudent?.student_nisn, schedule.id]);

  // Periodic poll in case proctor resets student lock from Guru Panel
  useEffect(() => {
    if (!selectedStudent?.student_nisn) return;
    const timer = setInterval(() => {
      fetchStudentLockStatus(selectedStudent.student_nisn).then((res) => {
        setViolations(res.exit_count);
        if (!res.is_locked && res.exit_count < 5) {
          setIsLockedOut(false);
        } else if (res.is_locked || res.exit_count >= 5) {
          setIsLockedOut(true);
        }
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [selectedStudent?.student_nisn]);

  // Record a violation event to backend and trigger proctor alarm
  const handleRecordViolation = async (reason: string) => {
    if (isExamCompleted) return;

    try {
      const res = await reportStudentExit({
        student_nisn: selectedStudent?.student_nisn || 'UNKNOWN',
        student_name: selectedStudent?.student_name || 'Peserta Ujian',
        student_class: selectedStudent?.student_class || schedule.schedule_class,
        student_absence_number: selectedStudent?.student_absence_number || '-',
        student_exam_room: selectedStudent?.student_exam_room || 'Ruang 1',
        subject_name: schedule.subject_name,
        schedule_id: schedule.id,
        reason,
      });

      setViolations(res.exit_count);
      if (res.is_locked || res.exit_count >= 5) {
        setIsLockedOut(true);
      }
      setShowViolationAlert(true);
    } catch (e) {
      console.warn('Failed to record violation:', e);
    }
  };

  // Request fullscreen when entering exam
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement && containerRef.current) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch (err) {
        console.warn('Fullscreen request denied or blocked by iframe policy:', err);
      }
    };

    enterFullscreen();

    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active && !isExamCompleted) {
        setFullscreenNotice(true);
        handleRecordViolation('Keluar dari mode layar penuh (Fullscreen Ditutup)');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isExamCompleted, selectedStudent]);

  // Anti-cheat: prevent window unload / tab switch
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isExamCompleted) {
        handleRecordViolation('Mencoba menutup atau memuat ulang halaman ujian');
        e.preventDefault();
        e.returnValue = 'Ujian CBT sedang berlangsung! Dilarang keluar tanpa izin pengawas.';
        return e.returnValue;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isExamCompleted) {
        handleRecordViolation('Berpindah tab atau membuka aplikasi lain');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isExamCompleted, selectedStudent]);

  // Timer calculation
  const timeRemaining = formatTimeRemaining(schedule.schedule_end, currentTime.time);

  // Iframe timeout helper (if site blocks framing)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!iframeLoaded) {
        setIframeErrorTimeout(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [iframeLoaded]);

  // Toggle fullscreen manually
  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current) {
          await containerRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
        setFullscreenNotice(false);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn('Fullscreen toggle failed:', e);
    }
  };

  // Exit Token verification
  const handleVerifyTokenAndExit = (e: React.FormEvent) => {
    e.preventDefault();
    setTokenError('');

    const isValid = verifyExitToken(tokenInput, activeToken);
    if (!isValid) {
      setTokenError('Token Keluar tidak valid! Minta token resmi dari Pengawas Ruang Ujian.');
      return;
    }

    if (selectedStudent?.student_nisn) {
      reportStudentFinishExam(selectedStudent.student_nisn, schedule.subject_name, schedule.id);
    }

    // Success! Mark exam completed
    setIsExamCompleted(true);
    setShowTokenDialog(false);
  };

  const handleFinishAndReturn = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Exit fullscreen error:', err);
    }
    onExitExam();
  };

  const examUrl = schedule.schedule_exam_url?.trim() || '';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#08121e] text-white flex flex-col font-sans select-none overflow-hidden"
    >
      {/* Top Authoritative CBT Kiosk Bar */}
      <header className="bg-[#002244] border-b border-sky-900/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md">
        {/* Left: School & Exam Identification */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 p-1 flex items-center justify-center border border-white/20">
            <SchoolLogo className="w-7 h-7 text-[#ffc72c]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                SMP INSAN TELADAN · CBT EXAM
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                KIOSK TERKUNCI
              </span>
            </div>
            <p className="text-xs text-sky-200">
              {schedule.subject_name} · Kelas {schedule.schedule_class} · {schedule.schedule_session}
            </p>
          </div>
        </div>

        {/* Center: Student Badge & Remaining Time */}
        <div className="flex items-center gap-3">
          {/* Student Picker/Info */}
          <div className="bg-sky-950/80 border border-sky-800/80 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
            <User className="w-3.5 h-3.5 text-sky-400" />
            {selectedStudent ? (
              <div>
                <p className="font-bold text-white text-xs truncate max-w-[150px]">
                  {selectedStudent.student_name}
                </p>
                <p className="text-[10px] text-sky-300">
                  NISN: {selectedStudent.student_nisn} · {selectedStudent.student_exam_room || 'Ruang 1'}
                </p>
              </div>
            ) : (
              <select
                aria-label="Pilih nama peserta ujian"
                value=""
                onChange={(e) => {
                  const s = students.find((std) => std.id === e.target.value);
                  if (s) onSelectStudent(s);
                }}
                className="bg-sky-900 text-sky-100 text-[11px] rounded px-2 py-1 border border-sky-700 focus:outline-none"
              >
                <option value="">Pilih Nama Peserta...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.student_name} ({s.student_nisn})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Countdown Clock */}
          <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-1.5 flex items-center gap-2 text-xs">
            <Clock className="w-4 h-4 text-[#ffc72c] animate-spin-slow" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Sisa Waktu</p>
              <p
                className={`font-mono font-extrabold text-xs ${
                  timeRemaining.isEnded ? 'text-rose-400' : 'text-[#ffc72c]'
                }`}
              >
                {timeRemaining.label}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Controls & Proctor Exit Button */}
        <div className="flex items-center gap-2">
          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Masuk Layar Penuh'}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-sky-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Selesaikan Ujian & Minta Keluar */}
          <button
            type="button"
            onClick={() => {
              setTokenInput('');
              setTokenError('');
              setShowTokenDialog(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Selesaikan & Keluar Ujian</span>
          </button>
        </div>
      </header>

      {/* Warning Banners */}
      {fullscreenNotice && !isFullscreen && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0 animate-bounce">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
            <span>
              PERHATIAN: Layar penuh non-aktif! Sesuai tata tertib CBT, Anda wajib berada dalam mode layar penuh selama ujian.
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            Masuk Layar Penuh
          </button>
        </div>
      )}

      {violations > 0 && (
        <div className="bg-rose-950 border-b border-rose-800 text-rose-200 px-4 py-1.5 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Catatan Pengawas: Terdeteksi <strong>{violations} kali</strong> beralih tab atau jendela aplikasi. Aktivitas ini dicatat sistem CBT.
            </span>
          </div>
          <span className="text-[10px] text-rose-300 font-mono">ID Sesi: {schedule.id}</span>
        </div>
      )}

      {/* Main Exam Viewport (Iframe or Locked Screen) */}
      <main className="flex-1 relative bg-slate-900 flex flex-col min-h-0">
        {/* If Student is Locked Out after 5 exits, DO NOT SHOW EXAM - SHOW AUTHORITATIVE LOCKOUT SCREEN */}
        {isLockedOut ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-white space-y-5 animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full bg-rose-600/20 text-rose-500 border-2 border-rose-500 flex items-center justify-center animate-bounce shadow-xl">
              <Lock className="w-10 h-10" />
            </div>

            <div className="max-w-md space-y-2">
              <span className="px-3.5 py-1 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-full shadow-md">
                UJIAN TERKUNCI · 5X KELUAR
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                AKSES UJIAN ANDA DIBLOKIR
              </h2>
              <p className="text-xs sm:text-sm text-rose-200 leading-relaxed">
                Anda terdeteksi memaksa keluar sebanyak <strong>{violations >= 5 ? violations : 5} kali</strong>. Sesuai ketentuan CBT SMP Insan Teladan, Anda tidak dapat melanjutkan pengerjaan soal ini.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700/80 p-5 rounded-2xl max-w-md w-full text-xs text-left text-slate-300 space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Nama Peserta:</span>
                <span className="font-bold text-white">{selectedStudent?.student_name || 'Peserta Ujian'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">NISN / Kelas:</span>
                <span className="font-mono font-semibold text-slate-200">
                  {selectedStudent?.student_nisn || '-'} · {selectedStudent?.student_class || schedule.schedule_class}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Mata Pelajaran:</span>
                <span className="font-bold text-sky-300">{schedule.subject_name}</span>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] leading-relaxed mt-2">
                <strong>INSTRUKSI PENGAWAS:</strong> Silakan segera lapor kepada Pengawas Ruang Ujian. Pengawas harus membuka dan mereset status ujian Anda di <strong>Panel Guru &gt; Monitoring Ujian</strong> agar soal dapat dibuka kembali.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={checkStatus}
                disabled={isCheckingReset}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingReset ? 'animate-spin' : ''}`} />
                <span>{isCheckingReset ? 'Memeriksa...' : 'Cek Ulang Status Reset Pengawas'}</span>
              </button>

              <button
                type="button"
                onClick={handleFinishAndReturn}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Kembali ke Beranda Siswa
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Info Strip */}
            <div className="bg-slate-800/80 border-b border-slate-700 px-4 py-1.5 flex items-center justify-between text-xs text-slate-300 shrink-0">
              <span className="truncate max-w-xl">
                Tautan Soal Ujian: <strong className="text-sky-300">{examUrl}</strong>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={examUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-bold cursor-pointer"
                  title="Buka lembar soal di tab jendela baru jika frame terblokir kebijakan browser"
                >
                  <span>Buka Tab Soal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Viewport Content */}
            <div className="flex-1 relative w-full h-full bg-white">
              {!iframeLoaded && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900 text-white p-6 space-y-4">
                  <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                  <p className="font-bold text-sm">Memuat Lembar Soal Ujian CBT SMP Insan Teladan...</p>
                  <p className="text-xs text-slate-400 max-w-md text-center">
                    Menghubungkan ke lembar soal resmi. Harap tunggu hingga halaman selesai dimuat.
                  </p>
                </div>
              )}

              {/* Iframe Loading Error / Header Restriction helper */}
              {iframeErrorTimeout && !iframeLoaded && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                    <HelpCircle className="w-8 h-8" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Mode Kompatibilitas Soal Ujian</h2>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Layanan formulir soal ujian membatasi tampilan langsung di dalam frame (kebijakan keamanan browser). Klik tombol di bawah untuk membuka soal di jendela ujian khusus. Layar CBT ini akan tetap terkunci dan memerlukan Token Keluar untuk selesai.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <a
                      href={examUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIframeLoaded(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#087f78] hover:bg-[#066560] text-white font-bold text-sm rounded-xl shadow-lg cursor-pointer"
                    >
                      <span>Kerjakan Soal Ujian (Jendela Penuh)</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              <iframe
                src={examUrl}
                title={`Ujian CBT ${schedule.subject_name}`}
                className="w-full h-full border-0"
                onLoad={() => setIframeLoaded(true)}
                allow="fullscreen; camera; microphone; display-capture"
              />
            </div>
          </>
        )}
      </main>

      {/* Security Violation Alert Dialog */}
      {showViolationAlert && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-2xl max-w-md w-full p-6 text-center text-white shadow-2xl space-y-4 animate-shake">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-extrabold text-lg text-white">
                {isLockedOut ? 'UJIAN DIBLOKIR · 5X KELUAR' : `PERINGATAN CBT (${violations}/5x KELUAR)`}
              </h3>
              <p className="text-xs text-rose-300 mt-1">
                {isLockedOut
                  ? 'Batas maksimal 5x keluar telah tercapai. Ujian terkunci otomatis!'
                  : `Anda terdeteksi keluar dari layar ujian CBT (${violations} dari batas 5x toleransi).`}
              </p>
            </div>

            <p className="text-xs text-slate-300 bg-slate-800/80 p-3 rounded-xl border border-slate-700 leading-relaxed">
              {isLockedOut
                ? 'Sistem CBT telah mengunci pengerjaan soal Anda dan membunyikan alarm di Panel Guru. Harap lapor kepada Pengawas Ruang untuk di-reset di panel pengawas.'
                : 'Tata tertib CBT melarang beralih jendela/tab aplikasi selama ujian. Jika Anda keluar mencapai 5 kali, ujian Anda akan TERKUNCI OTOMATIS dan tidak bisa dikerjakan sebelum di-reset oleh Pengawas di Panel Guru.'}
            </p>

            <button
              type="button"
              onClick={() => setShowViolationAlert(false)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {isLockedOut ? 'Saya Mengerti & Hubungi Pengawas' : 'Saya Mengerti & Kembali Mengerjakan'}
            </button>
          </div>
        </div>
      )}

      {/* Exit Token Dialog (Token Keluar) */}
      {showTokenDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#003366]">
                <KeyRound className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-base">VERIFIKASI TOKEN KELUAR</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTokenDialog(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Untuk mengakhiri dan keluar dari mode CBT terkunci, Anda wajib memasukkan <strong>Token Keluar</strong> yang diberikan oleh Pengawas Ruang Ujian.
            </p>

            <form onSubmit={handleVerifyTokenAndExit} className="space-y-4">
              <div>
                <label htmlFor="token-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Masukkan Token Keluar Pengawas:
                </label>
                <input
                  id="token-input"
                  type="text"
                  placeholder="Masukkan token keluar pengawas..."
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value.toUpperCase());
                    setTokenError('');
                  }}
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 text-center tracking-widest font-mono text-base font-bold uppercase border-2 border-slate-300 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none"
                />
                {tokenError && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{tokenError}</span>
                  </p>
                )}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 shrink-0 text-amber-700 mt-0.5" />
                <span>
                  Pastikan Anda sudah mengklik <strong>Kirim / Submit</strong> pada formulir soal sebelum meminta token keluar kepada pengawas.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTokenDialog(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal / Kembali Mengerjakan
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  Verifikasi & Selesai
                </button>
              </div>

              {/* Emergency Force Exit button without token */}
              <div className="pt-2 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowTokenDialog(false);
                    setShowForceExitConfirm(true);
                  }}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                >
                  Tidak Punya Token? Paksa Keluar Ujian (Dicatat Sistem)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Paksa Keluar Ujian */}
      {showForceExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-600 rounded-2xl max-w-md w-full p-6 text-white text-center shadow-2xl space-y-4 animate-shake">
            <div className="w-14 h-14 rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-extrabold text-lg text-white">KONFIRMASI PAKSA KELUAR</h3>
              <p className="text-xs text-rose-300 mt-1">
                Tindakan ini akan dicatat sebagai pelanggaran ke-<strong>{violations + 1} dari 5x</strong>!
              </p>
            </div>

            <p className="text-xs text-slate-300 bg-slate-800 p-3.5 rounded-xl border border-slate-700 text-left leading-relaxed">
              Memaksa keluar tanpa token akan <strong>membunyikan alarm suara di panel guru</strong> dan mencatat nama Anda. Jika keluar mencapai 5x, ujian Anda akan langsung <strong>TERKUNCI</strong> dan Anda tidak bisa mengerjakan sebelum di-reset di panel guru.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForceExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Batal / Lanjut Mengerjakan
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowForceExitConfirm(false);
                  await handleRecordViolation('Siswa menekan tombol paksa keluar tanpa token pengawas');
                  if (violations + 1 >= 5) {
                    setIsLockedOut(true);
                  } else {
                    handleFinishAndReturn();
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Ya, Paksa Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Dialog */}
      {isExamCompleted && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-7 text-center text-slate-900 shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="font-extrabold text-xl text-[#003366]">UJIAN TELAH SELESAI</h2>
              <p className="text-xs text-slate-600 mt-1">
                Token keluar terverifikasi. Sesi ujian mata pelajaran <strong>{schedule.subject_name}</strong> telah berhasil ditutup.
              </p>
            </div>

            {selectedStudent && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-left space-y-1">
                <p>
                  <strong>Peserta:</strong> {selectedStudent.student_name}
                </p>
                <p>
                  <strong>NISN:</strong> {selectedStudent.student_nisn}
                </p>
                <p>
                  <strong>Kelas / Ruang:</strong> {selectedStudent.student_class} ({selectedStudent.student_exam_room || 'Ruang 1'})
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleFinishAndReturn}
              className="w-full py-3 bg-[#003366] hover:bg-[#002244] text-white font-bold text-sm rounded-xl shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Kembali ke Portal Siswa</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
