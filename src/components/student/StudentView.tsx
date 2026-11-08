import React, { useState } from 'react';
import { ArrowLeft, Clock, Calendar, CheckCircle2, AlertCircle, ExternalLink, BookOpen, Search, UserCheck, Lock } from 'lucide-react';
import { ScheduleItem, StudentItem } from '../../types/cbt';
import { getScheduleStatus, normalizeClass, WibTimeInfo, DEFAULT_CBT_EXIT_TOKEN, fetchStudentLockStatus } from '../../utils/cbtLogic';
import { CbtExamLockdownModal } from './CbtExamLockdownModal';

interface StudentViewProps {
  schedules: ScheduleItem[];
  students: StudentItem[];
  onBackToHome: () => void;
  currentTime: WibTimeInfo;
  activeToken?: string;
}

export const StudentView: React.FC<StudentViewProps> = ({
  schedules,
  students,
  onBackToHome,
  currentTime,
  activeToken = DEFAULT_CBT_EXIT_TOKEN,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('7');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [activeExamSchedule, setActiveExamSchedule] = useState<ScheduleItem | null>(null);
  const [studentLockStatus, setStudentLockStatus] = useState<{ exit_count: number; is_locked: boolean }>({
    exit_count: 0,
    is_locked: false,
  });

  // Check lock status when student is picked
  React.useEffect(() => {
    if (selectedStudent?.student_nisn) {
      fetchStudentLockStatus(selectedStudent.student_nisn).then((res) => {
        setStudentLockStatus(res);
      });
    } else {
      setStudentLockStatus({ exit_count: 0, is_locked: false });
    }
  }, [selectedStudent?.student_nisn]);

  const filteredSchedules = schedules
    .filter((s) => normalizeClass(s.schedule_class) === selectedClass)
    .sort((a, b) => a.schedule_date.localeCompare(b.schedule_date) || a.schedule_start.localeCompare(b.schedule_start));

  const matchedStudents = studentSearch.trim()
    ? students.filter(
        (s) =>
          s.student_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
          s.student_nisn.includes(studentSearch.trim())
      )
    : [];

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#17364e]">
      {/* Top Banner Header */}
      <header className="bg-[#003366] text-white shadow-md">
        <div className="max-w-5xl mx-auto px-5 py-8">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold mb-6 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#ffc72c] font-bold">
                SMP INSAN TELADAN · CBT ONLINE
              </p>
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white mt-1">
                PORTAL UJIAN CBT MANDIRI
              </h1>
              <p className="text-sky-200 text-sm mt-1">
                Pilih kelas dan periksa jadwal ujian aktif Anda hari ini.
              </p>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex items-center gap-3 backdrop-blur-sm">
              <Clock className="w-5 h-5 text-[#ffc72c] shrink-0" />
              <div>
                <p className="text-xs text-sky-200 font-medium">Waktu Sekarang</p>
                <p className="text-sm font-bold text-white font-mono">{currentTime.label}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        {/* Class Selection & Student Search */}
        <section aria-labelledby="class-selection-title" className="bg-white rounded-2xl p-6 border border-[#dce6ed] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 id="class-selection-title" className="font-bold text-lg text-[#003366] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#003366]" />
                <span>PILIH TINGKAT KELAS</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Jadwal mata pelajaran akan otomatis disesuaikan dengan kelas yang dipilih.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {['7', '8', '9'].map((grade) => {
                const isSelected = selectedClass === grade;
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setSelectedClass(grade)}
                    aria-pressed={isSelected}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#003366] text-white shadow-md ring-2 ring-[#ffc72c]'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Kelas {grade}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Check Student Room & Absence from Master Database */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label htmlFor="student-check-input" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>Cek Nomor Peserta / Ruang Ujian (Ketik Nama / NISN):</span>
              </label>
              <input
                id="student-check-input"
                type="text"
                placeholder="Contoh: Ahmad atau 0132001009..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg max-w-sm w-full focus:ring-2 focus:ring-[#003366] focus:outline-none"
              />
            </div>

            {selectedStudent && (
              <div
                className={`mt-3 p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  studentLockStatus.is_locked || studentLockStatus.exit_count >= 5
                    ? 'bg-rose-50 border-rose-300 text-rose-950 animate-pulse'
                    : studentLockStatus.exit_count > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {studentLockStatus.is_locked || studentLockStatus.exit_count >= 5 ? (
                    <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-slate-900">
                        Peserta Ujian: {selectedStudent.student_name}
                      </p>
                      {studentLockStatus.is_locked || studentLockStatus.exit_count >= 5 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                          TERKUNCI ⛔
                        </span>
                      ) : studentLockStatus.exit_count > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-200 text-amber-900">
                          {studentLockStatus.exit_count}/5x Keluar
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      NISN: {selectedStudent.student_nisn} · {selectedStudent.student_class} · No. Absen: {selectedStudent.student_absence_number} · Ruang: {selectedStudent.student_exam_room || 'Ruang 1'}
                    </p>
                    {(studentLockStatus.is_locked || studentLockStatus.exit_count >= 5) && (
                      <p className="text-[11px] font-bold text-rose-700 mt-1 bg-white/70 p-1.5 rounded-lg border border-rose-200">
                        ⚠️ Ujian Anda terkunci karena telah keluar 5x. Harap lapor ke Pengawas Ruang Ujian untuk di-reset di Panel Guru agar dapat mengerjakan kembali.
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-2.5 py-1 text-[11px] bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-100 font-bold cursor-pointer shrink-0"
                >
                  Ganti Peserta
                </button>
              </div>
            )}

            {matchedStudents.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 space-y-2">
                <p className="font-bold text-[#003366] flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Ditemukan di Database Master ({matchedStudents.length} siswa) — Klik untuk memilih:</span>
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {matchedStudents.map((ms) => {
                    const isSelected = selectedStudent?.id === ms.id;
                    return (
                      <button
                        key={ms.id}
                        type="button"
                        onClick={() => setSelectedStudent(ms)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-2 ring-emerald-400'
                            : 'bg-white border-sky-100 hover:border-sky-300 shadow-2xs'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-900">{ms.student_name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            NISN: {ms.student_nisn} · {ms.student_class} · Absen: {ms.student_absence_number}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                            {ms.student_exam_room || 'Ruang 1'}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Schedule List */}
        <section aria-labelledby="schedule-heading" className="bg-white rounded-2xl p-6 border border-[#dce6ed] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 id="schedule-heading" className="text-xl font-bold text-[#003366]">
                DAFTAR JADWAL UJIAN
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan jadwal ujian untuk siswa <strong>Kelas {selectedClass}</strong>
              </p>
            </div>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#003366]/10 text-[#003366]">
              Kelas {selectedClass} ({filteredSchedules.length} Ujian)
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {filteredSchedules.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 font-semibold">Belum ada jadwal ujian untuk kelas {selectedClass}.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Pengawas atau guru dapat menambahkan jadwal melalui panel guru.
                </p>
              </div>
            ) : (
              filteredSchedules.map((item) => {
                const currentStatus = getScheduleStatus(
                  item.schedule_date,
                  item.schedule_start,
                  item.schedule_end,
                  currentTime
                );

                const examUrl = String(item.schedule_exam_url || '').trim();
                const isLinkValid = /^https:\/\//i.test(examUrl);
                const canEnterExam = isLinkValid && currentStatus !== 'Selesai';

                return (
                  <article
                    key={item.id}
                    className="p-5 rounded-2xl border-l-4 border-[#087f78] bg-[#f7fbfa] border border-[#dce6ed] hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-[#003366]">
                            {item.subject_name}
                          </h3>
                          <span
                            className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                              currentStatus === 'Aktif'
                                ? 'bg-[#087f78] text-white animate-pulse'
                                : currentStatus === 'Selesai'
                                ? 'bg-[#852d35] text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {currentStatus}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {item.schedule_date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {item.schedule_start} – {item.schedule_end} WIB
                          </span>
                          <span>•</span>
                          <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-semibold">
                            {item.schedule_session}
                          </span>
                        </div>
                      </div>

                      {/* Action Button: Enters CBT Lockdown mode */}
                      <div>
                        {canEnterExam ? (
                          <button
                            type="button"
                            onClick={() => setActiveExamSchedule(item)}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#087f78] hover:bg-[#066560] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
                          >
                            <Lock className="w-4 h-4 text-emerald-300" />
                            <span>Masuk Ujian Sekarang (CBT Terkunci)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-200 text-slate-500 font-semibold text-xs cursor-not-allowed opacity-80"
                            title={
                              currentStatus === 'Selesai'
                                ? 'Ujian sudah selesai'
                                : 'Tautan HTTPS soal ujian belum dimasukkan oleh guru'
                            }
                          >
                            {currentStatus === 'Selesai' ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-rose-700" />
                                <span>Ujian Sudah Selesai</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <span>Link Soal Belum Tersedia</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="mt-8 p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Mode Kiosk CBT Mandiri:</strong> Saat menekan tombol masuk ujian, aplikasi akan masuk ke mode layar penuh terkunci (CBT Lockdown). Siswa tidak dapat keluar bebas tanpa memasukkan <strong>Token Keluar</strong> resmi dari pengawas ruang. Soal ujian dimuat langsung dari tautan guru.
            </div>
          </div>
        </section>
      </main>

      {/* CBT Exam Lockdown View */}
      {activeExamSchedule && (
        <CbtExamLockdownModal
          isOpen={!!activeExamSchedule}
          schedule={activeExamSchedule}
          currentTime={currentTime}
          activeToken={activeToken}
          students={students}
          selectedStudent={selectedStudent}
          onSelectStudent={setSelectedStudent}
          onExitExam={() => setActiveExamSchedule(null)}
        />
      )}
    </div>
  );
};

