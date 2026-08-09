import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetSchoolSettingsQuery } from '@modules/admissions';
import { setModules } from '@modules/tenancy';
import { setOasesEnabled, resetOasesState } from '@modules/oases';

const SchoolSettingsProvider = ({ children }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state?.user?.user);
  const { data: settingsData, isLoading: settingsLoading } = useGetSchoolSettingsQuery();

  // Payroll pages read the role from localStorage rather than the store.
  useEffect(() => {
    const u = currentUser?.user || currentUser || null;
    if (u?._id) {
      localStorage.setItem('user', JSON.stringify(u));
      if (u.role) localStorage.setItem('role', u.role);
    }
  }, [currentUser]);

  useEffect(() => {
    if (settingsLoading) return;

    const settingsModules = settingsData?.data?.modules;
    const oasesEnabled = settingsData?.data?.isOasesEnabled ?? false;

    if (settingsModules) {
      dispatch(setModules(settingsModules));
    }

    // Super Admin's modules.oases=true must NOT override the school's own
    // isOasesEnabled toggle. If Super Admin explicitly disabled it, it is off;
    // otherwise the school's toggle is the final gate.
    const oases = settingsModules?.oases === false ? false : oasesEnabled;
    dispatch(setOasesEnabled(oases));
    if (!oases) dispatch(resetOasesState());
  }, [settingsData, settingsLoading, dispatch]);

  return children;
};

export default SchoolSettingsProvider;
