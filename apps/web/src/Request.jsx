import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';

function Request() {
    const complaintsData = [
        { id: 1, category: "Student", desc: "Lorem ipsum dolor sit amet.", suggestion: "Repairing required", complaintby: "solo" },
        { id: 2, category: "Academic", desc: "Lorem ipsum dolor sit amet.", suggestion: "Repairing required", complaintby: "solo" },
        { id: 3, category: "College Resources", desc: "Lorem ipsum dolor sit amet.", suggestion: "Repairing required", complaintby: "solo" },
        { id: 4, category: "Infrastructure Services", desc: "Lorem ipsum dolor sit amet.", suggestion: "Repairing required", complaintby: "group" },
        { id: 5, category: "Student", desc: "Lorem ipsum dolor sit amet.", suggestion: "Repairing required", complaintby: "solo" },
        { id: 6, category: "Student", desc: "Lorem ipsum dolor sit amet.", suggestion: "Repairing required", complaintby: "all" },
        { id: 7, category: "Student", desc: "Lorem ipsum dolor sit amet.", suggestion: "Repairing required", complaintby: "solo" },
        { id: 8, category: "Student", desc: "Lorem ipsum dolor sit amet.", suggestion: "Repairing required", complaintby: "solo" }
    ];

    const [acceptedComplaints, setAcceptedComplaints] = useState({});
    const [deniedComplaints, setDeniedComplaints] = useState({});
    const [view, setView] = useState('all'); 

    const activeComplaints = complaintsData.filter(c => !deniedComplaints[c.id]);
    const accepted = complaintsData.filter(c => acceptedComplaints[c.id]);
    const myComplaints = complaintsData.filter(c => c.complaintby === "me");

    function clickAccept(id) {
        setAcceptedComplaints(prev => ({ ...prev, [id]: true }));
    }

    function clickDeny(id) {
        setDeniedComplaints(prev => ({ ...prev, [id]: true }));
    }

    return (
        <>
            <section className='main'>
                <h1 className='heading'>
                    COMPLAINT REQUESTS
                    <div className='cbox'><FontAwesomeIcon icon={faBox} /></div>
                </h1>
                <div className="navbar">
                    <p onClick={() => setView('all')} className={view === 'all' ? 'active' : ''}>All</p>
                    <p onClick={() => setView('accepted')} className={view === 'accepted' ? 'active' : ''}>Accepted</p>
                    <p onClick={() => setView('myself')} className={view === 'myself' ? 'active' : ''}>Complaints by Me</p>
                </div>

                {view === 'all' && activeComplaints.length > 0 ? (
                    <div className='complaints'>
                        {activeComplaints.map(c => (
                            <div className='complaint' key={c.id}>
                                <h2 className='complaint-heading'>{c.category}</h2>
                                <p>{c.desc}</p>
                                <p><b>Suggestions:</b> {c.suggestion}</p>
                                {!acceptedComplaints[c.id] ? (
                                    <>
                                        <button onClick={() => clickAccept(c.id)} className='accept-btn'>Accept</button>
                                        <button className='deny-btn' onClick={() => clickDeny(c.id)}>Deny</button>
                                    </>
                                ) : (
                                    <button className='accepted-btn'>Accepted</button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : view === 'all' ? (
                    <div className='no-request'>No Requests available</div>
                ) : null}

                {view === 'accepted' && (
                    <>
                        {accepted.length > 0 ? (
                            <div className='complaints'>
                                {accepted.map(c => (
                                    <div className='complaint' key={c.id}>
                                        <h2 className='complaint-heading'>{c.category}</h2>
                                        <p>{c.desc}</p>
                                        <p><b>Suggestions:</b> {c.suggestion}</p>
                                        <button className='accepted-btn'>Accepted</button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className='no-request'>No Accepted Requests</div>
                        )}
                    </>
                )}

                {view === 'myself' && (
                    <>
                        
                        {myComplaints.length > 0 ? (
                            <div className='complaints'>
                                {myComplaints.map(c => (
                                    <div className='complaint' key={c.id}>
                                        <h2 className='complaint-heading'>{c.category}</h2>
                                        <p>{c.desc}</p>
                                        <p><b>Suggestions:</b> {c.suggestion}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className='no-request'>No Complaints By You</div>
                        )}
                    </>
                )}
            </section>
            <style jsx>{`
                body {
                    background-color: #FEF9F2;
                }
                .main {
                    height: 100vh;
                    padding: 0;
                    margin: 0;
                    font-family: Arial, Helvetica, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                h2 {
                    margin-bottom: 50px;
                    font-size: 2rem;
                }
                h1 {
                    font-size: 3rem;
                }
                button {
                    height: 40px;
                    width: 90px;
                    padding: 8px;
                    font-size: 1rem;
                    margin: 20px;
                    border-radius: 10px;
                    border: none;
                    background-color: rgb(203, 203, 241);
                    
                }
                .accept-btn {
                    background-color: rgb(105, 184, 105);
                    color: white;
                    width:130px;
                    margin: 10px;
                    cursor: pointer;
                }
                .accept-btn:hover {
                    background-color: rgb(78, 132, 78);
                }
                .deny-btn {
                    background-color: rgb(229, 88, 88);
                    color: white;
                    width:130px;
                    margin: 10px;
                }
                .navbar{
                    background-color: rgb(12, 12, 54);
                    width: 100vw;
                    display: flex;
                    justify-content: end;
                    margin-top: 0;
                    padding: 5px;
                    color: white;
                    margin-bottom: 20px;
                }
                .navbar p{
                    margin:  0 20px;
                    padding: 10px;
                }
                .active{
                    background-color: #1b1b64;
                }
                .mecomplaint{
                    display: none;
                    height: 500px;
                }
                .deny-btn:hover {
                    background-color: rgb(170, 62, 62);
                }
                
                .accepted-btn{
                    width: 90%;
                    margin: 10px;
                    background-color: rgb(154, 151, 151);
                    color: white;
                }
                .no-request{
                    font-size: 1.6rem;
                    color: rgba(0, 0, 0, 0.497);
                    margin-top: 50px;
                }
                .heading {
                    display: flex;
                    justify-content: center;
                    width: 100%;
                    text-align: center;
                    background-color: #C9E9D2;
                    padding: 10px;
                    margin-top: 0;
                    font-size: 2.5rem;
                    margin-bottom: 0;
                }
                .complaints {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                .complaint {
                    border: 1px solid rgba(0, 0, 0, 0.432);
                    border-radius: 5px;
                    padding: 10px;
                    width: 300px;
                    margin: 10px;
                    box-shadow: 2px 5px 5px 0 rgba(0, 0, 0, 0.132);
                    background-color: #FFE3E3;
                    position: relative;
                }
                .complaint:hover {
                    transform: scale(1.03);
                    transition: 0.3s;
                }
                .cbox {
                    height: 80px;
                    width: 80px;
                    color: black;
                    position: relative;
                    animation: khisakja 1s ease-in-out 2;
                }
                @keyframes khisakja {
                    0% { transform: rotateZ(30deg); }
                    25% { transform: rotateZ(-30deg); }
                    50% { transform: rotateZ(30deg); }
                    75% { transform: rotateZ(-30deg); }
                    100% { transform: rotateZ(0deg); }
                }
                .complaint-heading{
                    height: 72px;
                    text-overflow: ellipsis;
                    overflow: hidden;
                }
                
            `}</style>
        </>
    );
}

export default Request;
