// import wdr from './wdr.jpeg';
// import c from './c.jpeg';
// import cpp from './cpp.jpeg';
// import java1 from './java1.jpeg';
// import wdr2 from './wdr.jpeg';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faBars } from "@fortawesome/free-solid-svg-icons";
// import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';


// function Roadmap(){
//     const Skills = [
//         {id: 1, name:"C++"},
//         {id: 2, name:"Java"},
//         {id: 3, name:"Python"},
//         {id: 4, name:"Java script"},
//         {id: 5, name:"React"},
//         {id: 6, name:"Angular"},
//         {id: 7, name:"Type script"},
//         {id: 8, name:"SOL"},
//         {id: 9, name:"Node.js"},
//         {id: 10, name:"Sprinng boot"},
//         {id: 11, name:"Flutter"},
//         {id: 12, name:"GO"},
//         {id: 13, name:"Rust"},
//         {id: 14, name:"Mongo DB"},
//         {id: 15, name:"AWS"},
//         {id: 16, name:"DSA-C++"},
//         {id: 17, name:"DSA-Java"},
//         {id: 18, name:"DSA-Python"},
//         {id: 19, name:"System Design"},
//         {id: 20, name:"Api Design"},
//         {id: 21, name:"React Native"},];

//     const skillitems = Skills.map(Skill => <li className="li" key={Skill.id}>{Skill.name}</li>);

//     const Roles = [
//         {id: 1, name:"Frontend"},
//         {id: 2, name:"Backend"},
//         {id: 3, name:"DevOps"},
//         {id: 4, name:"Full Stack"},
//         {id: 5, name:"Data Analyst"},
//         {id: 6, name:"AI and Data Scientist"},
//         {id: 7, name:"Android"},
//         {id: 8, name:"iOS"},
//         {id: 9, name:"PostgreSQL"},
//         {id: 10, name:"Blockchain"},
//         {id: 11, name:"QA"},
//         {id: 12, name:"Software Architect"},
//         {id: 13, name:"Cyber Security"},
//         {id: 14, name:"UX Design"},
//         {id: 15, name:"Game Developer"},];

//     const RoleList = Roles.map(Role => <li className="li" key={Role.id}>{Role.name}</li>);

//     return(<>
//         <div className="main">
//             <div className="navbar">
//                 <h2>Unified Campus</h2>
//                 <div className="nav-search">
//                     <input className="search-input" placeholder="Search for roadmaps" type="text"/>
//                     <FontAwesomeIcon className="search-icon" icon={faMagnifyingGlass} />
//                 </div>
//                 <p>Home</p>
//                 <p>Dashboard</p>
//                 <p>Roadmap </p>
//             </div>
//             <hr/>
//             <div className="discription">
//                 <div className="dis-1"><h1>All Roadmaps</h1></div>
//                 <div className="dis-2"><h3><a className="for-skill" href='#skill-based-roadmap'>Skill Based Roadmaps</a></h3></div>
//                 <div className="dis-3"><h3><a className="for-role" href='#role-based-roadmap'>Role Based Roadmaps</a></h3></div>
//             </div>
//             <div className="display-section">
//                 <div className="center-display">
//                     <div className="slider">
//                         <img id="wdr" src={wdr} alt='image' />
//                         <img id="c" src={c} alt='image' />
//                         <img id="wdr2" src={wdr2} alt='image' />
//                         <img id="cpp" src={cpp} alt='image' />
//                          <img id="java" src={java1} alt='image' />
//                     </div>
//                 </div>
//                 <div className="side-display">
//                     <h2 className='h2'>Mostly visited Roadmaps</h2>
//                     <ul className='ul-side'>
//                         <li>Front-End</li>
//                         <li>Back-End</li>
//                         <li>Full-Stack</li>
//                         <li>C++</li>
//                         <li>Java</li>
//                     </ul>
//                 </div>
//             </div>
//             <hr/>
//             <div className="description2">
//                 <div className='des-1'>
//                     <h1>Select Roadmap</h1>
//                 </div>
//                 <div className='des-2'>
//                     <p>Select the roadmaps from several options for better learning and practical knowledge</p> 
//                     <p>according to your need on the basis of skills and role.</p>
//                 </div>
//             </div>
//             <hr/>
//             <div className="main-body">
//                 <div className="skill-based">
//                     <section id='skill-based-roadmap'><h1>Skill Based Roadmaps</h1></section>
//                     <div className="container1">
//                         <div className="slider2">
//                             <ul className='ul-skill'>{skillitems}</ul>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <hr/>
//             <div className="main-body2">
//                 <div className="role-based">
//                         <section id='role-based-roadmap'><h1>Role Based Roadmaps</h1></section>
//                         <div className="container2">
//                             <div className="slider3">
//                                 <ul className='ul-role'>{RoleList}</ul>
//                             </div>
//                         </div>
//                 </div>    
//             </div>
//             <div className=""></div>
//         </div>
//         <style jsx>{`
//             *{
//                 margin: 0%;
//                 padding: 0%;
//             }
//             html{
//                 scroll-behavior: smooth;
//                 width: 100svw;

