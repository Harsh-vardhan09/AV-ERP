import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetAdminStudentDetailQuery } from '@shared/lib/api/adminApi';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Supports both old {addressLine1} object and new flat string
// (normalization now done in backend; addressData is always returned)
// Keeping this as a local fallback just in case
const getAddressField = (s, field) => s.addressData?.[field] || '';

// Text wraps on long values (emails, addresses, etc.)
const InfoRow = ({ label, value }) => {
  if (!value && value !== 0 && value !== false) return null;
  return (
    <div className="flex gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 w-44 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium break-words min-w-0 flex-1">{String(value)}</span>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h2>
    </div>
    <div className="px-4 py-2">{children}</div>
  </div>
);

const leaveStatusColor = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
};

const AdminStudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useGetAdminStudentDetailQuery(id);
  const d = data?.data;

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!d) return <div className="text-center py-20 text-gray-400">Student not found.</div>;

  const { profile: s, attendance, assignmentCount, recentLeaves } = d;
  const pct = Number(attendance?.percentage || 0);

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-5">
        <button onClick={() => navigate('/admin/dashboard')} className="hover:text-blue-600">Dashboard</button>
        <span>›</span>
        <button onClick={() => navigate('/admin/students')} className="hover:text-blue-600">Students</button>
        <span>›</span>
        <span className="text-gray-900 font-medium">{s.firstName} {s.lastName}</span>
      </div>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5 flex flex-col sm:flex-row gap-5 items-start">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-2xl font-bold shrink-0">
          {s.firstName?.[0]}{s.lastName?.[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{s.firstName} {s.middleName || ''} {s.lastName}</h1>
          <div className="flex flex-wrap gap-2 mt-1 text-xs">
            {s.rollNo && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">Roll: {s.rollNo}</span>}
            {s.scholarNo && <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-medium">Scholar: {s.scholarNo}</span>}
            {s.admissionNumber && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-medium">Adm: {s.admissionNumber}</span>}
            {s.studentId && <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-medium">ID: {s.studentId}</span>}
            <span className="text-gray-500">{s.classId?.name} — {s.sectionId?.name}</span>
            <span className="text-gray-500">Session: {s.session?.name}</span>
            {s.userId?.email && <span className="text-gray-500">📧 {s.userId.email}</span>}
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <div className="text-center px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <div className={`text-2xl font-bold ${pct >= 75 ? 'text-green-600' : 'text-red-600'}`}>{pct}%</div>
            <div className="text-xs text-gray-500">Attendance</div>
          </div>
          <div className="text-center px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{assignmentCount}</div>
            <div className="text-xs text-gray-500">Assignments</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Personal */}
          <Section title="Personal Information">
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
          </Section>

          {/* Identity */}
          <Section title="Identity & IDs">
            <InfoRow label="Aadhar Card" value={s.aadharCard} />
            <InfoRow label="SSSM ID" value={s.ssmId} />
            <InfoRow label="Family ID" value={s.familyId} />
            <InfoRow label="RTE" value={s.rte ? 'Yes' : s.rte === false ? 'No' : null} />
            <InfoRow label="Student ID" value={s.studentId} />
          </Section>

          {/* Academic */}
          <Section title="Academic Details">
            <InfoRow label="Admission Date" value={fmtDate(s.admissionDate)} />
            <InfoRow label="Previous School" value={s.previousSchool} />
            <InfoRow label="Previous Class" value={s.previousClass} />
          </Section>

          {/* Attendance */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendance Summary</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Present', value: attendance?.present, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
                  { label: 'Absent', value: attendance?.absent, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
                  { label: 'Late', value: attendance?.late, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
                  { label: 'Leave', value: attendance?.leave, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`border rounded-lg py-3 text-center ${bg}`}>
                    <div className={`text-xl font-bold ${color}`}>{value ?? 0}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>{attendance?.total ?? 0} total classes</span>
                <span className={pct >= 75 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${pct >= 75 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Leave History */}
          {recentLeaves?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Leaves</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {recentLeaves.map((l, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800 capitalize">{l.leaveType}</p>
                      <p className="text-xs text-gray-400">{fmtDate(l.startDate)} — {fmtDate(l.endDate)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${leaveStatusColor[l.status]}`}>{l.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-5">

          {/* Parent / Guardian */}
          <Section title="Parent / Guardian">
            <InfoRow label="Father's Name" value={s.parentDetails?.father?.name} />
            <InfoRow label="Father Mobile" value={s.parentDetails?.father?.phone} />
            <InfoRow label="Father Email" value={s.parentDetails?.father?.email} />
            <InfoRow label="Father Occupation" value={s.parentDetails?.father?.occupation} />
            <InfoRow label="Father Income" value={s.parentDetails?.father?.annualIncome} />
            <InfoRow label="Mother's Name" value={s.parentDetails?.mother?.name} />
            <InfoRow label="Mother Mobile" value={s.parentDetails?.mother?.phone} />
            <InfoRow label="Mother Email" value={s.parentDetails?.mother?.email} />
            <InfoRow label="Mother Occupation" value={s.parentDetails?.mother?.occupation} />
            <InfoRow label="Guardian Name" value={s.parentDetails?.guardian?.name} />
            <InfoRow label="Guardian Relation" value={s.parentDetails?.guardian?.relation} />
            <InfoRow label="Guardian Mobile" value={s.parentDetails?.guardian?.phone} />
          </Section>

          {/* Address */}
          <Section title="Address">
            <InfoRow label="Address" value={getAddressField(d, 'line1')} />
            <InfoRow label="Address Line 2" value={getAddressField(d, 'line2')} />
            <InfoRow label="City" value={getAddressField(d, 'city')} />
            <InfoRow label="State" value={getAddressField(d, 'state')} />
            <InfoRow label="Pincode" value={getAddressField(d, 'pincode')} />
            <InfoRow label="Emergency Contact" value={s.emergencyContact?.name} />
            <InfoRow label="Emergency Phone" value={s.emergencyContact?.phone} />
            <InfoRow label="Emergency Relation" value={s.emergencyContact?.relation} />
          </Section>

          {/* Bank Details */}
          {(s.bankDetails?.accountNumber || s.bankDetails?.bankName) && (
            <Section title="Bank Details">
              <InfoRow label="Account Number" value={s.bankDetails?.accountNumber} />
              <InfoRow label="Bank Name" value={s.bankDetails?.bankName} />
              <InfoRow label="IFSC Code" value={s.bankDetails?.ifsc} />
              <InfoRow label="Branch" value={s.bankDetails?.branchName} />
            </Section>
          )}

          {/* Health */}
          {(s.healthInfo?.healthIssues || s.healthInfo?.allergies || s.healthInfo?.medications || s.healthInfo?.disabilityType) && (
            <Section title="Health Information">
              <InfoRow label="Health Issues" value={s.healthInfo?.healthIssues} />
              <InfoRow label="Allergies" value={s.healthInfo?.allergies} />
              <InfoRow label="Medications" value={s.healthInfo?.medications} />
              <InfoRow label="Disability Type" value={s.healthInfo?.disabilityType} />
            </Section>
          )}

          {/* Transport & Hostel */}
          {(s.transportation?.transportRequired || s.hostel?.hostelRequired) && (
            <Section title="Transport & Hostel">
              <InfoRow label="Transport" value={s.transportation?.transportRequired ? 'Yes' : 'No'} />
              <InfoRow label="Pickup Point" value={s.transportation?.pickupPoint} />
              <InfoRow label="Route No." value={s.transportation?.routeNo} />
              <InfoRow label="Hostel" value={s.hostel?.hostelRequired ? 'Yes' : 'No'} />
              <InfoRow label="Room No." value={s.hostel?.roomNo} />
            </Section>
          )}

          {/* Assignments count */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignments in Class</h2>
            </div>
            <div className="px-4 py-3 text-center">
              <div className="text-3xl font-bold text-blue-600">{assignmentCount}</div>
              <p className="text-xs text-gray-500 mt-1">Total assignments given to this class</p>
            </div>
          </div>

          {/* Remarks */}
          {s.remarks && (
            <Section title="Remarks">
              <p className="text-sm text-gray-700 py-1">{s.remarks}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStudentDetail;
