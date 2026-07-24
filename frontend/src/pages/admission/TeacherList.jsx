import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAllTeachersQuery, useActivateTeacherMutation, useDeactivateTeacherMutation } from '../../redux/api/admissionApi';
import EditTeacher from './EditTeacher';
import toast from 'react-hot-toast';

const TeacherList = () => {
  const { data, isLoading } = useGetAllTeachersQuery({});
  const [activate] = useActivateTeacherMutation();
  const [deactivate] = useDeactivateTeacherMutation();
  const teachers = data?.data || [];
  const navigate = useNavigate();
  const [editId, setEditId] = useState(null);

  const handleToggle = async (t) => {
    try {
      if (t.status === 'active') { await deactivate(t.userId?._id || t._id).unwrap(); toast.success('Deactivated'); }
      else { await activate(t.userId?._id || t._id).unwrap(); toast.success('Activated'); }
    } catch (err) { toast.error('Error'); }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">All Teachers</h1>
      <p className="text-sm text-gray-500 mb-5">
        Total: <span className="font-semibold text-gray-700">{teachers.length}</span> teacher{teachers.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Sorted A → Z
      </p>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? <div className="text-center py-8 text-gray-500">Loading...</div> : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teachers.map((t, i) => (
                    <tr key={t._id} className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admission/teachers/${t._id}`)}>
                      <td className="py-3 px-4 text-gray-400">{i + 1}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{t.firstName} {t.middleName ? t.middleName + ' ' : ''}{t.lastName}</td>
                      <td className="py-3 px-4 text-gray-600">{t.employeeId || '—'}</td>
                      <td className="py-3 px-4 text-gray-600 text-xs">{t.userId?.email || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{t.phone || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{t.department || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/admission/teachers/${t._id}`); }}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium">View</button>
                          <button onClick={(e) => { e.stopPropagation(); setEditId(t._id); }}
                            className="text-xs font-medium text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-50">Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); handleToggle(t); }}
                            className={`text-sm font-medium ${t.status === 'active' ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}>
                            {t.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {teachers.length === 0 && (
                    <tr><td colSpan="8" className="text-center py-8 text-gray-400">No teachers registered</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {teachers.map((t, i) => (
                <div key={t._id} className="p-4 active:bg-gray-50"
                  onClick={() => navigate(`/admission/teachers/${t._id}`)}>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <div className="font-medium text-gray-900 text-sm"><span className="text-gray-400 text-xs mr-1">{i + 1}.</span>{t.firstName} {t.lastName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.employeeId || '—'} · {t.userId?.email || '—'}</div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-2" onClick={e => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/admission/teachers/${t._id}`); }}
                      className="text-xs text-blue-600 font-medium">View details</button>
                    <button onClick={(e) => { e.stopPropagation(); setEditId(t._id); }}
                      className="text-xs text-indigo-600 font-medium">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); handleToggle(t); }}
                      className={`text-xs font-medium ${t.status === 'active' ? 'text-red-600' : 'text-green-600'}`}>
                      {t.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
              {teachers.length === 0 && <div className="text-center py-8 text-gray-400">No teachers registered</div>}
            </div>
          </>
        )}
      </div>

      {/* Edit Teacher Modal */}
      {editId && <EditTeacher teacherId={editId} onClose={() => setEditId(null)} />}
    </div>
  );
};

export default TeacherList;
