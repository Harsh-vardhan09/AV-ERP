import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useGetNoticeQuery } from '@modules/communication/api/noticeApi';

export default function NoticeboxLegacy() {
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id') || searchParams.get('noticeId');
  const id = paramId || queryId;

  const { data, isLoading, isError, error } = useGetNoticeQuery(id, { skip: !id });

  useEffect(() => {
    // If there's no id at all, send the user to notices listing
    if (!id) {
      navigate('/student/notices', { replace: true });
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    if (!isLoading && data) {
      // Notice exists: redirect to canonical notice route
      navigate(`/fullnotice/${id}`, { replace: true });
    }
  }, [id, isLoading, data, navigate]);

  if (!id) return null; // navigation will occur

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
  );

  if (isError) {
    const status = error?.status || error?.originalStatus || (error?.data && error.data.status);
    if (status === 404) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow p-6 max-w-lg text-center">
            <h2 className="text-lg font-bold mb-2">Notice not found</h2>
            <p className="text-sm text-slate-600">The notice you are looking for has been deleted or is no longer available.</p>
            <div className="mt-4">
              <button className="text-indigo-600 font-bold" onClick={() => navigate('/student/notices')}>Back to Notices</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow p-6 max-w-lg text-center">
          <h2 className="text-lg font-bold mb-2">Unable to load notice</h2>
          <p className="text-sm text-slate-600">An unexpected error occurred. Please try again later.</p>
        </div>
      </div>
    );
  }

  return null;
}
