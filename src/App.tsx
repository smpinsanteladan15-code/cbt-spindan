import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { MainView, GuruTab, ScheduleItem, StudentItem, TeacherItem, GoogleSheetsConfig } from './types/cbt';
import {
  getNowWib,
  WibTimeInfo,
  DEFAULT_CBT_EXIT_TOKEN,
  fetchBackendExitToken,
  updateBackendExitToken,
  syncTeachersToBackend,
  syncStudentsToBackend,
  fetchBackendSchedules,
  syncSchedulesToBackend,
} from './utils/cbtLogic';
import {
  loadSchedules,
  saveSchedules,
  loadTeachers,
  saveTeachers,
  loadStudents,
  saveStudents,
  DEFAULT_SCHEDULES,
  DEFAULT_TEACHERS,
  DEFAULT_STUDENTS,
} from './data/defaultData';
import { HomeView } from './components/home/HomeView';
import { StudentView } from './components/student/StudentView';
import { GuruLayout } from './components/guru/GuruLayout';
import { initAuth, googleSignIn, logoutGoogle, subscribeAuth } from './services/googleAuth';
import {
  createCbtSpreadsheet,
  syncAllExamResultsToSheet,
  syncAllMonitoringToSheet,
  getSpreadsheetDetails,
} from './services/googleSheets';

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState<MainView>('home');
  const [initialGuruTab, setInitialGuruTab] = useState<GuruTab>('dashboard');

  // Google Auth & Sheets State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>({
    spreadsheetId: localStorage.getItem('cbt_google_spreadsheet_id') || '',
    spreadsheetTitle: localStorage.getItem('cbt_google_spreadsheet_title') || 'CBT SMP Insan Teladan - Hasil & Monitoring',
    spreadsheetUrl: localStorage.getItem('cbt_google_spreadsheet_url') || '',
    autoSyncEnabled: localStorage.getItem('cbt_google_auto_sync') !== 'false',
    lastSyncTime: '',
  });

  // Time state (WIB)
  const [currentTime, setCurrentTime] = useState<WibTimeInfo>(getNowWib());

  // Data states with persistence
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => loadSchedules());
  const [teachers, setTeachers] = useState<TeacherItem[]>(() => loadTeachers());
  const [students, setStudents] = useState<StudentItem[]>(() => loadStudents());

  // Ref to avoid echo sync loops when updating from backend
  const skipNextBackendSyncRef = useRef<boolean>(false);

  // CBT Exit Token state
  const [exitToken, setExitToken] = useState<string>(() => {
    return localStorage.getItem('cbt_exit_token') || DEFAULT_CBT_EXIT_TOKEN;
  });

  // Fetch token from backend on mount
  useEffect(() => {
    fetchBackendExitToken().then((token) => {
      if (token) {
        setExitToken(token);
        localStorage.setItem('cbt_exit_token', token);
      }
    });
  }, []);

  // Fetch schedules from backend on initial mount
  useEffect(() => {
    fetchBackendSchedules().then((backendSchedules) => {
      if (backendSchedules && Array.isArray(backendSchedules) && backendSchedules.length > 0) {
        skipNextBackendSyncRef.current = true;
        setSchedules(backendSchedules);
        saveSchedules(backendSchedules);
      }
    });
  }, []);

  // Real-time synchronization polling for schedules across multiple teachers, accounts, and student portal
  useEffect(() => {
    const syncSchedules = async () => {
      try {
        const backendSchedules = await fetchBackendSchedules();
        if (backendSchedules && Array.isArray(backendSchedules)) {
          setSchedules((prev) => {
            const prevStr = JSON.stringify(prev);
            const nextStr = JSON.stringify(backendSchedules);
            if (prevStr !== nextStr) {
              skipNextBackendSyncRef.current = true;
              saveSchedules(backendSchedules);
              return backendSchedules;
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Realtime schedule sync error:', err);
      }
    };

    const interval = setInterval(syncSchedules, 4000);
    window.addEventListener('focus', syncSchedules);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncSchedules);
    };
  }, []);

  const handleUpdateExitToken = (newToken: string) => {
    const clean = newToken.trim().toUpperCase();
    setExitToken(clean);
    localStorage.setItem('cbt_exit_token', clean);
    updateBackendExitToken(clean);
  };

  // URL query parameter support for direct access (?view=guru, ?autostart=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const tabParam = params.get('tab') as GuruTab | null;

    if (viewParam === 'guru' || params.get('autostart') === '1') {
      setCurrentView('guru');
      if (tabParam && ['dashboard', 'monitoring', 'master', 'schedule', 'poster', 'results'].includes(tabParam)) {
        setInitialGuruTab(tabParam);
      }
    } else if (viewParam === 'student') {
      setCurrentView('student');
    }
  }, []);

  // Fetch sheets configuration from backend on mount
  useEffect(() => {
    fetch('/api/sheets/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.config && data.config.spreadsheetId) {
          setSheetsConfig((prev) => ({
            ...prev,
            ...data.config,
          }));
        }
      })
      .catch((e) => console.warn('Could not fetch sheets config', e));
  }, []);

  // Subscribe to Google Auth state
  useEffect(() => {
    const unsubscribe = subscribeAuth((user, token) => {
      setGoogleUser(user);
      setGoogleAccessToken(token);
    });
    initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleAccessToken(token);
      },
      () => {
        setGoogleAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Update clock and auto-sync status every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getNowWib());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Sync to localStorage and write directly to disk database files
  useEffect(() => {
    saveSchedules(schedules);
    if (skipNextBackendSyncRef.current) {
      skipNextBackendSyncRef.current = false;
      return;
    }
    syncSchedulesToBackend(schedules);
  }, [schedules]);

  useEffect(() => {
    saveTeachers(teachers);
    syncTeachersToBackend(teachers);
  }, [teachers]);

  useEffect(() => {
    saveStudents(students);
    syncStudentsToBackend(students);
  }, [students]);

  // Schedule Actions: Immediately saved to state, localStorage, and server file database
  const handleSaveSchedule = (newSchedule: Omit<ScheduleItem, 'id'>) => {
    const id = `SCH-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    setSchedules((prev) => {
      const updated = [...prev, { ...newSchedule, id }];
      syncSchedulesToBackend(updated);
      return updated;
    });
  };

  const handleUpdateExamUrl = (id: string, url: string) => {
    setSchedules((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, schedule_exam_url: url } : s));
      syncSchedulesToBackend(updated);
      return updated;
    });
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      syncSchedulesToBackend(updated);
      return updated;
    });
  };

  // Student Actions
  const handleSaveStudent = (newStudent: Omit<StudentItem, 'id'>) => {
    const id = `STD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    setStudents((prev) => {
      const existing = prev.find((s) => s.student_nisn === newStudent.student_nisn);
      if (existing) {
        return prev.map((s) => (s.student_nisn === newStudent.student_nisn ? { ...newStudent, id: existing.id } : s));
      }
      return [...prev, { ...newStudent, id }];
    });
  };

  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const handleBatchImportStudents = (imported: Omit<StudentItem, 'id'>[]) => {
    setStudents((prev) => {
      const updated = [...prev];
      for (const item of imported) {
        const idx = updated.findIndex((s) => s.student_nisn === item.student_nisn);
        if (idx >= 0) {
          updated[idx] = { ...item, id: updated[idx].id };
        } else {
          updated.push({
            ...item,
            id: `STD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          });
        }
      }
      return updated;
    });
  };

  // Teacher Actions
  const handleSaveTeacher = (newTeacher: Omit<TeacherItem, 'id'>) => {
    const id = `TCH-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    setTeachers((prev) => [...prev, { ...newTeacher, id }]);
  };

  const handleDeleteTeacher = (id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleBatchImportTeachers = (imported: Omit<TeacherItem, 'id'>[]) => {
    setTeachers((prev) => {
      const newItems = imported.map((item) => ({
        ...item,
        id: `TCH-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      }));
      return [...prev, ...newItems];
    });
  };

  const handleSyncTeachers = (synced: Omit<TeacherItem, 'id'>[]) => {
    setTeachers(
      synced.map((item, idx) => ({
        ...item,
        id: `TCH-SYNC-${idx + 1}-${Date.now().toString(36)}`,
      }))
    );
  };

  const handleSyncStudents = (synced: Omit<StudentItem, 'id'>[]) => {
    setStudents(
      synced.map((item, idx) => ({
        ...item,
        id: `STD-SYNC-${idx + 1}-${Date.now().toString(36)}`,
      }))
    );
  };

  const handleResetData = () => {
    setSchedules(DEFAULT_SCHEDULES);
    syncSchedulesToBackend(DEFAULT_SCHEDULES);
    setTeachers(DEFAULT_TEACHERS);
    syncTeachersToBackend(DEFAULT_TEACHERS);
    setStudents(DEFAULT_STUDENTS);
    syncStudentsToBackend(DEFAULT_STUDENTS);
  };

  // Google Sheets Action Handlers
  const handleGoogleSignIn = async () => {
    const res = await googleSignIn();
    if (res) {
      setGoogleUser(res.user);
      setGoogleAccessToken(res.accessToken);
    }
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setGoogleAccessToken(null);
  };

  const handleCreateNewSpreadsheet = async () => {
    if (!googleAccessToken) {
      await handleGoogleSignIn();
      return;
    }
    const created = await createCbtSpreadsheet(googleAccessToken);
    const updated: GoogleSheetsConfig = {
      ...sheetsConfig,
      spreadsheetId: created.spreadsheetId,
      spreadsheetTitle: created.title,
      spreadsheetUrl: created.spreadsheetUrl,
      lastSyncTime: getNowWib().time,
    };
    setSheetsConfig(updated);
    localStorage.setItem('cbt_google_spreadsheet_id', created.spreadsheetId);
    localStorage.setItem('cbt_google_spreadsheet_title', created.title);
    localStorage.setItem('cbt_google_spreadsheet_url', created.spreadsheetUrl);

    await fetch('/api/sheets/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });

    // Initial sync
    await handleSyncAllToSheets(created.spreadsheetId);
  };

  const handleUpdateSpreadsheetId = async (id: string) => {
    let cleanId = id.trim();
    if (!cleanId) return;
    const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) cleanId = match[1];
    const url = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;

    if (googleAccessToken) {
      try {
        const details = await getSpreadsheetDetails(googleAccessToken, cleanId);
        const updated: GoogleSheetsConfig = {
          ...sheetsConfig,
          spreadsheetId: cleanId,
          spreadsheetTitle: details.title,
          spreadsheetUrl: url,
        };
        setSheetsConfig(updated);
        localStorage.setItem('cbt_google_spreadsheet_id', cleanId);
        localStorage.setItem('cbt_google_spreadsheet_title', details.title);
        localStorage.setItem('cbt_google_spreadsheet_url', url);
        await fetch('/api/sheets/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
      } catch (err: unknown) {
        console.warn('Verify spreadsheet warning:', err);
        const updated: GoogleSheetsConfig = {
          ...sheetsConfig,
          spreadsheetId: cleanId,
          spreadsheetUrl: url,
        };
        setSheetsConfig(updated);
        localStorage.setItem('cbt_google_spreadsheet_id', cleanId);
        localStorage.setItem('cbt_google_spreadsheet_url', url);
        await fetch('/api/sheets/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
      }
    } else {
      const updated: GoogleSheetsConfig = {
        ...sheetsConfig,
        spreadsheetId: cleanId,
        spreadsheetUrl: url,
      };
      setSheetsConfig(updated);
      localStorage.setItem('cbt_google_spreadsheet_id', cleanId);
      localStorage.setItem('cbt_google_spreadsheet_url', url);
      await fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    const updated = { ...sheetsConfig, autoSyncEnabled: enabled };
    setSheetsConfig(updated);
    localStorage.setItem('cbt_google_auto_sync', String(enabled));
    await fetch('/api/sheets/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoSyncEnabled: enabled }),
    });
  };

  const handleSyncAllToSheets = async (targetSpreadsheetId?: string) => {
    const activeId = targetSpreadsheetId || sheetsConfig.spreadsheetId;
    if (!googleAccessToken || !activeId) return;

    try {
      const [resResults, resMon] = await Promise.all([
        fetch('/api/exam/results').then((r) => r.json()),
        fetch('/api/exam/monitoring').then((r) => r.json()),
      ]);

      const resultsList = resResults.results || [];
      const monRecords = resMon.records || [];
      const monEvents = resMon.recentEvents || [];

      await Promise.all([
        syncAllExamResultsToSheet(googleAccessToken, activeId, resultsList),
        syncAllMonitoringToSheet(googleAccessToken, activeId, monRecords, monEvents),
      ]);

      const syncTime = getNowWib().time;
      setSheetsConfig((prev) => ({ ...prev, lastSyncTime: syncTime }));
      await fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastSyncTime: syncTime }),
      });
    } catch (e) {
      console.error('Failed to sync all to sheets:', e);
      throw e;
    }
  };

  const handleSyncMonitoringToSheet = async () => {
    if (!googleAccessToken || !sheetsConfig.spreadsheetId) return;
    const resMon = await fetch('/api/exam/monitoring').then((r) => r.json());
    await syncAllMonitoringToSheet(
      googleAccessToken,
      sheetsConfig.spreadsheetId,
      resMon.records || [],
      resMon.recentEvents || []
    );
    const syncTime = getNowWib().time;
    setSheetsConfig((prev) => ({ ...prev, lastSyncTime: syncTime }));
  };

  return (
    <div className="w-full min-h-screen">
      {currentView === 'home' && (
        <HomeView
          currentTime={currentTime}
          onEnterStudent={() => setCurrentView('student')}
          onEnterGuru={() => setCurrentView('guru')}
        />
      )}

      {currentView === 'student' && (
        <StudentView
          schedules={schedules}
          students={students}
          currentTime={currentTime}
          onBackToHome={() => setCurrentView('home')}
          activeToken={exitToken}
        />
      )}

      {currentView === 'guru' && (
        <GuruLayout
          initialTab={initialGuruTab}
          schedules={schedules}
          students={students}
          teachers={teachers}
          currentTime={currentTime}
          onExit={() => setCurrentView('home')}
          onSaveSchedule={handleSaveSchedule}
          onUpdateExamUrl={handleUpdateExamUrl}
          onDeleteSchedule={handleDeleteSchedule}
          onSaveStudent={handleSaveStudent}
          onDeleteStudent={handleDeleteStudent}
          onSaveTeacher={handleSaveTeacher}
          onDeleteTeacher={handleDeleteTeacher}
          onBatchImportStudents={handleBatchImportStudents}
          onBatchImportTeachers={handleBatchImportTeachers}
          onSyncTeachers={handleSyncTeachers}
          onSyncStudents={handleSyncStudents}
          onResetData={handleResetData}
          exitToken={exitToken}
          onUpdateExitToken={handleUpdateExitToken}
          currentUser={googleUser}
          hasAccessToken={!!googleAccessToken}
          accessToken={googleAccessToken}
          sheetsConfig={sheetsConfig}
          onSignIn={handleGoogleSignIn}
          onSignOut={handleGoogleSignOut}
          onCreateNewSpreadsheet={handleCreateNewSpreadsheet}
          onSyncAll={handleSyncAllToSheets}
          onUpdateSpreadsheetId={handleUpdateSpreadsheetId}
          onToggleAutoSync={handleToggleAutoSync}
          onSyncMonitoringToSheet={handleSyncMonitoringToSheet}
        />
      )}
    </div>
  );
}
