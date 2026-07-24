import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedExamId: null,
};

const examSlice = createSlice({
  name: 'exam',
  initialState,
  reducers: {
    setSelectedExamId: (state, action) => {
      state.selectedExamId = action.payload;
    },
    clearSelectedExamId: (state) => {
      state.selectedExamId = null;
    },
  },
});

export const { setSelectedExamId, clearSelectedExamId } = examSlice.actions;
export default examSlice.reducer;
