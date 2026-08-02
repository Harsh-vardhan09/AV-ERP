import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetAllSchoolsQuery } from '../../redux/api/superAdminApi';
import { MdSchool, MdCheckCircle, MdCancel, MdAdd, MdRefresh, MdArrowForward } from 'react-icons/md';

const SuperAdminDashboard = () => {
  const navigate    = useNavigate();
  const superAdmin  = useSelector((s) => s.superAdmin?.superAdmin);

  const { data: allData,      isLoading: allLoading,      refetch } = useGetAllSchoolsQuery({ limit: 5, page: 1 });
  const { data: activeData,   isLoading: activeLoading   } = useGetAllSchoolsQuery({ status: 'active',   limit: 1 });
  const { data: inactiveData, isLoading: inactiveLoading } = useGetAllSchoolsQuery({ status: 'inactive', limit: 1 });

  const recentSchools = allData?.data?.schools      || [];
  const total         = allData?.data?.pagination?.total;
  const totalActive   = activeData?.data?.pagination?.total;
  const totalInactive = inactiveData?.data?.pagination?.total;

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="erp-page-title">Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Welcome back, {superAdmin?.firstName || 'Admin'} · Unified Campus Platform
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => refetch()}
            className="btn"
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'var(--card-bg)', border:'1px solid var(--card-border)', color:'var(--text-secondary)', cursor:'pointer', fontSize:13, fontWeight:500 }}
          >
            <MdRefresh size={16} /> Refresh
          </button>
          <button
            onClick={() => navigate('/superadmin/schools')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'var(--color-primary)', border:'none', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, borderRadius:8 }}
          >
            <MdAdd size={16} /> Add School
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:24 }}>
        {[
          { label:'Total Schools',   value: total,        icon:<MdSchool size={22} />,       loading: allLoading      },
          { label:'Active Schools',  value: totalActive,  icon:<MdCheckCircle size={22} />,  loading: activeLoading   },
          { label:'Suspended',       value: totalInactive,icon:<MdCancel size={22} />,       loading: inactiveLoading },
        ].map(({ label, value, icon, loading }) => (
          <div key={label} className="erp-stat-card" style={{ flex:1, minWidth:160 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span className="erp-stat-label">{label}</span>
              <div className="erp-icon-box" style={{ width:36, height:36 }}>{icon}</div>
            </div>
            {loading
              ? <div style={{ height:32, width:'50%', borderRadius:6, background:'var(--color-card-border)', animation:'pulse 1.5s ease infinite' }} />
              : <div className="erp-stat-value">{value ?? '—'}</div>
            }
          </div>
        ))}
      </div>

      {/* Recent schools */}
      <div className="erp-section-card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--card-border)' }}>
          <div>
            <div className="erp-section-title" style={{ margin:0 }}>Recent Schools</div>
            <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>Latest 5 onboarded schools</div>
          </div>
          <button
            onClick={() => navigate('/superadmin/schools')}
            style={{ display:'flex', alignItems:'center', gap:4, fontSize:13, color:'var(--color-primary)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}
          >
            View all <MdArrowForward size={15} />
          </button>
        </div>

        <div className="responsive-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                {['School Name','Code','Status','Users','Created','Action'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j}>
                          <div style={{ height:14, width: j===0 ? '70%' : '50%', borderRadius:4, background:'var(--color-card-border)' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : recentSchools.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign:'center', padding:'32px 20px', color:'var(--text-secondary)' }}>
                        No schools found.{' '}
                        <button onClick={() => navigate('/superadmin/schools')} style={{ color:'var(--color-primary)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                          Add the first school →
                        </button>
                      </td>
                    </tr>
                  )
                  : recentSchools.map((school) => (
                    <tr key={school._id}>
                      <td style={{ fontWeight:600 }}>{school.name}</td>
                      <td>
                        <span style={{ fontFamily:'monospace', fontSize:12, background:'var(--color-primary-light)', color:'var(--color-primary)', padding:'2px 8px', borderRadius:5, fontWeight:600 }}>
                          {school.code}
                        </span>
                      </td>
                      <td>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, padding:'2px 10px', borderRadius:20, background: school.isActive ? 'color-mix(in srgb,var(--color-success) 14%, white)' : 'color-mix(in srgb,var(--color-danger) 10%, white)', color: school.isActive ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', background: school.isActive ? 'var(--color-success)' : 'var(--color-danger)', display:'inline-block' }} />
                          {school.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td>{school.userCount ?? '—'}</td>
                      <td style={{ color:'var(--text-secondary)', fontSize:12 }}>
                        {new Date(school.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                      </td>
                      <td>
                        <button
                          onClick={() => navigate('/superadmin/schools')}
                          style={{ fontSize:12, fontWeight:600, color:'var(--color-primary)', background:'var(--color-primary-light)', border:'1px solid var(--card-border)', borderRadius:6, padding:'4px 12px', cursor:'pointer' }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </>
  );
};

export default SuperAdminDashboard;
