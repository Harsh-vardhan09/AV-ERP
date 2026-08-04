import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

const SingleEventCard = ({ event }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const handleDetail = (id) => {
    navigate(`/description/${id}`);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Truncate text with ellipsis
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Determine if the event is upcoming, ongoing, or past
  const getEventStatus = () => {
    const eventDate = new Date(event.date);
    const today = new Date();
    
    if (eventDate > today) {
      return { label: 'Upcoming', className: 'bg-green-100 text-green-800' };
    } else if (eventDate.toDateString() === today.toDateString()) {
      return { label: 'Today', className: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: 'Past', className: 'bg-gray-100 text-gray-800' };
    }
  };

  const eventStatus = getEventStatus();
  const imageUrl = event?.image?.file ? 
    `${import.meta.env.VITE_PORT}/uploads/${event.image.file}` : 
    '/api/placeholder/400/250';

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      {/* Card Image */}
      <div className="relative">
        <img
          src={imageUrl}
          alt={event.title || 'Event image'}
          className="w-full h-48 object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/api/placeholder/400/250';
          }}
        />
        <span className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${eventStatus.className}`}>
          {eventStatus.label}
        </span>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-grow flex flex-col">
        <h3 
          className="text-xl font-bold text-gray-800 mb-2 hover:text-blue-600 cursor-pointer"
          onClick={() => handleDetail(event._id)}
        >
          {event.title}
        </h3>

        {/* Event Details */}
        <div className="mb-4 text-sm space-y-2">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{formatDate(event.date)}</span>
          </div>
          
          {event.time && (
            <div className="flex items-center text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              <span>{event.time}</span>
            </div>
          )}
          
          {event.location && (
            <div className="flex items-center text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{event.location}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mt-auto">
          <div className={`text-gray-700 transition-all duration-300 ${expanded ? '' : 'line-clamp-2'}`}>
            {event.description}
          </div>
          
          {event.description && event.description.length > 100 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Read more
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-5 py-3 bg-gray-50">
        <button
          onClick={() => handleDetail(event._id)}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default SingleEventCard;