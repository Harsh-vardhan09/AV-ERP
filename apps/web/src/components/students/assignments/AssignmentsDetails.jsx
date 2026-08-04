// import { useLocation, useNavigate, useParams } from 'react-router-dom';
// import { useAssignmnetsQuery, useExpiredassignmnetsbyidQuery, useNotExpiredassignmnetsbyidQuery, useAssignmentbyidQuery } from '../../../redux/api/assignmentapi';
// import { useState } from 'react';
// import { useSelector } from 'react-redux';
// import Loader from '../../Loader';

// function AssignmentsDetails() {
//     const { subject } = useParams();
//     const navigate = useNavigate();
//     const location = useLocation();
//     const [load, setLoad] = useState(false);
//     const queryParams = new URLSearchParams(location.search);                    
//     const ass = queryParams.get('ass');
//     const studentId = useSelector(state => state.user.user.user._id);
// const {section} = useSelector(state => state?.user?.user?.user.academicRecords[0])
// const {semester} = useSelector(state => state?.user?.user?.user.academicRecords[0])

//     const allAssignments = useAssignmnetsQuery({ subject, section, semester});
//     const expiredAssignments = useExpiredassignmnetsbyidQuery({ subject, section,semester});
//     const notExpiredAssignments = useNotExpiredassignmnetsbyidQuery({ subject, section,semester });

//     const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
//     const { data: studentAssignment, error: studentError, isLoading: studentLoading } = useAssignmentbyidQuery(
//         { assignmentid: selectedAssignmentId, studentid: studentId },
//         { skip: !selectedAssignmentId }
//     );

//     let assignmentsData, error, isLoading;
//     if (ass === "expired") {
//         assignmentsData = expiredAssignments.data;
//         error = expiredAssignments.error;
//         isLoading = expiredAssignments.isLoading;
//     } else if (ass === "notexpired") {
//         assignmentsData = notExpiredAssignments.data;
//         error = notExpiredAssignments.error;
//         isLoading = notExpiredAssignments.isLoading;
//     } else {
//         assignmentsData = allAssignments.data;
//         error = allAssignments.error;
//         isLoading = allAssignments.isLoading;
//     }

//     if (isLoading || load) {
//         return <Loader />;
//     }
//     if (error) {
//         return <p>Error loading assignments: {error.message}</p>;
//     }

//     if (!assignmentsData || !assignmentsData.assignments || assignmentsData.assignments.length === 0) {
//         return <p>No assignments found for this subject.</p>;
//     }

//     const handleFetchStudentAssignment = (assignmentId) => {
//         setSelectedAssignmentId(assignmentId);
//     };

//     console.log(studentAssignment);

//     // const downloadFile = async (fileUrl) => {
//     //     try {
//     //         setLoad(true);
//     //         const response = await fetch(fileUrl);
//     //         if (!response.ok) {
//     //             throw new Error(`Network response was not ok: ${response.statusText}`);
//     //         }
//     //         const blob = await response.blob();
//     //         const url = window.URL.createObjectURL(blob);
    
//     //         const a = document.createElement('a');
//     //         a.style.display = 'none';
//     //         a.href = url;
//     //         a.download = fileUrl.split('/').pop(); 
//     //         document.body.appendChild(a);
//     //         a.click();
//     //         window.URL.revokeObjectURL(url);
//     //         document.body.removeChild(a);
//     //     } catch (error) {
//     //         console.error('Error downloading the file:', error);
//     //         alert('There was an error downloading the file. Please try again later.');
//     //     } finally {
//     //         setLoad(false);
//     //     }
//     // };
    

//     const styles = {
//         container: {
//             margin: '0 auto',
//             padding: '20px',
//             maxWidth: '1200px',
//             fontFamily: 'Arial, sans-serif',
//             borderRadius: '10px',
//         },
//         header: {
//             fontSize: '2rem',
//             color: '#333',
//             textAlign: 'center',
//             marginBottom: '30px',
//         },
//         gridContainer: {
//             display: 'grid',
//             gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
//             gap: '20px',
//         },
//         card: {
//             backgroundColor: '#fff',
//             borderRadius: '10px',
//             padding: '20px',
//             boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
//             transition: 'transform 0.3s ease',
//             display: 'flex',
//             flexDirection: 'column',
//             justifyContent: 'space-between',
//         },
//         cardHover: {
//             transform: 'translateY(-5px)',
//         },
//         cardHeader: {
//             fontSize: '1.3rem',
//             fontWeight: 'bold',
//             marginBottom: '10px',
//             color: '#444',
//         },
//         cardDetails: {
//             marginBottom: '15px',
//             fontSize: '1rem',
//             color: '#555',
//         },
//         buttonRow: {
//             display: 'flex',
//             justifyContent: 'space-between',
//             marginTop: '10px',
//         },
//         button: {
//             padding: '10px',
//             borderRadius: '5px',
//             border: 'none',
//             fontSize: '14px',
//             cursor: 'pointer',
//             margin: '5px 0',
//             width: '48%',
//             textAlign: 'center',
//         },
//         downloadButton: {
//             backgroundColor: '#3498db',
//             color: '#fff',
//         },
//         uploadButton: {
//             backgroundColor: '#27ae60',
//             color: '#fff',
//         },
//         descriptionButton: {
//             backgroundColor: '#f1c40f',
//             color: '#fff',
//             width: '100%', // Full width for description button
//         },
//         errorText: {
//             color: '#e74c3c',
//             fontSize: '14px',
//         },
//         infoText: {
//             color: '#7f8c8d',
//             fontSize: '14px',
//         },
//     };

