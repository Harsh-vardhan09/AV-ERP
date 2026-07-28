// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faBox } from '@fortawesome/free-solid-svg-icons';
// import { useState, useEffect } from 'react';
// import axios from 'axios';

// function Request() {
//     const [complaintsData, setComplaintData] = useState();
//     const [myComplaints, setMyComplaints] = useState();
//     const [acceptedComplaints, setAcceptedComplaints] = useState({});
//     const [deniedComplaints, setDeniedComplaints] = useState({});
//     const [view, setView] = useState('all');
//     const [suggestions, setSuggestions] = useState(null);
//     const [accepted, setAccepted] = useState([]);
//     let suggestionData = "";

//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 const [complainByMe, allComplaints, acceptedData] = await Promise.all([
//                     axios.get(`${import.meta.env.VITE_PORT}/api/v1/complain/by/67000c5c3a4def779eff1605`),
//                     axios.get(`${import.meta.env.VITE_PORT}/api/v1/complain/0863CS221070`),
//                     axios.get(`${import.meta.env.VITE_PORT}/api/v1/complain/accepted/0863CS221070`)
//                 ]);

//                 setMyComplaints(complainByMe.data);
//                 setComplaintData(allComplaints.data);
//                 const acceptedList = acceptedData.data.map((c) => ({ ...c, [c._id]: true }));
//                 setAcceptedComplaints(acceptedData.data);
//                 setAccepted(acceptedList);
//             } catch (error) {
//                 console.error('Error fetching data', error);
//             }
//         };
//         fetchData();
//     }, []);

//     if (!complaintsData) {
//         return <h1>Loading your data</h1>;
//     }

//     const activeComplaints = complaintsData.filter((c) => !deniedComplaints[c._id]);

//     const updateSuggestionData = (e) => {
//         suggestionData = e.target.value;
//     };

//     const addSuggestions = (complaint) => {
//         setSuggestions(
//             <div className='suggestion-overlay'>
//                 <div className='suggestion-box'>
//                     <h2>{complaint.category}</h2>
//                     <p>{complaint.desc}</p>
//                     <p><b>Suggestions:</b></p>
//                     <input type='text' placeholder='Add your suggestion here' required onChange={updateSuggestionData} />
//                     <div className='suggestion-buttons'>
//                         <button onClick={() => handleSuggestionSubmit(complaint._id, true)}>Submit</button>
//                         <button onClick={() => handleSuggestionSubmit(complaint._id, false)}>Cancel</button>
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//     const handleSuggestionSubmit = async (id, isAccepted) => {
//         if (!suggestionData && isAccepted) return;

//         try {
//             await axios.patch('http://127.0.0.1:4000/api/v1/complain/add/suggestion', {
//                 id,
//                 suggestion: suggestionData,
//                 status: isAccepted,
//                 scholar_no: "0863CS221070"
//             });
//             if (!isAccepted) setDeniedComplaints((prev) => ({ ...prev, [id]: true }));
//         } catch (error) {
//             console.error('Error submitting suggestion', error);
//         }
//         setSuggestions(null);
//     };

//     const handleAccept = (complaint) => {
//         setAccepted((prev) => [...prev, { ...complaint, [complaint._id]: true }]);
//         setAcceptedComplaints((prev) => ({ ...prev, [complaint._id]: true }));
//         addSuggestions(complaint);
//     };

//     return (
//         <>
//             <section className='main'>
//                 <h1 className='heading'>
//                     COMPLAINT REQUESTS
//                     <div className='cbox'><FontAwesomeIcon icon={faBox} /></div>
//                 </h1>
//                 <div className="navbar">
//                     {['all', 'accepted', 'myself'   ].map((tab) => (
//                         <p key={tab} onClick={() => setView(tab)} className={view === tab ? 'active' : ''}>
//                             {tab.charAt(0).toUpperCase() + tab.slice(1)}
//                         </p>
//                     ))}
//                 </div>

//                 {view === 'all' && activeComplaints.length > 0 ? (
//                     <div className='complaints'>
//                         {activeComplaints.map((c) => (
//                             <ComplaintItem key={c._id} complaint={c} onAccept={() => handleAccept(c)} onDeny={() => handleSuggestionSubmit(c._id, false)} isAccepted={acceptedComplaints[c._id]} />
//                         ))}
//                     </div>
//                 ) : view === 'all' ? (
//                     <div className='no-request'>No Requests available</div>
//                 ) : null}

//                 {view === 'accepted' && accepted.length > 0 ? (
//                     <div className='complaints'>
//                         {accepted.map((c) => (
//                             <ComplaintItem key={c._id} complaint={c} isAccepted />
//                         ))}
//                     </div>
//                 ) : view === 'accepted' ? (
//                     <div className='no-request'>No Accepted Requests</div>
//                 ) : null}

