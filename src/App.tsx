import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { MainView, GuruTab, ScheduleItem, StudentItem, TeacherItem, GoogleSheetsConfig } from './types/cbt';
import { getNowWib, WibTimeInfo } from './utils/cbtLogic';
import { loadSchedules, loadTeachers, loadStudents } from './data/defaultData';
import { HomeView } from './components/home/HomeView';
import { StudentView } from './components/student/StudentView';
import { GuruLayout } from './components/guru/GuruLayout';

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getNowWib());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {currentView === 'home' && (
        <HomeView
          onSelectStudent={() => setCurrentView('student')}
          onSelectGuru={() => setCurrentView('guru')}
        />
      )}
      {currentView === 'student' && (
        <StudentView
          schedules={schedules}
          onBack={() => setCurrentView('home')}
        />
      )}
      {currentView === 'guru' && (
        <GuruLayout
          schedules={schedules}
          setSchedules={setSchedules}
          teachers={teachers}
          setTeachers={setTeachers}
          students={students}
          setStudents={setStudents}
          initialTab={initialGuruTab}
          onBack={() => setCurrentView('home')}
        />
      )}
    </div>
  );
}
