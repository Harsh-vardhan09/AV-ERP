// import { useState } from 'react';
// import { useKnowlegecentercreateMutation } from '../redux/api/knowlegecenterapi';
// import { useSelector } from 'react-redux';
// import { useNavigate } from 'react-router';

// function Knowledgeadmin() {
//     // title,teacherid,subject,section,semester
//     // State for all form inputs
//     const [knowledgeAdmin]  =  useKnowlegecentercreateMutation();
//     const [title, setTitle] = useState('');
//     const [section, setSection] = useState('');
//     const [semester, setSemester] = useState('');
//     const [subject, setSubject] = useState('');
//     const [file, setFile] = useState(null);
     
// const teacherid =useSelector(state=>state?.user?.user?.user?._id);
//     const details = ['Choose option','A', 'B', 'C', 'D'];
//     const sem =  ["Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
//     const yearOptions = ['Choose option',"Ada", "OOps", "digital ststem"];
// const navigate =useNavigate();
//     const handleSubmit = async (e) => {
//         e.preventDefault();
        
//         const formData = new FormData();
//         formData.append("title", title);
//         formData.append("subject", subject); 
//         formData.append("section", section);
//         formData.append("semester", semester);
//         formData.append("photo", file);
//         formData.append("teacherid", teacherid); 
// //    console.log(...formData);

//         try {
//             const response = await knowledgeAdmin(formData);
//             console.log("Form submission success:", response);
//             // navigate('/')
//         } catch (error) {
//             console.log("Form submission error:", error);
//         }
//     };

//     return (
//         <>
//             <h3 className="fixed z-[1] bg-[#5c4e4e] text-wrap min-w-[100%] max-h-16 text-black py-2 pl-2 text-xl lg:h-16">Assignment Form</h3>

//             <div className="pt-7 lg:pt-14">
//                 <form onSubmit={handleSubmit} className="flex flex-col p-4 lg:p-4 lg:justify-center border-sky-500">
//                     <div className="flex flex-col lg:justify-center lg:pl-52 lg:pr-52">

//                         <label htmlFor="topic" className="text-xl pl-2 mt-4">About Topic</label>
//                         <textarea
//                             row="3"
//                             clo="50"
//                             required
//                             className="p-3 mt-1 rounded-md bg-[#d1d0d0] resize-none"
//                             id="unit"
//                             placeholder="Enter Topic"
//                             value={title}
//                             onChange={(e) => setTitle(e.target.value)}
//                         />

//                         <label htmlFor="section" className="text-xl pl-2 mt-4">Select Section</label>
//                         <select
//                             id="section"
//                             required
//                             className="p-3 mt-1 rounded-md bor bg-[#d1d0d0]"
//                             value={section}
//                             onChange={(e) => setSection(e.target.value)}
//                         >
//                             {details.map((e, index) => (
//                                 <option key={index} value={e}>{e}</option>
//                             ))}
//                         </select>

//                         <label htmlFor="SelectSem" className="text-xl pl-2 mt-4">Select Semester</label>
//                         <select
//                             id="SelectSem"
//                             required
//                             className="p-3 mt-1 rounded-md bor bg-[#d1d0d0]"
//                             value={semester}
//                             onChange={(e) => setSemester(e.target.value)}
//                         >
//                             {sem.map((e, index) => (
//                                 <option key={index} value={e}>{e}</option>
//                             ))}
//                         </select>

//                         <label htmlFor="Year" className="text-xl pl-2 mt-4">Select subject</label>
//                         <select
//                             id="Year"
//                             required
//                             className="p-3 mt-1 rounded-md bor bg-[#d1d0d0]"
//                             value={subject}
//                             onChange={(e) => setSubject(e.target.value)}
//                         >
//                             {yearOptions.map((e, index) => (
//                                 <option key={index} value={e}>{e}</option>
//                             ))}
//                         </select> 