//                 {view === 'myself' && myComplaints && myComplaints.length > 0 ? (
//                     <div className='complaints'>
//                         {myComplaints.map((c) => (
//                             <ComplaintItem key={c._id} complaint={c} />
//                         ))}
//                     </div>
//                 ) : view === 'myself' ? (
//                     <div className='no-request'>No Complaints By You</div>
//                 ) : null}

//                 {suggestions}
//             </section>

//             <style jsx>{`
//                     /* Basic styling */
//                     body {
//                         background-color: #FEF9F2;
//                     }
//                     .main {
//                         height: 100vh;
//                         padding: 0;
//                         margin: 0;
//                         font-family: Arial, Helvetica, sans-serif;
//                         display: flex;
//                         flex-direction: column;
//                         align-items: center;
//                     }
//                     .navbar {
//                         background-color: rgb(12, 12, 54);
//                         width: 100vw;
//                         display: flex;
//                         justify-content: end;
//                         padding: 5px;
//                         color: white;
//                     }
//                     .navbar p {
//                         margin:  0 20px;
//                         padding: 10px;
//                         cursor: pointer;
//                     }
//                     .active {
//                         background-color: #1b1b64;
//                     }

//                     /* Suggestion Box Overlay */
//                     .suggestion-overlay {
//                         position: fixed;
//                         top: 0;
//                         left: 0;
//                         right: 0;
//                         bottom: 0;
//                         background-color: rgba(0, 0, 0, 0.5);
//                         display: flex;
//                         justify-content: center;
//                         align-items: center;
//                         z-index: 1000;
//                     }
//                     .suggestion-box {
//                         background-color: #fff;
//                         padding: 20px;
//                         border-radius: 10px;
//                         width: 300px;
//                         text-align: center;
//                     }
//                     .suggestion-buttons {
//                         display: flex;
//                         justify-content: space-between;
//                         margin-top: 15px;
//                     }
//                     .suggestion-buttons button {
//                         width: 45%;
//                         padding: 8px;
//                         border-radius: 5px;
//                         border: none;
//                         cursor: pointer;
//                     }
//                     .suggestion-buttons button:hover {
//                         opacity: 0.8;
//                     }
//                 `}</style>
//                   <style jsx>{`
//                 body {
//                     background-color: #FEF9F2;
//                 }
//                 .main {
//                     height: 100vh;
//                     padding: 0;
//                     margin: 0;
//                     font-family: Arial, Helvetica, sans-serif;
//                     display: flex;
//                     flex-direction: column;
//                     align-items: center;
//                 }
//                 h2 {
//                     margin-bottom: 10px;
//                     font-size: 2rem;
//                 }
//                 h1 {
//                     font-size: 3rem;
//                 }
//                 button {
//                     height: 40px;
//                     width: 90px;
//                     padding: 8px;
//                     font-size: 1rem;
//                     margin: 20px;
//                     border-radius: 10px;
//                     border: none;
//                     background-color: rgb(203, 203, 241);
                    
//                 }
//                 .accept-btn {
//                     background-color: rgb(105, 184, 105);
//                     color: white;
//                     width:130px;
//                     margin: 10px;
//                     cursor: pointer;
//                 }
//                 .accept-btn:hover {
//                     background-color: rgb(78, 132, 78);
//                 }
//                 .deny-btn {
//                     background-color: rgb(229, 88, 88);
//                     color: white;
//                     width:130px;
//                     margin: 10px;
//                 }
//                 .navbar{
//                     background-color: rgb(12, 12, 54);
//                     width: 100vw;
//                     display: flex;
//                     justify-content: end;
//                     margin-top: 0;
//                     padding: 5px;
//                     color: white;
//                     margin-bottom: 20px;
//                 }
//                 .navbar p{
//                     margin:  0 20px;
//                     padding: 10px;
//                 }
//                 .active{
//                     background-color: #1b1b64;
//                 }
//                 .mecomplaint{
//                     display: none;
//                     height: 500px;
//                 }
//                 .deny-btn:hover {
//                     background-color: rgb(170, 62, 62);
//                 }
                
