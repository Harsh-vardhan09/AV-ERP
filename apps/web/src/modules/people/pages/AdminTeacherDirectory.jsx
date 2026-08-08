import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAdminTeachersQuery } from '../../../redux/api/adminApi';

const AdminTeacherDirectory = () => {
  const navigate = useNavigate();
  const [inputSearch, setInputSearch] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useGetAdminTeachersQuery(search ? { search } : {});
  const teachers = data?.data || [];

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(inputSearch);
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <button onClick={() => navigate('/admin/dashboard')} className="hover:text-blue-600">Dashboard</button>
        <span>›</span>
        <span className="text-gray-900 font-medium">Teachers</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Teacher Directory</h1>
          <p className="text-xs text-gray-500 mt-0.5">{data?.total ?? 0} teachers found</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <input
            type="text"
            value={inputSearch}
            onChange={(e) => setInputSearch(e.target.value)}
            placeholder="Search by name, employee ID…"
            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700">Search</button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setInputSearch(''); }}
              className="text-xs text-gray-500 underline">Clear</button>
          )}
        </form>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="flex justify-center py-14">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="text-center py-14 bg-white border border-gray-200 rounded-lg text-gray-400">
          <p className="text-sm">No teachers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((t) => (
            <div key={t._id}
              onClick={() => navigate(`/admin/teachers/${t._id}`)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-200 cursor-pointer transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {t.firstName?.[0]?.toUpperCase()}{t.lastName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.firstName} {t.lastName}</p>
                  <p className="text-xs text-gray-400">{t.userId?.email || '—'}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                {t.employeeId && <p>Employee ID: <span className="font-medium">{t.employeeId}</span></p>}
                {t.designation && <p>Designation: <span className="font-medium">{t.designation}</span></p>}
                {t.department && <p>Department: <span className="font-medium">{t.department}</span></p>}
                {t.phone && <p>📞 {t.phone}</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-blue-600 hover:underline text-right">
                View Details →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTeacherDirectory;
