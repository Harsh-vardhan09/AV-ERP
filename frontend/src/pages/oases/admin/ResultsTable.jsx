// ══════════════════════════════════════════════════════════════════
// OASES — ResultsTable (Sprint 6)
// useInfiniteQuery paginated table (50 rows/page)
// Columns: Anonymous | Sec A-D | Total | % | Grade | Rank | PDF
// Sortable header, search, load more, PDF download per row
// ══════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import { Loader2, ChevronDown, Download, Search, Trophy, CheckCircle2, XCircle } from 'lucide-react';
import { useResultsList, downloadPDF } from '../hooks/useReports';

// ── Grade badge ───────────────────────────────────────────────────
const GRADE_STYLE = {
  A1: 'bg-emerald-100 text-emerald-700',
  A2: 'bg-green-100 text-green-700',
  B1: 'bg-blue-100 text-blue-700',
  B2: 'bg-indigo-100 text-indigo-700',
  C1: 'bg-amber-100 text-amber-700',
  C2: 'bg-orange-100 text-orange-700',
  D:  'bg-red-50 text-red-500',
  E:  'bg-red-100 text-red-700',
};

const GradeBadge = ({ grade }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${GRADE_STYLE[grade] ?? 'bg-gray-100 text-gray-500'}`}>
    {grade ?? '—'}
  </span>
);

// ── Download button ───────────────────────────────────────────────
const DownloadBtn = ({ sheetId, anonymousCode }) => {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    await downloadPDF(sheetId, `result-${anonymousCode}.pdf`);
    setLoading(false);
  };
  return (
    <button
      onClick={handle}
      disabled={loading}
      className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition disabled:opacity-40"
      title="Download PDF"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
    </button>
  );
};

// ── Sortable column header ────────────────────────────────────────
const SortTh = ({ label, field, sortField, sortDir, onSort }) => (
  <th
    onClick={() => onSort(field)}
    className="px-3 py-3 text-left text-[10px] uppercase tracking-wide text-gray-400 cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap"
  >
    {label}
    {sortField === field && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
  </th>
);

// ══════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════
const ResultsTable = ({ examId }) => {
  const [search,   setSearch]   = useState('');
  const [sortField, setSortField] = useState('rank');
  const [sortDir,  setSortDir]  = useState('asc');

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useResultsList(examId, search);

  const allRows = useMemo(() =>
    data?.pages?.flatMap((p) => p?.results || []) ?? [],
    [data]
  );

  // Client-side sort
  const sorted = useMemo(() => {
    return [...allRows].sort((a, b) => {
      let va = a[sortField] ?? 0;
      let vb = b[sortField] ?? 0;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [allRows, sortField, sortDir]);

  const handleSort = (field) => {
    if (field === sortField) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SECTIONS = ['A', 'B', 'C', 'D'];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Search bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          className="flex-1 text-sm focus:outline-none placeholder:text-gray-300"
          placeholder="Search by anonymous code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {allRows.length > 0 && (
          <span className="text-xs text-gray-400">{data?.pages?.[0]?.total ?? 0} total</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <SortTh label="Rank"      field="rank"         sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="Anonymous" field="anonymousCode" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              {SECTIONS.map((s) => (
                <th key={s} className="px-3 py-3 text-[10px] uppercase tracking-wide text-gray-400 text-right">
                  Sec {s}
                </th>
              ))}
              <SortTh label="Total"   field="finalMarks"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="%"       field="percentage"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <th className="px-3 py-3 text-[10px] uppercase tracking-wide text-gray-400">Grade</th>
              <th className="px-3 py-3 text-[10px] uppercase tracking-wide text-gray-400">Pass</th>
              <th className="px-3 py-3 text-[10px] uppercase tracking-wide text-gray-400">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 bg-gray-100 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-sm text-gray-400">
                  No results yet. Generate grades first.
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50/60 transition">
                  {/* Rank */}
                  <td className="px-3 py-3">
                    {row.rank === 1
                      ? <span className="inline-flex items-center gap-1 text-amber-500 font-bold"><Trophy className="w-3.5 h-3.5" />1</span>
                      : <span className="text-gray-600 font-medium">{row.rank ?? '—'}</span>}
                  </td>
                  {/* Anonymous code */}
                  <td className="px-3 py-3 font-mono text-xs text-gray-600">{row.anonymousCode}</td>
                  {/* Section totals */}
                  {SECTIONS.map((s) => (
                    <td key={s} className="px-3 py-3 text-right text-gray-600">
                      {row.sectionTotals?.[s] ?? '—'}
                    </td>
                  ))}
                  {/* Total */}
                  <td className="px-3 py-3 font-bold text-gray-800">{row.finalMarks ?? row.marksObtained ?? '—'}</td>
                  {/* Percentage */}
                  <td className="px-3 py-3 text-gray-600">{row.percentage != null ? `${row.percentage}%` : '—'}</td>
                  {/* Grade */}
                  <td className="px-3 py-3"><GradeBadge grade={row.grade} /></td>
                  {/* Pass/Fail */}
                  <td className="px-3 py-3">
                    {row.isPassed
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : <XCircle className="w-4 h-4 text-red-400" />}
                  </td>
                  {/* PDF download */}
                  <td className="px-3 py-3">
                    <DownloadBtn sheetId={row.sheetId} anonymousCode={row.anonymousCode} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {hasNextPage && (
        <div className="px-4 py-3 border-t border-gray-100 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            {isFetchingNextPage
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</>
              : <><ChevronDown className="w-3.5 h-3.5" /> Load More</>}
          </button>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;