//             }
//             .main{
//                 width: 100svw;
//             }
//             hr{
//                 border: #111 1px solid;
//             }
//             .navbar{
//                 height: 80px;   
//                 width: 100%;
//                 background-color: #fff;
//                 color: #4b5563;
//                 display:flex;
//                 align-items: center;
//                 justify-content: space-evenly;
//                 position: relative;
//                 font-size: 1.5rem;
//             }
//             .navbar h2{
//                 color: #1d4ed8;
//             }
//             .navbar h2:hover{
//                 transform: scale(1.03,1.03);
//             }
//             .icon-bar{
//                 color: #111;
//                 height: 35px;
//             }
//             .nav-search{
//                 display: flex;
//                 justify-content: space-evenly;
//                 background-color: black;
//                 width: 500px;
//                 height: 40px;
//                 border: 2px solid #111;
//                 border-radius: 10px;
//             }
//             .search-input{
//                 width:480px;
//                 font-size: 1rem;
//                 background-color: white;
//                 border-radius: 10px;
//                 padding-left: 10px;
//             }
//             .search-icon{   
//                 padding: 4px;
//                 margin-top: 4px;
//                 color: white;
//             }
//             .navbar p:hover{
//                 color: #1d4ed8;
//                 transform: scale(1.02,1.02);
//             }
//             .discription{
//                 height: 100px;
//                 background-color: #e8e7e7;
//                 display: flex;
//                 align-items: center;
//                 width: 100%;
//                 font-size: 1.5rem;
//             }
//             .discription .dis-1{
//                 display: flex;
//                 align-items: center;
//                 height: 100px;
//                 width: 300px;
//                 padding-left: 80px;
//                 animation: 2s ease-in reverse both running slidein;
//             }
//             @keyframes slidein{
//                 0% { transform: translateX(0%); }
//                 100%{ transform: translateX(85%); }
//             }
//             .discription .dis-2{
//                 height: 60px;
//                 width: 300px;
//                 background-color:#fff;
//                 border-radius: 10px;
//                 padding-left: 10px;
//                 justify-content: center;
//                 position: relative;
//                 left: 22%;
//                 display: flex;
//                 align-items: center;
//             }
//             .discription .dis-2:hover{
//                 transform: scale(1.05,1.05);
//             }
//             .discription .dis-3{
//                 height: 60px;
//                 width: 300px;
//                 background-color:#fff;
//                 border-radius: 10px;
//                 justify-content: center;
//                 padding-left: 10px;
//                 position: relative;
//                 left: 28%;
//                 display: flex;
//                 align-items: center;
//             }
//             .discription .dis-3:hover{
//                 transform: scale(1.05,1.05);
//             }
//             .for-role{
//                 text-decoration: none;
//                 color: #1d4ed8;
//                 // font-size: 1.5rem;
//             }
//             .for-skill{
//                 text-decoration: none;
//                 color: #1d4ed8;
//                 // font-size: 1.5rem;
//             }
//             .display-section{
//                 background-color: #bed2e4;
//                 height: 540px;
//                 width: 100%;
//                 display: flex;
//                 align-items: center;
//                 justify-content: center;
//             }
//             .center-display{
//                 background-color: #fff;
//                 height: 78%;
//                 width: 750px;
//                 position: relative;
//                 left: 0;
//                 padding: 8px;
//                 border-radius: 0.5rem;
//                 box-shadow: 0.7px 0.7px 7px 4px rgb(150, 224, 250);
//             }
                    