//                 .accepted-btn{
//                     width: 90%;
//                     margin: 10px;
//                     background-color: rgb(154, 151, 151);
//                     color: white;
//                 }
//                 .no-request{
//                     font-size: 1.6rem;
//                     color: rgba(0, 0, 0, 0.497);
//                     margin-top: 50px;
//                 }
//                 .heading {
//                     display: flex;
//                     justify-content: center;
//                     width: 100%;
//                     text-align: center;
//                     background-color: #C9E9D2;
//                     padding: 10px;
//                     margin-top: 0;
//                     font-size: 2.5rem;
//                     margin-bottom: 0;
//                 }
//                 .complaints {
//                     display: flex;
//                     flex-wrap: wrap;
//                     justify-content: center;
//                 }
//                 .complaint {
//                     border: 1px solid rgba(0, 0, 0, 0.432);
//                     border-radius: 5px;
//                     padding: 10px;
//                     width: 300px;
//                     margin: 10px;
//                     box-shadow: 2px 5px 5px 0 rgba(0, 0, 0, 0.132);
//                     background-color: #FFE3E3;
//                     position: relative;
//                 }
//                 .complaint:hover {
//                     transform: scale(1.03);
//                     transition: 0.3s;
//                 }
//                 .cbox {
//                     height: 80px;
//                     width: 80px;
//                     color: black;
//                     position: relative;
//                     animation: khisakja 1s ease-in-out 2;
//                 }
//                 @keyframes khisakja {
//                     0% { transform: rotateZ(30deg); }
//                     25% { transform: rotateZ(-30deg); }
//                     50% { transform: rotateZ(30deg); }
//                     75% { transform: rotateZ(-30deg); }
//                     100% { transform: rotateZ(0deg); }
//                 }
//                 .complaint-heading{
//                     height: 72px;
//                     text-overflow: ellipsis;
//                     overflow: hidden;
//                 }
                
//             `}</style>

//         </>
//     );
// }

// const ComplaintItem = ({ complaint, onAccept, onDeny, isAccepted }) => (
//     <div className='complaint'>
//         <h2 className='complaint-heading'>{complaint.category}</h2>
//         <p>{complaint.desc}</p>
//         <p><b>Suggestions:</b> {complaint.suggestion}</p>
//         {!isAccepted ? (
//             <>
//                 {onAccept && <button onClick={onAccept} className='accept-btn'>Accept</button>}
//                 {onDeny && <button onClick={onDeny} className='deny-btn'>Deny</button>}
//             </>
//         ) : (
//             <button className='accepted-btn'>Accepted</button>
//         )}
//     </div>
// );

// export default Request;

import { useState, useEffect } from 'react';

