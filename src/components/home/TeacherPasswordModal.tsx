import React, { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, ShieldAlert, ArrowRight, X } from 'lucide-react';

interface TeacherPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TeacherPasswordModal: React.FC<TeacherPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = password.trim().toUpperCase();
    if (clean === 'CBT-SPINDAN') {
      setErrorMsg('');
      setPassword('');
      onSuccess();
    } else {
      setErrorMsg('Kata kunci salah. Akses ini khusus untuk Guru & Pengawas Ruang Ujian.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-[#17364e] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Banner */}
        <div className="bg-[#852d35] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#ffc72c]" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg">AKSES PANEL GURU</h2>
              <p className="text-xs text-rose-200">OTENTIKASI PENGAWAS UJIAN</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Silakan masukkan kata kunci akses resmi untuk masuk ke dashboard kontrol master guru & pengawas ujian.
          </p>

          <div>
            <label htmlFor="teacher-pass-key" className="block text-xs font-bold text-slate-700 mb-1.5">
              Kata Kunci Akses Pengawas:
            </label>
            <div className="relative">
              <input
                id="teacher-pass-key"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Masukkan kata kunci akses pengawas..."
                autoFocus
                required
                className="w-full pl-10 pr-12 py-3 text-sm border-2 border-slate-300 rounded-xl focus:border-[#852d35] focus:ring-2 focus:ring-[#852d35]/20 focus:outline-none transition-all uppercase tracking-wider font-semibold placeholder:normal-case placeholder:font-normal"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                title={showPassword ? 'Sembunyikan kata kunci' : 'Tampilkan kata kunci'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold animate-in fade-in duration-150">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#852d35] hover:bg-[#6e2229] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Lanjut ke Panel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
