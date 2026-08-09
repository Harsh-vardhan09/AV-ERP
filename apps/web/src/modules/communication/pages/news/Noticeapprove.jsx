  
import { Archive } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

function Noticeapprove() {
    const navigate=useNavigate()
    const NoticesData = [
        { id: 1, category: "Events", desc: "Lorem ipsum dolor sit amet.", title:"Abcd" },
        { id: 2, category: "Academic", desc: "Lorem ipsum dolor sit amet.", title:"Abcd" },
        { id: 3, category: "Announcements", desc: "Lorem ipsum dolor sit amet.", title:"Abcd" },
        { id: 4, category: "Academic", desc: "Lorem ipsum dolor sit amet.", title:"Abcd" },
        { id: 5, category: "Announcements", desc: "Lorem ipsum dolor sit amet.", title:"Abcd"  },
        { id: 6, category: "Events", desc: "Lorem ipsum dolor sit amet.", title:"Abcd" },
        { id: 7, category: "Announcements", desc: "Lorem ipsum dolor sit amet.", title:"Abcd"  },
        { id: 8, category: "Academic", desc: "Lorem ipsum dolor sit amet.", title:"Abcd"  }
    ];
    
    const newroutehandler = () => {
        navigate('/addnotice');
    }
    
    const [acceptedNotices, setAcceptedNotices] = useState({});
    const [deniedNotices, setDeniedNotices] = useState({});
    const [view, setView] = useState('all'); 

    const activeNotices = NoticesData.filter(c => !deniedNotices[c.id]);
    const accepted = NoticesData.filter(c => acceptedNotices[c.id]);

    function clickAccept(id) {
        setAcceptedNotices(prev => ({ ...prev, [id]: true }));
    }

    function clickDeny(id) {
        setDeniedNotices(prev => ({ ...prev, [id]: true }));
    }
    return (
        <>
            <section className='main'>
                <h1 className='heading'>
                    NOTICE REQUESTS
                        <div className='cbox'><Archive size="1em" /></div>
                    <button onClick={newroutehandler} className='add-btn mx-20'>Add New</button>
                </h1>
                <div className="navbar">
                    <p onClick={() => setView('all')} className={view === 'all' ? 'active' : ''}>All</p>
                    <p onClick={() => setView('accepted')} className={view === 'accepted' ? 'active' : ''}>Accepted</p>
                </div>

                {view === 'all' && activeNotices.length > 0 ? (
                    <div className='Notices'>
                        {activeNotices.map(n => (
                            <div className='Notice' key={n.id}>
                                <h3 className='Notice-heading'>{n.category}</h3>
                                <h1 className='Notice-title'>{n.title}</h1>
                                <p>{n.desc}</p>
                                {!acceptedNotices[n.id] ? (
                                    <>
                                        <button onClick={() => clickAccept(n.id)} className='accept-btn'>Accept</button>
                                        <button className='deny-btn' onClick={() => clickDeny(n.id)}>Deny</button>
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
                            <div className='Notices'>
                                {accepted.map(n => (
                                    <div className='Notice' key={n.id}>
                                        <h3 className='Notice-heading'>{n.category}</h3>
                                        <h1 className='Notice-title'>{n.title}</h1>
                                        <p>{n.desc}</p>
                                        <button className='accepted-btn'>Accepted</button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className='no-request'>No Accepted Requests</div>
                        )}
                    </>
                )}
            </section>
            <style jsx>{`
                *{
                    margin:0;
                    padding:0;
                }
                body {
                    background-color: #FEF9F2;
                }
                .main {
                    height: 100vh;
                    font-family: Arial, Helvetica, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                h3 {
                    margin-bottom: 20px;
                    font-size: 1.6rem;
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
                    align-items: center;
                    width: 100%;
                    text-align: center;
                    background-color: #C9E9D2;
                    padding: 10px;
                    margin-top: 0;
                    font-size: 2.5rem;
                    margin-bottom: 0;
                }
                .Notices {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                .Notice {
                    border: 1px solid rgba(0, 0, 0, 0.432);
                    border-radius: 5px;
                    padding: 10px;
                    width: 300px;
                    margin: 10px;
                    box-shadow: 2px 5px 5px 0 rgba(0, 0, 0, 0.132);
                    background-color: #FFE3E3;
                    position: relative;
                }
                .Notice p{
                    font-size: 1.2rem;
                    padding: 5px;
                    margin: 5px;
                    margin-bottom: 20px;
                }
                .Notice:hover {
                    transform: scale(1.03);
                    transition: 0.3s;
                }
                .cbox {
                    height: 80px;
                    width: 80px;
                    color: black;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    animation: khisakja 1s ease-in-out 2;
                }
                @keyframes khisakja {
                    0% { transform: rotateZ(30deg); }
                    25% { transform: rotateZ(-30deg); }
                    50% { transform: rotateZ(30deg); }
                    75% { transform: rotateZ(-30deg); }
                    100% { transform: rotateZ(0deg); }
                }
                .Notice-heading{
                    height: 35px;
                    text-overflow: ellipsis;
                    overflow: hidden;
                }
                .Notice-title{
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 2.5rem;
                    margin-bottom: 20px;
                }*{
                    margin:0;
                    padding:0;
                }
                body {
                    background-color: #FEF9F2;
                }
                .main {
                    height: 100vh;
                    font-family: Arial, Helvetica, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                h3 {
                    margin-bottom: 20px;
                    font-size: 1.6rem;
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
                .Notices {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                .Notice {
                    border: 1px solid rgba(0, 0, 0, 0.432);
                    border-radius: 5px;
                    padding: 10px;
                    width: 300px;
                    margin: 10px;
                    box-shadow: 2px 5px 5px 0 rgba(0, 0, 0, 0.132);
                    background-color: #FFE3E3;
                    position: relative;
                }
                .Notice p{
                    font-size: 1.2rem;
                    padding: 5px;
                    margin: 5px;
                    margin-bottom: 20px;
                }
                .Notice:hover {
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
                .Notice-heading{
                    height: 35px;
                    text-overflow: ellipsis;
                    overflow: hidden;
                }
                .Notice-title{
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 2.5rem;
                    margin-bottom: 20px;
                }
            `}</style>
        </>
    );
}

export default Noticeapprove;