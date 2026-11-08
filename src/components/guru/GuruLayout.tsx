import React, { useState, useEffect, useRef } from 'react';
import { MasterSubTab, GuruTab, ScheduleItem, StudentItem, TeacherItem, GoogleSheetsConfig } from '../../types/cbt';
import { LayoutDashboard, Database, CalendarCheck, QrCode, LogOut, AlertCircle, Clock, ShieldAlert, Volume2, FileSpreadsheet, ExternalLink } from 'lucide-react';
import { WibTimeInfo } from '../../utils/cbtLogic';
import { audioAlertService } from '../../utils/audioAlert';
import { DashboardView } from './DashboardView';
import { DataMasterView } from './DataMasterView';
import { ScheduleView } from './ScheduleView';
import { PosterQrView } from './PosterQrView';
import { MonitoringView } from './MonitoringView';
import { ExamResultsView } from './ExamResultsView';
import { MasterDatabaseModal } from './MasterDatabaseModal';

interface GuruLayoutProps {
  initialTab?: GuruTab;
  schedules: ScheduleItem[];
  students: StudentItem[];
  teachers: TeacherItem[];
  currentTime: WibTimeInfo;
  onExit: () => void;
  onSaveSchedule: (schedule: Omit<ScheduleItem, 'id'>) => void;
  onUpdateExamUrl: (id: string, url: string) => void;
  onDeleteSchedule: (id: string) => void;
  onSaveStudent: (student: Omit<StudentItem, 'id'>) => void;
  onDeleteStudent: (id: string) => void;
  onSaveTeacher: (teacher: Omit<TeacherItem, 'id'>) => void;
  onDeleteTeacher: (id: string) => void;
  onBatchImportStudents: (students: Omit<StudentItem, 'id'>[]) => void;
  onBatchImportTeachers: (teachers: Omit<TeacherItem, 'id'>[]) => void;
  onSyncTeachers: (teachers: Omit<TeacherItem, 'id'>[]) => void;
  onSyncStudents: (students: Omit<StudentItem, 'id'>[]) => void;
  onResetData: () => void;
  exitToken?: string;
  onUpdateExitToken?: (token: string) => void;
  currentUser?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  hasAccessToken?: boolean;
  accessToken?: string | null;
  sheetsConfig?: GoogleSheetsConfig;
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  onCreateNewSpreadsheet?: () => Promise<void>;
  onSyncAll?: () => Promise<void>;
  onUpdateSpreadsheetId?: (id: string) => Promise<void>;
  onToggleAutoSync?: (enabled: boolean) => Promise<void>;
  onSyncMonitoringToSheet?: () => Promise<void>;
  onBatchSetSchedules?: (schedules: ScheduleItem[]) => void;
}

