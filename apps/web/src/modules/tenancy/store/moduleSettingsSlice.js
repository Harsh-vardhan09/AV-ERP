import { createSlice } from '@reduxjs/toolkit';
import { DEFAULT_MODULES, isModuleEnabled } from '@av-erp/shared';

/**
 * moduleSettingsSlice — tracks which modules are enabled for the current school.
 *
 * Populated by App.jsx when school settings are fetched (useGetSchoolSettingsQuery).
 * NOT persisted — always re-read from server on load for freshness.
 *
 * selectModule(moduleKey) selector returns the boolean value for a given module.
 * Falls back to DEFAULT_MODULES if the module key is missing (safe default).
 */
const initialState = {
  modules: { ...DEFAULT_MODULES },
  loaded: false,
};

const moduleSettingsSlice = createSlice({
  name: 'moduleSettings',
  initialState,
  reducers: {
    /**
     * Merge incoming server modules into state.
     * Accepts a partial object — only the provided keys are updated.
     */
    setModules(state, action) {
      state.modules = { ...DEFAULT_MODULES, ...action.payload };
      state.loaded = true;
    },
    resetModules(state) {
      state.modules = { ...DEFAULT_MODULES };
      state.loaded = false;
    },
  },
});

export const { setModules, resetModules } = moduleSettingsSlice.actions;
export default moduleSettingsSlice.reducer;

/**
 * Curried selector factory:
 *   const isFeeEnabled = useSelector(selectModule('fee_management'));
 */
export const selectModule = (moduleKey) => (state) =>
  isModuleEnabled(state.moduleSettings?.modules, moduleKey);