//                         <input
//                             type="file"
//                             required
//                             className="p-3 mt-2 rounded-md"
//                             onChange={(e) => setFile(e.target.files[0])}
//                         />

//                         <button type="submit" className="bg-[#5c4e4e] text-wrap text-black min-w-[50px] justify-center mt-4">Assignment Upload</button>
//                     </div>
//                 </form>
//             </div>
//         </>
//     );
// }

// export default Knowledgeadmin;


import { useState } from 'react';
import { useKnowlegecentercreateMutation } from '../redux/api/knowlegecenterapi';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function KnowledgeAdmin() {
  const [knowledgeAdmin] = useKnowlegecentercreateMutation();
  const [title, setTitle] = useState('');
  const [section, setSection] = useState('');
  const [semester, setSemester] = useState('');
  const [subject, setSubject] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const teacherId = useSelector(state => state?.user?.user?.user?._id);
  const navigate = useNavigate();
  
  // Improved options with proper labels
  const sectionOptions = [
    { value: '', label: 'Select a section' },
    { value: 'A', label: 'Section A' },
    { value: 'B', label: 'Section B' },
    { value: 'C', label: 'Section C' },
    { value: 'D', label: 'Section D' }
  ];
  
  const semesterOptions = [
    { value: '', label: 'Select a grade' },
    { value: 'Nursery', label: 'Nursery' },
    { value: 'LKG', label: 'LKG' },
    { value: 'UKG', label: 'UKG' },
    ...Array.from({ length: 12 }, (_, i) => ({ 
      value: `${i + 1}`, 
      label: `Grade ${i + 1}` 
    }))
  ];
  
  const subjectOptions = [
    { value: '', label: 'Select a subject' },
    { value: 'Ada', label: 'Algorithms & Data Structures' },
    { value: 'OOps', label: 'Object-Oriented Programming' },
    { value: 'digital ststem', label: 'Digital Systems' },
    { value: 'Mathematics', label: 'Mathematics' },
    { value: 'Science', label: 'Science' },
    { value: 'English', label: 'English' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    
    const formData = new FormData();
    formData.append("title", title);
    formData.append("subject", subject);
    formData.append("section", section);
    formData.append("semester", semester);
    formData.append("photo", file);
    formData.append("teacherid", teacherId);

    try {
      const response = await knowledgeAdmin(formData);
      console.log("Form submission success:", response);
      setSubmitSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        setTitle('');
        setSection('');
        setSemester('');
        setSubject('');
        setFile(null);
        setSubmitSuccess(false);
        toast.success("Form submission success")
        // navigate('/'); // Uncomment if you want to navigate after submission
      }, 2000);
    } catch (error) {
      console.log("Form submission error:", error);
      setSubmitError('Failed to upload. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-semibold">Knowledge Center Administration</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4">
              <h2 className="text-xl font-medium text-white">Upload Educational Material</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Success message */}
              {submitSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                  Material uploaded successfully!
                </div>
              )}
              
              {/* Error message */}
              {submitError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {submitError}
                </div>
              )}
              
              {/* Topic field */}
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                  Topic Description
                </label>
                <textarea
                  rows="3"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  id="topic"
                  placeholder="Describe the topic or material you're uploading"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              {/* Section dropdown */}
              <div>
                <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <select
                  id="section"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                >
                  {sectionOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.value === ''}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Grade/Semester dropdown */}
              <div>
                <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">
                  Grade Level
                </label>
                <select
                  id="semester"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                >
                  {semesterOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.value === ''}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Subject dropdown */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  id="subject"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  {subjectOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.value === ''}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* File upload */}
              <div>
                <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Document
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4h-12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          required
                          onChange={(e) => setFile(e.target.files[0])}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, DOC, PPT, XLS, TXT up to 10MB</p>
                    {file && (
                      <p className="text-sm text-indigo-600 font-medium mt-2">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Submit button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? 'Uploading...' : 'Upload Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default KnowledgeAdmin;