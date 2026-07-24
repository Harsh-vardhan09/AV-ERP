//  import '../timetable/timetable.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function TimeTable() {
    const downloadPDF = () => {
        const input = document.getElementById('timetable');
        html2canvas(input, { scale: 2 }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF();
           const imgWidth = 190; // Desired width for PDF
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

             pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
             pdf.save('TimeTable.pdf');
         });
     };

return (
               <> <style>
                   {`
                   body {
   font-family: Arial, sans-serif;
   margin: 0;
   background-color: #f4f4f4;
   box-sizing: border-box;
}

#timetable {
   padding: 20px;
   max-width: 100%;
   box-sizing: border-box;
   background-color: #fff;
   border-radius: 8px;
   box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.heading, .details {
   text-align: center;
   margin-bottom: 20px;
   color: #333;
}

.h2 {                                            /*  changes apply  */
   font-weight: 600;
   font-size: 20px;
   color: #007bff; /* Bright blue for heading */
}

.h6 {
   color: #555; /* Darker gray for details */
}

.tables-container {
   
}

/* Table styles */
.table 
{

   width: 100%;
   border-collapse: collapse;
   margin: 10px 0;
   background-color: #f9f9f9;
   border-radius: 5px;
   overflow: hidden; /* Ensures rounded corners work */
}

.th {
   background-color: #007bff; /* Bright blue for table headers */
   color: white;
   padding: 10px;
}

.td {
   border: 1px solid #ccc;
   padding: 8px;
   text-align: center;
}

.tr:nth-child(even) {
   background-color: #e9ecef; /* Light gray for even rows */
}

.tr:hover {
   background-color: #e2e6ea; /* Slightly darker on hover */
}

.tablebhai{
   
  width: 100%;
    
  
}
/* Media queries for responsive design */
@media (max-width: 768px) {
   .tables-container {
       grid-template-columns: 1fr; /* Stack tables on small screens */
   }

   .th, .td {
       font-size: 20px;
   }

    .h2{
       font-size:10px ;
    }


    .h6 {
       font-size: 16px;
   }
}

@media (max-width: 480px) {
   .th, .td {
       font-size: 7px;
       padding: 2px;
   }

   .h2, .h6 {
       font-size: 13px;
   }

   .download-btn {
       width: 40vw;
       padding: 10px;
       font-size: 10px;
   }
}

.download-btn {
   display: block;
   margin: 20px auto;
   padding: 10px 20px;
   font-size: 18px;
   background-color: #28a745; /* Green for button */
   color: white;
   border: none;
   border-radius: 10px;
   cursor: pointer;
   transition: background-color 0.3s;
}

.download-btn:hover {
   background-color: #218838; /* Darker green on hover */
}

            `}   </style>
            <div id="timetable">
                <div className="heading">
                   <h2 className='h2'>Department of Computer Science & Engineering</h2>                     {/*  changes apply */}
                    <h2  className='h2'>Time Table: B.Tech. III Year (V Semester) Section A</h2>
                    <h2  className='h2'>Academic Session: July-Dec-2022</h2>
                </div>

                <div className="details">
                    <h6 className='h6'>Room No: C-205</h6>
                    <h6 className='h6'>No. of Students: 60</h6>
                    <h6 className='h6'>Class Teacher: Prof. Himanshu Bagwariya</h6>
                </div>

                <div className="tables-container">
                    <div className="main1">
                        <table className='table'>
                            <thead className='thead'>
                                <tr className='tr'>
                                    <th className='th'>DAY</th>
                                    <td className='td'>10:00AM-10:50AM</td>
                                    <td className='td'>10:50AM-11:40AM</td>
                                    <td className='td'>11:40AM-12:30PM</td>
                                    <td className='td'>12:30PM-1:20PM</td>
                                    <td className='td'>1:20PM-2:10PM</td>
                                    <td className='td'>2:10PM-3:00PM</td>
                                    <td className='td'>3:00PM-3:50PM</td>
                                    <td className='td'>3:50PM-4:40PM</td>
                                </tr>
                            </thead>
                            <tbody>
                                <tr  className='tr'>
                                    <th className='th'>MON</th>
                                    <td className='td'>IWT(YT)</td>
                                    <td className='td'>TOC(AB)</td>
                                    <td className='td'>APT(IP)</td>
                                    <td className='td'>DBMS(HS)</td>
                                    <td className='td'>Lunch Break</td>
                                    <td colSpan={2} className='td'>Coding(Adroit Training) CC1</td>
                                    <td className='td'>Cyber Security</td>
                                </tr>
                                <tr  className='tr'>
                                    <th className='th'>TUE</th>
                                    <td className='td'>SS(ST)</td>
                                    <td className='td'>TOC(AB)</td>
                                    <td className='td'>APT(IP)</td>
                                    <td className='td'>DBMS(HS)</td>
                                    <td className='td'></td>
                                    <td colSpan={2} className='td'>DBMS Lab(HB)A1 / TOC(OS Lab)(AB)A2</td>
                                    <td className='td'>IWT(YT)</td>
                                </tr>
                              <tr  className='tr'>
                                    <th className='th'>WED</th>
                                    <td className='td'>SS(ST)</td>
                                    <td className='td'>DBMS(HS)</td>
                                    <td colSpan={2} className='td'>Python Lab(ML Lab)(PR)A1 / Linux Lab(AK)A2</td>
                                    <td className='td'>Lunch Break</td>
                                    <td className='td'>TOC(AB)</td>
                                    <td className='td'>IWT(YT)</td>
                                    <td className='td'>Cyber Security(RJ)</td>
                                </tr>
                              <tr  className='tr'>
                                    <th className='th'>THU</th>
                                    <td className='td'>TOC(AB)</td>
                                    <td className='td'>Cyber Security(RJ)</td>
                                    <td colSpan={2} className='td'>DBMS Lab(HB)A2 / TOC Lab(AB)A1</td>
                                    <td  className='td'></td>
                                    <td className='td'>IWT(YT)</td>
                                    <td className='td'>DBMS(HS)</td>
                                    <td className='td'>Minor Project 1(PS)</td>
                                </tr>
                              <tr  className='tr'>
                                    <th className='th'>FRI</th>
                                    <td className='td'>Cyber Security(RJ)</td>
                                    <td className='td'>TOC(AB)</td>
                                    <td className='td'>IWT(YT)</td>
                                    <td className='td'>Cyber Security(RJ)</td>
                                    <td className='td'>Lunch Break</td>
                                    <td colSpan={2} className='td'>Python Lab(ML Lab)(PR)A2 / Linux Lab(AK)A1</td>
                                    <td className='td'>DBMS(HS)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="main2">
                        <table className='tablebhai'>
                            <thead>
                               <tr  className='tr'>
                                    <th className='th'>Subject</th>
                                    <th className='th'>Subject Name</th>
                                    <th className='th'>L+T</th>
                                    <th className='th'>Practical</th>
                                    <th className='th'>Name of Faculties</th>
                                </tr>
                            </thead>
                            <tbody>
                               <tr  className='tr'>
                                    <td  className='td'>CS501</td>
                                    <td  className='td'>Theory of Computation</td>
                                    <td  className='td'>5</td>
                                    <td  className='td'>2</td>
                                    <td  className='td'>Prof. Atul Barve</td>
                                </tr>
                               <tr  className='tr'>
                                    <td  className='td'>CS502</td>
                                    <td  className='td'>Data Base Management System</td>
                                    <td  className='td'>5</td>
                                    <td  className='td'>2</td>
                                    <td  className='td'>Prof. Himanshu B.</td>
                                </tr>
                               <tr  className='tr'>
                                    <td  className='td'>CS503</td>
                                    <td className='td'>Cyber Security</td>
                                    <td  className='td'>5</td>
                                    <td  className='td'></td>
                                    <td  className='td'>Dr. Ritesh Joshi</td>
                                </tr>
                               <tr  className='tr'>
                                    <td className='td'>CS504</td>
                                    <td className='td'>Internet and Web Technology</td>
                                    <td  className='td'>5</td>
                                    <td  className='td'></td>
                                    <td  className='td'>Dr. Yakuta Tayeibi</td>
                                </tr>
                               <tr  className='tr'>
                                    <td className='td'>CS505</td>
                                    <td className='td'>Lab (Linux)</td>
                                    <td className='td'></td>
                                    <td className='td'>2</td>
                                    <td className='td'>Mr. Anand Kushwaha</td>
                                </tr>
                               <tr  className='tr'>
                                    <td className='td'>CS506</td>
                                    <td className='td'>Lab (Python)</td>
                                    <td className='td'></td>
                                    <td className='td'>2</td>
                                    <td className='td'>Prof. Pragya Ranka</td>
                                </tr>
                               <tr  className='tr'>
                                    <td className='td'>CS508</td>
                                    <td className='td'>Minor Project</td>
                                    <td className='td'></td>
                                    <td className='td'>1</td>
                                    <td className='td'>Dr. Purva Sharma</td>
                                </tr>
                               <tr  className='tr'>
                                    <td className='td'></td>
                                    <td className='td'>Aptitude</td>
                                    <td className='td'>2</td>
                                    <td className='td'></td>
                                    <td className='td'>Mr. Ishwar Prasad</td>
                                </tr>
                               <tr  className='tr'>
                                    <td className='td'></td>
                                    <td className='td'>Soft Skill</td>
                                    <td className='td'>2</td>
                                    <td className='td'></td>
                                    <td className='td'>Ms. Sonakshi Tongia</td>
                                </tr>
                               <tr  className='tr'>
                                    <td className='td'></td>
                                    <td className='td'>Cocubes Coding</td>
                                    <td className='td'></td>
                                    <td className='td'>2</td>
                                    <td className='td'>Mr. Prashant Shakyawar</td>
                                </tr>
                               <tr  className='tr'>
                                    <td className='td'></td>
                                    <td className='td'>Total</td>
                                    <td className='td'>24</td>
                                    <td className='td'>11</td>
                                    <td className='td'></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <button className="download-btn" onClick={downloadPDF}>Download Time Table</button>
        </>
    );
}

export default TimeTable;
