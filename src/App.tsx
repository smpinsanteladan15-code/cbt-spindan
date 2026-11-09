import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { MainView, GuruTab, ScheduleItem, StudentItem, TeacherItem, GoogleSheetsConfig } from './types/cbt';
import { getNowWib, WibTimeInfo, DEFAULT_CBT_EXIT_TOKEN } from './utils/cbtLogic';
import { loadSchedules, saveSchedules, loadTeachers, saveTeachers, loadStudents, saveStudents } from './data/defaultData';
import { HomeView } from './components/home/HomeView';
import { StudentView } from './components/student/StudentView';
import { GuruLayout } from './components/guru/GuruLayout';
import { initAuth, googleSignIn, logoutGoogle, subscribeAuth } from './services/googleAuth';
import { createCbtSpreadsheet } from './services/googleSheets';

// ==========================================
// INISIALISASI FIREBASE & FIRESTORE
// ==========================================
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
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

  // Load All Collections from Firestore on Mount
  useEffect(() => {
    const fetchCloudData = async () => {
      try {
        const [schedSnap, teachSnap, studSnap] = await Promise.all([
          getDocs(collection(db, 'schedules')),
          getDocs(collection(db, 'teachers')),
          getDocs(collection(db, 'students'))
        ]);

        if (!schedSnap.empty) {
          const cloudSchedules = schedSnap.docs.map(doc => doc.data() as ScheduleItem);
          setSchedules(cloudSchedules);
          saveSchedules(cloudSchedules);
        }

        if (!teachSnap.empty) {
          const cloudTeachers = teachSnap.docs.map(doc => doc.data() as TeacherItem);
          setTeachers(cloudTeachers);
          saveTeachers(cloudTeachers);
        }

        if (!studSnap.empty) {
          const cloudStudents = studSnap.docs.map(doc => doc.data() as StudentItem);
          setStudents(cloudStudents);
          saveStudents(cloudStudents);
        }

        // Fetch Token from Firestore if available
        const tokenDoc = await getDoc(doc(db, 'settings', 'exitToken'));
        if (tokenDoc.exists()) {
          const tVal = tokenDoc.data().token;
          if (tVal) {
            setExitToken(tVal);
            localStorage.setItem('cbt_exit_token', tVal);
          }
        }
      } catch (err) {
        console.warn('Error fetching from Firestore:', err);
      }
    };

    fetchCloudData();
  }, []);

  // Real-time synchronization polling every 4 seconds
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

    const interval = setInterval(syncCloudData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateExitToken = async (newToken: string) => {
    const clean = newToken.trim().toUpperCase();
    setExitToken(clean);
    localStorage.setItem('cbt_exit_token', clean);
    try {
      await setDoc(doc(db, 'settings', 'exitToken'), { token: clean });
    } catch (e) {
      console.error('Failed to save token to firestore:', e);
    }
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
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    const updated = { ...sheetsConfig, autoSyncEnabled: enabled };
    setSheetsConfig(updated);
    localStorage.setItem('cbt_google_auto_sync', String(enabled));
  };

  const handleSyncAllToSheets = async (_targetSpreadsheetId?: string) => {};
  const handleSyncMonitoringToSheet = async () => {};

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
