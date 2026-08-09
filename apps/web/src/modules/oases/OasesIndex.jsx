import React, { Suspense, lazy } from 'react';
import { useSelector } from 'react-redux';
import useOasesAuth from './hooks/useOasesAuth';

const OasesDashboard = lazy(() => import('./OasesDashboard'));
const TeacherOasesPage = lazy(() => import('./evaluator/TeacherOasesPage'));

// Role-aware index — admins get the dashboard, teachers/evaluators their queue.
const OasesIndex = () => {
  // Belt-and-suspenders: check BOTH sources
  const erpUser = useSelector(state => state?.user?.user?.user);
  const erpRole = erpUser?.role;
  const { isEvaluator, isHeadExaminer } = useOasesAuth();

  const Page = erpRole === 'teacher' || isEvaluator || isHeadExaminer
    ? TeacherOasesPage
    : OasesDashboard;

  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
};

export default OasesIndex;
