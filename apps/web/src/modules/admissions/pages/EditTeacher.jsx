import React, { useState, useEffect } from 'react';
import { useGetTeacherDetailsQuery, useUpdateTeacherDetailsMutation } from '../api/admissionApi';
import toast from 'react-hot-toast';

const Input = ({ label, required, ...props }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    <input {...props} required={required} className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none ${props.readOnly ? 'bg-gray-100 text-gray-500' : 'bg-white'}`} />
  </div>
);

const Select = ({ label, options = [], placeholder, ...props }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    <select {...props} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
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

const EditTeacher = ({ teacherId, onClose }) => {
  const { data, isLoading } = useGetTeacherDetailsQuery(teacherId, { skip: !teacherId });
  const [updateTeacher, { isLoading: saving }] = useUpdateTeacherDetailsMutation();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (data?.data) {
      const t = data.data;
      setForm({
        firstName: t.firstName || '',
        middleName: t.middleName || '',
        lastName: t.lastName || '',
        dateOfBirth: t.dateOfBirth ? t.dateOfBirth.slice(0, 10) : '',
        gender: t.gender || '',
        phone: t.phone || '',
        alternatePhone: t.alternatePhone || '',
        address: t.address || '',
        addressLine2: t.addressLine2 || '',
        city: t.city || '',
        state: t.state || '',
        pincode: t.pincode || '',
        aadharCard: t.aadharCard || '',
        panCard: t.panCard || '',
        nationality: t.nationality || 'Indian',
        religion: t.religion || '',
        caste: t.caste || '',
        category: t.category || '',
        maritalStatus: t.maritalStatus || '',
        bloodGroup: t.bloodGroup || '',
        motherTongue: t.motherTongue || '',
        qualification: t.qualification || '',
        specialization: t.specialization || '',
        experience: t.experience || '',
        department: t.department || '',
        designation: t.designation || '',
        joiningDate: t.joiningDate ? t.joiningDate.slice(0, 10) : '',
        fatherName: t.familyDetails?.fatherName || '',
        fatherPhone: t.familyDetails?.fatherPhone || '',
        motherName: t.familyDetails?.motherName || '',
        motherPhone: t.familyDetails?.motherPhone || '',
        spouseName: t.familyDetails?.spouseName || '',
        spousePhone: t.familyDetails?.spousePhone || '',
        accountNumber: t.bankDetails?.accountNumber || '',
        bankName: t.bankDetails?.bankName || '',
        ifsc: t.bankDetails?.ifsc || '',
        branchName: t.bankDetails?.branchName || '',
        salaryBasic: t.salary?.basic || '',
        salaryHra: t.salary?.hra || '',
        salaryTransport: t.salary?.transport || '',
        salaryTotal: t.salary?.total || '',
        emergencyName: t.emergencyContact?.name || '',
        emergencyPhone: t.emergencyContact?.phone || '',
        emergencyRelation: t.emergencyContact?.relation || '',
        remarks: t.remarks || '',
      });
    }
  }, [data]);

  const set = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateTeacher({ id: teacherId, ...form }).unwrap();
      toast.success('Teacher updated successfully');
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Update failed');
    }
  };

  if (isLoading || !form) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const t = data?.data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-gray-50 w-full max-w-4xl rounded-xl shadow-xl max-h-[95vh] flex flex-col">
        {/* Sticky Header */}
        <div className="bg-white border-b border-gray-200 px-5 py-4 rounded-t-xl flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Edit Teacher — {form.firstName} {form.lastName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Employee ID: {t?.employeeId || '—'} · Teacher ID: {t?.teacherId || '—'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Section title="Personal Details">
            <Input label="First Name" name="firstName" value={form.firstName} onChange={set} required />
            <Input label="Middle Name" name="middleName" value={form.middleName} onChange={set} />
            <Input label="Last Name" name="lastName" value={form.lastName} onChange={set} required />
            <Input label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={set} />
            <Select label="Gender" name="gender" value={form.gender} onChange={set} placeholder="Select" options={[{value:'male',label:'Male'},{value:'female',label:'Female'},{value:'other',label:'Other'}]} />
            <Input label="Phone" name="phone" value={form.phone} onChange={set} />
            <Input label="Alternate Phone" name="alternatePhone" value={form.alternatePhone} onChange={set} />
            <Select label="Blood Group" name="bloodGroup" value={form.bloodGroup} onChange={set} placeholder="Select" options={['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v=>({value:v,label:v}))} />
            <Input label="Nationality" name="nationality" value={form.nationality} onChange={set} />
            <Input label="Religion" name="religion" value={form.religion} onChange={set} />
            <Input label="Caste" name="caste" value={form.caste} onChange={set} />
            <Select label="Category" name="category" value={form.category} onChange={set} placeholder="Select" options={['General','OBC','SC','ST','EWS'].map(v=>({value:v,label:v}))} />
            <Select label="Marital Status" name="maritalStatus" value={form.maritalStatus} onChange={set} placeholder="Select" options={['single','married','divorced','widowed'].map(v=>({value:v,label:v.charAt(0).toUpperCase()+v.slice(1)}))} />
            <Input label="Aadhar Card" name="aadharCard" value={form.aadharCard} onChange={set} />
            <Input label="PAN Card" name="panCard" value={form.panCard} onChange={set} />
          </Section>

          <Section title="Address">
            <div className="sm:col-span-2 lg:col-span-3"><Input label="Address" name="address" value={form.address} onChange={set} /></div>
            <Input label="Address Line 2" name="addressLine2" value={form.addressLine2} onChange={set} />
            <Input label="City" name="city" value={form.city} onChange={set} />
            <Input label="State" name="state" value={form.state} onChange={set} />
            <Input label="Pincode" name="pincode" value={form.pincode} onChange={set} />
          </Section>

          <Section title="Professional Details">
            <Input label="Qualification" name="qualification" value={form.qualification} onChange={set} />
            <Input label="Specialization" name="specialization" value={form.specialization} onChange={set} />
            <Input label="Experience (years)" name="experience" type="number" value={form.experience} onChange={set} />
            <Input label="Department" name="department" value={form.department} onChange={set} />
            <Input label="Designation" name="designation" value={form.designation} onChange={set} />
            <Input label="Joining Date" name="joiningDate" type="date" value={form.joiningDate} onChange={set} />
          </Section>

          <Section title="Family Details">
            <Input label="Father's Name" name="fatherName" value={form.fatherName} onChange={set} />
            <Input label="Father's Phone" name="fatherPhone" value={form.fatherPhone} onChange={set} />
            <Input label="Mother's Name" name="motherName" value={form.motherName} onChange={set} />
            <Input label="Mother's Phone" name="motherPhone" value={form.motherPhone} onChange={set} />
            <Input label="Spouse Name" name="spouseName" value={form.spouseName} onChange={set} />
            <Input label="Spouse Phone" name="spousePhone" value={form.spousePhone} onChange={set} />
          </Section>

          <Section title="Bank Details">
            <Input label="Account Number" name="accountNumber" value={form.accountNumber} onChange={set} />
            <Input label="Bank Name" name="bankName" value={form.bankName} onChange={set} />
            <Input label="IFSC Code" name="ifsc" value={form.ifsc} onChange={set} />
            <Input label="Branch Name" name="branchName" value={form.branchName} onChange={set} />
          </Section>

          <Section title="Salary">
            <Input label="Basic (₹)" name="salaryBasic" type="number" value={form.salaryBasic} onChange={set} />
            <Input label="HRA (₹)" name="salaryHra" type="number" value={form.salaryHra} onChange={set} />
            <Input label="Transport (₹)" name="salaryTransport" type="number" value={form.salaryTransport} onChange={set} />
            <Input label="Total (₹)" name="salaryTotal" type="number" value={form.salaryTotal} onChange={set} />
          </Section>

          <Section title="Emergency Contact">
            <Input label="Name" name="emergencyName" value={form.emergencyName} onChange={set} />
            <Input label="Phone" name="emergencyPhone" value={form.emergencyPhone} onChange={set} />
            <Input label="Relation" name="emergencyRelation" value={form.emergencyRelation} onChange={set} />
          </Section>

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

export default EditTeacher;
