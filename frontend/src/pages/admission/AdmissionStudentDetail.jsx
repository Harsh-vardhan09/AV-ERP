import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetStudentDetailsQuery } from '../../redux/api/admissionApi';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

// Normalization is done in backend; addressData always has {line1, line2, city, state, pincode}
const addr = (s, field) => s.addressData?.[field] || '';

// Enterprise InfoRow — wraps long values
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
    orange: 'border-orange-500', teal: 'border-teal-500', red: 'border-red-500', gray: 'border-gray-400',
  };
  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden`}>
      <div className={`border-l-4 ${accents[accent]} px-4 py-3 bg-gray-50/60`}>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
};

// Badges inside dark hero — use white/semi-transparent style
const Badge = ({ children, color = 'blue' }) => {
  const colors = {
    blue:   'bg-blue-500/20  text-blue-200  border-blue-400/40',
    teal:   'bg-teal-500/20  text-teal-200  border-teal-400/40',
    purple: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
    orange: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
    green:  'bg-green-500/20 text-green-200  border-green-400/40',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
};

const AdmissionStudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useGetStudentDetailsQuery(id, { skip: !id });
  const s = data?.data;

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!s) return <div className="text-center py-20 text-gray-400">Student not found.</div>;

  return (
    <div className="max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <button onClick={() => navigate('/admission/dashboard')} className="hover:text-blue-600">Dashboard</button>
        <span>›</span>
        <button onClick={() => navigate('/admission/students')} className="hover:text-blue-600">Students</button>
        <span>›</span>
        <span className="text-gray-700 font-medium">{s.firstName} {s.lastName}</span>
      </div>

      {/* ─── HERO HEADER ─── */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 mb-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-3xl font-bold shadow-lg shrink-0">
            {s.firstName?.[0]}{s.lastName?.[0]}
          </div>
          {/* Name + badges */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{s.firstName} {s.middleName || ''} {s.lastName}</h1>
            <p className="text-slate-300 text-sm mt-0.5">{s.classId?.name && `${s.classId.name}${s.sectionId?.name ? ' – ' + s.sectionId.name : ''}`} · Session: {s.session?.name || '—'}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {s.rollNo && <Badge color="blue">Roll: {s.rollNo}</Badge>}
              {s.scholarNo && <Badge color="teal">Scholar: {s.scholarNo}</Badge>}
              {s.admissionNumber && <Badge color="purple">Adm: {s.admissionNumber}</Badge>}
              {s.studentId && <Badge color="orange">ID: {s.studentId}</Badge>}
              {s.rte && <Badge color="green">RTE</Badge>}
            </div>
          </div>
          {/* Status */}
          <div className="shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${s.status === 'active' ? 'bg-green-400/20 text-green-300 border border-green-400/30' : 'bg-red-400/20 text-red-300 border border-red-400/30'}`}>
              {s.status}
            </span>
          </div>
        </div>

        {/* Quick identity pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Gender', val: s.gender },
            { label: 'DOB', val: fmtDate(s.dateOfBirth) },
            { label: 'Blood Group', val: s.bloodGroup },
            { label: 'Nationality', val: s.nationality },
          ].map(({ label, val }) => val ? (
            <div key={label} className="bg-white/10 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-sm font-semibold text-white capitalize">{val}</p>
            </div>
          ) : null)}
        </div>
      </div>

      {/* ─── BODY GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT (2 cols) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Academic */}
          <Card title="Academic Information" accent="blue">
            <InfoRow label="Class" value={s.classId?.name} />
            <InfoRow label="Section" value={s.sectionId?.name} />
            <InfoRow label="Session" value={s.session?.name} />
            <InfoRow label="Roll Number" value={s.rollNo} />
            <InfoRow label="Scholar Number" value={s.scholarNo} />
            <InfoRow label="Admission Number" value={s.admissionNumber} />
            <InfoRow label="Student ID" value={s.studentId} />
            <InfoRow label="Admission Date" value={fmtDate(s.admissionDate)} />
            <InfoRow label="Previous School" value={s.previousSchool} />
            <InfoRow label="Previous Class" value={s.previousClass} />
            <InfoRow label="RTE" value={s.rte === true ? 'Yes' : s.rte === false ? 'No' : null} />
          </Card>

          {/* Personal */}
          <Card title="Personal Details" accent="purple">
            <InfoRow label="Date of Birth" value={fmtDate(s.dateOfBirth)} />
            <InfoRow label="Place of Birth" value={s.placeOfBirth} />
            <InfoRow label="Gender" value={s.gender} />
            <InfoRow label="Blood Group" value={s.bloodGroup} />
            <InfoRow label="Nationality" value={s.nationality} />
            <InfoRow label="Religion" value={s.religion} />
            <InfoRow label="Caste" value={s.caste} />
            <InfoRow label="Category" value={s.category} />
            <InfoRow label="Mother Tongue" value={s.motherTongue} />
            <InfoRow label="Phone" value={s.phone} />
            <InfoRow label="Email (Login)" value={s.userId?.email} />
          </Card>

          {/* Identity */}
          <Card title="Identity & Documents" accent="orange">
            <InfoRow label="Aadhar Card" value={s.aadharCard} />
            <InfoRow label="SSSM ID" value={s.ssmId} />
            <InfoRow label="Family ID" value={s.familyId} />
          </Card>

          {/* Father */}
          <Card title="Father's Details" accent="teal">
            <InfoRow label="Name" value={s.parentDetails?.father?.name} />
            <InfoRow label="Phone" value={s.parentDetails?.father?.phone} />
            <InfoRow label="Email" value={s.parentDetails?.father?.email} />
            <InfoRow label="Occupation" value={s.parentDetails?.father?.occupation} />
            <InfoRow label="Annual Income" value={s.parentDetails?.father?.annualIncome} />
          </Card>

          {/* Mother */}
          <Card title="Mother's Details" accent="green">
            <InfoRow label="Name" value={s.parentDetails?.mother?.name} />
            <InfoRow label="Phone" value={s.parentDetails?.mother?.phone} />
            <InfoRow label="Email" value={s.parentDetails?.mother?.email} />
            <InfoRow label="Occupation" value={s.parentDetails?.mother?.occupation} />
          </Card>

          {/* Guardian */}
          {s.parentDetails?.guardian?.name && (
            <Card title="Guardian's Details" accent="gray">
              <InfoRow label="Name" value={s.parentDetails.guardian.name} />
              <InfoRow label="Phone" value={s.parentDetails.guardian.phone} />
              <InfoRow label="Email" value={s.parentDetails.guardian.email} />
              <InfoRow label="Relation" value={s.parentDetails.guardian.relation} />
            </Card>
          )}
        </div>

        {/* ── RIGHT ── */}
        <div className="space-y-5">

          {/* Address */}
          <Card title="Address" accent="blue">
            <InfoRow label="Address" value={addr(s, 'line1')} />
            <InfoRow label="Address Line 2" value={addr(s, 'line2')} />
            <InfoRow label="City" value={addr(s, 'city')} />
            <InfoRow label="State" value={addr(s, 'state')} />
            <InfoRow label="Pincode" value={addr(s, 'pincode')} />
          </Card>

          {/* Emergency */}
          <Card title="Emergency Contact" accent="red">
            <InfoRow label="Name" value={s.emergencyContact?.name} />
            <InfoRow label="Phone" value={s.emergencyContact?.phone} />
            <InfoRow label="Relation" value={s.emergencyContact?.relation} />
          </Card>

          {/* Bank */}
          {(s.bankDetails?.accountNumber || s.bankDetails?.bankName) && (
            <Card title="Bank Details" accent="gray">
              <InfoRow label="Account Number" value={s.bankDetails?.accountNumber} />
              <InfoRow label="Bank Name" value={s.bankDetails?.bankName} />
              <InfoRow label="IFSC Code" value={s.bankDetails?.ifsc} />
              <InfoRow label="Branch" value={s.bankDetails?.branchName} />
            </Card>
          )}

          {/* Health */}
          {(s.healthInfo?.healthIssues || s.healthInfo?.allergies || s.healthInfo?.medications || s.healthInfo?.disabilityType) && (
            <Card title="Health Information" accent="red">
              <InfoRow label="Health Issues" value={s.healthInfo?.healthIssues} />
              <InfoRow label="Allergies" value={s.healthInfo?.allergies} />
              <InfoRow label="Medications" value={s.healthInfo?.medications} />
              <InfoRow label="Disability Type" value={s.healthInfo?.disabilityType} />
            </Card>
          )}

          {/* Transport */}
          {s.transportation?.transportRequired && (
            <Card title="Transport" accent="teal">
              <InfoRow label="Transport" value="Yes" />
              <InfoRow label="Pickup Point" value={s.transportation?.pickupPoint} />
              <InfoRow label="Route No." value={s.transportation?.routeNo} />
            </Card>
          )}

          {/* Hostel */}
          {s.hostel?.hostelRequired && (
            <Card title="Hostel" accent="purple">
              <InfoRow label="Hostel" value="Yes" />
              <InfoRow label="Room No." value={s.hostel?.roomNo} />
            </Card>
          )}

          {/* Remarks */}
          {s.remarks && (
            <Card title="Remarks" accent="gray">
              <p className="text-sm text-gray-700 py-2 leading-relaxed">{s.remarks}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdmissionStudentDetail;
