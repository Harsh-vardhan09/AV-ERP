import React, { useState, useRef } from 'react';
import { useRegisterStudentMutation, useGetSchoolSettingsQuery, useCheckDuplicateFieldQuery, useUploadStudentPhotoMutation, useGetAdmissionFormSettingsQuery } from '../../redux/api/admissionApi';
import { useGetClassesQuery, useGetSectionsQuery, useGetActiveSessionQuery } from '../../redux/api/adminApi';
import EmailOtpVerifier from '../../components/EmailOtpVerifier';
import toast from 'react-hot-toast';

// ─── Reusable UI primitives ────────────────────────────────────────────────────

const Section = ({ title, open, onToggle, children, required }) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
    <button type="button" onClick={onToggle}
      className={`w-full flex justify-between items-center px-4 py-3 text-left text-sm font-medium transition-colors ${open ? 'bg-blue-50 text-blue-800 border-b border-blue-100' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
      <span>{title}{required && <span className="text-red-500 ml-1">*</span>}</span>
      <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </button>
    {open && <div className="p-4 bg-white">{children}</div>}
  </div>
);

const Input = ({ label, required, numeric, ...props }) => {
  // numeric=true → digit-only enforcement (blocks letters/symbols at input level)
  const numericProps = numeric ? {
    inputMode: 'numeric',
    pattern: '[0-9]*',
    onInput: (e) => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); },
  } : {};
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {props.maxLength && <span className="text-gray-400 ml-1 font-normal">({props.maxLength} digits)</span>}
      </label>
      <input {...numericProps} {...props} required={required}
        className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${props.readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'} ${props.className || ''}`} />
    </div>
  );
};

