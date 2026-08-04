// import React, { useEffect, useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';

// const ImageDetails = () => {
//   const { id } = useParams();
//   const navigate = useNavigate(); // Hook to navigate to other routes
//   const [event, setEvent] = useState({});
//   const [load, setLoad] = useState(false);

//   // Function to save event data to session storage
//   const saveEventToSessionStorage = (event) => {
//     sessionStorage.setItem(`event_${id}`, JSON.stringify(event));
//   };

//   // Function to load event data from session storage
//   const loadEventFromSessionStorage = () => {
//     const savedEvent = sessionStorage.getItem(`event_${id}`);
//     return savedEvent ? JSON.parse(savedEvent) : null;
//   };

//   useEffect(() => {
//     const fetchEvents = async () => {
//       // First, try loading the event from session storage
//       const cachedEvent = loadEventFromSessionStorage();
//       if (cachedEvent) {
//         setEvent(cachedEvent);
//         setLoad(true);
//         return;
//       }

//       // If no cached data, fetch from the API
//       try {
//         const response = await fetch(`${import.meta.env.VITE_PORT}/events/getevents/${id}`);
//         const data = await response.json();
//         const fetchedEvent = data.events;
//         setEvent(fetchedEvent);
//         setLoad(true);

//         // Save the fetched event to session storage
//         saveEventToSessionStorage(fetchedEvent);
//       } catch (error) {
//         console.error("Error fetching event:", error);
//       }
//     };

//     fetchEvents();
//   }, [id]);

//   // Function to handle the "Register" button click
//   const handleRegister = () => {
//     navigate(`/eventform/${id}`); // Navigate to the eventform route with the event ID
//   };

//   return (
//     <div>
//       {load === false ? (
//         <div>Nothing to show</div>
//       ) : (
//         <div>
//           <div className="flex flex-wrap">
//             {/* Image Section */}
//             <div className="w-full md:w-1/2 p-6">
//               <img
//                 src={`https://localhost:4000/uploads/${event.image?.file}`}
//                 alt={event.title}
//                 className="w-full h-auto rounded-lg shadow-md"
//               />
//             </div>

//             {/* Details Section */}
//             <div className="w-full md:w-1/2 p-6 bg-white rounded-lg shadow-lg">
//               <h1 className="text-2xl font-semibold mb-4">{event.title}</h1>
//               <p className="text-gray-700 mb-4">{event.description}</p>

//               {/* Date Section */}
//               <div className="mb-6">
//                 <h3 className="text-lg font-medium text-gray-900">Date</h3>
//                 <p className="text-gray-600">{event.date}</p>
//               </div>

//               {/* Contact Information */}
//               <div className="mt-6">
//                 <h2 className="text-2xl font-semibold mb-6">Contact Information</h2>
//                 <div className="overflow-x-auto">
//                   <table className="min-w-full divide-y divide-gray-200">
//                     <thead className="bg-gray-50">
//                       <tr>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                           Role
//                         </th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                           Name
//                         </th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                           Contact
//                         </th>
//                       </tr>
//                     </thead>
//                     <tbody className="bg-white divide-y divide-gray-200">
//                       {(event.faculty || []).map((contact, index) => (
//                         <tr key={index}>
//                           <td className="px-6 py-4 whitespace-nowrap">Faculty</td>
//                           <td className="px-6 py-4 whitespace-nowrap">{contact.name}</td>
//                           <td className="px-6 py-4 whitespace-nowrap">{contact.number}</td>
//                         </tr>
//                       ))}
//                       {(event.student || []).map((contact, index) => (
//                         <tr key={index}>
//                           <td className="px-6 py-4 whitespace-nowrap">Student</td>
//                           <td className="px-6 py-4 whitespace-nowrap">{contact.name}</td>
//                           <td className="px-6 py-4 whitespace-nowrap">{contact.number}</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//               <button
//                 type="button"
//                 onClick={handleRegister} // Call the handleRegister function
//                 className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
//               >
//                 Register
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ImageDetails;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Phone, Mail } from 'lucide-react';

const ImageDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      // Try loading from session storage first
      const cachedEvent = sessionStorage.getItem(`event_${id}`);
      
      if (cachedEvent) {
        setEvent(JSON.parse(cachedEvent));
        setLoading(false);
        return;
      }

      // Fetch from API if not in session storage
      try {
        const response = await fetch(`${import.meta.env.VITE_PORT}/events/getevents/${id}`);
        const data = await response.json();
        const fetchedEvent = data.events;
        
        setEvent(fetchedEvent);
        sessionStorage.setItem(`event_${id}`, JSON.stringify(fetchedEvent));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching event:", error);
        setLoading(false);
      }
    };

    fetchEvents();
  }, [id]);

  const handleRegister = () => {
    navigate(`/eventform`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-gray-300 rounded mb-4"></div>
          <div className="h-6 w-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Hero Section - Optimized for vertical images */}
          <div className="relative bg-gray-900">
            <div className="flex flex-col md:flex-row">
              {/* Image container - optimized for vertical images */}
              <div className="w-full md:w-1/2 lg:w-2/5 h-72 md:h-96 flex items-center justify-center overflow-hidden bg-black">
                {event.image?.file ? (
                  <img
                    src={`${import.meta.env.VITE_PORT}/uploads/${event?.image?.file}`}
                    alt={event.title || "Event"}
                    className="h-full w-auto max-w-full object-contain mx-auto"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/400x600?text=Event+Image";
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center">
                    <span className="text-white opacity-50 text-lg">No image available</span>
                  </div>
                )}
              </div>
              
              {/* Event details section */}
              <div className="w-full md:w-1/2 lg:w-3/5 bg-gradient-to-br from-blue-900 to-indigo-900 p-6 md:p-8 flex flex-col justify-center">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{event.title}</h1>
                
                <div className="flex flex-wrap gap-3 mb-4">
                  {event.date && (
                    <span className="inline-flex items-center bg-blue-600 bg-opacity-80 text-white px-3 py-1 rounded-full text-sm">
                      <Calendar size={16} className="mr-1" /> 
                      {formatDate(event.date)}
                    </span>
                  )}
                  {event.location && (
                    <span className="inline-flex items-center bg-indigo-600 bg-opacity-80 text-white px-3 py-1 rounded-full text-sm">
                      <MapPin size={16} className="mr-1" /> 
                      {event.location}
                    </span>
                  )}
                </div>
                
                {/* Short description preview */}
                {event.description && (
                  <p className="text-gray-200 line-clamp-3 md:line-clamp-4">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 md:p-8">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">About This Event</h2>
                <div className="prose max-w-none text-gray-600">
                  <p>{event.description}</p>
                </div>
              </section>
              
              {/* Additional Details (if available) */}
              {(event.schedule || event.agenda) && (
                <section>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Schedule</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-3">
                      {(event.schedule || []).map((item, index) => (
                        <li key={index} className="flex items-start">
                          <Clock size={20} className="mt-1 mr-3 text-blue-500 flex-shrink-0" />
                          <div>
                            <span className="font-medium">{item.time}: </span>
                            <span>{item.activity}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}
            </div>

            {/* Right Column - Registration & Contact */}
            <div className="space-y-6">
              {/* Registration Card */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Register Now</h3>
                <p className="mb-4 text-gray-600">Secure your spot for this exciting event!</p>
                <button
                  onClick={handleRegister}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition duration-200 flex items-center justify-center"
                >
                  <Users size={18} className="mr-2" />
                  Register for Event
                </button>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Contact Information</h3>
                
                {/* Faculty Contacts */}
                {event.faculty && event.faculty.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Faculty Coordinators</h4>
                    <ul className="space-y-3">
                      {event.faculty.map((contact, index) => (
                        <li key={index} className="flex items-start">
                          <Phone size={18} className="mt-1 mr-2 text-blue-500 flex-shrink-0" />
                          <div>
                            <div className="font-medium">{contact.name}</div>
                            <div className="text-gray-600">{contact.number}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Student Contacts */}
                {event.student && event.student.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Student Coordinators</h4>
                    <ul className="space-y-3">
                      {event.student.map((contact, index) => (
                        <li key={index} className="flex items-start">
                          <Phone size={18} className="mt-1 mr-2 text-blue-500 flex-shrink-0" />
                          <div>
                            <div className="font-medium">{contact.name}</div>
                            <div className="text-gray-600">{contact.number}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* No contacts fallback */}
                {(!event.faculty || event.faculty.length === 0) && 
                 (!event.student || event.student.length === 0) && (
                  <p className="text-gray-500">No contact information available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageDetails;