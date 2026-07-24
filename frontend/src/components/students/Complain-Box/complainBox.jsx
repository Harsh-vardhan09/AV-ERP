// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faBox } from '@fortawesome/free-solid-svg-icons';
// import axios from 'axios';
// import { useEffect, useState } from 'react';
// import { useSelector,useDispatch } from 'react-redux';
// import React, { useMemo, useContext } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { complainData } from '../../../redux/features/complainSlice';

// function ComplaintBox() {
//     const dispatch = useDispatch();
//     useEffect(()=>{dispatch(complainData())},[])
//     const data = useSelector((state) => state.complains.complains);
//     const complaints = data;
//     const navigate = useNavigate();
//     function fullView(e){
//         console.log(e)
//        navigate(`/next/${e}`)
//     }
    
//     return (
//         <>
//             <section className='main' id='main'>
//                 <div >
//                     <h1 className='heading'>
//                         COMPLAINT BOX
//                         <div className='cbox'><FontAwesomeIcon icon={faBox} /></div>
//                         <button className='add-button' title='Add your Complaint' >+</button>
//                     </h1>
//                     <div className='complaints' id='complaints'>
//                     {complaints.length==0?(<h1>data is loading</h1>): (complaints.map((c) => {
//                             const count = c.acceptedby.length <1 ? 0 : c.acceptedby.length;
//                             return (
//                                 <div className='complaint'  key={c.id} onClick={()=>{fullView(c._id)}}>
//                                     <h2 className='complaint-heading' title='Complaint Title'>
//                                         {c.category}
//                                         <p className='status' title='Status'>{c.status}</p>
//                                     </h2>
//                                     <p className='complaint-desc'>{c.description} </p>
//                                  {!c.suggestion?(<p></p>) : (<>  <p className='suggestion'><b>Suggestions:</b> {c.suggestion}</p><br/></>)}
//                                     <p className='count' title='Complaint Count'>{count}</p>
//                                     <p className='more'>View more..</p>
//                                 </div>
//                             );
//                         }))
// }</div>
//                 </div>
//             </section>
//             <style jsx>{`
//                 body {
//                     background-color: #FEF9F2;
//                 }
//                 .main {
//                     height: 100vh;
//                     padding: 0;
//                     margin: 0;
//                     font-family: Arial, Helvetica, sans-serif;
//                     display: flex;
//                     flex-direction: column;
//                     align-items: center;
//                     background-color: #FEF9F2;
//                 }
//                 .complaint-form{
//                     margin: 40px;
//                     border: none;
//                     box-shadow: 5px 5px 5px 5px rgba(0, 0, 0, 0.162);
//                     padding: 30px;
//                     border-radius: 10px;
//                     width: 900px;
//                     font-size: 1.2rem;
//                     background-color: #F3FDE8;
//                 }
//                 h2{
//                     margin-bottom: 50px;
//                     font-size: 2rem;
//                 }
//                 h1{
//                     font-size: 3rem;
//                 }
//                 input{
//                     width: 80%;
//                     height: 20px;
//                     border-radius: 10px;
//                     border: 1px solid rgba(0, 0, 0, 0.197);
//                     margin: 10px;
//                     padding: 10px;
//                     font-size: 1rem;
//                 }
//                 button{
//                     height: 40px;
//                     width: 90px;
//                     padding: 8px;
//                     font-size: 1rem;
//                     margin: 20px;
//                     border-radius: 10px;
//                     border: none;
//                     background-color: rgb(203, 203, 241);
//                 }
//                 .submit-button{
//                     background-color: rgb(24, 214, 24);
//                     width: 90%;
//                     color: white;
//                 }
//                 .count{
//                     background-color: lightblue;
//                     width: 30px;
//                     text-align: center;
//                     border-radius: 50%;
//                     box-shadow: 1px 1px 2px 2px rgba(255, 255, 255, 0.337);
//                 }
//                 .add-button{
//                     height: 60px;
//                     width: 60px;
//                     font-size: 2rem;
//                     border-radius: 10px;
//                     border: none;
//                     background-color: rgb(109, 209, 243);
//                     color: white;
//                     position: absolute;
//                     right: 20px;
//                     cursor: pointer;
//                 }
//                 .complaint-desc{
//                     height: 120px;
//                     text-overflow: ellipsis;
//                     overflow: hidden;
//                     margin-bottom: 20px;
//                 }
//                 .suggestion{
//                     height: 40px;
//                     margin-bottom: 0;
//                     text-overflow: ellipsis;
//                     overflow: hidden;
//                 }
//                 .more{
//                     color: rgb(75, 134, 134);
//                     text-shadow: 2px 2px rgb(188, 239, 239);
//                 }
//                 .add-button:hover{
//                     background-color: rgb(57, 181, 223);
//                 }
//                 .heading {
//                     width: 100svw;
//                     text-align: center;
//                     background-color: #C9E9D2;
//                     padding: 10px;
//                     margin-top: 0;
//                     font-size: 2.5rem;
//                     display: flex;
//                     justify-content: center;
//                 }
//                 .complaint-heading {
//                     width: 90%;
//                     display: flex;
//                     justify-content: space-between;
//                     align-items: center;
//                     height: 72px;
//                     text-overflow: ellipsis;
//                     overflow: hidden;
//                     margin-bottom: 40px;
//                 }
//                 .status {
//                     font-size: 1rem;
//                     color: rgb(81, 81, 81);
//                     font-weight: 400;
//                 }   
//                 .count {
//                     font-size: 1.5rem;
//                     color: rgb(81, 81, 81);
//                     position: absolute;
//                     bottom: 10px;
//                     right: 10px;
//                     margin: 0;
//                 }   
//                 .cbox {
//                     height: 80px;
//                     width: 80px;
//                     color: black;
//                     position: relative;
//                     animation: khisakja 1s ease-in-out 2;
//                 }
//                 .complaints {
//                     display: flex;
//                     flex-wrap: wrap;
//                     justify-content: center;
                    
