export const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
  ADMISSION: 'admission',
  ACCOUNTS: 'accounts',
  LIBRARIAN: 'librarian',
  EXAM_CONTROLLER: 'exam_controller',
};

export const ALL_ROLES = Object.values(ROLES);

export const STUDENT_TEACHER = [ROLES.STUDENT, ROLES.TEACHER];

// Where a role lands on "/" and where the guard sends someone who hits a route
// their role is not allowed on. Never send them to /login — they are signed in.
export const roleHomePaths = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
  admission: '/admission/dashboard',
  accounts: '/accounts/fee/students',
  librarian: '/librarian/dashboard',
  exam_controller: '/exam-controller/dashboard',
};