//             .center-display:hover{
//                 transform: scale(1.03,1.03);
//             }
//             .center-display .slider{
//                 display: flex;
//                 aspect-ratio: 16/9;
//                 overflow-x: hidden;
//                 scroll-snap-type: x mandatory;
//                 scroll-behavior: smooth;
//                 border-radius:0.5rem ;
//             }
//             .slider img{
//                 flex: 1 0 100%;
//                 scroll-snap-align: start;
//                 object-fit: cover;
//                 animation: slide 20s linear infinite;
//             }
//             .slider-nav a{
//                 height: 0.5rem;
//                 width: 0.5rem;
//                 border-radius: 50%;
//                 background-color: #111;
//                 opacity: 0.75;
//                 transition: opacity ease 250ms;
//             }
//             @keyframes slide {
//                 0% { transform: translateX(0); }
//                 15% { transform: translateX(0); }
//                 20% { transform: translateX(-100%); }
//                 29% { transform: translateX(-100%); }
//                 39% { transform: translateX(-200%); }
//                 49% { transform: translateX(-200%); }
//                 55% { transform: translateX(-300%); }
//                 60% { transform: translateX(-300%); }
//                 65% { transform: translateX(-400%); }
//                 70% { transform: translateX(-400%); }
//                 75% { transform: translateX(-300%); }
//                 78% { transform: translateX(-300%); }
//                 80% { transform: translateX(-200%); }
//                 85% { transform: translateX(-200%); }
//                 90% { transform: translateX(-100%); }
//                 95% { transform: translateX(-100%); }
//                 100% { transform: translateX(0); }
//             }
//             .side-display {
//                 height: 85%;
//                 width: 500px;
//                 padding: 8px;
//                 position: relative;
//                 left: 5%; 
//                 border-radius: 0.5rem;
//                 border: #111 5px solid;
//             }
//             .side-display .h2 {
//                 height: 70px;
//                 width: 100%;
//                 display: flex;
//                 align-items: center;
//                 justify-content: center;
//                 border-radius: 3px;
//                 font-size: 2rem;
//                 border: #111 2px solid;
//                 background-color: #c2aaf6;
//             }
//             .side-display .ul-side{
//                 list-style-type: none;
//             }
//             .ul-side li{
//                 height: 50px;
//                 width: 450px;
//                 display: flex;
//                 justify-content: center;
//                 margin: 20px;
//                 background-color: #c2aaf6;
//                 border-radius: 5px;
//                 border: #111 2px solid;
//                 font-size: 2rem;
//             }
//             .ul-side li:hover{
//                 transform: scale(1.04,1.04);
//             }
//             .description2{
//                 height: 200px;
//                 width: 100%;
//                 background-color: #bed2e4;
//             }
//             .description2 h1{
//                 display: flex;
//                 width: 500px;
//                 font-size: 4rem;
//                 align-items: center;
//                 justify-content: center;
//                 position: relative;
//                 left: 32%;
//                 background-image: linear-gradient(to right,rgb(251, 97, 176),rgb(75, 8, 8)70%);
//                 background-clip: text;
//                 -webkit-text-fill-color: transparent;
//                 padding: 15px 0px 10px 0p;
//             }
//             .description2 p{
//                 display: flex;
//                 align-items: center;
//                 justify-content: center;
//                 width: 1200px;
//                 position: relative;
//                 left: 12%;
//                 font-size: 2rem;
//             }
//             .main-body{
//                 height: 700px;
//                 width: 100%;
//                 display: flex;
//                 justify-content: center;
//                 background-color: #bed2e4;
//             }
//             .skill-based h1{
//                 height: 40px;
//                 width: 340px;
//                 display: flex;
//                 align-items: center;
//                 justify-content: center;
//                 background-color: #c2aaf6;
//                 position: relative;
//                 margin-top: 20px;
//                 left: 28%;
//                 border: #111 5px solid;
//                 border-radius: 10px;
//             }
//             .skill-based h1:hover{
//                 transform: scale(1.1,1.1);
//             }
//             .container1{
//                 margin-top: 50px;
//                 height: 450px;
//                 width: 900px;
//                 display: grid;
//             }
//             .ul-skill{
//                 display: flex;
//                 flex-wrap: wrap;
//                 list-style-type: none;
//             }
//             .li{
//                 height: 20px;
//                 width: 250px;
//                 border-radius: 5px;
//                 border: #111 2px solid;
//                 font-size: 1.5rem;
//                 display: flex;
//                 align-items: center;
//                 background-color: #c2aaf6;
//                 margin: 5px;
//                 padding: 15px;
//             }
//             .li:hover{
//                 transform: scale(1.04,1.04);
//             }
//             .main-body2{
//                 height: 500px;
//                 width: 100%;
//                 display: flex;
//                 justify-content: center;
//                 background-color: #bed2e4;
//             }
//             .container2{
//                 margin-top: 50px;
//                 height: 350px;
//                 width: 900px;
//                 display: grid;
//             }
//             .role-based h1{
//                 height: 40px;
//                 width: 340px;
//                 display: flex;
//                 align-items: center;
//                 justify-content: center;
//                 background-color: #c2aaf6;
//                 position: relative;
//                 margin-top: 20px;
//                 left: 28%;
//                 border: #111 5px solid;
//                 border-radius: 10px;
//             }
//             .role-based h1:hover{
//                 transform: scale(1.1,1.1);
//             }
//             .ul-role{
//                 display: flex;
//                 flex-wrap: wrap;
//                 list-style-type: none;
//             } 
//             @media (max-width: 560px) {
//             .navbar {
//                 font-size: 0.6rem;
//                 height: 60px;
//                 flex-wrap: wrap;
//             }
//             .navbar h2 {
//                 font-size: 0.8rem;
//                 padding: 3px;
//             }
//             .nav-search {
//                 max-width: 40%;
//                 height: 35px;
//             }
//             .search-input {
//                 max-width: 80%;
//             }
//             .discription {
//                 width: 100%;
//                 font-size: 0.7rem;
//                 left: 0;
//                 display: flex;
//                 height: 48px;
//             }
//             .discription .dis-1,
//             .discription .dis-2,
//             .discription .dis-3 {
//                 max-width: 40%;
//                 left: 0;
//                 margin: 5px;
//                 padding: 10px;
//             } 
//             .discription .dis-2,
//             .discription .dis-3 {
//                 width: 80px;
//                 font-size: 0.6rem;
//                 padding: 5px;
//                 margin: 5px;
//                 height: 30px;
//             }
//             .display-section {
//                 flex-direction: column;
//                 width: 100%;
//                 height: auto;
//             }
//             .center-display {
//                 max-width: 80%;
//                 height: 78%;
//                 left: 0;
//                 margin: 10px 0;
//             }
//             .side-display {
//                 max-width: 85%;
//                 left: 0;
//                 margin: 10px;
//                 height: 85%;
//             }
//             .side-display .h2{
//                 font-size: 1.7rem;
//             }
//             .ul-side li{
//                 left: 0;
//                 max-width: 90%;
//                 height: 40px;
//                 font-size: 2rem;
//                 margin: 15px;
//             }
//             .description2{
//                 height: 28%;
//             }
//             .description2 h1 {
//                 font-size: 2.5rem;
//                 left: 5%;
//                 width: 90%;
//             }
//             .description2 p {
//                 font-size: 1.2rem;
//                 left: 5%;
//                 width: 90%;
//             }
//             .main-body{
//                 height: 1470px;
//             }
//             .main-body2 {
//                 height: 1130px;
//             }
//             .skill-based h1,
//             .role-based h1 {
//                 width: 90%;
//                 font-size: 1.5rem;
//                 left: 0;
//                 margin: 20px;
//             }
//             .container1,
//             .container2 {
//                 width: 100%;
//             }
//             .ul-skill,
//             .ul-role {
//                 flex-direction: column;
//                 align-items: center;
//             }
//             .li {
//                 width: 90%;
//                 font-size: 1.2rem;
//             }
//             }
//             @media (max-width: 880px) and (min-width: 561px){
//                 .navbar {
//                     font-size: 1.2rem;
//                     height: 60px;
//                     flex-wrap: wrap;
//                 }
//                 .navbar h2 {
//                     font-size: 1.2rem;
//                     padding: 3px;
//                 }
//                 .nav-search {
//                     max-width: 40%;
//                     height: 35px;
//                 }
//                 .search-input {
//                     max-width: 80%;
//                 }
//                 .discription {
//                     width: 100%;
//                     font-size: 1.2rem;
//                     display: flex;
//                     height: 48px;
//                 }
//                 .dis-1{
//                     font-size: 0.75rem; 
//                 }
                
