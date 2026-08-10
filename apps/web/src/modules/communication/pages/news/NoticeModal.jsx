import React, { useEffect } from 'react';
import { useGetNoticeQuery } from '@modules/communication/api/noticeApi';
import { X } from 'lucide-react';

export default function NoticeModal({ id, onClose }) {
  const { data, isLoading, isError, error } = useGetNoticeQuery(id, { skip: !id });

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!id) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-auto" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="text-sm text-slate-500">Full Notice</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><X /></button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : isError ? (
            <div className="text-center text-rose-600">Failed to load notice: {error?.data?.message || error?.message}</div>
          ) : (
            (() => {
              const notice = data?.data || data || {};
              const title = notice.title || notice.heading || 'Untitled';
              const body = notice.Body || notice.content || notice.description || '';
              const date = notice.createdAt || notice.date;
              const category = notice.category || 'General';

              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold uppercase text-slate-400">{category}</div>
                    {date && <div className="text-xs text-slate-400">{new Date(date).toLocaleDateString()}</div>}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>
                  <div className="prose max-w-none text-slate-700" style={{ whiteSpace: 'pre-wrap' }}>
                    {body}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
