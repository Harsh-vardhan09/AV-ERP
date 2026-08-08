// import { useNavigate, useParams } from 'react-router-dom';
// import { useAssignmetuploaadMutation, useAssignmnetsbyidQuery } from '../../../redux/api/assignmentapi';
// import { useState } from 'react';
// import { useSelector } from 'react-redux';
// import toast from 'react-hot-toast';
// import Loader from '@shared/ui/Loader';

// function SubmissionPage() {
//     const navigate = useNavigate();
//     const { assignmentid } = useParams();
//     const { _id: studentid } = useSelector((state) => state.user.user.user); 
//     const { data: assignmentsData1, error, isLoading,refetch } = useAssignmnetsbyidQuery({ assignmentid });
//     const [selectedFile, setSelectedFile] = useState(null); 
//     const [uploadAssignment] = useAssignmetuploaadMutation(); 
//     const [loading, setLoading] = useState(false);

//     if (error) {
//         toast.error('Failed to fetch assignment data.');
//         return;
//     }

//     const handleFileChange = (e) => {
//         setSelectedFile(e.target.files[0]);
//     };

//     const submitAssignment = async () => {
//         if (!selectedFile) {
//             toast.error('Please select a file before submitting.');
//             return;
//         }

//         const fileSizeLimit = 10 * 1024 * 1024; 
//         if (selectedFile.size > fileSizeLimit) {
//             toast.error('File size exceeds the limit of 10MB. Please upload a smaller file.');
//             return;
//         }

//         const formData = new FormData();
//         formData.append('photo', selectedFile);

//         setLoading(true); 

//         try {
//             await uploadAssignment({ studentid, assignmentid, formData }).unwrap(); 
//             toast.success('Assignment submitted successfully!');
//             refetch();
//             setSelectedFile(null); 
//             navigate(-1);
//         } catch (error) {
//             toast.error(`Failed: ${error.data.message}`);
//         } finally {
//             setLoading(false); 
//         }
//     };

//     if (isLoading) return <Loader />;
//     if (error) return <p>There was an error fetching the assignment data.</p>;

//     const { title, section, description, dueDate } = assignmentsData1?.assignment || {};

//     return (
//         <div className="min-h-screen bg-gray-50 p-4">
//             {loading && <Loader />}
            
//             <div className="bg-blue-500 text-white py-10 px-6 mb-8 rounded-lg relative shadow-lg">
//                 <h1 className="text-3xl font-bold">Submit Your Assignment</h1>
//                 <div className="h-1 bg-white w-3/4 mt-2 rounded-md animate-pulse"></div>
//             </div>

//             <div className="bg-white shadow-md rounded-lg p-6 mb-8">
//                 <h2 className="text-xl font-semibold mb-4">Assignment Details</h2>
//                 <p className="mb-2"><strong>Subject Name:</strong> {title || "N/A"}</p>
//                 <p className="mb-2"><strong>Class:</strong> {section || "N/A"}</p>
//                 <p className="mb-2"><strong>Description:</strong> {description || "No description available"}</p>
//                 <p className="mb-2"><strong>Due Date:</strong> {dueDate || "No due date"}</p>
//             </div>

//             <div className="bg-white shadow-md rounded-lg p-6">
//                 <h2 className="text-xl font-semibold mb-4">Upload Your Assignment</h2>
//                 <div className="flex items-center space-x-4 mb-4">
//                     <label className="font-semibold">Upload File:</label>
//                     <input
//                         type="file"
//                         onChange={handleFileChange}
//                         accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
//                         className="border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                 </div>
//                 <button
//                     onClick={submitAssignment}
//                     className="bg-green-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
//                     disabled={loading}
//                 >
//                     {loading ? 'Submitting...' : 'Submit'}
//                 </button>
//             </div>
//         </div>
//     );
// }

// export default SubmissionPage;

