import React from 'react';
import { MasterSubTab, GuruTab, ScheduleItem, TeacherItem, StudentItem } from '../../types/cbt';
import { Users, Calendar, Clock, ArrowRight, ShieldCheck, Database, CheckCircle2, GraduationCap, RefreshCw, ExternalLink, FileSpreadsheet } from 'lucide-react';
import { WibTimeInfo } from '../../utils/cbtLogic';

interface DashboardViewProps {
  teachers: TeacherItem[];
  schedules: ScheduleItem[];
  students: StudentItem[];
  currentTime: WibTimeInfo;
  onNavigateTab: (tab: GuruTab) => void;
  onOpenDatabaseModal?: (tab?: MasterSubTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  teachers,
  schedules,
  students,
  currentTime,
  onNavigateTab,
  onOpenDatabaseModal,
}) => {
  return (
    <div className="space-y-6">
      {/* Module Header */}
      <header className="pb-4 border-b border-slate-200">
        <p className="text-xs uppercase font-extrabold tracking-widest text-[#60758a]">
          SMP INSAN TELADAN / PANEL ADMIN & PENGAWAS
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003366] mt-2">
          PORTAL UJIAN SEKOLAH
        </h1>
        <p className="text-sm font-bold text-[#60758a] mt-1">
          SISTEM CBT-SPINDAN (SMP INSAN TELADAN)
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Pusat kendali master data, jadwal sesi ujian, dan pencetakan kartu akses QR Exambro.
        </p>
      </header>

      {/* Connected Master Database Banner with Direct Click & Sync */}
      <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Database className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                MASTER DATABASE AKTIF & TERHUBUNG
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => onOpenDatabaseModal?.('teachers')}
                className="group inline-flex items-center gap-1.5 text-xs font-mono bg-white hover:bg-emerald-100/70 border border-emerald-200 hover:border-emerald-400 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs"
                title="Klik untuk membuka database guru & mapel dan langsung disinkronkan"
              >
                <span className="font-sans font-bold text-slate-700 text-[11px]">Database Guru:</span>
                <span className="text-blue-700 underline font-medium truncate max-w-[180px] sm:max-w-xs group-hover:text-blue-900">
                  MASTER_..._f5f5b44b
                </span>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-700" />
              </button>

              <button
                type="button"
                onClick={() => onOpenDatabaseModal?.('students')}
                className="group inline-flex items-center gap-1.5 text-xs font-mono bg-white hover:bg-emerald-100/70 border border-emerald-200 hover:border-emerald-400 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs"
                title="Klik untuk membuka database siswa dan langsung disinkronkan"
              >
                <span className="font-sans font-bold text-slate-700 text-[11px]">Database Siswa:</span>
                <span className="text-blue-700 underline font-medium truncate max-w-[180px] sm:max-w-xs group-hover:text-blue-900">
                  MASTER_..._83338db6
                </span>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-700" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-1.5">
              Klik sumber link di atas untuk <strong>langsung membuka data base & menyinkronkannya</strong> secara instan: <strong>{students.length} Siswa</strong> · <strong>{teachers.length} Guru/Mapel</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => onOpenDatabaseModal?.('teachers')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Buka master database dan langsung sinkronkan"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Buka & Sinkronkan</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('master')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[#003366] hover:bg-[#00264d] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <span>Data Master</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="bg-white rounded-2xl p-5 border border-[#dce6ed] shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-xs font-medium text-slate-500">Total Siswa</h2>
            <p className="text-3xl font-extrabold text-[#003366] mt-1">{students.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Database Ruang 1</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#003366]">
            <GraduationCap className="w-6 h-6" />
          </div>
        </article>

        <article className="bg-white rounded-2xl p-5 border border-[#dce6ed] shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-xs font-medium text-slate-500">Guru & Mapel</h2>
            <p className="text-3xl font-extrabold text-[#003366] mt-1">{teachers.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Terdaftar di Data Master</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700">
            <Users className="w-6 h-6" />
          </div>
        </article>

        <article className="bg-white rounded-2xl p-5 border border-[#dce6ed] shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-xs font-medium text-slate-500">Jadwal Ujian</h2>
            <p className="text-3xl font-extrabold text-[#087f78] mt-1">{schedules.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Sesi ujian terkonfigurasi</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center text-[#087f78]">
            <Calendar className="w-6 h-6" />
          </div>
        </article>

        <article className="bg-white rounded-2xl p-5 border border-[#dce6ed] shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-xs font-medium text-slate-500">Waktu Sekolah</h2>
            <p className="text-xl font-extrabold text-slate-800 mt-1 font-mono">{currentTime.time} WIB</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{currentTime.date}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </article>
      </div>

      {/* Quick Access Actions */}
      <section className="bg-white rounded-2xl p-6 border border-[#dce6ed] shadow-sm">
        <h2 className="text-base font-bold text-[#003366]">
          Akses Cepat Pengelolaan
        </h2>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('monitoring')}
            className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 text-rose-900 text-left transition-all flex items-center justify-between group cursor-pointer shadow-xs"
          >
            <div>
              <p className="font-bold text-sm text-rose-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                <span>Monitoring Ujian</span>
              </p>
              <p className="text-xs text-rose-700 mt-0.5">Siswa Keluar & Terkunci</p>
            </div>
            <ArrowRight className="w-5 h-5 text-rose-700 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('results')}
            className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-950 text-left transition-all flex items-center justify-between group cursor-pointer shadow-xs"
          >
            <div>
              <p className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Hasil Ujian & Sheets</span>
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">Rekap & Google Sheets</p>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-700 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('master')}
            className="p-4 rounded-xl border border-slate-200 bg-[#e8eef4] hover:bg-[#d5e2ee] text-[#003366] text-left transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <p className="font-bold text-sm">Data Master CBT</p>
              <p className="text-xs text-slate-600 mt-0.5">{students.length} Siswa · {teachers.length} Guru</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#003366] group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('schedule')}
            className="p-4 rounded-xl border border-slate-200 bg-[#e8eef4] hover:bg-[#d5e2ee] text-[#003366] text-left transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <p className="font-bold text-sm">Jadwal & Sesi Ujian</p>
              <p className="text-xs text-slate-600 mt-0.5">Kelola link & status</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#003366] group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('poster')}
            className="p-4 rounded-xl border border-slate-200 bg-[#e8eef4] hover:bg-[#d5e2ee] text-[#003366] text-left transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <p className="font-bold text-sm">Poster QR Exambro</p>
              <p className="text-xs text-slate-600 mt-0.5">Cetak kartu akses A4</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#003366] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Security and Operation Notice */}
      <aside className="rounded-xl border-l-4 border-[#ffc72c] bg-[#fff6d8] p-5 text-xs text-[#594716] leading-relaxed">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-amber-900 mb-1">Keamanan & Sinkronisasi Database</p>
            Panel ini telah dilindungi kata kunci akses khusus guru & pengawas ujian. Seluruh entri dan perubahan jadwal, status pelanggaran siswa, link ujian, maupun data siswa/guru secara otomatis terhubung langsung ke Master Database CBT SMP Insan Teladan.
          </div>
        </div>
      </aside>
    </div>
  );
};