//                 .discription .dis-1,
//                 .discription .dis-2,
//                 .discription .dis-3 {
//                     width: 40%;
//                     left: 0;
//                     margin: 5px;
//                     padding: 10px;
//                 } 
//                 .discription .dis-2,
//                 .discription .dis-3 {
//                     width: 30%;
//                     font-size: 0.8rem;
//                     padding: 3px;
//                     margin: 25px;
//                     height: 30px;
//                 }
//                 .display-section {
//                     flex-direction: column;
//                     width: 100%;
//                     height: auto;
//                 }
//                 .center-display {
//                     max-width: 80%;
//                     height: 78%;
//                     left: 0;
//                     margin: 10px 0;
//                 }
//                 .side-display {
//                     max-width: 85%;
//                     height: 85%;
//                     left: 0;
//                     margin: 10px;
//                     height: 370px;
//                 }
//                 .side-display .h2{
//                     font-size: 1.7rem;
//                 }
//                 .ul-side li{
//                     left: 0;
//                     max-width: 90%;
//                     height: 40px;
//                     font-size: 2rem;
//                     margin: 15px;
//                 }
//                 .description2{
//                     height: 28%;
//                 }
//                 .description2 h1 {
//                     font-size: 2.5rem;
//                     left: 5%;
//                     width: 90%;
//                 }
//                 .description2 p {
//                     font-size: 1.2rem;
//                     left: 5%;
//                     width: 90%;
//                 }
//                 .main-body{
//                     height: 1470px;
//                 }
//                 .main-body2 {
//                     height: 1130px;
//                 }
//                 .skill-based h1,
//                 .role-based h1 {
//                     width: 90%;
//                     font-size: 1.5rem;
//                     left: 0;
//                     margin: 20px;
//                 }
//                 .container1,
//                 .container2 {
//                     width: 100%;
//                 }
//                 .ul-skill,
//                 .ul-role {
//                     flex-direction: column;
//                     align-items: center;
//                 }
//                 .li {
//                     width: 90%;
//                     font-size: 1.2rem;
//                 }
//                 }
//             @media (min-width: 880px) and (max-width: 1049px) {
//             .navbar {
//                 font-size: 1.4rem;
//                 height: 60px;
//                 flex-wrap: wrap;
//             }
//             .navbar h2 {
//                 font-size: 1.2rem;
//                 padding: 3px;
//             }
//             .nav-search {
//                 max-width: 40%;
//                 height: 35px;
//             }
//             .search-input {
//                 max-width: 80%;
//             }
//             .discription {
//                 width: 100%;
//                 font-size: 1.2rem;
//                 left: 0;
//                 display: flex;
//                 height: 50px;
//             }
//             .discription .dis-1,
//             .discription .dis-2,
//             .discription .dis-3 {
//                 width: 40%;
//                 left: 0;
//                 margin: 5px;
//                 padding: 10px;
//             } 
//             .for-skill,.for-role{
//                 font-size: 1.2rem;
//             }
//             .discription .dis-2,
//             .discription .dis-3 {
//                 width: 280px;
//                 font-size: 1.2rem;
//                 padding: 5px;
//                 margin: 25px;
//                 height: 30px;
//             }
//             .display-section {
//                 flex-direction: column;
//                 width: 100%;
//                 height: auto;
//             }
//             .center-display {
//                 max-width: 80%;
//                 height: 78%;
//                 left: 0;
//                 margin: 10px;
//             }
//             .side-display {
//                 max-width: 75%;
//                 height: 75%;
//                 left: 0;
//                 margin: 10px;
//             }
//             .side-display .h2{
//                 font-size: 2rem;
//             }
//             .ul-side li{
//                 max-width: 90%;
//                 left: 0;
//             }
//             .description2{
//                 height: 28%;
//                 margin: 0%;
//             }
//             .description2 h1 {
//                 font-size: 2.5rem;
//                 left: 5%;
//                 width: 90%;
//             }
//             .description2 p {
//                 font-size: 1.2rem;
//                 left: 5%;
//                 width: 90%;
//             }
//             .main-body{
//                 height: 1470px;
//             }
//             .main-body2 {
//                 height: 1130px;
//             }
//             .skill-based h1,
//             .role-based h1 {
//                 width: 90%;
//                 font-size: 1.5rem;
//                 left: 0;
//                 margin: 20px;
//             }
//             .container1,
//             .container2 {
//                 width: 100%;
//             }
//             .ul-skill,
//             .ul-role {
//                 flex-direction: column;
//                 align-items: center;
//             }
//             .li {
//                 width: 90%;
//                 font-size: 1.2rem;
//             } 
//             }
                    
