import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NoticeModal from './NoticeModal';

function Noticebox({ data }) { 
    const [notice, setNotice] = useState(null); 
    const [showless, setShow] = useState(false); 
    const [modalOpen, setModalOpen] = useState(false);
    const [modalId, setModalId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (data) setNotice(data);
    }, [data]);

    const navigateToFullNotice = (id) => {
        // open modal overlay instead of navigating to legacy route
        setModalId(id);
        setModalOpen(true);
    };

    if (!notice) {
        return <div>!! Nothing to show !!</div>; 
    }

    return (
        <div className="complaint" key={notice._id} onClick={() => navigateToFullNotice(notice._id)}>
            <h2 className="complaint-heading" title="Complaint Title">
                {notice.category}
            </h2>
            <h1 className="notice-title" >
                {notice.title}
            </h1>
            {/* <p className="complaint-desc">{notice.Body}</p> */}
            
            <div className="p-4">
                <button
                    onClick={(e) => { e.stopPropagation(); setShow(!showless); }}
                    className="text-blue-500 hover:underline mb-2"
                >
                    {showless ? 'Show Less' : 'Show More'}
                </button>
                <div className={`transition-max-height duration-300 ease-in-out ${showless ? 'max-h-40' : 'max-h-16'} overflow-hidden`}>
                    <p>
                        {showless ? notice.Body : `${notice.Body.substring(0, 30)}...`}
                    </p>
                </div>
            </div>
            
            <style jsx>{`
                *{
                    padding: 0;
                    margin: 0;
                }
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
                    background-color: #FEF9F2;
                }
                h2{
                    margin-bottom: 50px;
                    font-size: 1.5rem;
                }
                h1{
                    font-size: 3rem;
                }
                .heading {
                    width: 100svw;
                    background-color: #C9E9D2;
                    padding-top: 30px;
                    margin-top: 0;
                    font-size: 2.5rem;
                    display: flex;
                    justify-content: center;
                    text-align: center;
                }
                .notice-title{
                    width: 95%;
                    display: flex;
                    font-size:2.5rem;
                    justify-content: center;
                    align-items: center;
                    margin: 10px;
                    margin-bottom: 20px;
                    text-overflow: ellipsis;
                    overflow: hidden;
                }
                .complaint-heading {
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 52px;
                    text-overflow: ellipsis;
                    overflow: hidden;
                    margin: 0px;
                }
                .cbox {
                    height: 80px;
                    width: 80px;
                    color: black;
                    position: relative;
                    animation: khisakja 1s ease-in-out 2;
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
                    background-color: lightblue;
                    position: relative;
                }
                .more{
                    margin:20px;
                }
                .complaint:hover {
                    transform: scale(1.03);
                    transition: 0.3s;
                }
                @keyframes khisakja {
                    0% { transform: rotateZ(30deg); }
                    25% { transform: rotateZ(-30deg); }
                    50% { transform: rotateZ(30deg); }
                    75% { transform: rotateZ(-30deg); }
                    100% { transform: rotateZ(0deg); }
                }
                @media (max-width: 550px) {
                    .heading{
                        font-size: 1.5rem;
                        text-align: left;
                    }
                    .add-button{
                        top: 60px;
                        right: 10px;
                    }
                }
            `}</style>
        </div>
            {modalOpen && <NoticeModal id={modalId} onClose={() => setModalOpen(false)} />}
    );
}




export default Noticebox;