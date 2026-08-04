import { createSlice} from '@reduxjs/toolkit';
const initialState = {
    isMainEvent: false,
    image: null,
    title: '',
    date: '',
    description: '',
    coordinatorType: 'student',
    studentCoordinator: [''],
    facultyCoordinator: [''],
    studentContact: [''],
    facultyContact: [''],
};

const formSlice = createSlice({
    name: 'form',
    initialState,
    reducers: {
        setMainEvent(state, action) {
            state.isMainEvent = action.payload;
        },
        setImage(state, action) {
            state.image = action.payload;
        },
        setTitle(state, action) {
            state.title = action.payload;
        },
        setDate(state, action) {
            state.date = action.payload;
        },
        setDescription(state, action) {
            state.description = action.payload;
        },
        setCoordinatorType(state, action) {
            state.coordinatorType = action.payload;
        },
        setStudentCoordinator(state, action) {
            state.studentCoordinator = action.payload;
        },
        setFacultyCoordinator(state, action) {
            state.facultyCoordinator = action.payload;
        },
        setStudentContact(state, action) {
            state.studentContact = action.payload;
        },
        setFacultyContact(state, action) {
            state.facultyContact = action.payload;
        },
        resetForm(state) {
            return initialState;
        },
    },

});

export const {
    setMainEvent,
    setImage,
    setTitle,
    setDate,
    setDescription,
    setCoordinatorType,
    setStudentCoordinator,
    setFacultyCoordinator,
    setStudentContact,
    setFacultyContact,
    resetForm,
} = formSlice.actions;

export default formSlice.reducer;
