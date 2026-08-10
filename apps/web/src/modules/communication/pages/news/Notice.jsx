import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCreateNoticeMutation } from '@modules/communication/api/noticeApi';
import { useCheak_authQuery } from '@modules/identity/api/userApi';

function Notice() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Academic');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const navigate = useNavigate();
  const location = useLocation();

  const [createNotice, { isLoading }] = useCreateNoticeMutation();

  const { data: authData, isLoading: authLoading } = useCheak_authQuery();
  useEffect(() => {
    if (!authLoading && authData) {
      const role = authData?.user?.role;
      if (role === 'student') {
        navigate('/student/notices');
      }
    }
  }, [authData, authLoading, navigate]);

  const categories = ['Academic', 'Events', 'Administrative', 'Urgent'];
  const audiences = [
    { value: 'all', label: 'All' },
    { value: 'students', label: 'Students' },
    { value: 'teachers', label: 'Teachers' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Title is required');
    if (!body.trim()) return toast.error('Body is required');
    if (!category) return toast.error('Category is required');
    if (!audience) return toast.error('Audience is required');

    try {
      // backend expects `Body` (capital B) and audience enums: 'all'|'students'|'teachers'
      const payload = { title: title.trim(), category, Body: body.trim() };
      if (audience && audience !== 'all') payload.audience = audience;
      await createNotice(payload).unwrap();
      toast.success('Notice created');
      // navigate to appropriate list based on path
      if (location.pathname.includes('/teacher')) navigate('/teacher/notices');
      else navigate('/admin/notices');
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || 'Failed to create notice');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-4 sm:px-6 pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Create Notice</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">Publish a school-wide announcement</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-4 w-full">
        <div>
          <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder="Short headline for the notice"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Audience</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500">
              {audiences.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Body</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="Write the notice content here" />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => { if (location.pathname.includes('/teacher')) navigate('/teacher/notices'); else navigate('/admin/notices'); }} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold">Cancel</button>
          <button type="submit" disabled={isLoading} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold">
            {isLoading ? 'Saving…' : 'Publish Notice'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Notice;
