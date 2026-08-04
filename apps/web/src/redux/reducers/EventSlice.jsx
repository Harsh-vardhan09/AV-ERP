import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Function to load events from session storage (if they exist)
const loadEventsFromSessionStorage = () => {
  const savedEvents = sessionStorage.getItem('events');
  return savedEvents ? JSON.parse(savedEvents) : [];
};

// Function to save events to session storage
const saveEventsToSessionStorage = (events) => {
  sessionStorage.setItem('events', JSON.stringify(events));
};

// Async thunk to fetch events
export const fetchEvents = createAsyncThunk('events/fetchEvents', async () => {

  const response = await fetch(`${import.meta.env.VITE_PORT}/events/getevents`);

  const data = await response.json();
  const event = data.events;
  return event;
});

// Slice definition
const eventsSlice = createSlice({
  name: 'events',
  initialState: {
    // Load initial state from session storage
    events: loadEventsFromSessionStorage(),
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.events = action.payload;

        // Save events to session storage
        saveEventsToSessionStorage(state.events);
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default eventsSlice.reducer;


