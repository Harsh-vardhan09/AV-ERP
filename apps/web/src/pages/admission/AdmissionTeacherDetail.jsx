import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetTeacherDetailsQuery } from '../../redux/api/admissionApi';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

const InfoRow = ({ label, value }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 uppercase tracking-wide w-44 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 break-words min-w-0 flex-1">{String(value)}</span>
    </div>
  );
};

const Card = ({ title, accent = 'blue', children }) => {
  const accents = {
    blue: 'border-blue-500', green: 'border-green-500', purple: 'border-purple-500',
    orange: 'border-orange-500', teal: 'border-teal-500', red: 'border-red-500',
    emerald: 'border-emerald-500', gray: 'border-gray-400',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`border-l-4 ${accents[accent]} px-4 py-3 bg-gray-50/60`}>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
};

const AdmissionTeacherDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useGetTeacherDetailsQuery(id, { skip: !id });
  const t = data?.data;

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!t) return <div className="text-center py-20 text-gray-400">Teacher not found.</div>;

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <button onClick={() => navigate('/admission/dashboard')} className="hover:text-blue-600">Dashboard</button>
        <span>›</span>
        <button onClick={() => navigate('/admission/teachers')} className="hover:text-blue-600">Teachers</button>
        <span>›</span>
        <span className="text-gray-700 font-medium">{t.firstName} {t.lastName}</span>
      </div>

      {/* ─── CLEAN LIGHT HEADER ─── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold shrink-0 border border-emerald-200">
            {t.firstName?.[0]}{t.lastName?.[0]}
          </div>
          {/* Name + meta */}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{t.firstName} {t.middleName || ''} {t.lastName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {[t.designation, t.department].filter(Boolean).join(' · ')}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {t.employeeId && (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
                  Emp: {t.employeeId}
                </span>
              )}
              {t.teacherId && (
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
                  ID: {t.teacherId}
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${t.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {t.status}
              </span>
              {t.userId?.email && <span className="text-gray-500 text-xs">📧 {t.userId.email}</span>}
              {t.phone && <span className="text-gray-500 text-xs">📞 {t.phone}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ─── BODY GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT (2 cols) ── */}
        <div className="lg:col-span-2 space-y-5">

          <Card title="Personal Details" accent="teal">
            <InfoRow label="Date of Birth" value={fmtDate(t.dateOfBirth)} />
            <InfoRow label="Gender" value={t.gender} />
            <InfoRow label="Blood Group" value={t.bloodGroup} />
            <InfoRow label="Nationality" value={t.nationality} />
            <InfoRow label="Religion" value={t.religion} />
            <InfoRow label="Caste" value={t.caste} />
            <InfoRow label="Category" value={t.category} />
            <InfoRow label="Marital Status" value={t.maritalStatus} />
            <InfoRow label="Mother Tongue" value={t.motherTongue} />
            <InfoRow label="Phone" value={t.phone} />
            <InfoRow label="Alternate Phone" value={t.alternatePhone} />
          </Card>

          <Card title="Professional Details" accent="blue">
            <InfoRow label="Employee ID" value={t.employeeId} />
            <InfoRow label="Teacher ID" value={t.teacherId} />
            <InfoRow label="Qualification" value={t.qualification} />
            <InfoRow label="Specialization" value={t.specialization} />
            <InfoRow label="Experience" value={t.experience ? `${t.experience} years` : null} />
            <InfoRow label="Department" value={t.department} />
            <InfoRow label="Designation" value={t.designation} />
            <InfoRow label="Joining Date" value={fmtDate(t.joiningDate)} />
          </Card>

          <Card title="Identity" accent="orange">
            <InfoRow label="Aadhar Card" value={t.aadharCard} />
            <InfoRow label="PAN Card" value={t.panCard} />
          </Card>

          {(t.familyDetails?.fatherName || t.familyDetails?.motherName || t.familyDetails?.spouseName) && (
            <Card title="Family Details" accent="green">
              <InfoRow label="Father's Name" value={t.familyDetails?.fatherName} />
              <InfoRow label="Father's Phone" value={t.familyDetails?.fatherPhone} />
              <InfoRow label="Mother's Name" value={t.familyDetails?.motherName} />
              <InfoRow label="Mother's Phone" value={t.familyDetails?.motherPhone} />
              <InfoRow label="Spouse Name" value={t.familyDetails?.spouseName} />
              <InfoRow label="Spouse Phone" value={t.familyDetails?.spousePhone} />
            </Card>
          )}
        </div>

        {/* ── RIGHT ── */}
        <div className="space-y-5">

          <Card title="Address" accent="purple">
            <InfoRow label="Address" value={t.address} />
            <InfoRow label="Address Line 2" value={t.addressLine2} />
            <InfoRow label="City" value={t.city} />
            <InfoRow label="State" value={t.state} />
            <InfoRow label="Pincode" value={t.pincode} />
          </Card>

          {t.emergencyContact?.name && (
            <Card title="Emergency Contact" accent="red">
              <InfoRow label="Name" value={t.emergencyContact?.name} />
              <InfoRow label="Phone" value={t.emergencyContact?.phone} />
              <InfoRow label="Relation" value={t.emergencyContact?.relation} />
            </Card>
          )}

          {(t.bankDetails?.accountNumber || t.bankDetails?.bankName) && (
            <Card title="Bank Details" accent="gray">
              <InfoRow label="Account Number" value={t.bankDetails?.accountNumber} />
              <InfoRow label="Bank Name" value={t.bankDetails?.bankName} />
              <InfoRow label="IFSC Code" value={t.bankDetails?.ifsc} />
              <InfoRow label="Branch" value={t.bankDetails?.branchName} />
            </Card>
          )}

          {(t.salary?.basic || t.salary?.total) && (
            <Card title="Salary" accent="emerald">
              <InfoRow label="Basic" value={t.salary?.basic ? `₹${t.salary.basic}` : null} />
              <InfoRow label="HRA" value={t.salary?.hra ? `₹${t.salary.hra}` : null} />
              <InfoRow label="Transport" value={t.salary?.transport ? `₹${t.salary.transport}` : null} />
              <InfoRow label="Total" value={t.salary?.total ? `₹${t.salary.total}` : null} />
            </Card>
          )}

          {t.remarks && (
            <Card title="Remarks" accent="gray">
              <p className="text-sm text-gray-700 py-2 leading-relaxed">{t.remarks}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdmissionTeacherDetail;