export const GuruLayout: React.FC<GuruLayoutProps> = ({
  initialTab = 'dashboard',
  schedules,
  students,
  teachers,
  currentTime,
  onExit,
  onSaveSchedule,
  onUpdateExamUrl,
  onDeleteSchedule,
  onSaveStudent,
  onDeleteStudent,
  onSaveTeacher,
  onDeleteTeacher,
  onBatchImportStudents,
  onBatchImportTeachers,
  onSyncTeachers,
  onSyncStudents,
  onResetData,
  exitToken,
  onUpdateExitToken,
  currentUser = null,
  hasAccessToken = false,
  accessToken = null,
  sheetsConfig = {
    spreadsheetId: '',
    spreadsheetTitle: 'CBT SMP Insan Teladan - Hasil Ujian & Monitoring 2026',
    spreadsheetUrl: '',
    autoSyncEnabled: true,
  },
  onSignIn = async () => {},
  onSignOut = async () => {},
  onCreateNewSpreadsheet = async () => {},
  onSyncAll = async () => {},
  onUpdateSpreadsheetId = async () => {},
  onToggleAutoSync = async () => {},
  onSyncMonitoringToSheet = async () => {},
  onBatchSetSchedules,
}) => {
  const [activeTab, setActiveTab] = useState<GuruTab>(initialTab);
  const [isDbModalOpen, setIsDbModalOpen] = useState<boolean>(false);
  const [dbModalCategory, setDbModalCategory] = useState<MasterSubTab>('teachers');
  const [noticeMessage, setNoticeMessage] = useState<string>(
    'Data CBT SMP Insan Teladan tersimpan aktif secara mandiri di master database.'
  );

  // Background monitor stats for sidebar badge and audio alerts across all tabs
  const [lockedCount, setLockedCount] = useState<number>(0);
  const [flaggedCount, setFlaggedCount] = useState<number>(0);
  const lastAlertIdRef = useRef<string>('');
  const isFirstCheckRef = useRef<boolean>(true);

  useEffect(() => {
    const checkMonitoring = async () => {
      try {
        const res = await fetch('/api/exam/monitoring');
        if (res.ok) {
          const data = await res.json();
          const stats = data.stats || {};
          setLockedCount(stats.total_locked || 0);
          setFlaggedCount(stats.total_flagged_students || 0);

          // Audio chime when student forced-exits while in any guru tab
          if (!isFirstCheckRef.current && data.lastAlertId && data.lastAlertId !== lastAlertIdRef.current) {
            const topEvent = (data.recentEvents || [])[0];
            if (topEvent && topEvent.exit_count > 0) {
              audioAlertService.playStudentExitAlarm();
            }
          }
          lastAlertIdRef.current = data.lastAlertId || '';
          isFirstCheckRef.current = false;
        }
      } catch (e) {
        // quiet error in background
      }
    };

    checkMonitoring();
    const interval = setInterval(checkMonitoring, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenDatabaseModal = (category: MasterSubTab = 'teachers') => {
    setDbModalCategory(category);
    setIsDbModalOpen(true);
  };

  const navItems = [
    { id: 'dashboard' as GuruTab, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'monitoring' as GuruTab,
      label: 'Monitoring Ujian',
      icon: ShieldAlert,
      badge: lockedCount > 0 ? `${lockedCount} Terkunci` : flaggedCount > 0 ? `${flaggedCount} Keluar` : undefined,
      badgeColor: lockedCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-400 text-slate-950 font-black',
    },
    {
      id: 'results' as GuruTab,
      label: 'Hasil Ujian & Sheets',
      icon: FileSpreadsheet,
      badge: hasAccessToken ? 'Sheets OK' : undefined,
      badgeColor: 'bg-emerald-500 text-white font-bold',
    },
    { id: 'master' as GuruTab, label: 'Data Master', icon: Database },
    { id: 'schedule' as GuruTab, label: 'Jadwal & Sesi', icon: CalendarCheck },
    { id: 'poster' as GuruTab, label: 'Poster QR Exambro', icon: QrCode },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="print-hide w-full md:w-64 bg-[#003366] text-white p-5 flex flex-col justify-between shrink-0 shadow-lg">
        <div>
          {/* Brand Logo & Name */}
          <div className="px-2 pb-6 border-b border-white/10">
            <p className="font-extrabold text-base tracking-wide text-white">
              SMP INSAN TELADAN
            </p>
            <p className="text-[11px] font-semibold text-[#ffc72c] tracking-widest uppercase mt-0.5">
              CBT MASTER CONTROL · GURU
            </p>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Navigasi Guru" className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#235d88] text-white shadow-inner ring-1 ring-white/20'
                      : 'text-sky-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#ffc72c]' : 'text-sky-300'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 text-[10px] rounded-full uppercase tracking-wider ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="pt-6 border-t border-white/10 mt-6 space-y-3">
          {/* Google Sheets Quick Connection in Sidebar */}
          {hasAccessToken ? (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Google Sheets</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-[11px] text-emerald-100 truncate">
                {currentUser?.displayName || currentUser?.email}
              </p>
              {sheetsConfig.spreadsheetUrl && (
                <a
                  href={sheetsConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-emerald-300 hover:text-white underline flex items-center gap-1 mt-1 font-semibold"
                >
                  <span>Buka Spreadsheet</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>Hubungkan Sheets</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExit}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-400/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar & Kunci Panel</span>
          </button>

          <div className="px-2 pt-1 text-[10px] text-sky-300/70">
            WIB Server: {currentTime.time}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Real-time Notice Bar */}
          <div
            role="status"
            className="print-hide flex items-start gap-3 p-4 rounded-xl border-l-4 border-[#ffc72c] bg-[#fff6d8] text-xs text-[#594716] shadow-sm"
          >
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{noticeMessage}</div>
            <div className="hidden sm:flex items-center gap-1 font-mono text-[11px] text-amber-900 font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>{currentTime.label}</span>
            </div>
          </div>

          {/* Tab Renderers */}
          {activeTab === 'dashboard' && (
            <DashboardView
              teachers={teachers}
              schedules={schedules}
              students={students}
              currentTime={currentTime}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenDatabaseModal={handleOpenDatabaseModal}
            />
          )}

          {activeTab === 'monitoring' && (
            <MonitoringView
              currentTime={currentTime}
              setNoticeMessage={setNoticeMessage}
              hasAccessToken={hasAccessToken}
              accessToken={accessToken}
              sheetsConfig={sheetsConfig}
              onSignIn={onSignIn}
              onSyncMonitoringToSheet={onSyncMonitoringToSheet}
            />
          )}

          {activeTab === 'results' && (
            <ExamResultsView
              schedules={schedules}
              students={students}
              currentUser={currentUser}
              hasAccessToken={hasAccessToken}
              accessToken={accessToken}
              sheetsConfig={sheetsConfig}
              onSignIn={onSignIn}
              onSignOut={onSignOut}
              onCreateNewSpreadsheet={onCreateNewSpreadsheet}
              onSyncAll={onSyncAll}
              onUpdateSpreadsheetId={onUpdateSpreadsheetId}
              onToggleAutoSync={onToggleAutoSync}
              setNoticeMessage={setNoticeMessage}
            />
          )}

          {activeTab === 'master' && (
            <DataMasterView
              students={students}
              teachers={teachers}
              onSaveStudent={onSaveStudent}
              onDeleteStudent={onDeleteStudent}
              onSaveTeacher={onSaveTeacher}
              onDeleteTeacher={onDeleteTeacher}
              onBatchImportStudents={onBatchImportStudents}
              onBatchImportTeachers={onBatchImportTeachers}
              onSyncTeachers={onSyncTeachers}
              onSyncStudents={onSyncStudents}
              onOpenDatabaseModal={handleOpenDatabaseModal}
              onResetData={onResetData}
              setNoticeMessage={setNoticeMessage}
              hasAccessToken={hasAccessToken}
              accessToken={accessToken}
              sheetsConfig={sheetsConfig}
              onSignIn={onSignIn}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleView
              schedules={schedules}
              currentTime={currentTime}
              onSaveSchedule={onSaveSchedule}
              onUpdateExamUrl={onUpdateExamUrl}
              onDeleteSchedule={onDeleteSchedule}
              onBatchSetSchedules={onBatchSetSchedules}
              setNoticeMessage={setNoticeMessage}
              exitToken={exitToken}
              onUpdateExitToken={onUpdateExitToken}
              hasAccessToken={hasAccessToken}
              accessToken={accessToken}
              sheetsConfig={sheetsConfig}
              onSignIn={onSignIn}
            />
          )}

          {activeTab === 'poster' && (
            <PosterQrView
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}
        </div>
      </div>

      {/* Global Master Database Viewer & Sync Modal */}
      <MasterDatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        initialTab={dbModalCategory}
        onSyncTeachers={onSyncTeachers}
        onSyncStudents={onSyncStudents}
        setNoticeMessage={setNoticeMessage}
      />
    </div>
  );
};
