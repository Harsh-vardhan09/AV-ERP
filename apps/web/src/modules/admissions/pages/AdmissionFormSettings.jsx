import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetAdmissionFormSettingsQuery,
  useUpdateAdmissionFormSettingsMutation,
} from '../../../redux/api/admissionApi';
import {
  useGetActiveAdmissionTemplateQuery,
} from '../../../redux/api/admissionTemplateApi';

// ─── All 60+ field definitions matching the screenshot ────────────────────────
const FIELD_GROUPS = [
  // Column 1
  [
    { key: 'name',              label: 'Name' },
    { key: 'emailAddress',      label: 'Email Address' },
    { key: 'registrationNo',    label: 'Registration No.' },
    { key: 'srnNo',             label: 'SRN No.' },
    { key: 'houseBlock',        label: 'House Block' },
    { key: 'pincode',           label: 'Pincode' },
    { key: 'aadharNo',          label: 'Aadhar No.' },
    { key: 'religion',          label: 'Religion' },
    { key: 'admissionType',     label: 'Admission Type' },
    { key: 'rteApplicationNo',  label: 'RTE Application No.' },
    { key: 'schoolTotalFees',   label: 'School Total Fees' },
    { key: 'paidFees',          label: 'Paid Fees' },
    { key: 'fatherName',        label: "Father's Name" },
    { key: 'guardianQualification', label: 'Guardian Qualification' },
    { key: 'motherResidentialAddress', label: 'Mother Residential Address' },
    { key: 'fatherOfficialAddress', label: 'Father Official Address' },
    { key: 'guardianIncome',    label: 'Guardian Income' },
    { key: 'guardianMobile',    label: 'Guardian Mobile' },
    { key: 'transferCertificateNo', label: 'Transfer Certificate No.' },
    { key: 'scholarshipPassword', label: 'Scholarship Password' },
    { key: 'dobCertificateNo',  label: 'DOB Certificate No.' },
    { key: 'height',            label: 'Height' },
    { key: 'bankAccountNo',     label: 'Bank Account No.' },
    { key: 'bankIfsc',          label: 'Bank IFSC' },
    { key: 'officialBankName',  label: 'Official Bank Name' },
    { key: 'officialAccountHolder', label: 'Official Account Holder' },
    { key: 'enrolledYear',      label: 'Enrolled Year' },
    { key: 'dropout',           label: 'Dropout' },
    { key: 'lastActive',        label: 'Last Active' },
  ],
  // Column 2
  [
    { key: 'mobileNo',          label: 'Mobile No.' },
    { key: 'penNo',             label: 'PEN No.' },
    { key: 'generalRegistrationNo', label: 'General Registration No.' },
    { key: 'className',         label: 'Class Name' },
    { key: 'medium',            label: 'Medium' },
    { key: 'city',              label: 'City' },
    { key: 'bloodGroup',        label: 'Blood Group' },
    { key: 'nationality',       label: 'Nationality' },
    { key: 'isBplStudent',      label: 'Is BPL Student?' },
    { key: 'attendedSchool',    label: 'Attended School' },
    { key: 'rollNo',            label: 'Roll No.' },
    { key: 'discount',          label: 'Discount' },
    { key: 'motherEmail',       label: 'Mother Email' },
    { key: 'motherPhone',       label: 'Mother Mobile' },
    { key: 'transferCertificateDate', label: 'Transfer Certificate Date' },
    { key: 'admissionDate',     label: 'Admission Date' },
    { key: 'scholarshipId',     label: 'Scholarship ID' },
    { key: 'domicileApplicationNo', label: 'Domicile Application No.' },
    { key: 'fatherAadharNo',    label: 'Father Aadhar No.' },
    { key: 'weight',            label: 'Weight' },
    { key: 'bankName',          label: 'Bank Name' },
    { key: 'bankBranch',        label: 'Bank Branch' },
    { key: 'officialBankAccountNo', label: 'Official Bank Account No.' },
    { key: 'officialArt',       label: 'Official Art' },
    { key: 'enrolledClasses',   label: 'Enrolled Class' },
    { key: 'dropoutReason',     label: 'Dropout Reason' },
    { key: 'status',            label: 'Status' },
  ],
  // Column 3
  [
    { key: 'whatsappNo',        label: 'Whatsapp No.' },
    { key: 'apaarId',           label: 'APAAR ID' },
    { key: 'enrollmentNo',      label: 'Enrollment No.' },
    { key: 'classesSection',    label: 'Class Section' },
    { key: 'gender',            label: 'Gender' },
    { key: 'state',             label: 'State' },
    { key: 'caste',             label: 'Caste' },
    { key: 'dateOfBirth',       label: 'Date of Birth' },
    { key: 'isRteStudent',      label: 'Is RTE Student?' },
    { key: 'transport',         label: 'Transport' },
    { key: 'grossTotalFees',    label: 'Gross Total Fees' },
    { key: 'fine',              label: 'Fine' },
    { key: 'motherName',        label: "Mother's Name" },
    { key: 'motherQualification', label: 'Mother Qualification' },
    { key: 'fatherOccupation',  label: 'Father Occupation' },
    { key: 'guardianOccupation', label: 'Guardian Occupation' },
    { key: 'motherOfficialAddress', label: 'Mother Official Address' },
    { key: 'fatherIncome',      label: 'Father Income' },
    { key: 'guardianEmail',     label: 'Guardian Email' },
    { key: 'samagroId',         label: 'Samagra ID' },
    { key: 'accountCreationDate', label: 'Account Creation Date' },
  ],
  // Column 4
  [
    { key: 'alternateNumber',   label: 'Alternate Number' },
    { key: 'admissionNo',       label: 'Admission No.' },
    { key: 'srNo',              label: 'Sr.No.' },
    { key: 'stream',            label: 'Stream' },
    { key: 'schoolAffiliated',  label: 'School Affiliated' },
    { key: 'transportFees',     label: 'Transport Fees' },
    { key: 'balanceFees',       label: 'Balance Fees' },
    { key: 'fatherQualification', label: 'Father Qualification' },
    { key: 'guardianResidentialAddress', label: 'Guardian Residential Address' },
    { key: 'fatherOfficialAddress2', label: 'Father Official Address (Alt)' },
    { key: 'fatherPhone',       label: 'Father Mobile' },
    { key: 'fatherEmail',       label: 'Father Email' },
    { key: 'biometricCode',     label: 'Biometric Code' },
    { key: 'incomeApplicationNo', label: 'Income Application No.' },
    { key: 'casteApplicationNo', label: 'Caste Application No.' },
    { key: 'guardianAadharNo',  label: 'Guardian Aadhar No.' },
    { key: 'accountHolder',     label: 'Account Holder' },
    { key: 'panNo',             label: 'PAN No.' },
    { key: 'officialBankIfsc',  label: 'Official Bank IFSC' },
    { key: 'referredBy',        label: 'Referred By' },
    { key: 'enrolledStudentId', label: 'Enrolled Student ID' },
    { key: 'govtFamilyId',      label: 'Govt. Family ID' },
    { key: 'dropoutDate',       label: 'Dropout Date' },
    { key: 'category',          label: 'Category' },
    { key: 'placeOfBirth',      label: 'Place of Birth' },
    { key: 'childWithSpecialNeeds', label: 'Child with Special Needs' },
  ],
];

