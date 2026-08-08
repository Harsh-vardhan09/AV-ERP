import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Edit2, Trash2, Eye, Lock, Filter, Download, Camera, RefreshCw } from 'lucide-react';
import { useGetAdminStudentsQuery, useGetActiveSessionQuery } from '../redux/api/adminApi';
import { useUploadStudentPhotoMutation } from '@modules/admissions/api/admissionApi';

const StudentManagementDashboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(10);

  // Photo upload state
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState({ type: '', text: '' });
  const photoInputRef = useRef(null);
  const [uploadStudentPhoto] = useUploadStudentPhotoMutation();

  // Use the active session to filter students (ensures seeded data is visible)
  const { data: sessionData } = useGetActiveSessionQuery();
  const activeSessionId = sessionData?.data?._id;

  // Build query params: pass active session so backend filters correctly
  const queryParams = useMemo(() => {
    const p = {};
    if (activeSessionId) p.session = activeSessionId;
    return p;
  }, [activeSessionId]);

  const { data, isLoading, error: queryError } = useGetAdminStudentsQuery(queryParams, {
    skip: !activeSessionId, // wait until we know the session
  });

  const normalizedStudents = useMemo(() => {
    const profiles = data?.data || [];
    return profiles.map(profile => ({
      _id: profile._id,
      firstName: profile.firstName,
      middleName: profile.middleName,
      lastName: profile.lastName,
      email: profile.userId?.email,
      phone: profile.phone,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      address: profile.address,
      status: profile.status,
      rollno: profile.rollNo,
      academicDetails: {
        admissionNumber: profile.admissionNumber,
        grade: profile.classId?.name,
        section: profile.sectionId?.name,
      },
    }));
  }, [data]);

  useEffect(() => {
    if (queryError) {
      setError(queryError?.data?.message || 'Failed to fetch student data');
    } else {
      setError(null);
    }
    setStudents(normalizedStudents);
    setLoading(isLoading);
  }, [normalizedStudents, isLoading, queryError]);

  // Filter students based on search and filters
  const filteredStudents = students.filter(student => {
    // Search term filter
    const searchFields = [
      student.firstName,
      student.lastName,
      student.academicDetails?.admissionNumber,
      student.rollno,
      student.email,
      student.phone
    ].filter(Boolean).join(' ').toLowerCase();
    
    const matchesSearch = searchTerm === '' || searchFields.includes(searchTerm.toLowerCase());
    
    // Class filter
    const matchesClass = selectedClass === '' || student.academicDetails?.grade === selectedClass;
    
    // Section filter
    const matchesSection = selectedSection === '' || student.academicDetails?.section === selectedSection;
    
    // Status filter
    const matchesStatus = selectedStatus === '' || student.status === selectedStatus;
    
    return matchesSearch && matchesClass && matchesSection && matchesStatus;
  });

  // Pagination
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  // Get all available classes and sections for filters
  const classes = [...new Set(students.map(student => student.academicDetails?.grade).filter(Boolean))];
  const sections = [...new Set(students.map(student => student.academicDetails?.section).filter(Boolean))];
  const statuses = [...new Set(students.map(student => student.status).filter(Boolean))];

  // Handle student operations
  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setPhotoPreview(null);
    setPhotoFile(null);
    setPhotoMsg({ type: '', text: '' });
    setIsViewModalOpen(true);
  };

  const handleEditStudent = (student) => {
    setSelectedStudent({...student});
    setPhotoPreview(null);
    setPhotoFile(null);
    setPhotoMsg({ type: '', text: '' });
    setIsEditModalOpen(true);
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        const response = await fetch(`/api/user/${studentId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete student');
        }
        
        const data = await response.json();
        if (data.success) {
          // Remove deleted student from state
          setStudents(students.filter(student => student._id !== studentId));
          alert('Student deleted successfully');
        } else {
          throw new Error(data.message || 'Failed to delete student');
        }
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleChangePassword = (student) => {
    setSelectedStudent(student);
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/user/${selectedStudent._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedStudent)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update student');
      }
      
      const data = await response.json();
      if (data.success) {
        // Update student in state
        setStudents(students.map(student => 
          student._id === selectedStudent._id ? {...selectedStudent} : student
        ));
        setIsEditModalOpen(false);
        alert('Student updated successfully');
      } else {
        throw new Error(data.message || 'Failed to update student');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmitPasswordChange = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    try {
      const response = await fetch(`/api/user/${selectedStudent._id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: newPassword })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update password');
      }
      
      const data = await response.json();
      if (data.success) {
        setIsPasswordModalOpen(false);
        alert('Password updated successfully');
      } else {
        throw new Error(data.message || 'Failed to update password');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // ─── Photo handlers ──────────────────────────────────────────────────────
  const handlePhotoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoMsg({ type: 'error', text: 'Only image files are allowed.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoMsg({ type: 'error', text: 'File must be under 5 MB.' });
      return;
    }
    setPhotoFile(file);
    setPhotoMsg({ type: '', text: '' });
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !selectedStudent?._id) return;
    setPhotoUploading(true);
    setPhotoMsg({ type: '', text: '' });
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      const res = await uploadStudentPhoto({ id: selectedStudent._id, formData }).unwrap();
      setPhotoMsg({ type: 'success', text: 'Photo uploaded successfully!' });
      // Update local student record to show new photo
      setSelectedStudent(prev => ({ ...prev, photoUrl: res.data.photoUrl }));
      // Refresh table
      setStudents(prev => prev.map(s =>
        s._id === selectedStudent._id ? { ...s, photoUrl: res.data.photoUrl } : s
      ));
      setPhotoFile(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
    } catch (err) {
      setPhotoMsg({ type: 'error', text: err?.data?.message || 'Upload failed.' });
    } finally {
      setPhotoUploading(false);
    }
  };

  const exportToCSV = () => {
    // Prepare CSV data
    const headers = [
      'Admission No.',
      'Roll No.',
      'Name',
      'Class',
      'Section',
      'Gender',
      'Date of Birth',
      'Email',
      'Phone',
      'Address',
      'Status'
    ].join(',');
    
    const csvData = filteredStudents.map(student => [
      student.academicDetails?.admissionNumber || '',
      student.rollno || '',
      `${student.firstName} ${student.middleName || ''} ${student.lastName || ''}`.trim(),
      student.academicDetails?.grade || '',
      student.academicDetails?.section || '',
      student.gender || '',
      new Date(student.dateOfBirth).toLocaleDateString() || '',
      student.email || '',
      student.phone || '',
      `${student.address?.addressLine1 || ''}, ${student.address?.city || ''}, ${student.address?.state || ''}`.trim(),
      student.status || ''
    ].join(',')).join('\n');
    
    const csv = `${headers}\n${csvData}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'students.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading students data...</div>;
  if (error) return <div className="bg-red-100 text-red-700 p-4 rounded">Error: {error}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Student Management</h1>
      
      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search students by name, email, phone, or admission number..."
              className="pl-10 pr-4 py-2 border rounded-md w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
            onClick={exportToCSV}
          >
            <Download size={16} />
            Export
          </button>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <select 
            className="border rounded px-3 py-1 text-sm"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls} value={cls}>Class {cls}</option>
            ))}
          </select>
          
          <select 
            className="border rounded px-3 py-1 text-sm"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <option value="">All Sections</option>
            {sections.map(section => (
              <option key={section} value={section}>Section {section}</option>
            ))}
          </select>
          
          <select 
            className="border rounded px-3 py-1 text-sm"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
            ))}
          </select>
          
          <button 
            className="border border-gray-300 rounded px-3 py-1 text-sm flex items-center gap-1 hover:bg-gray-50"
            onClick={() => {
              setSearchTerm('');
              setSelectedClass('');
              setSelectedSection('');
              setSelectedStatus('');
            }}
          >
            <RefreshCw size={14} />
            Reset
          </button>
        </div>
      </div>
      
      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-medium">Students List</h2>
          <p className="text-sm text-gray-500">Total: {filteredStudents.length} students</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentStudents.length > 0 ? (
                currentStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {student.academicDetails?.admissionNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {student.rollno || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium mr-3">
                          {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {`${student.firstName} ${student.middleName || ''} ${student.lastName || ''}`}
                          </div>
                          <div className="text-xs text-gray-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {student.academicDetails ? (
                        <>Class {student.academicDetails.grade}-{student.academicDetails.section}</>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{student.phone || '-'}</div>
                      <div className="text-xs text-gray-500">
                        {student.address?.city}, {student.address?.state}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${student.status === 'active' ? 'bg-green-100 text-green-800' : 
                          student.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {student.status ? student.status.charAt(0).toUpperCase() + student.status.slice(1) : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewStudent(student)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleEditStudent(student)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleChangePassword(student)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Change Password"
                        >
                          <Lock size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteStudent(student._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No students found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {filteredStudents.length > 0 && (
          <div className="px-6 py-3 flex items-center justify-between border-t">
            <div className="text-sm text-gray-500">
              Showing {indexOfFirstStudent + 1} to {Math.min(indexOfLastStudent, filteredStudents.length)} of {filteredStudents.length} students
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* View Student Modal */}
      {isViewModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold mb-4">Student Details</h2>
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* ── Passport Photo Card ─────────────────────────────────── */}
                <div className="col-span-1 bg-gray-50 p-4 rounded-lg flex flex-col items-center gap-3">
                  <h3 className="font-semibold text-lg text-gray-700 w-full">Passport Photo</h3>

                  {/* Preview box */}
                  <div style={{
                    width: 120, height: 145, border: '2px dashed #cbd5e1',
                    borderRadius: 6, overflow: 'hidden', background: '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {(photoPreview || selectedStudent.photoUrl) ? (
                      <img
                        src={photoPreview || selectedStudent.photoUrl}
                        alt="Student passport"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: '0 8px' }}>
                        No Photo
                      </span>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoFileChange}
                  />

                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded px-3 py-1"
                  >
                    <Camera size={14} /> Choose Photo
                  </button>

                  {photoFile && (
                    <button
                      type="button"
                      onClick={handlePhotoUpload}
                      disabled={photoUploading}
                      className="text-sm bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1 disabled:opacity-50 w-full text-center"
                    >
                      {photoUploading ? 'Uploading…' : '☁ Upload to Cloud'}
                    </button>
                  )}

                  {photoMsg.text && (
                    <p className={`text-xs text-center ${photoMsg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                      {photoMsg.text}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 text-center">JPG/PNG, max 5 MB.<br />Appears in TC &amp; Migration Certificate.</p>
                </div>

                {/* Personal Information */}
                <div className="col-span-1 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 text-gray-700">Personal Information</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Name:</span> {`${selectedStudent.firstName} ${selectedStudent.middleName || ''} ${selectedStudent.lastName || ''}`}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Gender:</span> {selectedStudent.gender ? selectedStudent.gender.charAt(0).toUpperCase() + selectedStudent.gender.slice(1) : '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Date of Birth:</span> {selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString() : '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Place of Birth:</span> {selectedStudent.placeOfBirth || '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Nationality:</span> {selectedStudent.nationality || '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Religion:</span> {selectedStudent.religion || '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Mother Tongue:</span> {selectedStudent.motherTongue || '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Blood Group:</span> {selectedStudent.bloodGroup || '-'}
                    </p>
                  </div>
                </div>
                
                {/* Contact Information */}
                <div className="col-span-1 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 text-gray-700">Contact Information</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Email:</span> {selectedStudent.email || '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Phone:</span> {selectedStudent.phone || '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Address:</span> {selectedStudent.address ? (
                        <>
                          {selectedStudent.address.addressLine1}<br />
                          {selectedStudent.address.addressLine2 && <>{selectedStudent.address.addressLine2}<br /></>}
                          {selectedStudent.address.city}, {selectedStudent.address.state} - {selectedStudent.address.pincode}
                        </>
                      ) : '-'}
                    </p>
                    <h4 className="font-medium text-sm mt-4 mb-2">Emergency Contact</h4>
                    {selectedStudent.emergencyContact ? (
                      <>
                        <p className="text-sm">
                          <span className="font-medium">Name:</span> {selectedStudent.emergencyContact.name}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Phone:</span> {selectedStudent.emergencyContact.phone}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Relation:</span> {selectedStudent.emergencyContact.relation}
                        </p>
                      </>
                    ) : '-'}
                  </div>
                </div>
                
                {/* Academic Information */}
                <div className="col-span-1 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 text-gray-700">Academic Information</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Admission Number:</span> {selectedStudent.academicDetails?.admissionNumber || '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Roll Number:</span> {selectedStudent.rollno || '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Admission Date:</span> {selectedStudent.academicDetails?.admissionDate ? new Date(selectedStudent.academicDetails.admissionDate).toLocaleDateString() : '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Academic Year:</span> {selectedStudent.academicDetails?.academicYear || '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Class & Section:</span> {selectedStudent.academicDetails ? `${selectedStudent.academicDetails.grade}-${selectedStudent.academicDetails.section}` : '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Previous School:</span> {selectedStudent.academicDetails?.previousSchool || '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Previous Grade:</span> {selectedStudent.academicDetails?.previousGrade || '-'}
                    </p>
                  </div>
                </div>
                
                {/* Parents Information */}
                <div className="col-span-1 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 text-gray-700">Father's Information</h3>
                  {selectedStudent.parentDetails?.father ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Name:</span> {selectedStudent.parentDetails.father.name}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Occupation:</span> {selectedStudent.parentDetails.father.occupation || '-'}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Phone:</span> {selectedStudent.parentDetails.father.phone || '-'}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Email:</span> {selectedStudent.parentDetails.father.email || '-'}
                      </p>
                    </div>
                  ) : <p className="text-sm">No information available</p>}
                </div>
                
                <div className="col-span-1 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 text-gray-700">Mother's Information</h3>
                  {selectedStudent.parentDetails?.mother ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Name:</span> {selectedStudent.parentDetails.mother.name}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Occupation:</span> {selectedStudent.parentDetails.mother.occupation || '-'}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Phone:</span> {selectedStudent.parentDetails.mother.phone || '-'}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Email:</span> {selectedStudent.parentDetails.mother.email || '-'}
                      </p>
                    </div>
                  ) : <p className="text-sm">No information available</p>}
                </div>
                
                <div className="col-span-1 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 text-gray-700">Guardian's Information</h3>
                  {selectedStudent.parentDetails?.guardian ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Name:</span> {selectedStudent.parentDetails.guardian.name}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Relation:</span> {selectedStudent.parentDetails.guardian.relation || '-'}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Phone:</span> {selectedStudent.parentDetails.guardian.phone || '-'}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Email:</span> {selectedStudent.parentDetails.guardian.email || '-'}
                      </p>
                    </div>
                  ) : <p className="text-sm">No information available</p>}
                </div>
                
                {/* Additional Information */}
                <div className="col-span-1 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 text-gray-700">Health Information</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Health Issues:</span> {selectedStudent.healthInfo?.healthIssues || 'None'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Allergies:</span> {selectedStudent.healthInfo?.allergies || 'None'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Medications:</span> {selectedStudent.healthInfo?.medications || 'None'}
                    </p>
                  </div>
                </div>
                
                <div className="col-span-1 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 text-gray-700">Transportation</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                    <span className="font-medium">Transportation Required:</span> {selectedStudent.transportation?.transportRequired ? 'Yes' : 'No'}
                    </p>
                    {selectedStudent.transportation?.transportRequired && (
                      <>
                        <p className="text-sm">
                          <span className="font-medium">Bus Number:</span> {selectedStudent.transportation?.busNumber || '-'}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Pickup Point:</span> {selectedStudent.transportation?.pickupPoint || '-'}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Drop Point:</span> {selectedStudent.transportation?.dropPoint || '-'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="col-span-1 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 text-gray-700">Account Information</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Username:</span> {selectedStudent.username || '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${selectedStudent.status === 'active' ? 'bg-green-100 text-green-800' : 
                          selectedStudent.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {selectedStudent.status ? selectedStudent.status.charAt(0).toUpperCase() + selectedStudent.status.slice(1) : 'Unknown'}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Created On:</span> {selectedStudent.createdAt ? new Date(selectedStudent.createdAt).toLocaleDateString() : '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Last Updated:</span> {selectedStudent.updatedAt ? new Date(selectedStudent.updatedAt).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Student Modal */}
      {isEditModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold mb-4">Edit Student</h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>
              
              <form onSubmit={handleUpdateStudent}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Basic Information */}
                  <div className="col-span-3 bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3 text-gray-700">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name*</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.firstName || ''}
                          onChange={(e) => setSelectedStudent({...selectedStudent, firstName: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.middleName || ''}
                          onChange={(e) => setSelectedStudent({...selectedStudent, middleName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.lastName || ''}
                          onChange={(e) => setSelectedStudent({...selectedStudent, lastName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select
                          className="w-full p-2 border rounded"
                          value={selectedStudent.gender || ''}
                          onChange={(e) => setSelectedStudent({...selectedStudent, gender: e.target.value})}
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input
                          type="date"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toISOString().split('T')[0] : ''}
                          onChange={(e) => setSelectedStudent({...selectedStudent, dateOfBirth: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.bloodGroup || ''}
                          onChange={(e) => setSelectedStudent({...selectedStudent, bloodGroup: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact Information */}
                  <div className="col-span-3 bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3 text-gray-700">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
                        <input
                          type="email"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.email || ''}
                          onChange={(e) => setSelectedStudent({...selectedStudent, email: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.phone || ''}
                          onChange={(e) => setSelectedStudent({...selectedStudent, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-sm mt-4 mb-2">Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.address?.addressLine1 || ''}
                          onChange={(e) => setSelectedStudent({
                            ...selectedStudent, 
                            address: {...(selectedStudent.address || {}), addressLine1: e.target.value}
                          })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.address?.addressLine2 || ''}
                          onChange={(e) => setSelectedStudent({
                            ...selectedStudent, 
                            address: {...(selectedStudent.address || {}), addressLine2: e.target.value}
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.address?.city || ''}
                          onChange={(e) => setSelectedStudent({
                            ...selectedStudent, 
                            address: {...(selectedStudent.address || {}), city: e.target.value}
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.address?.state || ''}
                          onChange={(e) => setSelectedStudent({
                            ...selectedStudent, 
                            address: {...(selectedStudent.address || {}), state: e.target.value}
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.address?.pincode || ''}
                          onChange={(e) => setSelectedStudent({
                            ...selectedStudent, 
                            address: {...(selectedStudent.address || {}), pincode: e.target.value}
                          })}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Academic Information */}
                  <div className="col-span-3 bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3 text-gray-700">Academic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.academicDetails?.admissionNumber || ''}
                          onChange={(e) => setSelectedStudent({
                            ...selectedStudent, 
                            academicDetails: {
                              ...(selectedStudent.academicDetails || {}), 
                              admissionNumber: e.target.value
                            }
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={selectedStudent.rollno || ''}
                          onChange={(e) => setSelectedStudent({...selectedStudent, rollno: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                        <select
                          className="w-full p-2 border rounded"
                          value={selectedStudent.academicDetails?.grade || ''}
                          onChange={(e) => setSelectedStudent({
                            ...selectedStudent, 
                            academicDetails: {
                              ...(selectedStudent.academicDetails || {}), 
                              grade: e.target.value
                            }
                          })}
                        >
                          <option value="">Select Class</option>
                          {classes.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                        <select
                          className="w-full p-2 border rounded"
                          value={selectedStudent.academicDetails?.section || ''}
                          onChange={(e) => setSelectedStudent({
                            ...selectedStudent, 
                            academicDetails: {
                              ...(selectedStudent.academicDetails || {}), 
                              section: e.target.value
                            }
                          })}
                        >
                          <option value="">Select Section</option>
                          {sections.map(section => (
                            <option key={section} value={section}>{section}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          className="w-full p-2 border rounded"
                          value={selectedStudent.status || ''}
                          onChange={(e) => setSelectedStudent({...selectedStudent, status: e.target.value})}
                        >
                          <option value="">Select Status</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Password Change Modal */}
      {isPasswordModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold mb-4">Change Password</h2>
                <button 
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>
              
              <form onSubmit={handleSubmitPasswordChange}>
                <p className="mb-4 text-sm text-gray-600">
                  Change password for: <span className="font-semibold">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password*</label>
                  <input
                    type="password"
                    className="w-full p-2 border rounded"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength="6"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password*</label>
                  <input
                    type="password"
                    className="w-full p-2 border rounded"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength="6"
                  />
                  {newPassword !== confirmPassword && confirmPassword !== '' && (
                    <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={newPassword !== confirmPassword || newPassword.length < 6}
                  >
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagementDashboard;