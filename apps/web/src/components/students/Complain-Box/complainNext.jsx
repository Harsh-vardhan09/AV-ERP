// import { useDispatch, useSelector } from "react-redux";
// import { useParams } from 'react-router-dom';
// import axios from "axios";
// import { useEffect } from "react";
// import { complainData } from "../../../redux/features/complainSlice";
// function ComplaintNext() {
//     const dispatch = useDispatch();
//     useEffect(()=>{
//         dispatch(complainData())          
//     },[])
//     const { id } = useParams();
//     const count = 10;
//     const data = useSelector((state)=>state.complains.complains);
//     const complain = data?.filter((e)=>id==e._id);
//     const suggestion  = complain[0]?.acceptedby?.filter(c=>(!(c.comments==="")));
    

//     async function changeStatus() {
//         const value = document.getElementById("status").value;
//         document.getElementById("showstatus").innerText = value;
//         await axios.patch(`${import.meta.env.VITE_PORT}/api/v1/complain/change/status`,{
//             "id":id,
//             "status":value
         
             
//          })

//     }
    
//     function handleClick() {
//         document.getElementById("cs").style.display = "block";
//         setTimeout(() => {
//             document.getElementById("cs").classList.add("fade-in");
//         }, 10);
//     }

//     function close() {
//         document.getElementById("cs").classList.remove("fade-in");
//         setTimeout(() => {
//             document.getElementById("cs").style.display = "none";
//         }, 300);
//     }

//     return (
//         <>
//         { complain.length === 0 ?<h1>Loading your data</h1> : <><div className="main">
//                 <h1 className="category" title="Complaint Category">
//                     {complain[0].category}
//                     <p id="showstatus">{complain[0].status}</p>
//                 </h1>
//                 <p className="desc">
//                   {complain[0].description}
//                 </p>
//                 <h2>Complain Count</h2>
//                 <p>{complain[0].acceptedby.length}</p>
                
//                 <section className="suggestion-box">
//                     <h2>Suggestions:</h2>
//                     <h3>1. Repairing required</h3>
                    
//                 </section>
//                 <button onClick={handleClick}>Change Status</button>
//             </div>
//             <div id="cs" className="modal">
//                 <h2 className="cs-heading">
//                     Change Status
//                     <button onClick={close} className="close-button">❌</button>
//                 </h2>
//                 <label htmlFor="status">Change status to:</label>
//                 <select id="status">
//                     <option value="Pending">Pending</option>
//                     <option value="In Progress">In Progress</option>
//                     <option value="Resolved">Resolved</option>
//                 </select>
//                 <button onClick={changeStatus}>Change</button>
//             </div> </> }
//             <style jsx>
//                 {`
//                     * {
//                         font-family: Arial, Helvetica, sans-serif;
//                         box-sizing: border-box;
//                     }
//                     body {
//                         display: flex;
//                         justify-content: center;
//                         align-items: center;
//                         height: 100vh;
//                         margin: 0;
//                         background: #BED7DC;
//                     }
//                     .main {
//                         width: 80vw;
//                         border: 1px solid #ccc;
//                         border-radius: 8px;
//                         padding: 30px;
//                         background-color: white;
//                         box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
//                     }
//                     .modal {
//                         display: none;
//                         z-index: 1;
//                         border-radius: 8px;
//                         padding: 20px;
//                         width: 30vw;
//                         position: fixed;
//                         top: 30%;
//                         left: 35%;
//                         background-color: #fffbf0;
//                         box-shadow: 5px 5px 15px rgba(0, 0, 0, 0.2);
//                         transition: opacity 0.3s ease, transform 0.3s ease;
//                         opacity: 0;
//                         transform: translateY(-10px);
//                     }
//                     select{
//                         margin: 0 50px;
//                     }
//                     .fade-in {
//                         display: block;
//                         opacity: 1;
//                         transform: translateY(0);
//                     }
//                     .category {
//                         display: flex;
//                         justify-content: space-between;
//                         background-color: #8080805b;
//                         padding: 10px;
//                         border-radius: 5px;
//                         font-size: 2.5rem;
//                     }
//                     #showstatus {
//                         font-size: 1rem;
//                         font-weight: 500;
//                         color: rgb(109, 108, 108);
//                     }
//                     .cs-heading {
//                         width: 100%;
//                         display: flex;
//                         justify-content: space-between;
//                         margin-bottom: 15px;
//                     }
//                     button {
//                         cursor: pointer;
//                         padding: 8px 12px;
//                         border: none;
//                         border-radius: 5px;
//                         background-color: #007bff;
//                         color: white;
//                         transition: background-color 0.3s;
//                     }
//                     button:hover {
//                         background-color: #0056b3;
//                     }
//                     .close-button {
//                         background: none;
//                         border: none;
//                         color: #ff0000;
//                         font-size: 1.5rem;
//                     }
//                     .suggestion-box {
//                         padding: 10px;
//                         border-radius: 5px;
//                         margin-top: 10px;
//                     }
//                     .suggestion-box h2 {
//                         margin-bottom: 10px;
//                     }
//                     .suggestion-box p, h3 {
//                         margin-left: 30px;
//                     }
//                 `}
//             </style>
//         </>
//     );
// }