const ALL_KEYS = FIELD_GROUPS.flat().map(f => f.key);

export default function AdmissionFormSettings() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetAdmissionFormSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateAdmissionFormSettingsMutation();

  // Active template (read-only — assigned by Super Admin)
  const { data: activeData } = useGetActiveAdmissionTemplateQuery();
  const activeTemplate = activeData?.data;

  // Local set of enabled field keys
  const [enabled, setEnabled] = useState(new Set(ALL_KEYS));
  const [dirty, setDirty] = useState(false);

  // Sync from server
  useEffect(() => {
    if (data?.data?.visibleFields) {
      setEnabled(new Set(data.data.visibleFields));
      setDirty(false);
    }
  }, [data]);

  const allChecked = enabled.size === ALL_KEYS.length;
  const noneChecked = enabled.size === 0;

  const toggleAll = () => {
    if (allChecked) {
      setEnabled(new Set());
    } else {
      setEnabled(new Set(ALL_KEYS));
    }
    setDirty(true);
  };

  const toggle = (key) => {
    const next = new Set(enabled);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setEnabled(next);
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings({ visibleFields: [...enabled] }).unwrap();
      toast.success('Form settings saved successfully!');
      setDirty(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save settings');
    }
  };

  const handleCancel = () => {
    if (data?.data?.visibleFields) {
      setEnabled(new Set(data.data.visibleFields));
      setDirty(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Admission Form Setting</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage which fields appear on printed admission forms.</p>
      </div>

      {/* ── Active Template (read-only — assigned by Super Admin) ─────────── */}
      <div className="bg-white border border-blue-200 rounded-xl shadow-sm mb-5">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-blue-100">
          <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center">
            <span className="text-base">📄</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Active Admission Template</p>
            <p className="text-xs text-gray-500">Assigned by your system administrator. Used automatically when printing admission forms.</p>
          </div>
        </div>
        <div className="px-5 py-4">
          {activeTemplate ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <span className="text-lg">✅</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{activeTemplate.name}</p>
                  <p className="text-xs text-gray-500">
                    {activeTemplate.config?.pageSize || 'A4'} · {activeTemplate.config?.orientation || 'portrait'} · Used {activeTemplate.usageCount || 0}× times
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/admin/admission/templates/${activeTemplate._id}/preview`)}
                className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-300 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview Template
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <div className="text-amber-500 text-xl">⚠️</div>
              <div>
                <p className="text-sm font-medium text-gray-700">No template assigned yet</p>
                <p className="text-xs text-gray-500">
                  Contact your Super Administrator to assign a branded admission form template to this school.
                  The system will use the built-in static layout until a template is assigned.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {/* Blue config icon */}
            <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Configure which fields to show in the Admission Form.</span>
          </div>

          {/* Check / Uncheck All */}
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 border border-blue-500 text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {allChecked ? 'Uncheck All' : 'Check / Uncheck All'}
          </button>
        </div>

        {/* Fields Grid — 4 columns */}
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-0">
            {FIELD_GROUPS.map((group, gi) => (
              <div key={gi} className="space-y-0">
                {group.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2.5 py-1.5 cursor-pointer hover:bg-gray-50 rounded px-1 transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={enabled.has(key)}
                      onChange={() => toggle(key)}
                      className="w-3.5 h-3.5 rounded border-gray-400 accent-blue-600 cursor-pointer"
                    />
                    <span className={`text-xs transition-colors ${enabled.has(key) ? 'text-gray-700' : 'text-gray-400'}`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>

          {/* Enabled count indicator */}
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <strong className="text-gray-700">{enabled.size}</strong> of <strong className="text-gray-700">{ALL_KEYS.length}</strong> fields enabled
            </span>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleCancel}
            disabled={!dirty || isSaving}
            className="px-5 py-2 rounded-md border border-gray-300 text-gray-700 text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || isSaving}
            className="px-6 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
