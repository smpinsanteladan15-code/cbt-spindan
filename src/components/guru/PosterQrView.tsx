import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Printer, ArrowLeft, RefreshCw, QrCode as QrIcon, CheckCircle2 } from 'lucide-react';

interface PosterQrViewProps {
  onBackToDashboard: () => void;
  portalUrl?: string;
}

export const PosterQrView: React.FC<PosterQrViewProps> = ({
  onBackToDashboard,
  portalUrl = window.location.href,
}) => {
  const [targetUrl, setTargetUrl] = useState<string>(portalUrl);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#003366',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR', err));
  }, [targetUrl]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Bar (hidden in print) */}
      <div className="print-hide flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#003366] text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard Guru</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="qr-target-url" className="text-xs font-bold text-slate-700 hidden sm:inline">
              Target URL QR:
            </label>
            <input
              id="qr-target-url"
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://..."
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg max-w-xs focus:ring-2 focus:ring-[#003366]"
            />
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003366] hover:bg-[#00264d] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#ffc72c]" />
            <span>Cetak Poster A4</span>
          </button>
        </div>
      </div>

      {/* The Printable A4 Sheet */}
      <div className="flex justify-center">
        <article className="poster-sheet w-full max-w-[760px] min-h-[1020px] bg-white shadow-xl rounded-2xl border border-slate-300 overflow-hidden flex flex-col justify-between">
          {/* Header Banner */}
          <header className="bg-[#003366] px-8 py-10 text-center text-white relative">
            <div className="inline-block px-4 py-1 rounded-full bg-white/10 border border-white/20 text-[#ffc72c] font-extrabold text-xs tracking-widest uppercase mb-3">
              SMP INSAN TELADAN
            </div>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-wide">
              KARTU AKSES UJIAN CBT
            </h1>
            <p className="text-sky-200 text-sm mt-2 font-medium">
              Sistem Computer Based Test (CBT) Mandiri Sekolah · Tahun Pelajaran 2026/2027
            </p>
          </header>

          {/* Main QR Area */}
          <div className="px-8 py-8 flex flex-col items-center text-center my-auto">
            {/* QR Frame Container */}
            <div className="w-72 h-72 sm:w-80 sm:h-80 border-8 border-[#003366] rounded-3xl p-4 bg-white shadow-lg flex flex-col items-center justify-center relative">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code Akses Ujian CBT SMP Insan Teladan"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-4">
                  <QrIcon className="w-16 h-16 mb-2" />
                  <p className="text-xs font-bold text-[#003366]">AREA QR RESMI</p>
                  <p className="text-[11px] text-slate-500 mt-1">Sedang membuat QR Code...</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                ✓ QR Siap Dipindai (Scan Ready)
              </span>
            </div>

            <h2 className="font-extrabold text-xl sm:text-2xl text-[#003366] mt-6 tracking-wide">
              SCAN QR MENGGUNAKAN APLIKASI EXAMBRO
            </h2>

            {/* Steps list */}
            <ol className="mt-6 grid w-full max-w-xl gap-3 text-left">
              <li className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-800">
                <span className="w-6 h-6 rounded-full bg-[#003366] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span>Buka aplikasi <strong>Exambro</strong> di handphone atau peramban Chrome/Edge siswa.</span>
              </li>

              <li className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-800">
                <span className="w-6 h-6 rounded-full bg-[#003366] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span>Arahkan kamera ke kode QR di atas untuk membuka portal CBT.</span>
              </li>

              <li className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-800">
                <span className="w-6 h-6 rounded-full bg-[#003366] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </span>
                <span>Pilih tingkat kelas (7, 8, atau 9) dan mulai ujian sesuai sesi waktu pengawas.</span>
              </li>
            </ol>
          </div>

          {/* Footer Bar */}
          <footer className="bg-[#e6f5ef] border-t border-teal-200/50 px-8 py-5 text-center">
            <p className="font-bold text-sm text-[#003366]">
              SMP Insan Teladan · Panitia Ujian CBT Mandiri 2026
            </p>
            <p className="text-[11px] text-teal-800 mt-0.5">
              Harap pasang poster ini di pintu masuk dan papan pengumuman ruang ujian.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
};