//             @media (min-width: 1050px) and (max-width: 1500px) {
//             .navbar {
//                 font-size: 1.4rem;
//                 height: 60px;
//                 flex-wrap: wrap;
//             }
//             .navbar h2 {
//                 font-size: 1.2rem;
//                 padding: 3px;
//             }
//             .nav-search {
//                 max-width: 40%;
//                 height: 35px;
//             }
//             .search-input {
//                 max-width: 80%;
//             }
//             .discription {
//                 width: 100%;
//                 font-size: 1.2rem;
//                 left: 0;
//                 display: flex;
//                 height: 50px;
//             }
            
//             .discription .dis-1,
//             .discription .dis-2,
//             .discription .dis-3 {
//                 max-width: 40%;
//                 left: 0;
//                 margin: 5px;
//                 padding-left: 30px;
//             } 
//             .discription .dis-2,
//             .discription .dis-3 {
//                 width: 280px;
//                 font-size: 1.2rem;
//                 padding: 3px;
//                 margin: 20px;
//                 left: 10%;
//                 height: 30px;
//             }
//             .display-section {
//                 width: 100%;
//                 height: auto;
//             }
//             .center-display {
//                 max-width: 45%;
//                 height: 40%;
//                 left: 0%;
//                 margin: 10px;
//             }
//             .side-display {
//                 max-width: 45%;
//                 height: 45%;
//                 left: 3%;
//                 height: 20%;
//                 margin: 10px;
//             }
//             .side-display .h2{
//                 font-size: 2rem;
//             }
//             .ul-side li{
//                 max-width: 95%;
//                 height: 40px;
//                 font-size: 2rem;
//                 margin: 15px;
//                 left: 0;
//             }
//             .description2{
//                 height: 28%;
//                 margin: 0%;
//             }
//             .description2 h1 {
//                 font-size: 2.5rem;
//                 left: 5%;
//                 width: 90%;
//             }
//             .description2 p {
//                 font-size: 1.2rem;
//                 left: 5%;
//                 width: 90%;
//             }
//             .main-body{
//                 height: 590px;
//             }
//             .main-body2 {
//                 height: 470px;
//             }
//             .skill-based,
//             .role-based{
//                 max-width: 83%;
//             }
//             .skill-based h1,
//             .role-based h1 {
//                 max-width: 50%;
//                 font-size: 1.5rem;
//                 left: 30%;
//                 margin: 20px;
//             }
//             .container1,
//             .container2 {
//                 width: 100%;
//             }
//             .ul-skill,
//             .ul-role {
//                 justify-content: center;
//                 flex-wrap: wrap;
//             }
//             .li {
//                 font-size: 1.2rem;
//             }
//             }
                    
//         `}</style>
//     </>);
// }
// export default Roadmap