// export default ComplaintNext;
import { useDispatch, useSelector } from "react-redux";
import { useParams } from 'react-router-dom';
import axios from "axios";
import { useEffect, useState } from "react";
import { complainData } from "../../../redux/features/complainSlice";

function ComplaintNext() {
    const dispatch = useDispatch();
    const { id } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    useEffect(() => {
        dispatch(complainData());
        // Add a small delay to prevent flash of loading state for fast responses
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, [dispatch]);
    
    const data = useSelector((state) => state.complains.complains);
    const complain = data?.filter((e) => id === e._id);
    const suggestion = complain[0]?.acceptedby?.filter(c => (!(c.comments === "")));
    
    async function changeStatus() {
        const value = document.getElementById("status").value;
        try {
            await axios.patch(`${import.meta.env.VITE_PORT}/api/v1/complain/change/status`, {
                "id": id,
                "status": value
            });
            // Close modal and update UI without reload
            toggleModal();
            // Update the status in the UI
            document.getElementById("showstatus").innerText = value;
            document.getElementById("status-badge").className = `status-badge ${value.toLowerCase().replace(" ", "-")}`;
        } catch (error) {
            console.error("Error updating status:", error);
        }
    }
    
    function toggleModal() {
        setIsModalOpen(!isModalOpen);
    }
    
    if (isLoading || complain.length === 0) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading complaint details...</p>
            </div>
        );
    }
    
    return (
        <div className="complaint-container">
            <div className="complaint-card">
                <div className="complaint-header">
                    <h1>{complain[0].category}</h1>
                    <div id="status-badge" className={`status-badge ${complain[0].status.toLowerCase().replace(" ", "-")}`}>
                        <span id="showstatus">{complain[0].status}</span>
                    </div>
                </div>
                
                <div className="complaint-section">
                    <h2>Description</h2>
                    <p className="complaint-description">{complain[0].description}</p>
                </div>
                
                <div className="complaint-section">
                    <div className="complaint-stats">
                        <div className="stat-box">
                            <h3>Complaint ID</h3>
                            <p className="stat-value">{complain[0]._id.slice(-8)}</p>
                        </div>
                        <div className="stat-box">
                            <h3>Support Count</h3>
                            <p className="stat-value">{complain[0].acceptedby.length}</p>
                        </div>
                    </div>
                </div>
                
                <div className="complaint-section">
                    <h2>Suggestions</h2>
                    {suggestion && suggestion.length > 0 ? (
                        <ul className="suggestions-list">
                            {suggestion.map((item, index) => (
                                <li key={index} className="suggestion-item">
                                    <p>{item.comments || "No comment provided"}</p>
                                    <small>Suggested by: {item.userid || "Anonymous"}</small>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="suggestion-item">
                            <p>1. Repairing required</p>
                        </div>
                    )}
                </div>
                
                <div className="action-buttons">
                    <button className="primary-button" onClick={toggleModal}>
                        Update Status
                    </button>
                    <button className="secondary-button">
                        View History
                    </button>
                </div>
            </div>
            
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Update Complaint Status</h2>
                            <button onClick={toggleModal} className="close-button">×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label htmlFor="status">Select new status:</label>
                                <select id="status" defaultValue={complain[0].status}>
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Resolved">Resolved</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="secondary-button" onClick={toggleModal}>Cancel</button>
                            <button className="primary-button" onClick={changeStatus}>Update</button>
                        </div>
                    </div>
                </div>
            )}
            
            <style jsx>{`
                * {
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    box-sizing: border-box;
                }
                
                body {
                    margin: 0;
                    background-color: #f5f7fa;
                    color: #333;
                }
                
                .complaint-container {
                    max-width: 900px;
                    margin: 2rem auto;
                    padding: 0 1rem;
                }
                
                .complaint-card {
                    background-color: #fff;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                    overflow: hidden;
                }
                
                .complaint-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem 2rem;
                    background-color: #f8fafc;
                    border-bottom: 1px solid #eaeef2;
                }
                
                .complaint-header h1 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #1a202c;
                }
                
                .status-badge {
                    padding: 0.5rem 1rem;
                    border-radius: 50px;
                    font-weight: 500;
                    font-size: 0.875rem;
                }
                
                .status-badge.pending {
                    background-color: #fff8e1;
                    color: #b7791f;
                }
                
                .status-badge.in-progress {
                    background-color: #e6f7ff;
                    color: #0369a1;
                }
                
                .status-badge.resolved {
                    background-color: #e6fffa;
                    color: #047857;
                }
                
                .complaint-section {
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid #eaeef2;
                }
                
                .complaint-section:last-child {
                    border-bottom: none;
                }
                
                .complaint-section h2 {
                    margin-top: 0;
                    margin-bottom: 1rem;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #334155;
                }
                
                .complaint-description {
                    line-height: 1.6;
                    color: #4b5563;
                }
                
                .complaint-stats {
                    display: flex;
                    gap: 2rem;
                    margin-bottom: 1rem;
                }
                
                .stat-box {
                    flex: 1;
                    background-color: #f8fafc;
                    border-radius: 8px;
                    padding: 1rem;
                }
                
                .stat-box h3 {
                    margin: 0 0 0.5rem 0;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #64748b;
                }
                
                .stat-value {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #0f172a;
                }
                
                .suggestions-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .suggestion-item {
                    background-color: #f8fafc;
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                }
                
                .suggestion-item p {
                    margin: 0 0 0.5rem 0;
                    color: #334155;
                }
                
                .suggestion-item small {
                    color: #64748b;
                    font-size: 0.875rem;
                }
                
                .action-buttons {
                    display: flex;
                    gap: 1rem;
                    padding: 1.5rem 2rem;
                    background-color: #f8fafc;
                }
                
                .primary-button {
                    background-color: #2563eb;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 0.75rem 1.5rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                
                .primary-button:hover {
                    background-color: #1d4ed8;
                }
                
                .secondary-button {
                    background-color: white;
                    color: #64748b;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 0.75rem 1.5rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .secondary-button:hover {
                    background-color: #f1f5f9;
                    color: #334155;
                }
                
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 50;
                    animation: fadeIn 0.2s ease-out;
                }
                
                .modal-content {
                    background-color: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 500px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    animation: slideIn 0.3s ease-out;
                }
                
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid #eaeef2;
                }
                
                .modal-header h2 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                }
                
                .close-button {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #64748b;
                    cursor: pointer;
                    transition: color 0.2s;
                    line-height: 1;
                    padding: 0;
                }
                
                .close-button:hover {
                    color: #1e293b;
                }
                
                .modal-body {
                    padding: 1.5rem;
                }
                
                .form-group {
                    margin-bottom: 1.5rem;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 0.75rem;
                    font-weight: 500;
                    color: #334155;
                }
                
                .form-group select {
                    width: 100%;
                    padding: 0.75rem;
                    border-radius: 6px;
                    border: 1px solid #cbd5e1;
                    background-color: white;
                    font-size: 1rem;
                    color: #1e293b;
                    transition: border-color 0.2s;
                }
                
                .form-group select:focus {
                    outline: none;
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }
                
                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    padding: 1.25rem 1.5rem;
                    border-top: 1px solid #eaeef2;
                }
                
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 50vh;
                    color: #64748b;
                }
                
                .loading-spinner {
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #2563eb;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideIn {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                @media (max-width: 768px) {
                    .complaint-stats {
                        flex-direction: column;
                        gap: 1rem;
                    }
                    
                    .complaint-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                    
                    .action-buttons {
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
}

export default ComplaintNext;