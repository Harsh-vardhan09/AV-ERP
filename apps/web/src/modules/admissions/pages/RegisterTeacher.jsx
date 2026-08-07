import React, { useState, useRef } from 'react';
import { useRegisterTeacherMutation, useUploadTeacherPhotoMutation } from '../../../redux/api/admissionApi';
import EmailOtpVerifier from '../../../components/EmailOtpVerifier';
import toast from 'react-hot-toast';

const Section = ({ title, open, onToggle, children }) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
    <button type="button" onClick={onToggle}
      className={`w-full flex justify-between items-center px-4 py-3 text-left text-sm font-medium transition-colors ${open ? 'bg-blue-50 text-blue-800 border-b border-blue-100' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
      <span>{title}</span>
      <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </button>
    {open && <div className="p-4 bg-white">{children}</div>}
  </div>
);

const Input = ({ label, required, ...props }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    <input {...props} required={required} className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${props.className || ''}`} />
  </div>
);

const Select = ({ label, options = [], placeholder, ...props }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    <select {...props} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const initialForm = {
  salutation: '', firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: '',
  phone: '', alternatePhone: '', email: '',
  address: '', addressLine2: '', city: '', state: '', pincode: '',
  aadharCard: '', panCard: '',
  nationality: 'Indian', religion: '', caste: '', category: '', maritalStatus: '', bloodGroup: '', motherTongue: '',
  qualification: '', specialization: '', experience: '', department: '', designation: '',
  joiningDate: '',
  fatherName: '', fatherPhone: '', motherName: '', motherPhone: '', spouseName: '', spousePhone: '',
  accountNumber: '', bankName: '', ifsc: '', branchName: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
  remarks: ''
};

const RegisterTeacher = () => {
  const [registerTeacher, { isLoading }] = useRegisterTeacherMutation();
  const [uploadTeacherPhoto] = useUploadTeacherPhotoMutation();
  const [form, setForm] = useState(initialForm);
  const [openSections, setOpenSections] = useState({ personal: true, professional: true });
  const [successData, setSuccessData] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  const toggle = (key) => setOpenSections(p => ({ ...p, [key]: !p[key] }));
  const set = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

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
    if (!form.firstName || !form.email) {
      toast.error('First name and email are required');
      return;
    }
    if (!emailVerified) {
      toast.error('Please verify the email with OTP before registering');
      return;
    }
    try {
      // Register teacher first
      const res = await registerTeacher(form).unwrap();
      
      // Upload photo if selected
      if (photoFile && res.data?.teacher?._id) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        try {
          await uploadTeacherPhoto({ id: res.data.teacher._id, formData }).unwrap();
          toast.success('Photo uploaded successfully');
        } catch (photoErr) {
          console.error('Photo upload failed:', photoErr);
          toast.error('Photo upload failed, but teacher was registered');
        }
      }
      
      toast.success(res.message);
      setSuccessData(res.data);
      setForm(initialForm);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) { toast.error(err?.data?.message || 'Registration failed'); }
  };

  if (successData) {
    const c = successData.credentials;
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
              <div>
                <h2 className="text-lg font-semibold">Teacher Registered</h2>
                <p className="text-blue-100 text-sm">Save these credentials</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {[['Employee ID', c.employeeId], ['Teacher ID', c.teacherId], ['Login Email', c.loginEmail], ['Password', c.password]].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500">{k}</span>
                <span className={`text-sm font-medium ${k === 'Password' ? 'text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded' : 'text-gray-900'}`}>{v || '—'}</span>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6">
            <button onClick={() => setSuccessData(null)} className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 transition">Register Another Teacher</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Register Teacher</h1>
        <p className="text-sm text-gray-500 mt-1">Only <span className="text-red-500">*</span> fields are mandatory</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Section title="Personal Details" open={openSections.personal} onToggle={() => toggle('personal')}>
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="text-sm text-red-500 hover:text-red-600 font-medium ml-3"
                    >
                      Remove
                    </button>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Max 2MB, JPG/PNG</p>
                </div>
              </div>
            </div>

            <Select label="Salutation" name="salutation" value={form.salutation} onChange={set} placeholder="Select" options={[{ value: 'Mr', label: 'Mr.' }, { value: 'Mrs', label: 'Mrs.' }, { value: 'Ms', label: 'Ms.' }, { value: 'Dr', label: 'Dr.' }, { value: 'Prof', label: 'Prof.' }]} />
            <Input label="First Name" name="firstName" value={form.firstName} onChange={set} required />
            <Input label="Middle Name" name="middleName" value={form.middleName} onChange={set} />
            <Input label="Last Name" name="lastName" value={form.lastName} onChange={set} />
            <Input label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={set} />
            <Select label="Gender" name="gender" value={form.gender} onChange={set} placeholder="Select" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
            <Select label="Marital Status" name="maritalStatus" value={form.maritalStatus} onChange={set} placeholder="Select" options={[{ value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'divorced', label: 'Divorced' }, { value: 'widowed', label: 'Widowed' }]} />
            <Input label="Phone" name="phone" value={form.phone} onChange={set} />
            <Input label="Alternate Phone" name="alternatePhone" value={form.alternatePhone} onChange={set} />
            <EmailOtpVerifier
              email={form.email}
              onEmailChange={set}
              onVerified={() => setEmailVerified(true)}
              required
              disabled={isLoading}
            />
            <div className="sm:col-span-2 lg:col-span-3"><Input label="Address" name="address" value={form.address} onChange={set} /></div>
            <Input label="City" name="city" value={form.city} onChange={set} />
            <Input label="State" name="state" value={form.state} onChange={set} />
            <Input label="Pincode" name="pincode" value={form.pincode} onChange={set} />
            <Select label="Blood Group" name="bloodGroup" value={form.bloodGroup} onChange={set} placeholder="Select" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => ({ value: v, label: v }))} />
            <Input label="Religion" name="religion" value={form.religion} onChange={set} />
            <Input label="Mother Tongue" name="motherTongue" value={form.motherTongue} onChange={set} />
          </div>
        </Section>

        <Section title="Identity" open={openSections.identity} onToggle={() => toggle('identity')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Aadhar Card No." name="aadharCard" value={form.aadharCard} onChange={set} />
            <Input label="PAN Card No." name="panCard" value={form.panCard} onChange={set} />
            <Select label="Category" name="category" value={form.category} onChange={set} placeholder="Select" options={['General', 'OBC', 'SC', 'ST', 'EWS'].map(v => ({ value: v, label: v }))} />
            <Input label="Caste" name="caste" value={form.caste} onChange={set} />
          </div>
        </Section>

        <Section title="Professional Details" open={openSections.professional} onToggle={() => toggle('professional')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Qualification" name="qualification" value={form.qualification} onChange={set} />
            <Input label="Specialization" name="specialization" value={form.specialization} onChange={set} />
            <Input label="Experience (years)" name="experience" type="number" value={form.experience} onChange={set} />
            <Input label="Department" name="department" value={form.department} onChange={set} />
            <Input label="Designation" name="designation" value={form.designation} onChange={set} />
            <Input label="Joining Date" name="joiningDate" type="date" value={form.joiningDate} onChange={set} />
          </div>
        </Section>

        <Section title="Family Details" open={openSections.family} onToggle={() => toggle('family')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Father's Name" name="fatherName" value={form.fatherName} onChange={set} />
            <Input label="Father's Phone" name="fatherPhone" value={form.fatherPhone} onChange={set} />
            <div></div>
            <Input label="Mother's Name" name="motherName" value={form.motherName} onChange={set} />
            <Input label="Mother's Phone" name="motherPhone" value={form.motherPhone} onChange={set} />
            <div></div>
            <Input label="Spouse's Name" name="spouseName" value={form.spouseName} onChange={set} />
            <Input label="Spouse's Phone" name="spousePhone" value={form.spousePhone} onChange={set} />
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

        <Section title="Emergency Contact" open={openSections.emergency} onToggle={() => toggle('emergency')}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Name" name="emergencyName" value={form.emergencyName} onChange={set} />
            <Input label="Phone" name="emergencyPhone" value={form.emergencyPhone} onChange={set} />
            <Input label="Relation" name="emergencyRelation" value={form.emergencyRelation} onChange={set} />
          </div>
        </Section>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Remarks</label>
          <textarea name="remarks" value={form.remarks} onChange={set} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Any additional notes..." />
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4 text-xs text-blue-700">
          Password defaults to DOB (DDMMYYYY). Employee ID and Teacher ID are auto-generated.
        </div>

        <button type="submit" disabled={isLoading} className="bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition w-full sm:w-auto">
          {isLoading ? 'Registering...' : 'Register Teacher'}
        </button>
      </form>
    </div>
  );
};

export default RegisterTeacher;