import { useNavigate, useParams } from 'react-router-dom';
import { useAssignmetuploaadMutation, useAssignmnetsbyidQuery } from '../../../redux/api/assignmentapi';
import { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Loader from '@shared/ui/Loader';

function SubmissionPage() {
    const navigate = useNavigate();
    const { assignmentid } = useParams();
    const { _id: studentid } = useSelector((state) => state.user.user.user); 
    const semester = useSelector((state) => state.user.user.user.academicDetails.grade); 

    const { data: assignmentsData1, error, isLoading, refetch } = useAssignmnetsbyidQuery({ assignmentid });
    const [selectedFile, setSelectedFile] = useState(null); 
    const [uploadAssignment] = useAssignmetuploaadMutation(); 
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    if (error) {
        toast.error('Failed to fetch assignment data.');
        return;
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            validateAndSetFile(file);
        }
    };

    const validateAndSetFile = (file) => {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
        const fileSizeLimit = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.type)) {
            toast.error('Invalid file type. Please upload PDF, DOC, DOCX, PNG, or JPG files.');
            return;
        }

        if (file.size > fileSizeLimit) {
            toast.error('File size exceeds the limit of 10MB. Please upload a smaller file.');
            return;
        }

        setSelectedFile(file);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const openFileSelector = () => {
        fileInputRef.current.click();
    };

    const submitAssignment = async () => {
        if (!selectedFile) {
            toast.error('Please select a file before submitting.');
            return;
        }

        const formData = new FormData();
        formData.append('photo', selectedFile);

        setLoading(true); 

        try {
            await uploadAssignment({ studentid, assignmentid,semester, formData }).unwrap(); 
            toast.success('Assignment submitted successfully!');
            refetch();
            setSelectedFile(null); 
            navigate(-1);
        } catch (error) {
            toast.error(`Failed: ${error.data?.message || 'Unknown error occurred'}`);
        } finally {
            setLoading(false); 
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "No due date";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTimeRemaining = (dueDate) => {
        if (!dueDate) return { days: 0, hours: 0, minutes: 0 };
        
        const now = new Date();
        const due = new Date(dueDate);
        const diffMs = due - now;
        
        if (diffMs <= 0) return { expired: true };
        
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return { days, hours, minutes };
    };

    if (isLoading) return <Loader />;
    if (error) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                <div className="text-red-500 text-5xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold mb-2">Error</h2>
                <p className="text-gray-600 mb-4">There was an error fetching the assignment data.</p>
                <button 
                    onClick={() => navigate(-1)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                    Go Back
                </button>
            </div>
        </div>
    );

    const { title, section, description, dueDate, subjectName } = assignmentsData1?.assignment || {};
    const timeRemaining = getTimeRemaining(dueDate);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
            {loading && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><Loader /></div>}
            
            <div className="max-w-4xl mx-auto">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Assignments
                </button>
                
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-8 px-6 rounded-xl relative shadow-lg overflow-hidden mb-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-10 rounded-full -ml-10 -mb-10"></div>
                    <h1 className="text-3xl font-bold relative z-10">Submit Your Assignment</h1>
                    <p className="mt-2 opacity-90 relative z-10">{subjectName || title}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Assignment Details
                            </h2>
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center">
                                    <span className="text-gray-500 w-32">Subject:</span>
                                    <span className="font-medium text-gray-900">{title || "N/A"}</span>
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center">
                                    <span className="text-gray-500 w-32">Class:</span>
                                    <span className="font-medium text-gray-900">{section || "N/A"}</span>
                                </div>
                                <div className="flex flex-col md:flex-row">
                                    <span className="text-gray-500 w-32">Description:</span>
                                    <div className="font-medium text-gray-900">{description || "No description available"}</div>
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center">
                                    <span className="text-gray-500 w-32">Due Date:</span>
                                    <span className="font-medium text-gray-900">{formatDate(dueDate)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white shadow-lg rounded-xl p-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Upload Your Assignment
                            </h2>
                            
                            <div 
                                className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 cursor-pointer transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={openFileSelector}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                    className="hidden"
                                />
                                
                                {selectedFile ? (
                                    <div className="flex flex-col items-center">
                                        <div className="p-3 bg-green-100 rounded-full mb-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="font-medium text-lg mb-1">{selectedFile.name}</p>
                                        <p className="text-gray-500 text-sm">
                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFile(null);
                                            }}
                                            className="mt-3 text-sm text-red-500 hover:text-red-700 transition"
                                        >
                                            Remove file
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="font-medium text-lg mb-1">Drag and drop your file here</p>
                                        <p className="text-gray-500 mb-3">or click to browse</p>
                                        <p className="text-xs text-gray-400">Supported formats: PDF, DOC, DOCX, PNG, JPG (Max 10MB)</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-end">
                                <button
                                    onClick={submitAssignment}
                                    className={`flex items-center px-6 py-3 rounded-lg shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                        selectedFile 
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white focus:ring-indigo-500' 
                                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    }`}
                                    disabled={!selectedFile || loading}
                                >
                                    {loading ? 'Submitting...' : 'Submit Assignment'}
                                    {!loading && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="lg:col-span-1">
                        <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Time Remaining
                            </h2>
                            
                            {timeRemaining.expired ? (
                                <div className="p-4 bg-red-50 rounded-lg">
                                    <p className="text-red-600 font-semibold text-center">Assignment is past due!</p>
                                </div>
                            ) : dueDate ? (
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-indigo-50 rounded-lg p-3">
                                        <p className="text-2xl font-bold text-indigo-600">{timeRemaining.days}</p>
                                        <p className="text-indigo-600 text-sm">Days</p>
                                    </div>
                                    <div className="bg-indigo-50 rounded-lg p-3">
                                        <p className="text-2xl font-bold text-indigo-600">{timeRemaining.hours}</p>
                                        <p className="text-indigo-600 text-sm">Hours</p>
                                    </div>
                                    <div className="bg-indigo-50 rounded-lg p-3">
                                        <p className="text-2xl font-bold text-indigo-600">{timeRemaining.minutes}</p>
                                        <p className="text-indigo-600 text-sm">Minutes</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center">No due date specified</p>
                            )}
                        </div>
                        
                        <div className="bg-white shadow-lg rounded-xl p-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Submission Guidelines
                            </h2>
                            <ul className="space-y-2 text-gray-600">
                                <li className="flex items-start">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    File must be in PDF, DOC, DOCX, PNG, or JPG format
                                </li>
                                <li className="flex items-start">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Maximum file size is 10MB
                                </li>
                                <li className="flex items-start">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Include your name and ID in the document
                                </li>
                                <li className="flex items-start">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Once submitted, you cannot modify your submission
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SubmissionPage;