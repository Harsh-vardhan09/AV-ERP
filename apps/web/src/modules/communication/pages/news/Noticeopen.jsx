import { useParams } from "react-router-dom";
import { BellIcon, ArrowLeftIcon, UserIcon, CalendarIcon, UsersIcon } from "lucide-react";
import { useGetNoticeQuery } from '@modules/communication/api/noticeApi';

export default function NoticeView() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useGetNoticeQuery(id, { skip: !id });

  const notice = data?.data || data || {};
  const title = notice.title || notice.heading || 'Untitled';
  const body = notice.Body || notice.content || notice.description || '';
  const date = notice.createdAt || notice.date;
  const category = notice.category || 'General';
  const audience = notice.audience || '';
  const members = notice.member || notice.signatures || [];

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const formattedDate = formatDate(date);

  const getCategoryColor = (category) => {
    const categoryLower = (category || '').toLowerCase();
    if (categoryLower.includes('academic')) return 'bg-purple-600';
    if (categoryLower.includes('event')) return 'bg-green-600';
    if (categoryLower.includes('administrative')) return 'bg-orange-600';
    if (categoryLower.includes('urgent')) return 'bg-red-600';
    return 'bg-purple-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 to-purple-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-purple-300 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading notice...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    console.error('Failed to load notice:', error);
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 to-purple-800 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-red-500 text-4xl mb-4 text-center">⚠️</div>
          <h2 className="text-xl font-semibold mb-2 text-center">Error</h2>
          <p className="text-gray-600 text-center">{error?.data?.message || error?.message || 'Failed to load notice.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0.5 bg-gradient-to-b from-purple-600 to-purple-800">
      <header className="text-white py-6 px-4 md:px-8 text-center">
        <div className="container mx-auto flex items-center justify-center">
          <div className="bg-white bg-opacity-20 rounded-full p-3 mr-3">
            <BellIcon size={24} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">NOTICE BOARD</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden max-w-4xl mx-auto">
          <div className="bg-purple-50 p-4">
            <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center">
              <div className={`inline-flex items-center ${getCategoryColor(category)} text-white text-sm font-medium px-3 py-1.5 rounded-md`}>{category}</div>
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
                <div className="flex items-center text-sm text-gray-700"><UsersIcon size={16} className="mr-1.5 text-purple-500" /><span className="font-medium">For:</span> {audience}</div>
                <div className="flex items-center text-sm text-gray-700"><CalendarIcon size={16} className="mr-1.5 text-purple-500" /><span className="font-medium">Date:</span> {formattedDate}</div>
              </div>
            </div>
          </div>

          <div className="bg-purple-100 px-6 py-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 text-center">{title}</h2>
          </div>

          <div className="p-6">
            <div className="prose max-w-none" style={{ whiteSpace: 'pre-wrap' }}>
              {body}
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center"><UserIcon size={16} className="mr-1.5 text-purple-500" />Issued By:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members && members.length > 0 ? members.map((m, i) => <div key={i} className="text-sm text-gray-700 font-medium">{m}</div>) : <div className="text-sm text-gray-500 italic">No signatories available</div>}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-6 text-center">
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors flex items-center justify-center mx-auto" onClick={() => window.history.back()}>
            <ArrowLeftIcon size={16} className="mr-1.5" /> Back to Notices
          </button>
        </div>
      </main>
    </div>
  );
}