import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faArrowRight, faBookOpen, faRoad, faGraduationCap, faStar, faCodeBranch } from '@fortawesome/free-solid-svg-icons';
import wdr from './wdr.jpeg';
import c from './c.jpeg';
import cpp from './cpp.jpeg';
import java1 from './java1.jpeg';
import wdr2 from './wdr.jpeg';
function Roadmap() {
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredSkills, setFilteredSkills] = useState([]);
    const [filteredRoles, setFilteredRoles] = useState([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const Skills = [
        {id: 1, name: "C++", popularity: 80, difficulty: "Medium", estimatedTime: "4-6 months"},
        {id: 2, name: "Java", popularity: 85, difficulty: "Medium", estimatedTime: "5-7 months"},
        {id: 3, name: "Python", popularity: 95, difficulty: "Easy", estimatedTime: "3-4 months"},
        {id: 4, name: "JavaScript", popularity: 90, difficulty: "Easy", estimatedTime: "3-5 months"},
        {id: 5, name: "React", popularity: 88, difficulty: "Medium", estimatedTime: "2-4 months"},
        {id: 6, name: "Angular", popularity: 75, difficulty: "Hard", estimatedTime: "3-5 months"},
        {id: 7, name: "TypeScript", popularity: 82, difficulty: "Medium", estimatedTime: "2-3 months"},
        {id: 8, name: "SQL", popularity: 85, difficulty: "Medium", estimatedTime: "1-2 months"},
        {id: 9, name: "Node.js", popularity: 80, difficulty: "Medium", estimatedTime: "2-4 months"},
        {id: 10, name: "Spring Boot", popularity: 75, difficulty: "Hard", estimatedTime: "3-5 months"},
        {id: 11, name: "Flutter", popularity: 78, difficulty: "Medium", estimatedTime: "3-5 months"},
        {id: 12, name: "GO", popularity: 72, difficulty: "Medium", estimatedTime: "3-5 months"},
        {id: 13, name: "Rust", popularity: 70, difficulty: "Hard", estimatedTime: "4-7 months"},
        {id: 14, name: "MongoDB", popularity: 78, difficulty: "Easy", estimatedTime: "1-2 months"},
        {id: 15, name: "AWS", popularity: 88, difficulty: "Medium", estimatedTime: "3-6 months"},
        {id: 16, name: "DSA-C++", popularity: 85, difficulty: "Hard", estimatedTime: "6-8 months"},
        {id: 17, name: "DSA-Java", popularity: 82, difficulty: "Hard", estimatedTime: "6-8 months"},
        {id: 18, name: "DSA-Python", popularity: 80, difficulty: "Medium", estimatedTime: "4-6 months"},
        {id: 19, name: "System Design", popularity: 87, difficulty: "Hard", estimatedTime: "6-12 months"},
        {id: 20, name: "API Design", popularity: 75, difficulty: "Medium", estimatedTime: "2-3 months"},
        {id: 21, name: "React Native", popularity: 78, difficulty: "Medium", estimatedTime: "3-5 months"}
    ];

    const Roles = [
        {id: 1, name: "Frontend Developer", avgSalary: "$75,000 - $120,000", demand: "High", skills: ["HTML/CSS", "JavaScript", "React/Angular/Vue"]},
        {id: 2, name: "Backend Developer", avgSalary: "$80,000 - $130,000", demand: "High", skills: ["Java/Python/Node.js", "SQL", "API Development"]},
        {id: 3, name: "DevOps Engineer", avgSalary: "$90,000 - $140,000", demand: "Very High", skills: ["Docker", "Kubernetes", "CI/CD", "AWS/Azure"]},
        {id: 4, name: "Full Stack Developer", avgSalary: "$85,000 - $135,000", demand: "Very High", skills: ["Frontend", "Backend", "Databases"]},
        {id: 5, name: "Data Analyst", avgSalary: "$65,000 - $110,000", demand: "High", skills: ["SQL", "Excel", "Data Visualization", "Python/R"]},
        {id: 6, name: "AI and Data Scientist", avgSalary: "$100,000 - $160,000", demand: "Very High", skills: ["Python", "Machine Learning", "Statistics"]},
        {id: 7, name: "Android Developer", avgSalary: "$75,000 - $125,000", demand: "Medium", skills: ["Java/Kotlin", "Android SDK"]},
        {id: 8, name: "iOS Developer", avgSalary: "$80,000 - $130,000", demand: "Medium", skills: ["Swift", "iOS SDK"]},
        {id: 9, name: "Database Administrator", avgSalary: "$85,000 - $130,000", demand: "Medium", skills: ["SQL", "PostgreSQL", "Database Optimization"]},
        {id: 10, name: "Blockchain Developer", avgSalary: "$90,000 - $150,000", demand: "Growing", skills: ["Solidity", "Web3.js", "Smart Contracts"]},
        {id: 11, name: "QA Engineer", avgSalary: "$65,000 - $110,000", demand: "Medium", skills: ["Testing Frameworks", "Automation Tools"]},
        {id: 12, name: "Software Architect", avgSalary: "$120,000 - $180,000", demand: "High", skills: ["System Design", "Multiple Languages", "Cloud"]},
        {id: 13, name: "Cyber Security Specialist", avgSalary: "$90,000 - $150,000", demand: "Very High", skills: ["Security Protocols", "Penetration Testing"]},
        {id: 14, name: "UX Designer", avgSalary: "$70,000 - $120,000", demand: "High", skills: ["UI Design", "User Research", "Prototyping"]},
        {id: 15, name: "Game Developer", avgSalary: "$75,000 - $130,000", demand: "Medium", skills: ["Unity/Unreal", "C#/C++", "3D Modeling"]}
    ];

    const featuredRoadmaps = [
        { title: "Frontend Development", description: "Master modern web technologies", progress: 42, image: "/api/placeholder/400/200", popular: true },
        { title: "Machine Learning Path", description: "From basics to advanced AI", progress: 68, image: "/api/placeholder/400/200", popular: false },
        { title: "Full Stack MERN", description: "MongoDB, Express, React, Node.js", progress: 55, image: "/api/placeholder/400/200", popular: true },
        { title: "Cloud Computing", description: "Master AWS, Azure, and GCP", progress: 35, image: "/api/placeholder/400/200", popular: true }
    ];

    // Simulate loading effect
    useEffect(() => {
        setTimeout(() => {
            setIsLoading(false);
        }, 1500);
    }, []);

    // Filter skills and roles based on search term
    useEffect(() => {
        setFilteredSkills(
            Skills.filter(skill => 
                skill.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
        setFilteredRoles(
            Roles.filter(role => 
                role.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [searchTerm]);

    // Auto slide carousel
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % featuredRoadmaps.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [featuredRoadmaps.length]);

    // Sort functions
    const sortByPopularity = () => {
        setFilteredSkills([...filteredSkills].sort((a, b) => b.popularity - a.popularity));
    };

    const sortByDifficulty = (order) => {
        const difficultyWeight = { "Easy": 1, "Medium": 2, "Hard": 3 };
        setFilteredSkills([...filteredSkills].sort((a, b) => {
            return order === 'asc' 
                ? difficultyWeight[a.difficulty] - difficultyWeight[b.difficulty]
                : difficultyWeight[b.difficulty] - difficultyWeight[a.difficulty];
        }));
    };

    const getDifficultyColor = (difficulty) => {
        switch(difficulty) {
            case "Easy": return "bg-green-100 text-green-700";
            case "Medium": return "bg-yellow-100 text-yellow-700";
            case "Hard": return "bg-red-100 text-red-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    const getDemandBadge = (demand) => {
        switch(demand) {
            case "Very High": return "bg-purple-600 text-white";
            case "High": return "bg-blue-600 text-white";
            case "Medium": return "bg-green-500 text-white";
            case "Growing": return "bg-teal-500 text-white";
            default: return "bg-gray-500 text-white";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Loading overlay */}
            {isLoading && (
                <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="mt-4 text-xl font-medium text-blue-600">Loading your roadmaps...</p>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 flex items-center">
                                <h1 className="text-2xl font-bold text-blue-600">Unified Campus</h1>
                            </div>
                        </div>
                        <div className="flex-1 flex items-center justify-center px-2 lg:ml-6 lg:justify-end">
                            <div className="max-w-lg w-full">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-gray-500" />
                                    </div>
                                    <input
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="Search for roadmaps, skills, or roles..."
                                        type="search"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <a href="#" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600">Home</a>
                            <a href="#" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600">Dashboard</a>
                            <a href="#" className="px-3 py-2 rounded-md text-sm font-medium text-blue-600 border-b-2 border-blue-600">Roadmaps</a>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:flex lg:items-center lg:justify-between">
                        <div className="lg:w-1/2">
                            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                                Find Your Perfect Learning Path
                            </h1>
                            <p className="mt-3 max-w-md text-lg text-blue-100 sm:text-xl md:mt-5 md:max-w-3xl">
                                Customized roadmaps for students and professionals. 
                                Master in-demand skills and accelerate your career.
                            </p>
                            <div className="mt-10 flex space-x-4">
                                <a href="#skill-based-roadmap" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-blue-700 bg-white hover:bg-blue-50">
                                    Explore Skills
                                    <FontAwesomeIcon icon={faBookOpen} className="ml-2" />
                                </a>
                                <a href="#role-based-roadmap" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-800 bg-opacity-60 hover:bg-opacity-70">
                                    Explore Roles
                                    <FontAwesomeIcon icon={faRoad} className="ml-2" />
                                </a>
                            </div>
                        </div>
                        <div className="mt-10 lg:mt-0 lg:w-1/2 flex justify-center">
                            <img className="h-64 w-auto rounded-lg shadow-xl" src={wdr} alt="Learning journey visualization" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Featured Roadmaps */}
            <div className="py-12 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            Featured Roadmaps
                        </h2>
                        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
                            Most popular learning paths chosen by students
                        </p>
                    </div>

                    <div className="mt-12 relative">
                        <div className="flex overflow-hidden rounded-lg">
                            {featuredRoadmaps.map((roadmap, index) => (
                                <div 
                                    key={index} 
                                    className={`w-full flex-shrink-0 transition-all duration-500 ease-out transform ${
                                        index === currentSlide ? "translate-x-0" : `${index < currentSlide ? "-translate-x-full" : "translate-x-full"} hidden`
                                    }`}
                                >
                                    <div className="bg-gray-50 overflow-hidden rounded-lg shadow-lg">
                                        <div className="lg:flex">
                                            <div className="lg:w-1/2">
                                                <img className="h-60 w-full object-cover lg:h-full" src={cpp} alt={roadmap.title} />
                                            </div>
                                            <div className="p-8 lg:w-1/2">
                                                <div className="flex items-center">
                                                    <h3 className="text-2xl font-bold text-gray-900">{roadmap.title}</h3>
                                                    {roadmap.popular && (
                                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            <FontAwesomeIcon icon={faStar} className="mr-1" />
                                                            Popular
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-2 text-gray-600">{roadmap.description}</p>
                                                <div className="mt-6">
                                                    <h4 className="text-sm font-medium text-gray-500">Completion rate</h4>
                                                    <div className="mt-2 relative pt-1">
                                                        <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-200">
                                                            <div style={{ width: `${roadmap.progress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"></div>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                                                            <span>Progress</span>
                                                            <span>{roadmap.progress}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-8">
                                                    <a href="#" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                                                        View Roadmap
                                                        <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
                            {featuredRoadmaps.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`h-2 w-2 rounded-full ${
                                        index === currentSlide ? "bg-blue-600" : "bg-gray-300"
                                    }`}
                                    aria-label={`Go to slide ${index + 1}`}
                                ></button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="mt-12 grid gap-6 lg:grid-cols-4 md:grid-cols-2">
                        <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                            <div className="text-blue-600 text-4xl mb-4">
                                <FontAwesomeIcon icon={faGraduationCap} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Structured Learning</h3>
                            <p className="mt-2 text-gray-600">Step-by-step guided paths with clear milestones</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-6 border border-purple-100">
                            <div className="text-purple-600 text-4xl mb-4">
                                <FontAwesomeIcon icon={faCodeBranch} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Industry Relevance</h3>
                            <p className="mt-2 text-gray-600">Curated by experts to match job market demands</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-6 border border-green-100">
                            <div className="text-green-600 text-4xl mb-4">
                                <FontAwesomeIcon icon={faRoad} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Flexible Paths</h3>
                            <p className="mt-2 text-gray-600">Customize roadmaps to fit your learning goals</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-100">
                            <div className="text-yellow-600 text-4xl mb-4">
                                <FontAwesomeIcon icon={faStar} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Progress Tracking</h3>
                            <p className="mt-2 text-gray-600">Monitor your achievements and stay motivated</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`${
                                    activeTab === 'all'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                All Roadmaps
                            </button>
                            <button
                                onClick={() => setActiveTab('skills')}
                                className={`${
                                    activeTab === 'skills'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                Skill Based
                            </button>
                            <button
                                onClick={() => setActiveTab('roles')}
                                className={`${
                                    activeTab === 'roles'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                Role Based
                            </button>
                        </nav>
                    </div>
                </div>
            </div>

            {/* Skills Section */}
            {(activeTab === 'all' || activeTab === 'skills') && (
                <div id="skill-based-roadmap" className="py-12 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="lg:text-center">
                            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Skills</h2>
                            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                                Skill-Based Roadmaps
                            </p>
                            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
                                Master individual technologies and programming languages
                            </p>
                        </div>

                        <div className="mt-8 mb-6 flex flex-wrap justify-between items-center">
                            <div className="mb-4 md:mb-0">
                                <span className="text-gray-600 mr-2">Sort by:</span>
                                <button 
                                    onClick={sortByPopularity} 
                                    className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200 mr-2"
                                >
                                    Popularity
                                </button>
                                <button 
                                    onClick={() => sortByDifficulty('asc')} 
                                    className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200 mr-2"
                                >
                                    Easiest First
                                </button>
                                <button 
                                    onClick={() => sortByDifficulty('desc')} 
                                    className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                    Hardest First
                                </button>
                            </div>
                            <div className="text-sm text-gray-500">
                                Showing {filteredSkills.length} of {Skills.length} skills
                            </div>
                        </div>

                        <div className="mt-4 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {filteredSkills.map((skill) => (
                                <div 
                                    key={skill.id} 
                                    className="relative group bg-white overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200"
                                >
                                    <div className="p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-gray-900">{skill.name}</h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(skill.difficulty)}`}>
                                                {skill.difficulty}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-sm text-gray-500 mb-3">
                                            <span className="font-medium">Popularity:</span>
                                            <div className="ml-2 w-24 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="bg-blue-600 h-2 rounded-full" 
                                                    style={{ width: `${skill.popularity}%` }}
                                                ></div>
                                            </div>
                                            <span className="ml-2">{skill.popularity}%</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Est. Learning Time: <span className="font-medium">{skill.estimatedTime}</span>
                                        </p>
                                        <a 
                                            href="#" 
                                            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                                        >
                                            View Roadmap
                                            <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
                                        </a>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Roles Section */}
            {(activeTab === 'all' || activeTab === 'roles') && (
                <div id="role-based-roadmap" className={`py-12 ${activeTab === 'all' ? 'bg-gray-50' : 'bg-white'}`}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="lg:text-center">
                            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Careers</h2>
                            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                                Role-Based Roadmaps
                            </p>
                            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
                                Comprehensive paths to prepare for specific tech careers
                            </p>
                        </div>

                        <div className="mt-10">
                            <div className="space-y-6">
                                {filteredRoles.map((role) => (
                                    <div 
                                        key={role.id} 
                                        className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:border-indigo-300 transition-all duration-300"
                                    >
                                        <div className="px-4 py-5 sm:p-6">
                                            <div className="flex flex-col md:flex-row justify-between">
                                                <div className="md:w-2/3">
                                                    <div className="flex items-center mb-2">
                                                        <h3 className="text-lg leading-6 font-bold text-gray-900">
                                                            {role.name}
                                                        </h3>
                                                        <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${getDemandBadge(role.demand)}`}>
                                                            {role.demand} Demand
                                                        </span>
                                                    </div>
                                                    <p className="max-w-2xl text-sm text-gray-500">
                                                        Avg. Salary: <span className="font-medium">{role.avgSalary}</span>
                                                    </p>
                                                    <div className="mt-4">
                                                        <h4 className="text-sm font-medium text-gray-500">Key Skills:</h4>
                                                        <div className="mt-2 flex flex-wrap">
                                                        {role.skills.map((skill, idx) => (
    <span 
        key={idx}
        className="mr-2 mb-2 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800"
    >
        {skill}
    </span>
))}


</div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 md:mt-0 md:w-1/3 md:text-right">
                                                    <a 
                                                        href="#" 
                                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                                                    >
                                                        View Career Path
                                                        <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Call to action */}
            <div className="bg-blue-700">
                <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
                    <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                        <span className="block">Ready to accelerate your learning?</span>
                        <span className="block text-blue-200">Create your custom roadmap today.</span>
                    </h2>
                    <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
                        <div className="inline-flex rounded-md shadow">
                        <a
                                href="#"
                                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
                            >
                                Create Custom Roadmap
                            </a>
                        </div>
                        <div className="ml-3 inline-flex rounded-md shadow">
                        <a
                                href="#"
                                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-800 hover:bg-blue-900"
                            >
                                Talk to an Advisor
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            
        </div>
    );
}

export default Roadmap;