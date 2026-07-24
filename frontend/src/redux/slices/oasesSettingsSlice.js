import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isOasesEnabled: false,
  loaded: false,
};

const oasesSettingsSlice = createSlice({
  name: 'oasesSettings',
  initialState,
  reducers: {
    setOasesEnabled(state, action) {
      state.isOasesEnabled = action.payload;
      state.loaded = true;
    },
    resetOasesState(state) {
      state.isOasesEnabled = false;
      state.loaded = true;
    },
  },
});

export const { setOasesEnabled, resetOasesState } = oasesSettingsSlice.actions;
export default oasesSettingsSlice.reducer;
