// Routes that belong to no business module. /home is the pre-module landing
// shell; the kahoot screens are a quiz game with no API calls and no backend
// in apps/api — see docs/TECH-DEBT.md.
import { page } from '@shared/lib/lazyRoute';
import { STUDENT_TEACHER } from '@shared/constants/roles';

export const appLegacyRoutes = [
  { path: '/home', lazy: page(() => import('./layouts/LegacyHome')), handle: { roles: STUDENT_TEACHER } },

  { path: '/quiz', lazy: page(() => import('./pages/kahoot/kahootTeam')), handle: { roles: STUDENT_TEACHER } },
  { path: '/quizwinner', lazy: page(() => import('./pages/kahoot/kahootwinners')), handle: { roles: STUDENT_TEACHER } },
  { path: '/quizscore', lazy: page(() => import('./pages/kahoot/kahootScore')), handle: { roles: STUDENT_TEACHER } },
  { path: '/quizquestion', lazy: page(() => import('./pages/kahoot/kahootQueeze')), handle: { roles: STUDENT_TEACHER } },
  { path: '/quizmember', lazy: page(() => import('./pages/kahoot/kahootWaiting')), handle: { roles: STUDENT_TEACHER } },
];