//     return (
//         <div style={styles.container}>
//             <h1 style={styles.header}>Assignments for {subject}</h1>
//             <div style={styles.gridContainer}>
//                 {assignmentsData.assignments.map((assignment, index) => (
//                     <div key={index} style={styles.card}>
//                         <p style={styles.cardHeader}>Title: {assignment.title}</p>
//                         <p style={styles.cardDetails}>Due Date: {assignment.dueDate}</p>

//                         {/* Show description button */}
//                         {/* <button style={{ ...styles.button, ...styles.descriptionButton }}>
//                             Show Description
//                         </button> */}

//                         {/* Download and Upload buttons in a row */}
//                         <div style={styles.buttonRow}>
//                             {/* Download Teacher's Assignment */}
//                             {assignment.photo && (
//                               <a href={assignment.photo} download>  <button
//                               style={{ ...styles.button, ...styles.downloadButton }}
//                               // onClick={() => downloadFile(assignment.photo)}
//                           >
//                               Download Assignment
//                           </button></a> 
                             
//                             )}

//                             {/* Upload Assignment */}
//                             <button
//                                 style={{ ...styles.button, ...styles.uploadButton }}
//                                 onClick={() => navigate(`/assignment/${assignment.subject}/${assignment._id}`)}
//                             >
//                                 Upload
//                             </button>
//                         </div>

//                         {/* Conditionally show Student's Assignment */}
//                         {assignment._id && (
//                             <button
//                                 style={styles.button}
//                                 onClick={() => handleFetchStudentAssignment(assignment._id)}
//                             >
//                                 {studentLoading ? <Loader /> : "Your Assignment"}
//                             </button>
//                         )}

//                         {selectedAssignmentId === assignment._id && studentAssignment && (
//                          <a  href={studentAssignment.uploadassignments[0].photo} download >
//                                <button
//                                 style={{ ...styles.button, ...styles.downloadButton }}                               
//                             >
//                                 Download Your Assignment
//                             </button>
//                                 </a>  
//                         )
//                         }

//                         {selectedAssignmentId === assignment._id && studentError && (
//                             <span style={styles.errorText}>Upload your assignment first</span>
//                         )}
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// }

// export default AssignmentsDetails;
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAssignmnetsQuery, useExpiredassignmnetsbyidQuery, useNotExpiredassignmnetsbyidQuery, useAssignmentbyidQuery } from '../../../redux/api/assignmentapi';
import { useGetMyProfileQuery } from '../../../redux/api/studentApi';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import Loader from '../../Loader';

