import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { MainView, GuruTab, ScheduleItem, StudentItem, TeacherItem, GoogleSheetsConfig } from './types/cbt';
import { getNowWib, WibTimeInfo, DEFAULT_CBT_EXIT_TOKEN, fetchBackendExitToken, updateBackendExitToken } from './utils/cbtLogic';
import { loadSchedules, saveSchedules, loadTeachers, saveTeachers, loadStudents, saveStudents, DEFAULT_SCHEDULES, DEFAULT_TEACHERS, DEFAULT_STUDENTS } from './data/defaultData';
import { HomeView } from './components/home/HomeView';
import { StudentView } from './components/student/StudentView';
import { GuruLayout } from './components/guru/GuruLayout';
import { initAuth, googleSignIn, logoutGoogle, subscribeAuth } from './services/googleAuth';
import { createCbtSpreadsheet, syncAllExamResultsToSheet, syncAllMonitoringToSheet, getSpreadsheetDetails } from './services/googleSheets';

// ==========================================
// INISIALISASI FIREBASE & FIRESTORE
// ==========================================
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);
// ==========================================

export default function App() {
  const [currentView, setCurrentView] = useState<MainView>('home');
  const [initialGuruTab, setInitialGuruTab] = useState<GuruTab>('dashboard');

  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>({
    spreadsheetId: localStorage.getItem('cbt_google_spreadsheet_id') || '',
    spreadsheetTitle: localStorage.getItem('cbt_google_spreadsheet_title') || 'CBT SMP Insan Teladan - Hasil & Monitoring',
    spreadsheetUrl: localStorage.getItem('cbt_google_spreadsheet_url') || '',
    autoSyncEnabled: localStorage.getItem('cbt_google_auto_sync') !== 'false',
    lastSyncTime: '',
  });

  const [currentTime, setCurrentTime] = useState<WibTimeInfo>(getNowWib());

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => loadSchedules());
  const [teachers, setTeachers] = useState<TeacherItem[]>(() => loadTeachers());
  const [students, setStudents] = useState<StudentItem[]>(() => loadStudents());

  const [exitToken, setExitToken] = useState<string>(() => {
    return localStorage.getItem('cbt_exit_token') || DEFAULT_CBT_EXIT_TOKEN;
  });

  // Load All Collections (Schedules, Teachers, Students) from Firestore on Mount
  useEffect(() => {
    const fetchCloudData = async () => {
      try {
        const schedSnap = await getDocs(collection(db, 'schedules'));
        if (!schedSnap.empty) {
          const cloudSchedules = schedSnap.docs.map(doc => doc.data() as ScheduleItem);
          setSchedules(cloudSchedules);
          saveSchedules(cloudSchedules);
        }

        const teachSnap = await getDocs(collection(db, 'teachers'));
        if (!teachSnap.empty) {
          const cloudTeachers = teachSnap.docs.map(doc => doc.data() as TeacherItem);
          setTeachers(cloudTeachers);
          saveTeachers(cloudTeachers);
        }

        const studSnap = await getDocs(collection(db, 'students'));
        if (!studSnap.empty) {
          const cloudStudents = studSnap.docs.map(doc => doc.data() as StudentItem);
          setStudents(cloudStudents);
          saveStudents(cloudStudents);
        }
      } catch (err) {
        console.warn('Error fetching from Firestore:', err);
      }
    };

    fetchCloudData();
  }, []);

  // Real-time polling synchronization for multi-device support
  useEffect(() => {
    const syncCloudData = async () => {
      try {
        const [schedSnap, studSnap, teachSnap] = await Promise.all([
          getDocs(collection(db, 'schedules')),
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'teachers'))
        ]);

        if (!schedSnap.empty) {
          const cloudSchedules = schedSnap.docs.map(doc => doc.data() as ScheduleItem);
          setSchedules(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(cloudSchedules)) {
              saveSchedules(cloudSchedules);
              return cloudSchedules;
            }
            return prev;
          });
        }

        if (!studSnap.empty) {
          const cloudStudents = studSnap.docs.map(doc => doc.data() as StudentItem);
          setStudents(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(cloudStudents)) {
              saveStudents(cloudStudents);
              return cloudStudents;
            }
            return prev;
          });
        }

        if (!teachSnap.empty) {
          const cloudTeachers = teachSnap.docs.map(doc => doc.data() as TeacherItem);
          setTeachers(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(cloudTeachers)) {
              saveTeachers(cloudTeachers);
              return cloudTeachers;
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Realtime cloud sync error:', err);
      }
    };

    const interval = setInterval(syncCloudData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchBackendExitToken().then((token) => {
      if (token) {
        setExitToken(token);
        localStorage.setItem('cbt_exit_token', token);
      }
    });
  }, []);

  const handleUpdateExitToken = (newToken: string) => {
    const clean = newToken.trim().toUpperCase();
    setExitToken(clean);
    localStorage.setItem('cbt_exit_token', clean);
    updateBackendExitToken(clean);
  };

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

  useEffect(() => {
    fetch('/api/sheets/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.config && data.config.spreadsheetId) {
          setSheetsConfig((prev) => ({ ...prev, ...data.config }));
        }
      })
      .catch((e) => console.warn('Could not fetch sheets config', e));
  }, []);

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
      () => { setGoogleAccessToken(null); }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getNowWib());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Schedule Actions
  const handleSaveSchedule = async (newSchedule: Omit<ScheduleItem, 'id'>) => {
    const id = `SCH-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const item: ScheduleItem = { ...newSchedule, id };
    try {
      await setDoc(doc(db, 'schedules', id), item);
      setSchedules((prev) => [...prev, item]);
    } catch (e) {
      console.error('Failed to save schedule:', e);
    }
  };

  const handleUpdateExamUrl = async (id: string, url: string) => {
    try {
      const target = schedules.find(s => s.id === id);
      if (target) {
        const updatedItem = { ...target, schedule_exam_url: url };
        await setDoc(doc(db, 'schedules', id), updatedItem);
        setSchedules((prev) => prev.map((s) => (s.id === id ? updatedItem : s)));
      }
    } catch (e) {
      console.error('Failed to update exam URL:', e);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'schedules', id));
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error('Failed to delete schedule:', e);
    }
  };

  // Student Actions
  const handleSaveStudent = async (newStudent: Omit<StudentItem, 'id'>) => {
    const id = `STD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const existing = students.find((s) => s.student_nisn === newStudent.student_nisn);
    const studentId = existing ? existing.id : id;
    const item: StudentItem = { ...newStudent, id: studentId };

    try {
      await setDoc(doc(db, 'students', studentId), item);
      setStudents((prev) => {
        if (existing) {
          return prev.map((s) => (s.student_nisn === newStudent.student_nisn ? item : s));
        }
        return [...prev, item];
      });
    } catch (e) {
      console.error('Failed to save student:', e);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'students', id));
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error('Failed to delete student:', e);
    }
  };

  const handleBatchImportStudents = async (imported: Omit<StudentItem, 'id'>[]) => {
    try {
      for (const itemData of imported) {
        const id = `STD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const item: StudentItem = { ...itemData, id };
        await setDoc(doc(db, 'students', id), item);
      }
      const studSnap = await getDocs(collection(db, 'students'));
      if (!studSnap.empty) {
        setStudents(studSnap.docs.map(doc => doc.data() as StudentItem));
      }
    } catch (e) {
      console.error('Batch import students error:', e);
    }
  };

  // Teacher Actions
  const handleSaveTeacher = async (newTeacher: Omit<TeacherItem, 'id'>) => {
    const id = `TCH-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const item: TeacherItem = { ...newTeacher, id };
    try {
      await setDoc(doc(db, 'teachers', id), item);
      setTeachers((prev) => [...prev, item]);
    } catch (e) {
      console.error('Failed to save teacher:', e);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'teachers', id));
      setTeachers((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error('Failed to delete teacher:', e);
    }
  };

  const handleBatchImportTeachers = async (imported: Omit<TeacherItem, 'id'>[]) => {
    try {
      for (const itemData of imported) {
        const id = `TCH-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const item: TeacherItem = { ...itemData, id };
        await setDoc(doc(db, 'teachers', id), item);
      }
      const teachSnap = await getDocs(collection(db, 'teachers'));
      if (!teachSnap.empty) {
        setTeachers(teachSnap.docs.map(doc => doc.data() as TeacherItem));
      }
    } catch (e) {
      console.error('Batch import teachers error:', e);
    }
  };

  const handleSyncTeachers = (synced: Omit<TeacherItem, 'id'>[]) => {
    handleBatchImportTeachers(synced);
  };

  const handleSyncStudents = (synced: Omit<StudentItem, 'id'>[]) => {
    handleBatchImportStudents(synced);
  };

  const handleResetData = async () => {
    setSchedules(DEFAULT_SCHEDULES);
    setTeachers(DEFAULT_TEACHERS);
    setStudents(DEFAULT_STUDENTS);
  };

  // Google Sheets Actions
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

    await handleSyncAllToSheets(created.spreadsheetId);
  };

  const handleUpdateSpreadsheetId = async (id: string) => {
    let cleanId = id.trim();
    if (!cleanId) return;
    const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) cleanId = match[1];
    const url = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;

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

      await Promise.all([
        syncAllExamResultsToSheet(googleAccessToken, activeId, resResults.results || []),
        syncAllMonitoringToSheet(googleAccessToken, activeId, resMon.records || [], resMon.recentEvents || []),
      ]);

      const syncTime = getNowWib().time;
      setSheetsConfig((prev) => ({ ...prev, lastSyncTime: syncTime }));
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
    setSheetsConfig((prev) => ({ ...prev, lastSyncTime: getNowWib().time }));
  };

  return (
    <div className="w-full min-h-screen bg-[#f4f6f9] text-[#17364e] flex flex-col font-sans">
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