//                 }
//                 .complaint {
//                     border: 1px solid rgba(0, 0, 0, 0.432);
//                     border-radius: 5px;
//                     padding: 10px;
//                     width: 300px;
//                     margin: 10px;
//                     box-shadow: 2px 5px 5px 0 rgba(0, 0, 0, 0.132);
//                     background-color: #FFE3E3;
//                     position: relative; /* Set relative positioning */
//                 }
//                 .complaint:hover {
//                     transform: scale(1.03);
//                     transition: 0.3s;
//                 }
//                 @keyframes khisakja {
//                     0% { transform: rotateZ(30deg); }
//                     25% { transform: rotateZ(-30deg); }
//                     50% { transform: rotateZ(30deg); }
//                     75% { transform: rotateZ(-30deg); }
//                     100% { transform: rotateZ(0deg); }
//                 }
//                 @media (max-width: 550px) {
//                     .heading{
//                         font-size: 1.5rem;
//                         text-align: left;
//                     }
//                     .add-button{
//                         top: 60px;
//                         right: 10px;
//                     }
//                 }
                

//             `}</style>
//         </>
//     );
// }

// export default ComplaintBox;

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { complainData } from '../../../redux/features/complainSlice';

// Assume we're using phosphor-react for icons (can be replaced with any icon library)
import { 
  Package, 
  Plus, 
  Spinner, 
  ArrowRight, 
  Users, 
  CaretDown, 
//   Search,
  Funnel,
  SortAscending
} from 'phosphor-react';

function ComplaintBox() {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const navigate = useNavigate();
    
    useEffect(() => {
        dispatch(complainData())
            .finally(() => setIsLoading(false));
    }, [dispatch]);
    
    const allComplaints = useSelector((state) => state.complains.complains);
    
    // Filter and sort complaints
    const complaints = allComplaints
        .filter(complaint => {
            // Filter by search term
            const matchesSearch = searchTerm === '' || 
                complaint.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Filter by status
            const matchesStatus = filterStatus === 'all' || 
                complaint.status.toLowerCase() === filterStatus.toLowerCase();
                
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            // Sort based on sortBy value
            if (sortBy === 'newest') {
                return new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now());
            } else if (sortBy === 'oldest') {
                return new Date(a.createdAt || Date.now()) - new Date(b.createdAt || Date.now());
            } else if (sortBy === 'mostSupported') {
                return b.acceptedby.length - a.acceptedby.length;
            }
            return 0;
        });
    
    function viewComplaintDetails(id) {
        navigate(`/next/${id}`);
    }
    
    function handleAddComplaint() {
        navigate('/add-complaint');
    }
    
    function getStatusColor(status) {
        switch(status.toLowerCase()) {
            case 'resolved':
                return { bg: '#e6f7ef', text: '#0e6245' };
            case 'pending':
                return { bg: '#fff8e6', text: '#946c00' };
            case 'in progress':
                return { bg: '#e6f1fe', text: '#1a56db' };
            default:
                return { bg: '#f3f4f6', text: '#4b5563' };
        }
    }
    
    function getStatusIcon(status) {
        // Replace with actual icon components as needed
        return <span className="status-dot" style={{ backgroundColor: getStatusColor(status).text }}></span>;
    }
    
    return (
        <div className="complaint-dashboard">
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="app-branding">
                        <div className="logo-container">
                            <Package size={24} weight="fill" />
                        </div>
                        <h1 className="app-name">Complaint Manager</h1>
                    </div>
                    
                    <button 
                        className="add-complaint-btn" 
                        onClick={handleAddComplaint}
                    >
                        <Plus size={20} weight="bold" />
                        <span>New Complaint</span>
                    </button>
                </div>
            </header>
            
            <main className="dashboard-main">
                <div className="page-header">
                    <h2 className="page-title">All Complaints</h2>
                    <p className="page-description">Manage and track all submitted complaints</p>
                </div>
                
                <div className="filters-container">
                    <div className="search-container">
                        {/* <Search size={18} className="search-icon" /> */}
                        <input 
                            type="text" 
                            placeholder="Search complaints..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    
                    <div className="filter-actions">
                        <div className="filter-dropdown">
                            <button className="filter-btn">
                                <Funnel size={16} />
                                <span>Status: {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}</span>
                                <CaretDown size={12} />
                            </button>
                            <div className="dropdown-menu">
                                <button 
                                    className={`dropdown-item ${filterStatus === 'all' ? 'active' : ''}`} 
                                    onClick={() => setFilterStatus('all')}
                                >
                                    All
                                </button>
                                <button 
                                    className={`dropdown-item ${filterStatus === 'pending' ? 'active' : ''}`} 
                                    onClick={() => setFilterStatus('pending')}
                                >
                                    Pending
                                </button>
                                <button 
                                    className={`dropdown-item ${filterStatus === 'in progress' ? 'active' : ''}`} 
                                    onClick={() => setFilterStatus('in progress')}
                                >
                                    In Progress
                                </button>
                                <button 
                                    className={`dropdown-item ${filterStatus === 'resolved' ? 'active' : ''}`} 
                                    onClick={() => setFilterStatus('resolved')}
                                >
                                    Resolved
                                </button>
                            </div>
                        </div>
                        
                        <div className="sort-dropdown">
                            <button className="filter-btn">
                                <SortAscending size={16} />
                                <span>Sort: {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Most Supported'}</span>
                                <CaretDown size={12} />
                            </button>
                            <div className="dropdown-menu">
                                <button 
                                    className={`dropdown-item ${sortBy === 'newest' ? 'active' : ''}`} 
                                    onClick={() => setSortBy('newest')}
                                >
                                    Newest
                                </button>
                                <button 
                                    className={`dropdown-item ${sortBy === 'oldest' ? 'active' : ''}`} 
                                    onClick={() => setSortBy('oldest')}
                                >
                                    Oldest
                                </button>
                                <button 
                                    className={`dropdown-item ${sortBy === 'mostSupported' ? 'active' : ''}`} 
                                    onClick={() => setSortBy('mostSupported')}
                                >
                                    Most Supported
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                {isLoading ? (
                    <div className="loading-state">
                        <Spinner size={40} className="spinner" />
                        <p>Loading complaints...</p>
                    </div>
                ) : complaints.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Package size={48} weight="thin" />
                        </div>
                        <h3>No complaints found</h3>
                        <p>
                            {searchTerm || filterStatus !== 'all' 
                                ? "Try adjusting your filters or search terms" 
                                : "Get started by adding your first complaint"}
                        </p>
                        {!searchTerm && filterStatus === 'all' && (
                            <button 
                                className="add-complaint-btn-empty" 
                                onClick={handleAddComplaint}
                            >
                                <Plus size={18} weight="bold" />
                                <span>Add New Complaint</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="complaints-container">
                        <div className="results-info">
                            <span>{complaints.length} {complaints.length === 1 ? 'complaint' : 'complaints'} found</span>
                        </div>
                        
                        <div className="complaint-list">
                            {complaints.map((complaint) => {
                                const supportCount = complaint.acceptedby.length;
                                const statusStyle = getStatusColor(complaint.status);
                                
                                return (
                                    <div 
                                        key={complaint._id} 
                                        className="complaint-item"
                                        onClick={() => viewComplaintDetails(complaint._id)}
                                    >
                                        <div className="complaint-body">
                                            <div className="complaint-header">
                                                <h3 className="complaint-title">{complaint.category}</h3>
                                                <div 
                                                    className="status-indicator"
                                                    style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                                                >
                                                    {getStatusIcon(complaint.status)}
                                                    {complaint.status}
                                                </div>
                                            </div>
                                            
                                            <p className="complaint-description">{complaint.description}</p>
                                            
                                            {complaint.suggestion && (
                                                <div className="suggestion-box">
                                                    <h4>Suggestion</h4>
                                                    <p>{complaint.suggestion}</p>
                                                </div>
                                            )}
                                            
                                            <div className="complaint-meta">
                                                <span className="supporters">
                                                    <Users size={16} />
                                                    <span>{supportCount} {supportCount === 1 ? 'supporter' : 'supporters'}</span>
                                                </span>
                                                <span className="submission-date">
                                                    {complaint.createdAt 
                                                        ? new Date(complaint.createdAt).toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'short', 
                                                            day: 'numeric' 
                                                          }) 
                                                        : 'Date unknown'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="complaint-action">
                                            <button className="view-details-btn">
                                                <span>View Details</span>
                                                <ArrowRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
            
            <style jsx>{`
                .complaint-dashboard {
                    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    background-color: #f7f9fc;
                    min-height: 100vh;
                    color: #1f2937;
                    line-height: 1.5;
                }
                
                /* Header Styles */
                .dashboard-header {
                    background-color: #ffffff;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    padding: 1rem 1.5rem;
                }
                
                .header-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .app-branding {
                    display: flex;
                    align-items: center;
                }
                
                .logo-container {
                    background-color: #4f46e5;
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    margin-right: 0.75rem;
                }
                
                .app-name {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #111827;
                    margin: 0;
                }
                
                .add-complaint-btn {
                    background-color: #4f46e5;
                    color: white;
                    border: none;
                    padding: 0.625rem 1.25rem;
                    border-radius: 0.375rem;
                    font-weight: 500;
                    font-size: 0.875rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    white-space: nowrap;
                }
                
                .add-complaint-btn:hover {
                    background-color: #4338ca;
                }
                
                /* Main Content Styles */
                .dashboard-main {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem 1.5rem;
                }
                
                .page-header {
                    margin-bottom: 1.5rem;
                }
                
                .page-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #111827;
                    margin: 0 0 0.5rem;
                }
                
                .page-description {
                    font-size: 0.875rem;
                    color: #6b7280;
                    margin: 0;
                }
                
                /* Filters Styles */
                .filters-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                
                .search-container {
                    flex: 1;
                    min-width: 250px;
                    position: relative;
                }
                
                .search-icon {
                    position: absolute;
                    left: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #9ca3af;
                }
                
                .search-input {
                    width: 100%;
                    padding: 0.625rem 1rem 0.625rem 2.5rem;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    background-color: white;
                    color: #1f2937;
                }
                
                .search-input:focus {
                    outline: none;
                    border-color: #4f46e5;
                    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
                }
                
                .filter-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .filter-dropdown, .sort-dropdown {
                    position: relative;
                }
                
                .filter-btn {
                    background-color: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.375rem;
                    padding: 0.625rem 1rem;
                    font-size: 0.875rem;
                    color: #1f2937;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    white-space: nowrap;
                }
                
                .filter-btn:hover {
                    background-color: #f9fafb;
                }
                
                .dropdown-menu {
                    position: absolute;
                    top: calc(100% + 0.5rem);
                    right: 0;
                    background-color: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.375rem;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    min-width: 180px;
                    z-index: 10;
                    display: none;
                }
                
                .filter-dropdown:hover .dropdown-menu,
                .sort-dropdown:hover .dropdown-menu {
                    display: block;
                }
                
                .dropdown-item {
                    padding: 0.5rem 1rem;
                    text-align: left;
                    background: none;
                    border: none;
                    width: 100%;
                    font-size: 0.875rem;
                    color: #1f2937;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                
                .dropdown-item:hover {
                    background-color: #f9fafb;
                }
                
                .dropdown-item.active {
                    background-color: #f3f4f6;
                    color: #4f46e5;
                    font-weight: 500;
                }
                
                /* Results and Complaints Styles */
                .complaints-container {
                    margin-top: 1.5rem;
                }
                
                .results-info {
                    font-size: 0.875rem;
                    color: #6b7280;
                    margin-bottom: 1rem;
                }
                
                .complaint-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .complaint-item {
                    background-color: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                    display: flex;
                    cursor: pointer;
                }
                
                .complaint-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }
                
                .complaint-body {
                    flex: 1;
                    padding: 1.25rem;
                }
                
                .complaint-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 0.75rem;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                
                .complaint-title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #111827;
                    margin: 0;
                }
                
                .status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 500;
                }
                
                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
                
                .complaint-description {
                    font-size: 0.875rem;
                    color: #4b5563;
                    margin: 0 0 1rem;
                    line-height: 1.5;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }
                
                .suggestion-box {
                    background-color: #f3f4f6;
                    border-radius: 0.375rem;
                    padding: 0.75rem 1rem;
                    margin-bottom: 1rem;
                }
                
                .suggestion-box h4 {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #4b5563;
                    margin: 0 0 0.375rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                .suggestion-box p {
                    font-size: 0.875rem;
                    color: #1f2937;
                    margin: 0;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }
                
                .complaint-meta {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 1rem;
                    font-size: 0.75rem;
                    color: #6b7280;
                }
                
                .supporters {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }
                
                .complaint-action {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.25rem;
                    background-color: #f9fafb;
                    border-left: 1px solid #e5e7eb;
                }
                
                .view-details-btn {
                    background: none;
                    border: none;
                    color: #4f46e5;
                    font-size: 0.875rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    cursor: pointer;
                    padding: 0.5rem;
                    transition: color 0.2s;
                }
                
                .view-details-btn:hover {
                    color: #4338ca;
                }
                
                /* Loading and Empty States */
                .loading-state, .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem 2rem;
                    text-align: center;
                }
                
                .spinner {
                    animation: spin 1s linear infinite;
                    color: #4f46e5;
                    margin-bottom: 1rem;
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .empty-icon {
                    width: 80px;
                    height: 80px;
                    background-color: #f3f4f6;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #9ca3af;
                    margin-bottom: 1.5rem;
                }
                
                .empty-state h3 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #111827;
                    margin: 0 0 0.5rem;
                }
                
                .empty-state p {
                    font-size: 0.875rem;
                    color: #6b7280;
                    margin: 0 0 1.5rem;
                }
                
                .add-complaint-btn-empty {
                    background-color: #4f46e5;
                    color: white;
                    border: none;
                    padding: 0.625rem 1.25rem;
                    border-radius: 0.375rem;
                    font-weight: 500;
                    font-size: 0.875rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                }
                
                /* Responsive Styles */
                @media (max-width: 768px) {
                    .filters-container {
                        flex-direction: column;
                    }
                    
                    .filter-actions {
                        width: 100%;
                    }
                    
                    .filter-dropdown, .sort-dropdown {
                        flex: 1;
                    }
                    
                    .filter-btn {
                        width: 100%;
                        justify-content: space-between;
                    }
                    
                    .complaint-item {
                        flex-direction: column;
                    }
                    
                    .complaint-action {
                        padding: 0.75rem;
                        border-left: none;
                        border-top: 1px solid #e5e7eb;
                    }
                    
                    .view-details-btn {
                        width: 100%;
                        justify-content: center;
                    }
                }
                
                @media (max-width: 480px) {
                    .app-name {
                        font-size: 1.125rem;
                    }
                    
                    .add-complaint-btn span {
                        display: none;
                    }
                    
                    .complaint-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .status-indicator {
                        margin-top: 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
}

export default ComplaintBox;