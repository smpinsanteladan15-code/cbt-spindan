import React, { useState } from 'react';
import { SchoolLogo } from '../common/SchoolLogo';
import { GraduationCap, ShieldCheck, Clock } from 'lucide-react';
import { WibTimeInfo } from '../../utils/cbtLogic';
import { TeacherPasswordModal } from './TeacherPasswordModal';

interface HomeViewProps {
  onEnterStudent: () => void;
  onEnterGuru: () => void;
  currentTime: WibTimeInfo;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onEnterStudent,
  onEnterGuru,
  currentTime,
}) => {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen w-full bg-[radial-gradient(circle_at_85%_10%,#1e6486,transparent_45%),linear-gradient(160deg,#003366,#001e39)] text-white flex flex-col justify-between">
      {/* Top Bar with Live WIB Clock */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs uppercase tracking-widest text-emerald-300 font-semibold">Server CBT Aktif</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-sky-200 bg-white/10 px-3 py-1.5 rounded-full">
          <Clock className="w-3.5 h-3.5 text-amber-300" />
          <span>{currentTime.label}</span>
        </div>
      </header>

      {/* Main Hero Card */}
      <main className="max-w-2xl mx-auto w-full px-6 py-10 flex flex-col items-center text-center my-auto">
        <SchoolLogo className="w-52 h-56 transition-transform hover:scale-105 duration-300" />

        <p className="tracking-[0.2em] uppercase text-sm font-bold text-[#ffc72c] mt-6">
          SMP INSAN TELADAN
        </p>

        <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-white mt-3 leading-tight">
          PORTAL CBT — SMP INSAN TELADAN
        </h1>

        <div className="my-5 h-1 w-20 rounded bg-[#ffc72c]" aria-hidden="true"></div>

        <p className="text-sky-100 text-base max-w-md">
          Sistem Computer Based Test (CBT) Mandiri Sekolah untuk Penilaian Harian, PTS, dan PAS Berbasis Digital.
        </p>

        {/* Action Buttons */}
        <div className="w-full grid gap-4 mt-10 max-w-md">
          <button
            type="button"
            onClick={onEnterStudent}
            className="w-full min-h-[60px] bg-[#003366] hover:bg-[#00264d] text-white border-2 border-[#ffc72c] rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <GraduationCap className="w-6 h-6 text-[#ffc72c]" />
            <span>MASUK SEBAGAI SISWA</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full min-h-[60px] bg-[#852d35] hover:bg-[#6e2229] text-white border border-rose-300/30 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <ShieldCheck className="w-6 h-6 text-rose-200" />
            <span>MASUK SEBAGAI GURU</span>
          </button>
        </div>

        {/* Information badge */}
        <div className="mt-8 text-xs text-sky-200/80 bg-white/5 border border-white/10 rounded-lg p-3 max-w-md">
          Pastikan siswa masuk sesuai dengan sesi dan kelas yang tertera pada kartu jadwal ujian masing-masing.
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-5 text-center text-xs text-sky-300/70 border-t border-white/10">
        <p>SMP Insan Teladan © 2026 · Sistem Ujian Berbasis Komputer & Handphone</p>
      </footer>

      {/* Password Modal */}
      <TeacherPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => {
          setIsPasswordModalOpen(false);
          onEnterGuru();
        }}
      />
    </div>
  );
};
