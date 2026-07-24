export const DEFAULT_FIELDS = [
  { key: 'studentName', label: 'Student Name', required: true, type: 'text' },
  { key: 'fatherName', label: "Father's Name", required: true, type: 'text' },
  { key: 'motherName', label: "Mother's Name", required: false, type: 'text' },
  { key: 'class', label: 'Class', required: true, type: 'text' },
  { key: 'section', label: 'Section', required: false, type: 'text' },
  { key: 'admissionNo', label: 'Admission No.', required: true, type: 'text' },
  { key: 'dob', label: 'Date of Birth', required: true, type: 'date' },
  { key: 'leavingDate', label: 'Date of Leaving', required: true, type: 'date' },
  { key: 'reason', label: 'Reason for Leaving', required: false, type: 'textarea' },
  { key: 'conduct', label: 'General Conduct', required: false, type: 'text' },
  { key: 'rollNo', label: 'Roll No.', required: false, type: 'number' },
];

export const FIELD_TYPES = ['text', 'date', 'number', 'textarea'];
