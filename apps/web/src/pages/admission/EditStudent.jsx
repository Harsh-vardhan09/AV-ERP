import React, { useState, useEffect } from 'react';
import { useGetStudentDetailsQuery, useUpdateStudentDetailsMutation } from '../../redux/api/admissionApi';
import { useGetClassesQuery, useGetSectionsQuery, useGetActiveSessionQuery } from '../../redux/api/adminApi';
import toast from 'react-hot-toast';

const Input = ({ label, required, ...props }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    <input {...props} required={required} className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none ${props.readOnly ? 'bg-gray-100 text-gray-500' : 'bg-white'}`} />
  </div>
);

const Select = ({ label, required, options = [], placeholder, ...props }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    <select {...props} required={required} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
    <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">{title}</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
  </div>
);

const Divider = ({ label }) => (
  <div className="sm:col-span-2 lg:col-span-3 border-t pt-3 mt-1">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
  </div>
);

const EditStudent = ({ studentId, onClose }) => {
  const { data, isLoading } = useGetStudentDetailsQuery(studentId, { skip: !studentId });
  const [updateStudent, { isLoading: saving }] = useUpdateStudentDetailsMutation();
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;
  const [selectedClass, setSelectedClass] = useState('');
  const { data: classData } = useGetClassesQuery(sessionId, { skip: !sessionId });
  const { data: sectionData } = useGetSectionsQuery({ classId: selectedClass, session: sessionId }, { skip: !selectedClass || !sessionId });
  const classes = classData?.data || [];
  const sections = sectionData?.data || [];

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (data?.data) {
      const s = data.data;
      setSelectedClass(s.classId?._id || '');
      setForm({
        // Academic
        firstName: s.firstName || '',
        middleName: s.middleName || '',
        lastName: s.lastName || '',
        dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '',
        gender: s.gender || '',
        phone: s.phone || '',
        whatsappNo: s.whatsappNo || '',
        alternateNumber: s.alternateNumber || '',
        rollNo: s.rollNo || '',
        admissionNumber: s.admissionNumber || '',
        studentId: s.studentId || '',
        scholarNo: s.scholarNo || '',
        srnNo: s.srnNo || '',
        pen: s.pen || s.penNo || '',
        admissionDate: s.admissionDate ? s.admissionDate.slice(0, 10) : '',
        // Address
        address: s.address?.addressLine1 || s.address || '',
        addressLine2: s.addressLine2 || '',
        city: s.city || '',
        state: s.state || '',
        pincode: s.pincode || '',
        // Class / Section
        classId: s.classId?._id || '',
        sectionId: s.sectionId?._id || '',
        // Identity
        nationality: s.nationality || 'Indian',
        religion: s.religion || '',
        caste: s.caste || '',
        category: s.category || '',
        bloodGroup: s.bloodGroup || '',
        motherTongue: s.motherTongue || '',
        placeOfBirth: s.placeOfBirth || '',
        aadharCard: s.aadharCard || '',
        ssmId: s.ssmId || '',
        familyId: s.familyId || '',
        apaarId: s.apaarId || '',
        rte: s.rte || false,
        bplStudent: s.bplStudent || false,
        bplCardNo: s.bplCardNo || '',
        // Caste Certificate
        casteApplicationNo: s.casteApplicationNo || '',
        casteApplicationDate: s.casteApplicationDate ? s.casteApplicationDate.slice(0, 10) : '',
        // Government Schemes
        boardEnrollNo: s.boardEnrollNo || '',
        ladliLaxmiNo: s.ladliLaxmiNo || '',
        scholarshipId: s.scholarshipId || '',
        domicileApplicationNo: s.domicileApplicationNo || '',
        rteApplicationNo: s.rteApplicationNo || '',
        // Previous School
        previousSchool: s.previousSchool || '',
        previousClass: s.previousClass || '',
        stream: s.stream || '',
        fatherName: s.parentDetails?.father?.name || '',
        fatherPhone: s.parentDetails?.father?.phone || '',
        fatherOccupation: s.parentDetails?.father?.occupation || '',
        fatherQualification: s.parentDetails?.father?.qualification || '',
        fatherEmail: s.parentDetails?.father?.email || '',
        fatherIncome: s.parentDetails?.father?.annualIncome || '',
        fatherAadharCard: s.fatherAadharCard || '',
        // Parent — Mother
        motherName: s.parentDetails?.mother?.name || '',
        motherPhone: s.parentDetails?.mother?.phone || '',
        motherOccupation: s.parentDetails?.mother?.occupation || '',
        motherQualification: s.parentDetails?.mother?.qualification || '',
        motherEmail: s.parentDetails?.mother?.email || '',
        motherAadharCard: s.motherAadharCard || '',
        // Guardian
        guardianName: s.parentDetails?.guardian?.name || '',
        guardianPhone: s.parentDetails?.guardian?.phone || '',
        guardianRelation: s.parentDetails?.guardian?.relation || '',
        guardianQualification: s.parentDetails?.guardian?.qualification || '',
        guardianIncome: s.parentDetails?.guardian?.income || '',
        guardianAadharCard: s.guardianAadharCard || '',
        // Emergency
        emergencyContactName: s.emergencyContact?.name || '',
        emergencyContactPhone: s.emergencyContact?.phone || '',
        emergencyContactRelation: s.emergencyContact?.relation || '',
        // Bank
        accountNumber: s.bankDetails?.accountNumber || '',
        bankName: s.bankDetails?.bankName || '',
        ifsc: s.bankDetails?.ifsc || '',
        branchName: s.bankDetails?.branchName || '',
        // Health
        healthIssues: s.healthInfo?.healthIssues || '',
        allergies: s.healthInfo?.allergies || '',
        medications: s.healthInfo?.medications || '',
        disabilityType: s.healthInfo?.disabilityType || '',
        // Other
        remarks: s.remarks || '',
      });
    }
  }, [data]);

  const set = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'classId') setSelectedClass(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Build nested update payload that matches how the controller stores it
      const payload = {
        ...form,
        parentDetails: {
          father: {
            name: form.fatherName,
            phone: form.fatherPhone,
            occupation: form.fatherOccupation,
            qualification: form.fatherQualification,
            email: form.fatherEmail,
            annualIncome: form.fatherIncome,
          },
          mother: {
            name: form.motherName,
            phone: form.motherPhone,
            occupation: form.motherOccupation,
            qualification: form.motherQualification,
            email: form.motherEmail,
          },
          guardian: {
            name: form.guardianName,
            phone: form.guardianPhone,
            relation: form.guardianRelation,
            qualification: form.guardianQualification,
            income: form.guardianIncome,
          },
        },
        emergencyContact: {
          name: form.emergencyContactName,
          phone: form.emergencyContactPhone,
          relation: form.emergencyContactRelation,
        },
        bankDetails: {
          accountNumber: form.accountNumber,
          bankName: form.bankName,
          ifsc: form.ifsc,
          branchName: form.branchName,
        },
        healthInfo: {
          healthIssues: form.healthIssues,
          allergies: form.allergies,
          medications: form.medications,
          disabilityType: form.disabilityType,
        },
        // pen stored in both keys for alias compatibility
        penNo: form.pen,
      };
      await updateStudent({ id: studentId, ...payload }).unwrap();
      toast.success('Student updated successfully');
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Update failed');
    }
  };

  if (isLoading || !form) return (
    <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-gray-50 w-full max-w-4xl rounded-xl shadow-xl max-h-[95vh] flex flex-col">
        {/* Sticky Header */}
        <div className="bg-white border-b border-gray-200 px-5 py-4 rounded-t-xl flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Edit Student — {form.firstName} {form.lastName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Admission No: {data?.data?.admissionNumber || '—'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-5 space-y-4">

            <Section title="Academic Details">
              <Select label="Class" name="classId" value={form.classId} onChange={set} required placeholder="Select Class" options={classes.map(c => ({ value: c._id, label: c.name }))} />
              <Select label="Section" name="sectionId" value={form.sectionId} onChange={set} required placeholder="Select Section" options={sections.map(s => ({ value: s._id, label: s.name }))} />
              <Input label="Admission Number" name="admissionNumber" value={form.admissionNumber} onChange={set} readOnly />
              <Input label="Roll Number" name="rollNo" value={form.rollNo} onChange={set} />
              <Input label="Student ID" name="studentId" value={form.studentId} onChange={set} />
              <Input label="Scholar Number" name="scholarNo" value={form.scholarNo} onChange={set} />
              <Input label="SRN No." name="srnNo" value={form.srnNo} onChange={set} />
              <Input label="PEN (Permanent Education No.)" name="pen" value={form.pen} onChange={set} />
              <Input label="Admission Date" name="admissionDate" type="date" value={form.admissionDate} onChange={set} />
            </Section>

            {/* Personal */}
            <Section title="Personal Details">
              <Input label="First Name" name="firstName" value={form.firstName} onChange={set} required />
              <Input label="Middle Name" name="middleName" value={form.middleName} onChange={set} />
              <Input label="Last Name" name="lastName" value={form.lastName} onChange={set} />
              <Input label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={set} />
              <Select label="Gender" name="gender" value={form.gender} onChange={set} placeholder="Select" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
              <Input label="Phone" name="phone" value={form.phone} onChange={set} />
              <Input label="WhatsApp No." name="whatsappNo" value={form.whatsappNo} onChange={set} />
              <Input label="Alternate Number" name="alternateNumber" value={form.alternateNumber} onChange={set} />
              <div className="sm:col-span-2 lg:col-span-3"><Input label="Address" name="address" value={form.address} onChange={set} /></div>
              <Input label="Address Line 2" name="addressLine2" value={form.addressLine2} onChange={set} />
              <Input label="City" name="city" value={form.city} onChange={set} />
              <Input label="State" name="state" value={form.state} onChange={set} />
              <Input label="Pincode" name="pincode" value={form.pincode} onChange={set} />
              <Input label="Place of Birth" name="placeOfBirth" value={form.placeOfBirth} onChange={set} />
              <Input label="Nationality" name="nationality" value={form.nationality} onChange={set} />
              <Input label="Religion" name="religion" value={form.religion} onChange={set} />
              <Input label="Caste" name="caste" value={form.caste} onChange={set} />
              <Select label="Category" name="category" value={form.category} onChange={set} placeholder="Select" options={['General','OBC','SC','ST','EWS'].map(v => ({ value: v, label: v }))} />
              <Select label="Blood Group" name="bloodGroup" value={form.bloodGroup} onChange={set} placeholder="Select" options={['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v }))} />
              <Input label="Mother Tongue" name="motherTongue" value={form.motherTongue} onChange={set} />
            </Section>

            {/* Identity & Government IDs */}
            <Section title="Identity &amp; Government IDs">
              <Input label="Aadhaar Card No." name="aadharCard" value={form.aadharCard} onChange={set} placeholder="12-digit Aadhaar" />
              <Input label="Samagra ID (SSM ID)" name="ssmId" value={form.ssmId} onChange={set} />
              <Input label="Family ID" name="familyId" value={form.familyId} onChange={set} />
              <Input label="APAAR ID (ABC ID)" name="apaarId" value={form.apaarId} onChange={set} placeholder="Academic Bank of Credits ID" />
              <div className="flex items-center gap-2 pt-5">
                <input id="rteEdit" name="rte" type="checkbox" checked={form.rte} onChange={set} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                <label htmlFor="rteEdit" className="text-sm text-gray-700">RTE (Right to Education)</label>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input id="bplEdit" name="bplStudent" type="checkbox" checked={form.bplStudent} onChange={set} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                <label htmlFor="bplEdit" className="text-sm text-gray-700">BPL Student</label>
              </div>
              {form.bplStudent && <Input label="BPL Card No." name="bplCardNo" value={form.bplCardNo} onChange={set} />}
              <Divider label="Caste Certificate" />
              <Input label="Caste Certificate No." name="casteApplicationNo" value={form.casteApplicationNo} onChange={set} />
              <Input label="Caste Certificate Date" name="casteApplicationDate" type="date" value={form.casteApplicationDate} onChange={set} />
            </Section>

            {/* Government Schemes */}
            <Section title="Government Scheme IDs">
              <Input label="Board Enroll No." name="boardEnrollNo" value={form.boardEnrollNo} onChange={set} />
              <Input label="Ladli Laxmi No." name="ladliLaxmiNo" value={form.ladliLaxmiNo} onChange={set} />
              <Input label="Scholarship ID" name="scholarshipId" value={form.scholarshipId} onChange={set} />
              <Input label="Domicile Application No." name="domicileApplicationNo" value={form.domicileApplicationNo} onChange={set} />
              <Input label="RTE Application No." name="rteApplicationNo" value={form.rteApplicationNo} onChange={set} />
            </Section>

            {/* Previous School */}
            <Section title="Previous School">
              <Input label="Previous School Name" name="previousSchool" value={form.previousSchool} onChange={set} />
              <Input label="Previous Class" name="previousClass" value={form.previousClass} onChange={set} />
            </Section>

            {/* Parent / Guardian */}
            <Section title="Parent / Guardian">
              <Divider label="Father's Details" />
              <Input label="Father's Name" name="fatherName" value={form.fatherName} onChange={set} />
              <Input label="Father's Phone" name="fatherPhone" value={form.fatherPhone} onChange={set} />
              <Input label="Father's Occupation" name="fatherOccupation" value={form.fatherOccupation} onChange={set} />
              <Input label="Father's Qualification" name="fatherQualification" value={form.fatherQualification} onChange={set} />
              <Input label="Father's Annual Income" name="fatherIncome" value={form.fatherIncome} onChange={set} />
              <Input label="Father's Email" name="fatherEmail" value={form.fatherEmail} onChange={set} type="email" />
              <Input label="Father's Aadhaar Card No." name="fatherAadharCard" value={form.fatherAadharCard} onChange={set} placeholder="Father's 12-digit Aadhaar" />
              <Divider label="Mother's Details" />
              <Input label="Mother's Name" name="motherName" value={form.motherName} onChange={set} />
              <Input label="Mother's Phone" name="motherPhone" value={form.motherPhone} onChange={set} />
              <Input label="Mother's Occupation" name="motherOccupation" value={form.motherOccupation} onChange={set} />
              <Input label="Mother's Qualification" name="motherQualification" value={form.motherQualification} onChange={set} />
              <Input label="Mother's Email" name="motherEmail" value={form.motherEmail} onChange={set} type="email" />
              <Input label="Mother's Aadhaar Card No." name="motherAadharCard" value={form.motherAadharCard} onChange={set} placeholder="Mother's 12-digit Aadhaar" />
              <Divider label="Guardian (if different from parents)" />
              <Input label="Guardian Name" name="guardianName" value={form.guardianName} onChange={set} />
              <Input label="Guardian Phone" name="guardianPhone" value={form.guardianPhone} onChange={set} />
              <Input label="Guardian Relation" name="guardianRelation" value={form.guardianRelation} onChange={set} />
              <Input label="Guardian Qualification" name="guardianQualification" value={form.guardianQualification} onChange={set} />
              <Input label="Guardian Income" name="guardianIncome" value={form.guardianIncome} onChange={set} />
              <Input label="Guardian Aadhaar Card No." name="guardianAadharCard" value={form.guardianAadharCard} onChange={set} />
            </Section>

            {/* Emergency Contact */}
            <Section title="Emergency Contact">
              <Input label="Name" name="emergencyContactName" value={form.emergencyContactName} onChange={set} />
              <Input label="Phone" name="emergencyContactPhone" value={form.emergencyContactPhone} onChange={set} />
              <Input label="Relation" name="emergencyContactRelation" value={form.emergencyContactRelation} onChange={set} />
            </Section>

            {/* Bank Details */}
            <Section title="Bank Details">
              <Input label="Account Number" name="accountNumber" value={form.accountNumber} onChange={set} />
              <Input label="Bank Name" name="bankName" value={form.bankName} onChange={set} />
              <Input label="IFSC Code" name="ifsc" value={form.ifsc} onChange={set} />
              <Input label="Branch Name" name="branchName" value={form.branchName} onChange={set} />
            </Section>

            {/* Health Information */}
            <Section title="Health Information">
              <Input label="Health Issues" name="healthIssues" value={form.healthIssues} onChange={set} />
              <Input label="Allergies" name="allergies" value={form.allergies} onChange={set} />
              <Input label="Medications" name="medications" value={form.medications} onChange={set} />
              <Input label="Disability Type" name="disabilityType" value={form.disabilityType} onChange={set} />
            </Section>

            {/* Remarks */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Remarks</label>
              <textarea name="remarks" value={form.remarks} onChange={set} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={onClose} className="border border-gray-300 text-gray-700 px-5 py-2 rounded-md text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditStudent;
