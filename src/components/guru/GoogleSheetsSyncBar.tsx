import React, { useState } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Edit2,
  LogOut,
  Zap,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { GoogleSignInButton } from '../common/GoogleSignInButton';
import { GoogleSheetsConfig } from '../../types/cbt';

interface GoogleSheetsSyncBarProps {
  currentUser: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  hasAccessToken: boolean;
  sheetsConfig: GoogleSheetsConfig;
  isSyncing: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onCreateNewSpreadsheet: () => Promise<void>;
  onSyncAll: () => Promise<void>;
  onUpdateSpreadsheetId: (id: string) => Promise<void>;
  onToggleAutoSync: (enabled: boolean) => Promise<void>;
}

export const GoogleSheetsSyncBar: React.FC<GoogleSheetsSyncBarProps> = ({
  currentUser,
  hasAccessToken,
  sheetsConfig,
  isSyncing,
  onSignIn,
  onSignOut,
  onCreateNewSpreadsheet,
  onSyncAll,
  onUpdateSpreadsheetId,
  onToggleAutoSync,
}) => {
  const [isEditingId, setIsEditingId] = useState(false);
  const [customIdInput, setCustomIdInput] = useState(sheetsConfig.spreadsheetId || '');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Lanjutkan',
    action: async () => {},
  });

  const handleCreateNewClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Buat Spreadsheet Baru di Google Drive?',
      description:
        'Sistem CBT akan membuat file Google Spreadsheet baru di Google Drive Anda dengan judul "CBT SMP Insan Teladan - Hasil & Monitoring", lengkap dengan tab Hasil Ujian, Log Monitoring, dan Rekap Peserta.',
      confirmText: 'Ya, Buat Spreadsheet Baru',
      action: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await onCreateNewSpreadsheet();
      },
    });
  };

  const handleSyncAllClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Sinkronkan Seluruh Data ke Google Sheets?',
      description:
        'Data seluruh peserta hasil ujian dan riwayat log monitoring CBT akan ditulis dan diperbarui ke tab Google Spreadsheet Anda saat ini.',
      confirmText: 'Ya, Sinkronkan Data',
      action: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await onSyncAll();
      },
    });
  };

  const handleSaveIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customIdInput.trim()) {
      await onUpdateSpreadsheetId(customIdInput.trim());
      setIsEditingId(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border-2 border-emerald-300 p-4 sm:p-5 shadow-sm space-y-4 bg-gradient-to-br from-white to-emerald-50/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Identity & Google Account info */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-[#003366]">
                  INTEGRASI GOOGLE SHEETS API
                </span>
                {hasAccessToken ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Terhubung</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>Belum Terhubung</span>
                  </span>
                )}
                {hasAccessToken && sheetsConfig.autoSyncEnabled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300 uppercase tracking-wider">
                    <Zap className="w-3 h-3 text-sky-600" />
                    <span>Simpan Otomatis: AKTIF</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mt-0.5">
                {hasAccessToken && currentUser ? (
                  <span>
                    Akun Google: <strong className="text-slate-800">{currentUser.displayName || currentUser.email}</strong>{' '}
                    ({currentUser.email})
                  </span>
                ) : (
                  <span>
                    Hubungkan akun Google untuk menyimpan data hasil ujian dan aktivitas monitoring siswa secara otomatis ke Google Spreadsheet.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right: Auth Action / User Profile */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!hasAccessToken ? (
              <GoogleSignInButton
                onClick={onSignIn}
                text="Hubungkan Google Sheets"
                className="shadow-sm border-emerald-400"
              />
            ) : (
              <div className="flex items-center gap-2">
                {currentUser?.photoURL && (
                  <img
                    src={currentUser.photoURL}
                    alt="Google Profile"
                    className="w-7 h-7 rounded-full border border-emerald-300"
                  />
                )}
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
                  title="Putuskan sambungan Google Sheets"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Putuskan</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Spreadsheet Status & Direct Access (When Connected) */}
        {hasAccessToken && (
          <div className="pt-3 border-t border-emerald-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex-1 min-w-0">
              {sheetsConfig.spreadsheetId ? (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500 font-medium">Spreadsheet Aktif:</span>
                    <a
                      href={sheetsConfig.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sheetsConfig.spreadsheetId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 truncate max-w-md"
                      title="Buka Spreadsheet di tab baru"
                    >
                      <span className="truncate">{sheetsConfig.spreadsheetTitle || 'CBT SMP Insan Teladan'}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>ID: {sheetsConfig.spreadsheetId}</span>
                    {sheetsConfig.lastSyncTime && (
                      <span className="text-emerald-700 font-bold">
                        · Terakhir Sinkron: {sheetsConfig.lastSyncTime}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Belum ada Google Spreadsheet yang terhubung. Klik <strong>Buat Spreadsheet Baru</strong> untuk memulai pencatatan otomatis.
                  </span>
                </div>
              )}
            </div>

            {/* Quick Spreadsheet Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {sheetsConfig.spreadsheetId && (
                <>
                  <a
                    href={sheetsConfig.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sheetsConfig.spreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Buka di Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={handleSyncAllClick}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleCreateNewClick}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{sheetsConfig.spreadsheetId ? 'Buat Baru' : 'Buat Spreadsheet Baru'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditingId(!isEditingId)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
                title="Ganti ID Spreadsheet manual"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Manual Spreadsheet ID editing drawer */}
        {isEditingId && hasAccessToken && (
          <form
            onSubmit={handleSaveIdSubmit}
            className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2 text-xs"
          >
            <label htmlFor="spreadsheet-id-input" className="text-slate-700 font-bold whitespace-nowrap">
              Masukkan ID Spreadsheet Google Anda:
            </label>
            <input
              id="spreadsheet-id-input"
              type="text"
              placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              value={customIdInput}
              onChange={(e) => setCustomIdInput(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Simpan ID
              </button>
              <button
                type="button"
                onClick={() => setIsEditingId(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Confirmation Modal for Destructive / Mutating operations (Workspace Requirement) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-500">Konfirmasi Operasi Google Sheets API</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDialog.action}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