function AssignmentsDetails() {
    const { subject } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [load, setLoad] = useState(false);
    const [expandedDescription, setExpandedDescription] = useState(null);
    const queryParams = new URLSearchParams(location.search);                    
    const ass = queryParams.get('ass');
    const studentId = useSelector(state => state.user.user.user._id);
    const academicDetails = useSelector(state => state?.user?.user?.user?.academicDetails);
    const { data: profileData, isLoading: profileLoading } = useGetMyProfileQuery();
    const profile = profileData?.data;
    const section = profile?.sectionId?.name || academicDetails?.section;
    const semester = profile?.classId?.name || academicDetails?.grade;

    const allAssignments = useAssignmnetsQuery({ subject, section, semester }, { skip: !section || !semester });
    const expiredAssignments = useExpiredassignmnetsbyidQuery({ subject, section, semester }, { skip: !section || !semester });
    const notExpiredAssignments = useNotExpiredassignmnetsbyidQuery({ subject, section, semester }, { skip: !section || !semester });

    const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
    const { data: studentAssignment, error: studentError, isLoading: studentLoading } = useAssignmentbyidQuery(
        { assignmentid: selectedAssignmentId, studentid: studentId },
        { skip: !selectedAssignmentId }
    );

    let assignmentsData, error, isLoading;
    if (ass === "expired") {
        assignmentsData = expiredAssignments.data;
        error = expiredAssignments.error;
        isLoading = expiredAssignments.isLoading;
    } else if (ass === "notexpired") {
        assignmentsData = notExpiredAssignments.data;
        error = notExpiredAssignments.error;
        isLoading = notExpiredAssignments.isLoading;
    } else {
        assignmentsData = allAssignments.data;
        error = allAssignments.error;
        isLoading = allAssignments.isLoading;
    }

    if (profileLoading || isLoading || load) {
        return <div className="flex justify-center items-center h-screen"><Loader /></div>;
    }

    if (!section || !semester) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
                    <span className="block sm:inline">Academic details missing. Please contact admin.</span>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error! </strong>
                    <span className="block sm:inline">NO  assignments available: {error.message}</span>
                </div>
            </div>
        );
    }

    if (!assignmentsData || !assignmentsData.assignments || assignmentsData.assignments.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative" role="alert">
                    <span className="block sm:inline">No assignments found for this subject.</span>
                </div>
            </div>
        );
    }

    const handleFetchStudentAssignment = (assignmentId) => {
        setSelectedAssignmentId(assignmentId);
    };

    const toggleDescription = (assignmentId) => {
        if (expandedDescription === assignmentId) {
            setExpandedDescription(null);
        } else {
            setExpandedDescription(assignmentId);
        }
    };

    // Function to format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Function to check if assignment is past due
    const isPastDue = (dueDate) => {
        const now = new Date();
        const due = new Date(dueDate);
        return now > due;
    };

    // Function to calculate days remaining
    const getDaysRemaining = (dueDate) => {
        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = due - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{subject} Assignments</h1>
                
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignmentsData.assignments.map((assignment, index) => {
                    const isExpired = isPastDue(assignment.dueDate);
                    const daysRemaining = getDaysRemaining(assignment.dueDate);
                    const hasSubmitted = selectedAssignmentId === assignment._id && studentAssignment;
                    
                    return (
                        <div 
                            key={index} 
                            className={`bg-white rounded-lg shadow-lg overflow-hidden border-l-4 ${
                                isExpired ? 'border-red-500' : 
                                hasSubmitted ? 'border-green-500' : 'border-yellow-500'
                            } hover:shadow-xl transition-all duration-300`}
                        >
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <h2 className="text-xl font-semibold text-gray-800 leading-tight">{assignment.title}</h2>
                                    {isExpired ? (
                                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">Expired</span>
                                    ) : (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                            {daysRemaining} days left
                                        </span>
                                    )}
                                </div>
                                
                                <div className="text-sm text-gray-600 mb-4">
                                    <p className="mb-1"><span className="font-medium">Due:</span> {formatDate(assignment.dueDate)}</p>
                                    {assignment.description && (
                                        <div>
                                            <button 
                                                onClick={() => toggleDescription(assignment._id)}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                                            >
                                                {expandedDescription === assignment._id ? 'Hide Description' : 'Show Description'}
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 transition-transform ${expandedDescription === assignment._id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            {expandedDescription === assignment._id && (
                                                <div className="mt-2 p-3 bg-gray-50 rounded-md text-gray-700">
                                                    {assignment.description}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex flex-col space-y-2">
                                    {assignment.photo && (
                                        <a 
                                            href={assignment.photo} 
                                            download 
                                            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Download Assignment
                                        </a>
                                    )}
                                    
                                    <button
                                        onClick={() => navigate(`/assignment/${assignment.subject}/${assignment._id}`)}
                                        className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                                        </svg>
                                        {hasSubmitted ? 'Update Submission' : 'Submit Assignment'}
                                    </button>
                                    
                                    {assignment._id && (
                                        <button
                                            onClick={() => handleFetchStudentAssignment(assignment._id)}
                                            className={`flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
                                                hasSubmitted ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            {studentLoading ? (
                                                <div className="flex items-center">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
                                                    Loading...
                                                </div>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    View My Submission
                                                </>
                                            )}
                                        </button>
                                    )}
                                    
                                    {selectedAssignmentId === assignment._id && studentAssignment && (
                                        <a  
                                            href={studentAssignment.uploadassignments[0].photo} 
                                            download
                                            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Download My Submission
                                        </a>
                                    )}
                                    
                                    {selectedAssignmentId === assignment._id && studentError && (
                                        <div className="text-red-500 text-sm flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            You haven't submitted this assignment yet
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default AssignmentsDetails;