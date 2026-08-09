import React, { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useGetMyPayslipsQuery } from '@modules/payroll/api/payrollApi';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MyPayslips = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  // ── All hooks unconditionally ────────────────────────────────────────
  const { data: res, isLoading } = useGetMyPayslipsQuery({ year });
  const payslips = res?.data?.docs || res?.data || [];

  // ── Role guard after hooks (skip redirect on null = first render) ────
  if (user !== null && user?.role !== 'teacher') {
    return <Navigate to="/" />;
  }


  // --- Year-to-Date Calculations ---
  const ytd = useMemo(() => {
    return payslips.reduce(
      (acc, p) => ({
        earned: acc.earned + (p.grossEarnings || 0),
        tax: acc.tax + (p.tdsAmount || 0),
        pf: acc.pf + (p.pfEmployeeAmount || 0),
        net: acc.net + (p.netPayable || 0),
        count: acc.count + 1,
      }),
      { earned: 0, tax: 0, pf: 0, net: 0, count: 0 }
    );
  }, [payslips]);

  const handleDownload = (url) => {
    if (!url) {
      alert('Your PDF payslip is being generated. Please check back in a few minutes.');
      return;
    }
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans text-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Personal Payslips</h1>
          <p className="text-slate-500 font-medium text-sm">Review and download your monthly salary statements</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3">Fiscal Year</label>
          <select 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-0 font-bold text-slate-700 appearance-none cursor-pointer"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* --- YTD Summary Widgets --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-200">
          <p className="text-blue-100/70 text-[10px] font-black uppercase tracking-widest mb-1">Total Net Received</p>
          <h2 className="text-3xl font-black italic tracking-tighter">₹{ytd.net.toLocaleString()}</h2>
          <div className="mt-4 h-1 w-12 bg-white/30 rounded-full"></div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Income Tax (TDS)</p>
          <h2 className="text-2xl font-black text-slate-800">₹{ytd.tax.toLocaleString()}</h2>
          <p className="text-[10px] text-slate-500 mt-2 font-bold italic">Fiscal Year Cumulative</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">PF Contribution</p>
          <h2 className="text-2xl font-black text-slate-800">₹{ytd.pf.toLocaleString()}</h2>
          <p className="text-[10px] text-slate-500 mt-2 font-bold italic">Employee Share</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Statements Available</p>
          <h2 className="text-2xl font-black text-slate-800">{ytd.count} Records</h2>
          <p className="text-[10px] text-slate-500 mt-2 font-bold italic">For selected year</p>
        </div>
      </div>

      {/* --- Payslips Ledger --- */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Billing Period</th>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Gross Income</th>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Total Deductions</th>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Net Credit</th>
              <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Statement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {payslips.map((slip) => (
              <tr key={slip._id} className="hover:bg-slate-50/50 transition-all group">
                <td className="px-10 py-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center mr-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-black text-slate-900 tracking-tight">{MONTHS[slip.month - 1]}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{slip.year} Cycle</div>
                    </div>
                  </div>
                </td>
                <td className="px-10 py-6 font-bold text-slate-600 italic">₹{slip.grossEarnings?.toLocaleString()}</td>
                <td className="px-10 py-6 font-bold text-red-400 italic">₹{slip.totalDeductions?.toLocaleString()}</td>
                <td className="px-10 py-6">
                  <div className="font-black text-emerald-600 text-lg">₹{slip.netPayable?.toLocaleString()}</div>
                </td>
                <td className="px-10 py-6 text-right">
                  <button 
                    onClick={() => handleDownload(slip.pdfUrl)}
                    disabled={!slip.pdfUrl}
                    className={`inline-flex items-center px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      slip.pdfUrl 
                        ? 'bg-slate-900 text-white hover:bg-blue-600 shadow-lg shadow-slate-200' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {slip.pdfUrl ? 'Download PDF' : 'Generating...'}
                  </button>
                </td>
              </tr>
            ))}
            {payslips.length === 0 && (
              <tr>
                <td colSpan="5" className="px-10 py-24 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-50 rounded-full mb-4">
                    <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-bold text-sm tracking-tight italic">No payroll records detected for fiscal year {year}.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyPayslips;