export default function ComplaintRequest() {
  const [complaintsData, setComplaintsData] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);
  const [acceptedComplaints, setAcceptedComplaints] = useState({});
  const [deniedComplaints, setDeniedComplaints] = useState({});
  const [view, setView] = useState('all');
  const [suggestions, setSuggestions] = useState(null);
  const [accepted, setAccepted] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [suggestionData, setSuggestionData] = useState('');

  useEffect(() => {
    // Simulate API calls with mock data
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Mock data to simulate API responses
        const mockComplaints = [
          { _id: '1', category: 'Facilities', desc: 'Air conditioning not working in Room 302', createdAt: '2025-04-20T10:30:00Z' },
          { _id: '2', category: 'IT Services', desc: 'Campus WiFi connection issues in Library Area', createdAt: '2025-04-22T14:15:00Z' },
          { _id: '3', category: 'Cafeteria', desc: 'Food quality concerns regarding lunch menu', createdAt: '2025-04-25T12:45:00Z' },
        ];
        
        const mockMyComplaints = [
          { _id: '4', category: 'Transportation', desc: 'Campus shuttle delays in morning schedule', createdAt: '2025-04-26T08:20:00Z' },
          { _id: '5', category: 'Library', desc: 'Need extended hours during exam week', createdAt: '2025-04-27T16:10:00Z' },
        ];
        
        const mockAccepted = [
          { _id: '6', category: 'Sports Equipment', desc: 'Basketball court needs maintenance', suggestion: 'Scheduled for repairs next weekend', createdAt: '2025-04-15T11:30:00Z' },
        ];

        setMyComplaints(mockMyComplaints);
        setComplaintsData(mockComplaints);
        setAccepted(mockAccepted);
        setAcceptedComplaints(mockAccepted.reduce((acc, c) => ({ ...acc, [c._id]: true }), {}));
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data', error);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const activeComplaints = complaintsData.filter((c) => !deniedComplaints[c._id]);

  const addSuggestions = (complaint) => {
    setSuggestionData('');
    setSuggestions(complaint);
  };

  const handleSuggestionSubmit = async (id, isAccepted) => {
    if (!suggestionData && isAccepted) return;

    try {
      // Simulate API call
      console.log('Submitting suggestion:', {
        id,
        suggestion: suggestionData,
        status: isAccepted,
        scholar_no: "0863CS221070"
      });
      
      if (!isAccepted) {
        setDeniedComplaints((prev) => ({ ...prev, [id]: true }));
      } else {
        // Update the complaint with suggestion
        const updatedComplaints = complaintsData.map(c => 
          c._id === id ? {...c, suggestion: suggestionData} : c
        );
        setComplaintsData(updatedComplaints);
        
        // Add to accepted list
        const complaintToAccept = complaintsData.find(c => c._id === id);
        if (complaintToAccept) {
          const updatedComplaint = {...complaintToAccept, suggestion: suggestionData};
          setAccepted(prev => [...prev.filter(c => c._id !== id), updatedComplaint]);
          setAcceptedComplaints(prev => ({ ...prev, [id]: true }));
        }
      }
      
      setSuggestions(null);
    } catch (error) {
      console.error('Error submitting suggestion', error);
    }
  };

  const handleAccept = (complaint) => {
    addSuggestions(complaint);
  };

  const handleDeny = (id) => {
    handleSuggestionSubmit(id, false);
  };

  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-blue-100 rounded-full animate-spin mb-4"></div>
          <p className="text-blue-800">Loading complaints...</p>
        </div>
      );
    }

    let displayComplaints = [];
    let emptyMessage = '';
    let emptyIcon = '';

    switch (view) {
      case 'all':
        displayComplaints = activeComplaints;
        emptyMessage = 'No complaints available';
        emptyIcon = '📦';
        break;
      case 'accepted':
        displayComplaints = accepted;
        emptyMessage = 'No accepted complaints';
        emptyIcon = '👍';
        break;
      case 'myself':
        displayComplaints = myComplaints;
        emptyMessage = 'You haven\'t submitted any complaints';
        emptyIcon = '💬';
        break;
    }

    if (displayComplaints.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <div className="text-5xl mb-4">{emptyIcon}</div>
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayComplaints.map((complaint) => (
          <div 
            key={complaint._id} 
            className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
              acceptedComplaints[complaint._id] ? 'border-l-4 border-green-500' : ''
            }`}
          >
            <div className="flex justify-between items-center bg-gray-50 p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 truncate">{complaint.category}</h3>
              {acceptedComplaints[complaint._id] && (
                <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-md flex items-center">
                  <span className="mr-1">👍</span> Accepted
                </span>
              )}
            </div>
            
            <div className="p-4">
              <p className="text-gray-700 mb-3">{complaint.desc}</p>
              <div className="text-xs text-gray-500">
                {formatDate(complaint.createdAt)}
              </div>
              
              {complaint.suggestion && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Suggestion:</h4>
                  <p className="text-sm text-gray-700">{complaint.suggestion}</p>
                </div>
              )}
            </div>
            
            {!acceptedComplaints[complaint._id] && view === 'all' && (
              <div className="flex border-t border-gray-100">
                <button 
                  onClick={() => handleAccept(complaint)} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 flex items-center justify-center gap-2 transition-colors"
                >
                  <span>👍</span> Accept
                </button>
                <button 
                  onClick={() => handleDeny(complaint._id)} 
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 flex items-center justify-center gap-2 transition-colors"
                >
                  <span>👎</span> Deny
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-blue-600 text-white py-6 px-6 shadow-md">
        <h1 className="text-2xl font-bold flex items-center">
          <span className="mr-3">📋</span>
          Complaint Management
        </h1>
      </header>

      <nav className="bg-white shadow-sm px-6 py-4">
        <div className="flex justify-center space-x-4">
          {[
            { id: 'all', label: 'All Complaints' },
            { id: 'accepted', label: 'Accepted' },
            { id: 'myself', label: 'My Complaints' }
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setView(tab.id)} 
              className={`px-4 py-2 rounded-full transition-colors ${
                view === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8">
        {renderTabContent()}
      </main>

      {suggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Suggestion</h2>
              
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <span className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded mb-2">
                  {suggestions.category}
                </span>
                <p className="text-gray-700">{suggestions.desc}</p>
              </div>
              
              <div>
                <label htmlFor="suggestion-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Suggestion:
                </label>
                <textarea
                  id="suggestion-input"
                  value={suggestionData}
                  onChange={(e) => setSuggestionData(e.target.value)}
                  placeholder="Enter your suggestion here..."
                  rows="4"
                  className="w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex justify-end mt-6 gap-3">
                <button 
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                  onClick={() => setSuggestions(null)}
                >
                  Cancel
                </button>
                <button 
                  className={`px-4 py-2 rounded-md text-white transition-colors ${
                    suggestionData.trim() 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                  onClick={() => handleSuggestionSubmit(suggestions._id, true)}
                  disabled={!suggestionData.trim()}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}