const Select = ({ label, required, options = [], placeholder, ...props }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    <select {...props} required={required} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ─── Initial form state ────────────────────────────────────────────────────────

const initialForm = {
  // Academic
  salutation: '', firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: '',
  phone: '', whatsappNo: '', alternateNumber: '',
  address: '', addressLine2: '', city: '', state: '', pincode: '',
  classId: '', sectionId: '', stream: '',
  admissionNumber: '', rollNo: '', studentId: '', scholarNo: '', srnNo: '', pen: '', penNo: '',
  admissionDate: '',
  // Identity & Category
  aadharCard: '', ssmId: '', familyId: '', apaarId: '',
  rte: false, bplStudent: false, bplCardNo: '',
  placeOfBirth: '', nationality: 'Indian', religion: '', caste: '', category: '',
  motherTongue: '', bloodGroup: '',
  // Caste Certificate
  casteApplicationNo: '', casteApplicationDate: '',
  // Government Schemes & Board IDs
  scholarshipId: '', domicileApplicationNo: '', rteApplicationNo: '',
  boardEnrollNo: '', ladliLaxmiNo: '',
  // Previous School
  previousSchool: '', previousClass: '',
  // Dise / Transfer
  diseCode: '', previousResult: '',
  // Parent — Father
  fatherName: '', fatherOccupation: '', fatherQualification: '',
  fatherPhone: '', fatherEmail: '', fatherIncome: '',
  fatherAadharCard: '',
  // Parent — Mother
  motherName: '', motherOccupation: '', motherQualification: '',
  motherPhone: '', motherEmail: '',
  motherAadharCard: '',
  // Guardian
  guardianName: '', guardianRelation: '', guardianPhone: '', guardianEmail: '',
  guardianQualification: '', guardianIncome: '',
  guardianAadharCard: '',
  // Bank
  accountNumber: '', bankName: '', ifsc: '', branchName: '',
  // Health
  healthIssues: '', allergies: '', medications: '', disabilityType: '',
  // Transport & Hostel
  transportRequired: false, pickupPoint: '', routeNo: '',
  hostelRequired: false, roomNo: '',
  // Emergency
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  // Account
  email: '', remarks: ''
};

// --- HMHSS00022 Custom Form ---
// ONLY the 37 fields from the physical form in exact order.

const HMHSS00022Form = ({ form, set, classes, sections, dupCheck, dupStudent, handleDupBlur, isLoading, handleSubmit,
  photoPreview, fileInputRef, handlePhotoChange, setPhotoFile, setPhotoPreview }) => {
  const selClass = classes.find(c => c._id === form.classId);
  const isHigher = selClass?.name?.includes('11th') || selClass?.name?.includes('12th');
  const RadioGroup = ({ label, name, options, value }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">{label}</label>
      <div className="flex items-center gap-5 flex-wrap">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="radio" name={name} value={opt} checked={value === opt} onChange={set} className="h-4 w-4 accent-blue-600" />
            <span className="text-sm text-gray-700">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">

        {/* ── Student Photo Upload ─────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Student Photo</label>
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors ${
                photoPreview ? 'border-blue-500' : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 hover:text-blue-700 font-medium block">
                {photoPreview ? 'Change Photo' : 'Upload Photo'}
              </button>
              {photoPreview && (
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="text-sm text-red-500 hover:text-red-600 font-medium mt-1 block">
                  Remove
                </button>
              )}
              <p className="text-xs text-gray-400 mt-1">Max 2MB, JPG/PNG</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" name="admissionDate" type="date" value={form.admissionDate} onChange={set} />
          <div>
            <Input label="Scholar No." name="scholarNo" value={form.scholarNo} onChange={set} placeholder="Scholar number" onBlur={(e) => handleDupBlur('scholarNo', e.target.value)} />
            {dupStudent && dupCheck.field === 'scholarNo' && (<p className="mt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs text-amber-800">Already assigned: {dupStudent.firstName} {dupStudent.lastName}</p>)}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input label="Student First Name" name="firstName" value={form.firstName} onChange={set} required />
          <Input label="Middle Name" name="middleName" value={form.middleName} onChange={set} />
          <Input label="Last Name" name="lastName" value={form.lastName} onChange={set} />
        </div>
        <Input label="Father's Name" name="fatherName" value={form.fatherName} onChange={set} required />
        <Input label="Mother's Name" name="motherName" value={form.motherName} onChange={set} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={set} required />
          <RadioGroup label="Gender" name="gender" value={form.gender} options={['male', 'female']} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Select label="Admission Class" name="classId" value={form.classId} onChange={set} required placeholder="Select Class" options={classes.map(c => ({ value: c._id, label: c.name }))} />
          <Select label="Section" name="sectionId" value={form.sectionId} onChange={set} required placeholder="Select Section" options={sections.map(s => ({ value: s._id, label: s.name }))} />
          <RadioGroup label="RTE Admission" name="rte" value={form.rte === true || form.rte === 'Yes' ? 'Yes' : 'No'} options={['Yes', 'No']} />
        </div>
        {isHigher && (<div className="max-w-xs"><label className="block text-xs font-medium text-gray-500 mb-1">Stream <span className="text-red-500">*</span></label><select name="stream" value={form.stream || ''} onChange={set} required className="w-full border border-blue-400 rounded-md px-3 py-2 text-sm bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none"><option value="">Select Stream</option><option value="Science">Science</option><option value="Commerce">Commerce</option><option value="Arts">Arts</option></select></div>)}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Mobile Number 1" name="fatherPhone" value={form.fatherPhone} onChange={set} required numeric maxLength={10} placeholder="10-digit number" />
          <Input label="Mobile Number 2" name="alternateNumber" value={form.alternateNumber} onChange={set} numeric maxLength={10} placeholder="10-digit number" />
        </div>
        <Input label="Samagra ID" name="ssmId" value={form.ssmId} onChange={set} numeric maxLength={9} placeholder="9-digit Samagra ID" />
        <Input label="Family ID" name="familyId" value={form.familyId} onChange={set} numeric maxLength={8} placeholder="Family ID" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Caste" name="caste" value={form.caste} onChange={set} />
          <RadioGroup label="Category" name="category" value={form.category} options={['General', 'OBC', 'ST', 'SC']} />
        </div>
        <Input label="Caste Certificate No." name="casteApplicationNo" value={form.casteApplicationNo} onChange={set} maxLength={25} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Caste Certificate Issue Date" name="casteApplicationDate" type="date" value={form.casteApplicationDate} onChange={set} />
          <RadioGroup label="Religion" name="religion" value={form.religion} options={['Hindu', 'Muslim']} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <RadioGroup label="BPL Card" name="bplStudent" value={form.bplStudent === true || form.bplStudent === 'Yes' ? 'Yes' : 'No'} options={['Yes', 'No']} />
          <Input label="BPL Card No." name="bplCardNo" value={form.bplCardNo} onChange={set} maxLength={20} />
        </div>
        <Input label="Student's Aadhaar Card No." name="aadharCard" value={form.aadharCard} onChange={set} numeric maxLength={12} placeholder="12-digit Aadhaar" />
        <Input label="Father's Aadhaar Card No." name="fatherAadharCard" value={form.fatherAadharCard} onChange={set} numeric maxLength={12} placeholder="12-digit Aadhaar" />
        <Input label="Mother's Aadhaar Card No." name="motherAadharCard" value={form.motherAadharCard} onChange={set} numeric maxLength={12} placeholder="12-digit Aadhaar" />
        <Input label="APAAR ID No." name="apaarId" value={form.apaarId} onChange={set} numeric maxLength={12} placeholder="12-digit APAAR ID" />
        <Input label="PEN (Permanent Education Number)" name="penNo" value={form.penNo} onChange={set} maxLength={20} />
        <Input label="Board Enrollment No." name="boardEnrollNo" value={form.boardEnrollNo} onChange={set} maxLength={20} />
        <Input label="Ladli Laxmi Card No." name="ladliLaxmiNo" value={form.ladliLaxmiNo} onChange={set} maxLength={15} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Bank Name" name="bankName" value={form.bankName} onChange={set} />
          <Input label="IFSC Code" name="ifsc" value={form.ifsc} onChange={set} maxLength={11} placeholder="e.g. SBIN0010101" />
        </div>
        <Input label="Account Number" name="accountNumber" value={form.accountNumber} onChange={set} numeric maxLength={20} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Occupation" name="fatherOccupation" value={form.fatherOccupation} onChange={set} />
          <Input label="Income" name="fatherIncome" value={form.fatherIncome} onChange={set} />
        </div>
        <Input label="Previous School" name="previousSchool" value={form.previousSchool} onChange={set} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Dise Code" name="diseCode" value={form.diseCode || ''} onChange={set} />
          <Input label="Class (Previous)" name="previousClass" value={form.previousClass || ''} onChange={set} placeholder="e.g. 8th" />
        </div>
        <RadioGroup label="Result" name="previousResult" value={form.previousResult} options={['Pass', 'Fail']} />
        <Input label="Address" name="address" value={form.address} onChange={set} required placeholder="Full residential address" />
        <div className="pt-2 border-t border-gray-100">
          <button type="submit" disabled={isLoading} className="bg-blue-600 text-white px-8 py-2.5 rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition w-full sm:w-auto">
            {isLoading ? 'Registering...' : 'Register Student'}
          </button>
        </div>
      </div>
    </form>
  );
};

// ─── Default (Generic) Form — for all other schools ───────────────────────────

const DefaultForm = ({
  form, set, classes, sections, settings,
  openSections, toggle,
  dupCheck, dupStudent, handleDupBlur,
  photoPreview, fileInputRef, handlePhotoChange, setPhotoFile, setPhotoPreview,
  emailVerified, setEmailVerified, isLoading,
  handleSubmit,
}) => {
  return (
    <form onSubmit={handleSubmit}>
      <Section title="Academic Details" open={openSections.academic} onToggle={() => toggle('academic')} required>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select label="Class" name="classId" value={form.classId} onChange={set} required placeholder="Select Class" options={classes.map(c => ({ value: c._id, label: c.name }))} />
          <Select label="Section" name="sectionId" value={form.sectionId} onChange={set} required placeholder="Select Section" options={sections.map(s => ({ value: s._id, label: s.name }))} />
          {/* Stream — only for Class 11th / 12th */}
          {(() => {
            const selClass = classes.find(c => c._id === form.classId);
            const isHigher = selClass?.name?.includes('11th') || selClass?.name?.includes('12th');
            return isHigher ? (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Stream <span className="text-red-500">*</span></label>
                <select name="stream" value={form.stream} onChange={set} required className="w-full border border-blue-400 rounded-md px-3 py-2 text-sm bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Select Stream</option>
                  <option value="Science">Science (₹19,200)</option>
                  <option value="Commerce">Commerce (₹18,500)</option>
                  <option value="Arts">Arts</option>
                </select>
              </div>
            ) : null;
          })()}
          <Input label="Admission Number" name="admissionNumber" value={form.admissionNumber} onChange={set}
            readOnly={settings.autoGenerateAdmissionNo} placeholder={settings.autoGenerateAdmissionNo ? 'Auto-generated' : 'Enter manually'}
            onBlur={!settings.autoGenerateAdmissionNo ? (e) => handleDupBlur('admissionNumber', e.target.value) : undefined} />
          {dupStudent && dupCheck.field === 'admissionNumber' && (
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800">
                ⚠️ <strong>Already assigned:</strong> {dupStudent.firstName} {dupStudent.lastName} — Class {dupStudent.classId?.name} {dupStudent.sectionId?.name} (Roll: {dupStudent.rollNo || '—'})
              </div>
            </div>
          )}
          <Input label="Roll Number" name="rollNo" value={form.rollNo} onChange={set}
            readOnly={settings.autoGenerateRollNo} placeholder={settings.autoGenerateRollNo ? 'Auto-generated' : 'Enter manually'}
            onBlur={!settings.autoGenerateRollNo ? (e) => handleDupBlur('rollNo', e.target.value, { classId: form.classId, sectionId: form.sectionId }) : undefined} />
          {dupStudent && dupCheck.field === 'rollNo' && (
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800">
                ⚠️ <strong>Already assigned:</strong> {dupStudent.firstName} {dupStudent.lastName} — Class {dupStudent.classId?.name} {dupStudent.sectionId?.name} (Adm: {dupStudent.admissionNumber || '—'})
              </div>
            </div>
          )}
          <Input label="Student ID" name="studentId" value={form.studentId} onChange={set}
            readOnly={settings.autoGenerateStudentId} placeholder={settings.autoGenerateStudentId ? 'Auto-generated' : 'Enter manually'} />
          <div className="relative">
            <Input label="Scholar Number" name="scholarNo" value={form.scholarNo} onChange={set}
              placeholder="e.g. SCH-2025-001"
              onBlur={(e) => handleDupBlur('scholarNo', e.target.value)} />
            {dupStudent && dupCheck.field === 'scholarNo' && (
              <div className="mt-1 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800">
                ⚠️ <strong>Already assigned:</strong> {dupStudent.firstName} {dupStudent.lastName} — Class {dupStudent.classId?.name} {dupStudent.sectionId?.name}
              </div>
            )}
          </div>
          <Input label="SRN No." name="srnNo" value={form.srnNo} onChange={set} placeholder="State Registration No." />
          <Input label="PEN No." name="penNo" value={form.penNo} onChange={set} placeholder="Permanent Education Number" />
          <Input label="Admission Date" name="admissionDate" type="date" value={form.admissionDate} onChange={set} />
        </div>
        {(settings.autoGenerateAdmissionNo || settings.autoGenerateRollNo || settings.autoGenerateStudentId) && (
          <p className="mt-3 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">Grayed-out fields will be auto-generated by the system.</p>
        )}
      </Section>

      <Section title="Personal Details" open={openSections.personal} onToggle={() => toggle('personal')} required>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Profile Photo Upload */}
          <div className="sm:col-span-2 lg:col-span-3 mb-2">
            <label className="block text-xs font-medium text-gray-500 mb-2">Profile Photo</label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden ${photoPreview ? 'border-blue-500' : 'border-gray-300 hover:border-blue-400'}`}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </button>
                {photoPreview && (
                  <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="text-sm text-red-500 hover:text-red-600 font-medium ml-3">
                    Remove
                  </button>
                )}
                <p className="text-xs text-gray-400 mt-1">Max 2MB, JPG/PNG</p>
              </div>
            </div>
          </div>

          <Select label="Salutation" name="salutation" value={form.salutation} onChange={set} placeholder="Select" options={[{ value: 'Master', label: 'Master' }, { value: 'Mr', label: 'Mr.' }, { value: 'Ms', label: 'Ms.' }]} />
          <Input label="First Name" name="firstName" value={form.firstName} onChange={set} required />
          <Input label="Middle Name" name="middleName" value={form.middleName} onChange={set} />
          <Input label="Last Name" name="lastName" value={form.lastName} onChange={set} />
          <Input label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={set} required />
          <Select label="Gender" name="gender" value={form.gender} onChange={set} placeholder="Select" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
          <Input label="Phone (Mobile 1)" name="phone" value={form.phone} onChange={set} />
          <Input label="WhatsApp No." name="whatsappNo" value={form.whatsappNo} onChange={set} />
          <Input label="Alternate Number" name="alternateNumber" value={form.alternateNumber} onChange={set} />
          <div className="sm:col-span-2 lg:col-span-3"><Input label="Address" name="address" value={form.address} onChange={set} required /></div>
          <Input label="City" name="city" value={form.city} onChange={set} />
          <Input label="State" name="state" value={form.state} onChange={set} />
          <Input label="Pincode" name="pincode" value={form.pincode} onChange={set} />
          <Input label="Nationality" name="nationality" value={form.nationality} onChange={set} />
        </div>
      </Section>

      <Section title="Parent / Guardian" open={openSections.parent} onToggle={() => toggle('parent')} required>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Father */}
          <div className="sm:col-span-2 lg:col-span-3"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Father's Details</p></div>
          <Input label="Father's Name" name="fatherName" value={form.fatherName} onChange={set} required />
          <Input label="Father's Phone (Mobile 1)" name="fatherPhone" value={form.fatherPhone} onChange={set} required />
          <Input label="Father's Email" name="fatherEmail" type="email" value={form.fatherEmail} onChange={set} />
          <Input label="Father's Occupation" name="fatherOccupation" value={form.fatherOccupation} onChange={set} />
          <Input label="Father's Qualification" name="fatherQualification" value={form.fatherQualification} onChange={set} />
          <Input label="Father's Annual Income" name="fatherIncome" value={form.fatherIncome} onChange={set} />
          <Input label="Father's Aadhaar Card No." name="fatherAadharCard" value={form.fatherAadharCard} onChange={set} placeholder="Father's 12-digit Aadhaar" />
          {/* Mother */}
          <div className="sm:col-span-2 lg:col-span-3 border-t pt-3 mt-1"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mother's Details</p></div>
          <Input label="Mother's Name" name="motherName" value={form.motherName} onChange={set} />
          <Input label="Mother's Phone (Mobile 2)" name="motherPhone" value={form.motherPhone} onChange={set} />
          <Input label="Mother's Email" name="motherEmail" type="email" value={form.motherEmail} onChange={set} />
          <Input label="Mother's Occupation" name="motherOccupation" value={form.motherOccupation} onChange={set} />
          <Input label="Mother's Qualification" name="motherQualification" value={form.motherQualification} onChange={set} />
          <Input label="Mother's Aadhaar Card No." name="motherAadharCard" value={form.motherAadharCard} onChange={set} placeholder="Mother's 12-digit Aadhaar" />
          {/* Guardian */}
          <div className="sm:col-span-2 lg:col-span-3 border-t pt-3 mt-1"><p className="text-xs text-gray-400">Guardian (if different from parents)</p></div>
          <Input label="Guardian Name" name="guardianName" value={form.guardianName} onChange={set} />
          <Input label="Guardian Phone" name="guardianPhone" value={form.guardianPhone} onChange={set} />
          <Input label="Guardian Relation" name="guardianRelation" value={form.guardianRelation} onChange={set} />
          <Input label="Guardian Email" name="guardianEmail" type="email" value={form.guardianEmail} onChange={set} />
          <Input label="Guardian Qualification" name="guardianQualification" value={form.guardianQualification} onChange={set} />
          <Input label="Guardian Income" name="guardianIncome" value={form.guardianIncome} onChange={set} />
          <Input label="Guardian Aadhaar Card No." name="guardianAadharCard" value={form.guardianAadharCard} onChange={set} />
        </div>
      </Section>

      <Section title="Identity & Category" open={openSections.identity} onToggle={() => toggle('identity')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input label="Aadhar Card No." name="aadharCard" value={form.aadharCard} onChange={set} />
          <Input label="Samagra ID (SSM ID)" name="ssmId" value={form.ssmId} onChange={set} placeholder="Samagra / SSSM ID" />
          <Input label="Govt. Family ID" name="familyId" value={form.familyId} onChange={set} />
          <Select label="Category" name="category" value={form.category} onChange={set} placeholder="Select" options={['General', 'OBC', 'SC', 'ST', 'EWS'].map(v => ({ value: v, label: v }))} />
          <Input label="Religion" name="religion" value={form.religion} onChange={set} />
          <Input label="Caste" name="caste" value={form.caste} onChange={set} />
          <Input label="Mother Tongue" name="motherTongue" value={form.motherTongue} onChange={set} />
          <Input label="Place of Birth" name="placeOfBirth" value={form.placeOfBirth} onChange={set} />
          <Select label="Blood Group" name="bloodGroup" value={form.bloodGroup} onChange={set} placeholder="Select" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => ({ value: v, label: v }))} />
          <Input label="APAAR ID (ABC ID)" name="apaarId" value={form.apaarId} onChange={set} placeholder="Academic Bank of Credits ID" />
          <div className="flex items-center gap-2 pt-5">
            <input id="rte" name="rte" type="checkbox" checked={form.rte} onChange={set} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label htmlFor="rte" className="text-sm text-gray-700">RTE (Right to Education)</label>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input id="bplStudent" name="bplStudent" type="checkbox" checked={form.bplStudent} onChange={set} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label htmlFor="bplStudent" className="text-sm text-gray-700">BPL Student</label>
          </div>
          {form.bplStudent && <Input label="BPL Card No." name="bplCardNo" value={form.bplCardNo} onChange={set} placeholder="BPL card number" />}
          <div className="sm:col-span-2 lg:col-span-3 border-t pt-3 mt-1"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Caste Certificate</p></div>
          <Input label="Caste Certificate No." name="casteApplicationNo" value={form.casteApplicationNo} onChange={set} />
          <Input label="Caste Certificate Date" name="casteApplicationDate" type="date" value={form.casteApplicationDate} onChange={set} />
        </div>
      </Section>

      <Section title="Government Scheme IDs" open={openSections.govtSchemes} onToggle={() => toggle('govtSchemes')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input label="Scholarship ID" name="scholarshipId" value={form.scholarshipId} onChange={set} />
          <Input label="Domicile Application No." name="domicileApplicationNo" value={form.domicileApplicationNo} onChange={set} />
          <Input label="RTE Application No." name="rteApplicationNo" value={form.rteApplicationNo} onChange={set} />
          <Input label="Board Enroll No." name="boardEnrollNo" value={form.boardEnrollNo} onChange={set} placeholder="Board/State enrollment number" />
          <Input label="Ladli Laxmi No." name="ladliLaxmiNo" value={form.ladliLaxmiNo} onChange={set} placeholder="Ladli Laxmi Yojana No." />
        </div>
      </Section>

      <Section title="Previous School" open={openSections.prevSchool} onToggle={() => toggle('prevSchool')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Previous School Name" name="previousSchool" value={form.previousSchool} onChange={set} />
          <Input label="Previous Class" name="previousClass" value={form.previousClass} onChange={set} />
        </div>
      </Section>

      <Section title="Health Information" open={openSections.health} onToggle={() => toggle('health')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Health Issues" name="healthIssues" value={form.healthIssues} onChange={set} />
          <Input label="Allergies" name="allergies" value={form.allergies} onChange={set} />
          <Input label="Medications" name="medications" value={form.medications} onChange={set} />
          <Input label="Disability Type" name="disabilityType" value={form.disabilityType} onChange={set} />
        </div>
      </Section>

      <Section title="Bank Details" open={openSections.bank} onToggle={() => toggle('bank')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Account Number" name="accountNumber" value={form.accountNumber} onChange={set} />
          <Input label="Bank Name" name="bankName" value={form.bankName} onChange={set} />
          <Input label="IFSC Code" name="ifsc" value={form.ifsc} onChange={set} />
          <Input label="Branch Name" name="branchName" value={form.branchName} onChange={set} />
        </div>
      </Section>

      <Section title="Transport & Hostel" open={openSections.transport} onToggle={() => toggle('transport')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <input name="transportRequired" type="checkbox" checked={form.transportRequired} onChange={set} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label className="text-sm text-gray-700">Transport Required</label>
          </div>
          {form.transportRequired && <>
            <Input label="Pickup Point" name="pickupPoint" value={form.pickupPoint} onChange={set} />
            <Input label="Route No." name="routeNo" value={form.routeNo} onChange={set} />
          </>}
          <div className="flex items-center gap-2">
            <input name="hostelRequired" type="checkbox" checked={form.hostelRequired} onChange={set} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label className="text-sm text-gray-700">Hostel Required</label>
          </div>
          {form.hostelRequired && <Input label="Room No." name="roomNo" value={form.roomNo} onChange={set} />}
        </div>
      </Section>

      <Section title="Emergency Contact" open={openSections.emergency} onToggle={() => toggle('emergency')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Name" name="emergencyContactName" value={form.emergencyContactName} onChange={set} />
          <Input label="Phone" name="emergencyContactPhone" value={form.emergencyContactPhone} onChange={set} />
          <Input label="Relation" name="emergencyContactRelation" value={form.emergencyContactRelation} onChange={set} />
        </div>
      </Section>

      <Section title="Login Account (Optional)" open={openSections.account} onToggle={() => toggle('account')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EmailOtpVerifier
            email={form.email}
            onEmailChange={set}
            onVerified={() => setEmailVerified(true)}
            disabled={isLoading}
          />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2.5">Default: Date of Birth (DDMMYYYY)</p>
          </div>
        </div>
      </Section>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">Remarks</label>
        <textarea name="remarks" value={form.remarks} onChange={set} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Any additional notes..." />
      </div>

      <button type="submit" disabled={isLoading} className="bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition w-full sm:w-auto">
        {isLoading ? 'Registering...' : 'Register Student'}
      </button>
    </form>
  );
};

// ─── Main RegisterStudent Component ───────────────────────────────────────────

const RegisterStudent = () => {
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;
  const { data: classData } = useGetClassesQuery(sessionId, { skip: !sessionId });
  const [selectedClass, setSelectedClass] = useState('');
  const { data: sectionData } = useGetSectionsQuery({ classId: selectedClass, session: sessionId }, { skip: !sessionId || !selectedClass });
  const { data: settingsData } = useGetSchoolSettingsQuery();
  const { data: formSettingsData } = useGetAdmissionFormSettingsQuery();
  const [registerStudent, { isLoading }] = useRegisterStudentMutation();
  const [uploadStudentPhoto] = useUploadStudentPhotoMutation();

  const classes = classData?.data || [];
  const sections = sectionData?.data || [];
  const settings = settingsData?.data || {};

  // ── Detect HMHSS00022 custom layout ───────────────────────────────────────
  // registrationFormConfig is seeded with 37 fields for HMHSS00022 only.
  // If it has entries → use the custom flat form. If empty → use DefaultForm.
  const registrationFormConfig = formSettingsData?.data?.registrationFormConfig || [];
  const isHMHSS00022 = registrationFormConfig.length > 0;

  const [form, setForm] = useState(initialForm);
  const [openSections, setOpenSections] = useState({
    academic: true,
    personal: true,
    parent: true,
    address: true,
    govtSchemes: true,
    bank: true,
    prevSchool: true,
    identity: false,
    health: false,
    transport: false,
    emergency: false,
    account: false,
  });
  const [successData, setSuccessData] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Duplicate field check
  const [dupCheck, setDupCheck] = useState({ field: null, value: null, classId: null, sectionId: null });
  const { data: dupData } = useCheckDuplicateFieldQuery(
    { field: dupCheck.field, value: dupCheck.value, classId: dupCheck.classId, sectionId: dupCheck.sectionId },
    { skip: !dupCheck.field || !dupCheck.value }
  );
  const dupStudent = dupData?.exists ? dupData.data : null;

  const handleDupBlur = (field, value, extra = {}) => {
    if (value && value.trim()) setDupCheck({ field, value: value.trim(), classId: extra.classId || null, sectionId: extra.sectionId || null });
    else setDupCheck({ field: null, value: null, classId: null, sectionId: null });
  };

  const toggle = (key) => setOpenSections(p => ({ ...p, [key]: !p[key] }));
  const set = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'classId') setSelectedClass(value);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo size should be less than 2MB');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.dateOfBirth || !form.fatherName || !form.fatherPhone || !form.classId || !form.sectionId || !form.address) {
      toast.error('Please fill all mandatory fields: Name, DOB, Father Name, Father Phone, Class, Section, Address');
      return;
    }
    // If email is provided, it must be verified
    if (form.email && !emailVerified) {
      toast.error('You entered an email — please verify it with OTP before registering');
      return;
    }
    try {
      // Normalize boolean fields before sending (radio inputs store 'Yes'/'No' strings)
      const payload = {
        ...form,
        session: sessionId,
        rte: form.rte === true || form.rte === 'Yes',
        bplStudent: form.bplStudent === true || form.bplStudent === 'Yes',
      };
      const res = await registerStudent(payload).unwrap();

      // Upload photo if selected
      if (photoFile && res.data?.profile?._id) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        try {
          await uploadStudentPhoto({ id: res.data.profile._id, formData }).unwrap();
          toast.success('Photo uploaded successfully');
        } catch (photoErr) {
          console.error('Photo upload failed:', photoErr);
          toast.error('Photo upload failed, but student was registered');
        }
      }

      toast.success(res.message);
      setSuccessData(res.data);
      setForm(initialForm);
      setSelectedClass('');
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) { toast.error(err?.data?.message || 'Registration failed'); }
  };

  if (!sessionId) return <div className="text-center py-12 text-gray-500">Activate an academic session first.</div>;

  if (successData) {
    const c = successData.credentials;
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
              <div>
                <h2 className="text-lg font-semibold">Student Registered</h2>
                <p className="text-blue-100 text-sm">Save these credentials</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {[['Admission No', c.admissionNumber], ['Roll No', c.rollNo], ['Student ID', c.studentId], ['Login Email', c.loginEmail], ['Password', c.password]].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500">{k}</span>
                <span className={`text-sm font-medium ${k === 'Password' ? 'text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded' : 'text-gray-900'}`}>{v || '—'}</span>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6">
            <button onClick={() => setSuccessData(null)} className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 transition">Register Another Student</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Shared props passed to both form variants ─────────────────────────────
  const formProps = {
    form, set, classes, sections, settings,
    openSections, toggle,
    dupCheck, dupStudent, handleDupBlur,
    photoPreview, fileInputRef, handlePhotoChange, setPhotoFile, setPhotoPreview,
    emailVerified, setEmailVerified, isLoading,
    handleSubmit,
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Register Student</h1>
        <p className="text-sm text-gray-500 mt-1">Fields marked <span className="text-red-500">*</span> are mandatory</p>
        {isHMHSS00022 && (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Custom layout active — HMHSS00022
          </div>
        )}
      </div>

      {/* Render school-specific form or default form */}
      {isHMHSS00022
        ? <HMHSS00022Form {...formProps} />
        : <DefaultForm {...formProps} />
      }
    </div>
  );
};

export default RegisterStudent;
