import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeClass,
  getScheduleStatus,
  parseCsv,
  parseTeacherDatabase,
  parseStudentDatabase,
  verifyExitToken,
  formatTimeRemaining,
  DEFAULT_CBT_EXIT_TOKEN,
  isStudentLocked,
  getViolationSeverity,
} from './cbtLogic';

test('normalizeClass standardizes various class inputs', () => {
  assert.equal(normalizeClass('7'), '7');
  assert.equal(normalizeClass('7A'), '7');
  assert.equal(normalizeClass('Kelas 8'), '8');
  assert.equal(normalizeClass('VII'), '7');
  assert.equal(normalizeClass('VIII'), '8');
  assert.equal(normalizeClass('IX'), '9');
  assert.equal(normalizeClass('9B'), '9');
});

test('verifyExitToken validates token case-insensitively and trims spaces', () => {
  assert.equal(verifyExitToken('SPINDAN2026', 'SPINDAN2026'), true);
  assert.equal(verifyExitToken('  spindan2026  ', 'SPINDAN2026'), true);
  assert.equal(verifyExitToken('WRONGTOKEN', 'SPINDAN2026'), false);
  assert.equal(verifyExitToken('', 'SPINDAN2026'), false);
  assert.equal(verifyExitToken('SPINDAN2026'), true); // uses default
});

test('formatTimeRemaining calculates remaining minutes accurately', () => {
  const ongoing = formatTimeRemaining('10:00', '08:30');
  assert.equal(ongoing.isEnded, false);
  assert.equal(ongoing.remainingSeconds, 90 * 60);

  const ended = formatTimeRemaining('09:00', '09:00');
  assert.equal(ended.isEnded, true);
  assert.equal(ended.remainingSeconds, 0);

  const past = formatTimeRemaining('09:00', '09:30');
  assert.equal(past.isEnded, true);
});

test('getScheduleStatus returns correct status based on WIB time', () => {
  const current = { date: '2026-11-03', time: '08:00' };

  // Future schedule on same day
  assert.equal(
    getScheduleStatus('2026-11-03', '09:00', '11:00', current),
    'Belum aktif'
  );

  // Active schedule
  assert.equal(
    getScheduleStatus('2026-11-03', '07:30', '09:30', current),
    'Aktif'
  );

  // Finished schedule
  assert.equal(
    getScheduleStatus('2026-11-03', '06:00', '07:30', current),
    'Selesai'
  );

  // Invalid date format
  assert.equal(
    getScheduleStatus('invalid', '07:30', '09:30', current),
    'Belum aktif'
  );
});

test('parseTeacherDatabase correctly parses master database teacher rows', () => {
  const teacherCsv = `No.,Nama,Mata pelajaran
1,"Istiqomah, S. Pd. I, M. Pd.",Etika Syariah Islam
2,"Sumiyatun, S. Pd",Matematika
3,Muhammad Ali Ilzam,Informatika`;
  const result = parseTeacherDatabase(teacherCsv);
  assert.equal(result.length, 3);
  assert.equal(result[0].teacher_name, 'Istiqomah, S. Pd. I, M. Pd.');
  assert.equal(result[0].subject_name, 'Etika Syariah Islam');
  assert.equal(result[1].teacher_name, 'Sumiyatun, S. Pd');
  assert.equal(result[1].subject_name, 'Matematika');
  assert.equal(result[2].teacher_name, 'Muhammad Ali Ilzam');
  assert.equal(result[2].subject_name, 'Informatika');
});

test('parseStudentDatabase correctly parses master database student rows', () => {
  const studentCsv = `matematika,Bu sum,Kelas,Nomer Absen,Ruang Ujian
0132001009,DEWI ZAHRA GANI,KELAS 7,9,Ruang 1
3149587132,LATISYA AVRINIA PUTRI,KELAS 7,14,Ruang 1`;
  const result = parseStudentDatabase(studentCsv);
  assert.equal(result.length, 2);
  assert.equal(result[0].student_nisn, '0132001009');
  assert.equal(result[0].student_name, 'DEWI ZAHRA GANI');
  assert.equal(result[0].student_class, 'KELAS 7');
  assert.equal(result[0].student_absence_number, '9');
  assert.equal(result[0].student_exam_room, 'Ruang 1');

  assert.equal(result[1].student_nisn, '3149587132');
  assert.equal(result[1].student_name, 'LATISYA AVRINIA PUTRI');
  assert.equal(result[1].student_class, 'KELAS 7');
  assert.equal(result[1].student_absence_number, '14');
});

test('isStudentLocked locks student when exits reach or exceed 5', () => {
  assert.equal(isStudentLocked(0), false);
  assert.equal(isStudentLocked(1), false);
  assert.equal(isStudentLocked(4), false);
  assert.equal(isStudentLocked(5), true);
  assert.equal(isStudentLocked(6), true);
});

test('getViolationSeverity returns accurate warning stages', () => {
  assert.equal(getViolationSeverity(0).level, 'safe');
  assert.equal(getViolationSeverity(1).level, 'warning');
  assert.equal(getViolationSeverity(2).level, 'warning');
  assert.equal(getViolationSeverity(3).level, 'danger');
  assert.equal(getViolationSeverity(4).level, 'danger');
  assert.equal(getViolationSeverity(5).level, 'locked');
  assert.equal(getViolationSeverity(7).level, 'locked');
});
