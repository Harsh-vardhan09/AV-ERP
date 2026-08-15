/**
 * Sections with no class teacher assigned.
 *
 * Daily attendance is marked by the section's class teacher. A section with none
 * has nobody responsible for it, and would otherwise go unmarked for weeks with
 * nothing anywhere saying so.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useGetActiveSessionQuery } from '@shared/lib/api/adminApi';
import { useGetUnassignedSectionsQuery } from '../api/attendanceApi';

const UnassignedSections = () => {
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;

  const { data, isLoading, error } = useGetUnassignedSectionsQuery(
    { session: sessionId },
    { skip: !sessionId }
  );
  const rows = data?.data || [];

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800">Sections without a class teacher</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">
        Daily attendance is marked by each section&apos;s class teacher. These sections have
        none, so only a school admin can mark them.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error?.data?.message || 'Failed to load.'}
        </div>
      )}

      {!error && rows.length === 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-6 text-center text-sm text-green-800">
          ✓ Every section has a class teacher assigned.
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Class</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Section</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">
                  Last marked
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.sectionId}>
                  <td className="px-4 py-2 text-sm text-gray-800">{r.className}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{r.sectionName}</td>
                  <td className="px-4 py-2 text-sm">
                    {r.lastMarkedOn ? (
                      <span
                        className={
                          r.daysSinceMarked > 7 ? 'text-red-600 font-medium' : 'text-gray-600'
                        }
                      >
                        {r.lastMarkedOn}
                        {r.daysSinceMarked != null && ` (${r.daysSinceMarked} day(s) ago)`}
                      </span>
                    ) : (
                      <span className="text-red-600 font-medium">Never</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-600">
            Assign a class teacher in{' '}
            <Link to="/admin/teachers" className="text-indigo-600 underline">
              Teacher Management
            </Link>
            .
          </div>
        </div>
      )}
    </div>
  );
};

export default UnassignedSections;
