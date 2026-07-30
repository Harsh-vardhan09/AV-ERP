import { useState } from 'react';
import { useGetMyStudentAssignmentsQuery, useSubmitAssignmentMutation } from '../../../redux/api/studentApi';
import Loader from '../../Loader';
import toast from 'react-hot-toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

function AssignmentPage() {
  const { data, error, isLoading, refetch } = useGetMyStudentAssignmentsQuery();
  const [submitAssignment, { isLoading: submitting }] = useSubmitAssignmentMutation();
  const [selectedFile, setSelectedFile] = useState({});
  const [expanding, setExpanding] = useState(null);

  const assignments = data?.data || [];

  // Group by subject
  const subjectMap = {};
  assignments.forEach(a => {
    const sName = a.subjectId?.name || 'Unknown Subject';
    if (!subjectMap[sName]) subjectMap[sName] = { name: sName, all: [], active: [], expired: [] };
    subjectMap[sName].all.push(a);
    if (a.isExpired) subjectMap[sName].expired.push(a);
    else subjectMap[sName].active.push(a);
  });
  const subjects = Object.values(subjectMap);

  const handleSubmit = async (assignmentId) => {
    const file = selectedFile[assignmentId];
    if (!file) { toast.error('Please select a file first'); return; }
    const formData = new FormData();
    formData.append('assignmentid', assignmentId);
    formData.append('photo', file);
    try {
      const res = await submitAssignment(formData).unwrap();
      toast.success(res.message || 'Submitted!');
      setSelectedFile(prev => { const n = { ...prev }; delete n[assignmentId]; return n; });
    } catch (err) {
      toast.error(err?.data?.message || 'Submission failed');
    }
  };

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-3 text-sm">Failed to load assignments</p>
        <button onClick={() => refetch()} className="text-sm text-blue-600 underline">Retry</button>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 text-center space-y-5 px-4">
        <img 
          src="/assets/undraw_all-checked_d3u6.svg" 
          alt="No assignments" 
          className="h-36 sm:h-44 md:h-52 w-auto opacity-75 object-contain grayscale"
        />
        <div>
          <p className="font-bold text-slate-700 text-sm">No assignments yet</p>
          <p className="text-xs text-slate-400 mt-1.5">Your teacher hasn't posted any assignments</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-5">My Assignments</h1>

      {/* Subject summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        {subjects.map(sub => (
          <div key={sub.name} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-medium text-gray-800 text-sm">{sub.name}</h3>
            </div>
            <div className="flex divide-x divide-gray-100">
              {[
                { label: 'Total', count: sub.all.length, color: 'text-blue-600', tab: 'all' },
                { label: 'Active', count: sub.active.length, color: 'text-green-600', tab: 'active' },
                { label: 'Expired', count: sub.expired.length, color: 'text-red-500', tab: 'expired' },
              ].map(({ label, count, color, tab }) => (
                <button key={tab}
                  onClick={() => setExpanding(expanding === `${sub.name}||${tab}` ? null : `${sub.name}||${tab}`)}
                  className={`flex-1 px-2 py-3 text-center hover:bg-gray-50 transition-colors ${expanding === `${sub.name}||${tab}` ? 'bg-blue-50' : ''}`}>
                  <div className={`text-xl font-bold ${color}`}>{count}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Expanded assignment list */}
      {expanding && (() => {
        const sepIdx = expanding.lastIndexOf('||');
        const sName = expanding.substring(0, sepIdx);
        const tab = expanding.substring(sepIdx + 2);
        const sub = subjectMap[sName];
        if (!sub) return null;
        const list = tab === 'all' ? sub.all : tab === 'active' ? sub.active : sub.expired;

        return (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-800">
                {sName} — <span className="capitalize text-gray-500">{tab}</span> ({list.length})
              </h3>
              <button onClick={() => setExpanding(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {list.length === 0
              ? <p className="text-center py-6 text-gray-400 text-sm">No assignments here</p>
              : <div className="divide-y divide-gray-100">
                  {list.map(a => (
                    <div key={a._id} className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm">{a.title}</h4>
                          {a.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.description}</p>}
                          <div className="flex flex-wrap gap-x-3 mt-1.5">
                            <span className="text-xs text-gray-400">Due: {fmtDate(a.dueDate)}</span>
                            <span className="text-xs text-gray-400">By: {a.teacherid?.firstName} {a.teacherid?.lastName}</span>
                            {a.isSubmitted && a.submittedAt && (
                              <span className="text-xs text-green-600">Uploaded: {fmtDate(a.submittedAt)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {a.isSubmitted
                            ? <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded font-medium">Submitted</span>
                            : a.isExpired
                              ? <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded font-medium">Expired</span>
                              : <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">Pending</span>
                          }
                          {a.photo && <a href={a.photo} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Question file</a>}
                          {a.isSubmitted && a.submittedFileUrl && (
                            <a href={a.submittedFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 underline">View submitted</a>
                          )}
                        </div>
                      </div>

                      {/* Submit / Re-submit */}
                      {!a.isExpired && (
                        <div className="mt-2">
                          {a.isSubmitted && (
                            <p className="text-xs text-gray-500 mb-1.5">
                              Already submitted on {fmtDate(a.submittedAt)}. Upload again to replace:
                            </p>
                          )}
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.png"
                              onChange={e => setSelectedFile(prev => ({ ...prev, [a._id]: e.target.files[0] }))}
                              className="text-xs border border-gray-200 rounded px-2 py-1.5 flex-1 text-gray-600"
                            />
                            <button
                              onClick={() => handleSubmit(a._id)}
                              disabled={submitting}
                              className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
                              {submitting ? 'Uploading...' : a.isSubmitted ? 'Re-submit' : 'Submit'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
            }
          </div>
        );
      })()}
    </div>
  );
}

export default AssignmentPage;