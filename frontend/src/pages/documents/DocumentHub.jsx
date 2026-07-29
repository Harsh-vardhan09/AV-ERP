import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, GraduationCap, Settings2, ArrowRight } from 'lucide-react';

const modules = [
  {
    title: 'Transfer Certificate (TC)',
    desc: 'Issue, lock, and manage official Transfer Certificates for students.',
    link: '/admin/documents/tc',
    icon: FileText,
    badge: 'TC Module',
  },
  {
    title: 'Migration Certificate',
    desc: 'Generate secure Migration Certificates based on student academic records.',
    link: '/admin/documents/migration',
    icon: GraduationCap,
    badge: 'Migration',
  },
  {
    title: 'Certificate Field Config',
    desc: 'Configure custom certificate fields and templates for TC & Migration documents.',
    link: '/admin/documents/template-config',
    icon: Settings2,
    badge: 'Configuration',
  },
];

const DocumentHub = () => (
  <div className="max-w-6xl mx-auto space-y-5 px-2 sm:px-4 pb-12">
    
    {/* Page Header */}
    <div className="pt-1">
      <h1 className="text-xl font-bold text-slate-900">Documents Hub</h1>
      <p className="text-xs text-slate-500 mt-0.5">Manage student certificates, TC records, and field configurations</p>
    </div>

    {/* Grid of Clean Modules */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {modules.map((m) => {
        const Icon = m.icon;
        return (
          <Link
            key={m.title}
            to={m.link}
            className="group bg-white border border-slate-200/80 hover:border-indigo-300 rounded-xl p-5 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                  {m.badge}
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                {m.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {m.desc}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
              <span>Open Module</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        );
      })}
    </div>

  </div>
);

export default DocumentHub;
