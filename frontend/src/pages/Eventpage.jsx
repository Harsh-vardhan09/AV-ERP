import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchEvents } from '../redux/reducers/EventSlice';
import SingleEventCard from '../components/students/events/SingleEventCard';
import { PlusCircle, Calendar, Search, X, RefreshCw } from 'lucide-react';

const EventsPage = () => {
  const { events, status, error } = useSelector((state) => state.events);
  const dispatch = useDispatch();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchEvents());
    }
  }, [status, dispatch]);

  // Get unique categories from events
  const categories = ['all', ...new Set(events.map(event => event.category || 'uncategorized'))];

  // Filter and sort events
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || event.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(a.date) - new Date(b.date);
    } else if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  const handleRefresh = () => {
    dispatch(fetchEvents());
  };

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
          <button 
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mt-3"
            onClick={handleRefresh}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Campus Events</h1>
        <p className="text-gray-600">Discover and participate in exciting events happening around the campus</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          {/* Search bar */}
          <div className="relative w-full md:w-1/3">
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Filters and controls */}
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>

            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
            </select>

            <button 
              onClick={handleRefresh}
              className="flex items-center gap-1 border rounded-lg px-3 py-2 hover:bg-gray-50"
              title="Refresh events"
            >
              <RefreshCw className="h-5 w-5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition"
            >
              {showAddForm ? <X className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
              <span>{showAddForm ? 'Cancel' : 'Add Event'}</span>
            </button>
          </div>
        </div>

        {/* Add Event Form (conditionally rendered) */}
        {showAddForm && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            {/* You can import your AddEventForm component here */}
            <div className="text-center p-4">
              <p>Add Event Form would go here</p>
              <button 
                onClick={() => setShowAddForm(false)}
                className="mt-4 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {status === 'loading' && (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Empty state */}
      {status === 'succeeded' && sortedEvents.length === 0 && (
        <div className="text-center p-12 bg-white shadow rounded-lg">
          <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No events found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterCategory !== 'all' ? 
              'Try changing your search or filter criteria' : 
              'There are no upcoming events at this time'}
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700"
          >
            Create an Event
          </button>
        </div>
      )}

      {/* Event cards grid */}
      {status === 'succeeded' && sortedEvents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedEvents.map(event => (
            <SingleEventCard key={event._id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsPage;