import React,{useState} from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMessage, faPeopleGroup, faMagnifyingGlass, faEllipsisVertical, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import profilepic from './profilepic.jpg';
import { useGetallchatQuery } from '../../redux/api/chat';


function ChatApp() {
    const [groupstate,setgroupstate]=useState(true);
    const {data,isLoading,isError}=useGetallchatQuery();
    console.log(data)
    if(isLoading){
        console.log("loading........")
    }

    if(isError){
        console.log("error........")

    }
   const grouphadler1=()=>{
    setgroupstate(true);
   }
   const grouphandler=()=>{
    setgroupstate(false);
   }
   
    // console.log(data);
    const chats = data?.chats;     
            const [searchTerm, setSearchTerm] = useState('');
            const [activeChat, setActiveChat] = useState(null);
            const [messages, setMessages] = useState([]);
            const [newMessage, setNewMessage] = useState('');
            const filteredChats = chats?.filter(chat =>
                chat.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

            const filteredChats1 = chats?.filter(chat =>
                chat.groupchat === true &&
                chat.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

            let width = window.innerWidth;
            const handleChatClick = (chat) => {
                
                if(width <=768){
                    document.getElementById("sidebar1").style.display="none";
                    document.getElementById("chat-content").style.display="flex";
                }
                setActiveChat(chat);
                setMessages([{
                    id: 1,
                    text: 'Hello!',
                    sender: 'You',
                }, {
                    id: 2,
                    text: 'How are you?',
                    sender: chat.name,
                }]);
            };
            const handleSendMessage = () => {
                if (newMessage.trim() !== '') {
                    setMessages([...messages, { id: messages.length + 1, text: newMessage, sender: 'You' }]);
                    setNewMessage('');
                }
            };
            const back=()=>{
                if(width <768){
                    document.getElementById("sidebar1").style.display="block";
                    document.getElementById("chat-content").style.display="none";
                }
            }

    return (<>
        <div className='main'>
            <div className="sidebar1" id='sidebar1'>
                <div className="bar">
                    <FontAwesomeIcon onClick={grouphadler1} className="icon-chat" icon={faMessage} />
                    <FontAwesomeIcon onClick={grouphandler} className='icon-chat' icon={faPeopleGroup} />
                    <div className='add-icon' onClick={() => alert('Add chat clicked!')}>+</div>
                    <img className='profilepic' src={profilepic} alt='Profile' />
                </div>

                <div className='chatbox'>
                    <div className="search-box">
                        <p className='chat-heading'>
                           Chats <FontAwesomeIcon title='Menu' className='icon-menu' icon={faEllipsisVertical} />
                         </p>
                            <input className='search' placeholder='Search...' onChange={(e) => setSearchTerm(e.target.value)} />
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </div>
                    <div className='chats'>
    {groupstate ? (
        filteredChats?.map((chat) => (
            <div className='chat' key={chat.id} onClick={() => handleChatClick(chat)}>
                <img src={chat.profilepicture} alt='Profile' className='img' />
                <p className='chat-name'>{chat.name}</p>
            </div>
        ))
    ) : (
        filteredChats1?.map((chat) => (
            <div className='chat' key={chat.id} onClick={() => handleChatClick(chat)}>
                <img src={chat.profilepicture} alt='Profile' className='img' />
                <p className='chat-name'>{chat.name}</p>
            </div>
        ))
    )}

                    </div>
                    
                </div>
            </div>
            <div className="chat-content" id='chat-content'>
            {activeChat ? (
                        <>
                            <div className="chat-header">
                                <img src={activeChat.profilepicture
} alt='Profile' className='active-img' />
                                <h2>{activeChat.name}</h2>
                                <FontAwesomeIcon icon={faArrowLeft} className='back-arrow' onClick={back} />
                            </div>
                            <div className='message-list'>
                                {messages.map(msg => (
                                    <div key={msg.id} className={`message ${msg.sender === 'You' ? 'message-sent' : 'message-received'}`}>
                                        <p>{msg.text}</p>
                                    </div>
                                ))}
                            </div>
                            <div className='message-input'>
                                <input
                                    type='text'
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder='Type a message...'
                                />
                                <button onClick={handleSendMessage}>Send</button>
                            </div>
                        </>
                    ) : (
                        <div className='no-chat'>Select a chat to start messaging!</div>
                    )}
                
            </div>
        </div>
        <style jsx>{`
//             *{
//     margin: 0;
//     padding: 0;
// }

.main{
    display: flex;
}
.sidebar1{
    font-family: Arial, Helvetica, sans-serif;
    height: 100svh;
    background-color: #17153B;
    width: 35vw;

}
.bar{
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100px;
    font-size: 1.5rem;
    padding-top: 40px;
    background-color: #2E236C;
    height: 100svh;
    color: rgba(10, 14, 29, 0.704);
    position: fixed;
    color: white;
}
.chat-heading{
    margin: 50px 30px 20px 20px;
    font-size: 2rem;
    font-weight: 700;
    color: rgba(10, 14, 29, 0.816);
    display: flex;
    justify-content: space-between;
    align-items: center;
    color:white;
    width: 100%;
}
.icon-chat{
    margin: 20px;
    cursor: pointer;
}
.icon-chat:hover{
    opacity: 50%;
}
.icon-menu {
    font-size: 30px;
    cursor: "pointer";
    margin: 10px 60px 10px 10px;
}
.icon-menu:hover{
    opacity:70%;
}
.active-img{
    width:50px;
    height: 50px;
    margin-right: 20px;
}
.profilepic{
    position: relative;
    bottom: calc(100% - 950px);
}
.profilepic:hover{
    opacity: 70%;
    cursor: pointer;
}
.add-icon{
    height: 60px;
    width: 60px;
    font-size: 2rem;
    border: none;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    background-color: #1976D2;
}
.add-icon:hover{
    opacity: 50%;
    cursor: pointer;
}
.chatbox{
    margin: 0 0 0 100px;
    height: 100svh;
    position: absolute;
    width: 25vw;
    background-color: #17153B;
}
.chat{
    height: 85px;
    width: 400px;
    background-color: #b7b7b718;
    background-color: #BBDEFB;
    display: flex;
    align-items: center;
    margin: 10px;
    border-bottom: 1px solid gray;
    background-color: #17153B;
    color:white;
    margin-left: 20px;
}
.search-box{
    margin: 0px 20px 10px 20px; 
    border-radius: 10px;
    color: white;
    padding-bottom: 10px;
}
.search{
    height: 20px;
    width: calc(100% - 90px);
    margin: 0 15px;
    border-radius: 10px;   
    padding: 10px;
    border: none;
    background-color: #b7b7b718;
    color: white;
}
.chats{
    position: relative;
    overflow-y: scroll;
    height: 75svh;
    overflow-x: hidden;
}
.icon-search{
    background-color: #b7b7b718;
}
img{
    height: 60px;
    width: 60px;
    border-radius: 50px;
}
.chat-name{
    margin: 10px;
    font-size: 20px;
    cursor: pointer;
}
.chat-name:hover{
    opacity: 60%;
}
title{
    background-color: white;
} 
.back-arrow{
    position: relative;
    right: 2000px;
}
.chat-content {
        margin-left: 0;
        padding: 20px;
        width: 70svw;
        height: 94.5svh;
        background-color: white;
        display: flex;
        flex-direction: column;  
}
.chat-header {
    border-bottom: 1px solid #ccc;
    padding: 10px;
    background-color: #222E35;
    background-color: #FFFFFF;
    font-size: 1.5rem;
    font-weight: bold;
    display: flex;
    color: #1976D2;
    font-family: system-ui;
}
.message-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    font-size: 1.2rem;
}
.message {
    margin: 5px 0;
    padding: 10px;
    border-radius: 10px;
    max-width: 80%;
    clear: both;
}
.message-sent {
    background-color: #BBDEFB;
    margin-left: auto;
    width: 60%;
}
.message-received {
    background-color:#8080803a;
    margin-right: auto;
    width: 60%;
}
.message-input {
    display: flex;
    align-items: center;
    margin-top: 10px;
}
.message-input input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
}
.message-input button {
    padding: 10px 15px;
    margin-left: 10px;
    border: none;
    background-color: #007bff;
    color: white;
    border-radius: 5px;
    cursor: pointer;
}
.message-input button:hover {
    background-color: #0056b3;
}
.no-chat {
    text-align: center;
    font-size: 1.2rem;
    color: #999;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}
     .chats::-webkit-scrollbar {
                    display: none; /* Hide scrollbar */
                } 
    

@media (max-width: 1076px) and (min-width:766px) {
    .bar{
        width: 100px;
        height: 95.5vh;
    }
    .sidebar1{
        width: 50vw;
    }
    .chatbox{
        width: 30vw;
    }
    .chat-content{
        width: 60svw;
    }
    
}
@media (max-width: 766px) {
    .main{
        width: 100vw;
        height: 95vh;
    }
    .chat{
        width: 90vw;
    }
    .bar{
        height: 100%;
    }
    .add-icon{
        left: 80%;
    }
    .profilepic{
        top: 60%;
    }
    body{
        background-color: #17153B;
    }
    .chat-heading{
        font-size: 2rem;
        margin-left: 0px;
    }
    .search{
        margin-left: 0;
    }
    .icon-menu{
        margin-right: 20px;
    }
    .sidebar1{
        width: 100vw;
        height: 100vh;
    }
    .chatbox{
        width: 100vw;
        height: 100vh;
    }
    .chats{
        width: 90vw;
        height: 100vh;
    }
    .profilepic{
        bottom: -580px;
    }
    .chat-content{
        display: none;
        height: 100% ;
        width: 100%;
    }
    .back-arrow{
        font-size: 2rem;
        position: relative;
        right: -15%;
    }
}
        `}</style>
        </>
    );
}

export default ChatApp;