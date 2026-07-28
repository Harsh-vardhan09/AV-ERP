// // import { useState } from 'react';

// // function Registration() {
// //   const [index, setIndex] = useState(1);
// //   const [formData, setFormData] = useState({
// //     // Basic Information
// //     firstname: '',
// //     middlename: '',
// //     lastname: '',
// //     gender: '',
// //     dob: '',
// //     photo: null,
// //     nationality: '',
// //     bloodgroup: '',

// //     // Contact Information
// //     email: '',
// //     phoneNo: '',
// //     permanentAddress:{
// //         street: '',
// //         city: '',
// //         state: '',
// //         zipcode: '',
// //         country: '',
// //     },
// //     currentAddress:{
// //         street: '',
// //         city: '',
// //         state: '',
// //         zipcode: '',
// //         country: '',
// //     },
// //     alterPhoneNo: '',
// //     guardianEmail: '',

    

// //     // Guardian Information
// //     fatherName: '',
// //     motherName: '',
// //     fatherOccupation: '',
// //     motherOccupation: '',
// //     guardianContact: '',
// //     guardianAddress: {
// //       street: '',
// //       city: '',
// //       state: '',
// //       zipCode: '',
// //       country: '',
// //     },
// //     //Educational Background
// //     education:{
// //         highSchoolName:'',
// //         highSchoolGradYear: '',
// //         highSchoolPercentage: '',
// //         secondaryHighSchoolName: '',
// //         secondaryHighSchoolGradYear: '',
// //         secondaryHighSchoolPercentage: '',
// //         entranceExamScore: '',
// //         previousCollege: '',
// //         certifications: '',
// //         extracurriculars: '',
// //     },
// //     academicRecords: {
// //       semester: '',
// //       courses: {
// //         courseCode: '',
// //         courseName: '',
// //         grade: '',
// //         credits: '',
// //       },
// //       semesterGPA: '',
// //       cumulativeGPA: '',
// //     },
  

// //     // Program Information
// //     programName: '',
// //     department: '',
// //     batchYear: '',
// //     expectedGradYear: '',
// //     studentType: '',
// //     specialization: '',

// //     // Identification Documents
// //     studentId: '',
// //     passportNumber: '',
// //     birthCertificate: '',
// //     addressProof: '',
// //     drivingLicense: '',
// //     voterId: '',

// //     // Health and Emergency Information
// //     emergencyContact: {
// //       name: '',
// //       contactNumber: '',
// //     },
// //     healthInfo: {
// //       medicalConditions: [],
// //       healthInsuranceInfo: '',
// //       vaccinationRecords: [],
// //     },

// //     // Hostel and Accommodation
    
// //       hostelAllotmentStatus: false,
// //       roomNumber: '',
// //       roommatePreference: '',
// //       specialAccommodationRequirements: [],
    

// //     // Financials and Scholarship Information
// //     tuitionFees: {
// //       amount: '',
// //       paymentStatus: 'Unpaid',
// //       paymentMethod: '',
// //     },
// //     scholarships: [],
// //     financialAidStatus: '',
// //     installmentPlan: '',
// //     bankAccountNumber: '',
// //     loanDetails: '',

// //     //Attendance & Discipline
// //     records: {
// //       semester: '',
// //       totalClasses: '',
// //       attendedClasses: '',
// //     },
// //     disciplinaryActions:[],

// //     //Awards & Recognition
// //       awards: [],
// //       extraCurricularInvolvement: [],

// //     //GraduationInfo
// //     graduationDate: '',
// //     finalCGPA: '',
// //     degreeConferred: '',
// //     placementStatus: '',
// //     companyInfo: '',

// //     // Consent and Declarations

// //       dataUsageConsent: false,
// //       termsAgreement: false,
// //       authenticityDeclaration: false,
// //       promotionalConsent: false,
    
// //   });

// //   const isValidPage = () => {
// //     switch (index) {
// //       case 1:
// //         return formData.firstname && formData.lastname && formData.gender && formData.dob && formData.nationality && formData.bloodgroup;
// //       case 2:
// //         return formData.email && formData.phoneNo &&
// //           formData.permanentAddress.street && formData.permanentAddress.city &&
// //           formData.permanentAddress.state && formData.permanentAddress.zipcode && formData.permanentAddress.country &&
// //           formData.currentAddress.street && formData.currentAddress.city &&
// //           formData.currentAddress.state && formData.currentAddress.zipcode && formData.currentAddress.country;
// //       case 3:
// //         return formData.fatherName && formData.motherName && formData.fatherOccupation && formData.motherOccupation && formData.guardianContact && formData.guardianEmail && formData.guardianAddress.street && formData.guardianAddress.city &&
// //         formData.guardianAddress.state && formData.guardianAddress.zipCode && formData.guardianAddress.country;
// //       case 4:
// //         return formData.education.highSchoolName && formData.education.highSchoolGradYear && formData.education.highSchoolPercentage &&
// //         formData.education.secondaryHighSchoolName && formData.education.secondaryHighSchoolGradYear && formData.education.secondaryHighSchoolPercentage && formData.education.entranceExamScore && formData.education.previousCollege && formData.education.certifications && formData.education.extracurriculars;
// //       case 5:
// //         return formData.academicRecords.semester && formData.academicRecords.courses.courseCode && formData.academicRecords.courses.courseName && formData.academicRecords.courses.grade && formData.academicRecords.courses.credits && formData.academicRecords.semesterGPA && formData.academicRecords.cumulativeGPA;  
// //       case 6:
// //         return formData.programName && formData.department && formData.batchYear && formData.expectedGradYear && formData.studentType && formData.specialization;
// //       case 7:
// //         return formData.studentId && formData.passportNumber && formData.birthCertificate && formData.addressProof && formData.drivingLicense && formData.voterId;
// //       case 8: 
// //         return formData.emergencyContact.name && formData.emergencyContact.contactNumber && formData.healthInfo.medicalConditions && formData.healthInfo.healthInsuranceInfo && formData.healthInfo.vaccinationRecords;
// //       case 9:
// //         return formData.hostelAllotmentStatus && formData.roomNumber && formData.roommatePreference && formData.specialAccommodationRequirements;
// //       case 10:
// //         return formData.tuitionFees.amount && formData.tuitionFees.paymentStatus && formData.tuitionFees.paymentMethod && formData.scholarships && formData.financialAidStatus && formData.installmentPlan && formData.bankAccountNumber && formData.loanDetails;
// //       case 11:
// //         return formData.records.semester && formData.records.totalClasses && formData.records.attendedClasses && formData.disciplinaryActions;
// //     case 12:
// //       return formData.awards && formData.extraCurricularInvolvement;
// //     case 13:
// //       return formData.graduationDate && formData.finalCGPA && formData.degreeConferred && formData.placementStatus && formData.companyInfo;
// //     case 14:
// //       return formData.dataUsageConsent && formData.termsAgreement && formData.authenticityDeclaration && formData.promotionalConsent;
// //       default:
// //         return true;
// //     }
// //   };

// //   const nextForm = () => {
// //     if (isValidPage()) {
// //       setIndex(index + 1);
// //     } else {
// //       alert('Please fill out all required fields before proceeding.');
// //     }
// //   };


// //   // const nextForm = () => {
// //   //   setIndex(index + 1);
// //   // };

// //   const prevForm = () => {
// //     setIndex(index - 1);
// //   };

// //   // Render form based on the index
// //   const renderForm = () => {
// //     switch (index) {
// //       case 1:
// //         return (
// //           <div className="personal-info registration" id="personal-info">
// //             <h1>Personal Information</h1>
// //             <label htmlFor="firstname">First Name:</label>
// //             <input
// //               id="firstname"
// //               placeholder="Enter first name"
// //               type="text"
// //               required
// //               value={formData.firstname}
// //               onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
// //             />
// //             <br />
// //             <label htmlFor="middlename">Middle Name:</label>
// //             <input
// //               id="middlename"
// //               placeholder="Enter Middle name"
// //               type="text"
// //               value={formData.middlename}
// //               onChange={(e) => setFormData({ ...formData, middlename: e.target.value })}
// //             />
// //             <br />
// //             <label htmlFor="lastname">Last Name:</label>
// //             <input
// //               id="lastname"
// //               placeholder="Enter last name"
// //               type="text"
// //               required
// //               value={formData.lastname}
// //               onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
// //             />
// //             <br />
// //             <label htmlFor="gender">Gender:</label>
// //             <select
// //               id="gender"
// //               value={formData.gender}
// //               required
// //               onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
// //             >
// //               <option value="Male">Male</option>
// //               <option value="Female">Female</option>
// //               <option value="Others">Others</option>
// //             </select>
// //             <br />
// //             <label htmlFor="dob">Date of Birth:</label>
// //             <input
// //               id="dob"
// //               type="date"
// //               required
// //               value={formData.dob}
// //               onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
// //             />
// //             <br />
// //             <label htmlFor="photo">Student Photo:</label>
// //             <input
// //               id="photo"
// //               type="file"
// //               required
// //               onChange={(e) => setFormData({ ...formData, photo: e.target.files[0] })}
// //             />
// //             <br />
// //             <label htmlFor="nationality">Nationality:</label>
// //             <input
// //               id="nationality"
// //               type="text"
// //               placeholder="Enter nationality"
// //               required
// //               value={formData.nationality}
// //               onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
// //             />
// //             <br />
// //             <label htmlFor="bloodgroup">Blood Group:</label>
// //             <input
// //               id="bloodgroup"
// //               type="text"
// //               placeholder="Enter blood group"
// //               required
// //               value={formData.bloodgroup}
// //               onChange={(e) => setFormData({ ...formData, bloodgroup: e.target.value })}
// //             />
// //             <br />
// //             <div className="button">
// //               {index > 1 && (
// //                 <button className="prev-button" onClick={prevForm}>
// //                   {'<'} Previous
// //                 </button>
// //               )}
// //               <p>{index}/14</p>
// //               {index < 14 && (
// //                 <button className="next-button" onClick={nextForm}>
// //                   Next {'>'}
// //                 </button>
// //               )}
// //             </div>
// //           </div>
// //         );
// //       case 2:
// //         return (
// //           <div className="contact-info registration" id="contact-info">
// //             <h1>Contact Information</h1>
// //             <label htmlFor="email">Personal Email:</label>
// //             <input
// //               id="email"
// //               type="email"
// //               placeholder="Enter your email"
// //               required
// //               value={formData.email}
// //               onChange={(e) => setFormData({ ...formData, email: e.target.value })}
// //             />
// //             <br />
// //             <label htmlFor="phoneNo">Phone Number:</label>
// //             <input
// //               id="phoneNo"
// //               type="tel"
// //               placeholder="Enter your phone number"
// //               required
// //               value={formData.phoneNo}
// //               onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })}
// //             />
// //             <br />
// //             <h3>Permanent Address:</h3>
// //             <label htmlFor="street">Street:</label>
// //             <input
// //               id="street"
// //               type="text"
// //               required
// //               value={formData.permanentAddress.street}
// //               onChange={(e) =>
// //                 setFormData({
// //                   ...formData,
// //                   permanentAddress: {
// //                     ...formData.permanentAddress,
// //                     street: e.target.value,
// //                   },
// //                 })
// //               }
// //             />
// //             <br />
// //             <label htmlFor="city">City:</label>
// //             <input
// //               id="city"
// //               type="text"
// //               required
// //               value={formData.permanentAddress.city}
// //               onChange={(e) =>
// //                 setFormData({
// //                   ...formData,
// //                   permanentAddress: {
// //                     ...formData.permanentAddress,
// //                     city: e.target.value,
// //                   },
// //                 })
// //               }
// //             />
// //             <br />
// //             <label htmlFor="state">State:</label>
// //             <input
// //               id="state"
// //               type="text"
// //               required
// //               value={formData.permanentAddress.state}
// //               onChange={(e) =>
// //                 setFormData({
// //                   ...formData,
// //                   permanentAddress: {
// //                     ...formData.permanentAddress,
// //                     state: e.target.value,
// //                   },
// //                 })
// //               }
// //             />
// //             <br />
// //             <label htmlFor="zipcode">Zip Code:</label>
// //             <input
// //               id="zipcode"
// //               type="text"
// //               required
// //               value={formData.permanentAddress.zipcode}
// //               onChange={(e) =>
// //                 setFormData({
// //                   ...formData,
// //                   permanentAddress: {
// //                     ...formData.permanentAddress,
// //                     zipcode: e.target.value,
// //                   },
// //                 })
// //               }
// //             />
// //             <br />
// //             <label htmlFor="country">Country:</label>
// //             <input
// //               id="country"
// //               type="text"
// //               required
// //               value={formData.permanentAddress.country}
// //               onChange={(e) =>
// //                 setFormData({
// //                   ...formData,
// //                   permanentAddress: {
// //                     ...formData.permanentAddress,
// //                     country: e.target.value,
// //                   },
// //                 })
// //               }
// //             />
// //             <br />
// //             <h3>Current Address:</h3>
// //             <label htmlFor="street">Street:</label>
// //             <input
// //               id="street"
// //               type="text"
// //               required
// //               value={formData.street}
// //               onChange={(e) => setFormData({ ...formData, street: e.target.value })}
// //             />
// //             <br />
// //             <label htmlFor="city">City:</label>
// //             <input
// //               id="city"
// //               type="text"
// //               required
// //               value={formData.currentAddress.state}
// //               onChange={(e) =>
// //                 setFormData({
// //                   ...formData,
// //                   currentAddress: {
// //                     ...formData.currentAddress,
// //                     state: e.target.value,
// //                   },
// //                 })
// //               }
// //             />
// //             <br />
// //             <label htmlFor="state">State:</label>
// //             <input
// //               id="state"
// //               type="text"
// //               required
// //               value={formData.currentAddress.state}
// //               onChange={(e) =>
// //                 setFormData({
// //                   ...formData,
// //                   currentAddress: {
// //                     ...formData.currentAddress,
// //                     state: e.target.value,
// //                   },
// //                 })
// //               }
// //             />
// //             <br />
// //             <label htmlFor="zipcode">Zip Code:</label>
// //             <input
// //               id="zipcode"
// //               type="text"
// //               required
// //               value={formData.currentAddress.zipcode}
// //               onChange={(e) =>
// //                 setFormData({
// //                   ...formData,
// //                   currentAddress: {
// //                     ...formData.currentAddress,
// //                     zipcode: e.target.value,
// //                   },
// //                 })
// //               }
// //             />
// //             <br />
// //             <label htmlFor="country">Country:</label>
// //             <input
// //               id="country"
// //               type="text"
// //               required
// //               value={formData.currentAddress.country}
// //               onChange={(e) =>
// //                 setFormData({
// //                   ...formData,
// //                   currentAddress: {
// //                     ...formData.currentAddress,
// //                     country: e.target.value,
// //                   },
// //                 })
// //               }
// //             />
// //             <br /><br/><br/>
// //             <label htmlFor="alterPhoneNo">Alternative Phone Number:</label>
// //             <input
// //               id="phoneNo"
// //               type="tel"
// //               placeholder="Enter an alternative phone number"
// //               value={formData.alterPhoneNo}
// //               onChange={(e) => setFormData({ ...formData, alterPhoneNo: e.target.value })}
// //             />
// //             <br />
            
// //             <div className="button">
// //               {index > 1 && (
// //                 <button className="prev-button" onClick={prevForm}>
// //                   {'<'} Previous
// //                 </button>
// //               )}
// //               <p>{index}/14</p>
// //               {index < 14 && (
// //                 <button className="next-button" onClick={nextForm}>
// //                   Next {'>'}
// //                 </button>
// //               )}
// //             </div>
// //           </div>
// //         );
// //       case 3:
// //         return(<>
// //             <div className='guardian-info registration' id='guardian-info'>
// //                 <h1>Guardian Information:</h1>
// //                 <label htmlFor="fatherName">Father's Name:</label>
// //                 <input
// //                 id="fatherName"
// //                 type="text"
// //                 placeholder="Enter your father's name"
// //                 required
// //                 value={formData.fatherName}
// //                 onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
// //                 />
// //                 <br />
// //                 <label htmlFor="motherName">Mother's Name:</label>
// //                 <input
// //                 id="motherName"
// //                 type="text"
// //                 placeholder="Enter your mother's name"
// //                 required
// //                 value={formData.motherName}
// //                 onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
// //                 />
// //                 <br />
// //                 <label htmlFor="fatherOccupation">Father's Occupation:</label>
// //                 <input
// //                 id="fatherOccupation"
// //                 type="text"
// //                 placeholder="Enter your father's occupation"
// //                 required
// //                 value={formData.fatherOccupation}
// //                 onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
// //                 />
// //                 <br />
// //                 <label htmlFor="motherOccupation">Mother's Occupation:</label>
// //                 <input
// //                 id="motherOccupation"
// //                 type="text"
// //                 placeholder="Enter your mother's occupation"
// //                 required
// //                 value={formData.motherOccupation}
// //                 onChange={(e) => setFormData({ ...formData, motherOccupation: e.target.value })}
// //                 />
// //                 <br />
// //                 <label htmlFor="guardianContact">Guardian Contact:</label>
// //             <input
// //               id="guardianContact"
// //               type="tel"
// //               placeholder="Enter your guardian's contact"
// //               value={formData.guardianContact}
// //               onChange={(e) => setFormData({ ...formData, guardianContact: e.target.value })}
// //             />
// //             <br />
// //             <label htmlFor="guardianEmail">Guardian Email:</label>
// //             <input
// //               id="guardianEmail"
// //               type="text"
// //               placeholder="Enter your guardian's email"
// //               value={formData.guardianEmail}
// //               onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
// //             />
// //             <br />
// //                 <h3>Guardian Address:</h3>
// //                 <label htmlFor="street">Street:</label>
// //             <input
// //               id="street"
// //               type="text"
// //               required
// //               value={formData.street}
// //               onChange={(e) => setFormData({ ...formData, street: e.target.value })}
// //             />
// //             <br />
// //             <label htmlFor="city">City:</label>
// //             <input
// //               id="city"
// //               type="text"
// //               required
// //               value={formData.city}
// //               onChange={(e) => setFormData({ ...formData, city: e.target.value })}
// //             />
// //             <br />
// //             <label htmlFor="state">State:</label>
// //             <input
// //               id="state"
// //               type="text"
// //               required
// //               value={formData.state}
// //               onChange={(e) => setFormData({ ...formData, state: e.target.value })}
// //             />
// //             <br />
// //             <label htmlFor="zipcode">Zip Code:</label>
// //             <input
// //               id="zipcode"
// //               type="text"
// //               required
// //               value={formData.zipcode}
// //               onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
// //             />
// //             <br />
// //             <label htmlFor="country">Country:</label>
// //             <input
// //               id="country"
// //               type="text"
// //               required
// //               value={formData.country}
// //               onChange={(e) => setFormData({ ...formData, country: e.target.value })}
// //             />
// //             <br /><br/>
            
// //             <div className="button">
// //               {index > 1 && (
// //                 <button className="prev-button" onClick={prevForm}>
// //                   {'<'} Previous
// //                 </button>
// //               )}
// //               <p>{index}/14</p>
// //               {index < 14 && (
// //                 <button className="next-button" onClick={nextForm}>
// //                   Next {'>'}
// //                 </button>
// //               )}
// //             </div>
// //             </div>
// //         </>);
// //         case 4:
// //             return(
// //                 <div className="educational-background registration" id='educational-background'>
// //                     <h1>Educational Background: </h1>
// //                     <label htmlFor="highSchoolName">High School Name:</label>
// //                     <input
// //                     id="highSchoolName"
// //                     type="text"
// //                     placeholder='Enter your High School Name'
// //                     required
// //                     value={formData.highSchoolName}
// //                     onChange={(e) => setFormData({ ...formData, highSchoolName: e.target.value })}
// //                     /><br/>
// //                     <label htmlFor="highSchoolGradYear">High School Passing Year:</label>
// //                     <input
// //                     id="highSchoolGradYear"
// //                     placeholder='Enter your High School Year'
// //                     type="number"
// //                     min="2000"
// //                     required
// //                     value={formData.highSchoolGradYear}
// //                     onChange={(e) => setFormData({ ...formData, highSchoolGradYear: e.target.value })}
// //                     /><br/>
// //                     <label htmlFor="highSchoolPercentage">High School Percentage:</label>
// //                     <input
// //                     id="highSchoolPercentage"
// //                     type="number"
// //                     placeholder='Enter your High School Percentage'
// //                     min="0"
// //                     max="100"
// //                     required
// //                     value={formData.highSchoolPercentage}
// //                     onChange={(e) => setFormData({ ...formData, highSchoolPercentage: e.target.value })}
// //                     /><br/>
// //                     <label htmlFor="secondaryHighSchoolName">Secondary School Name:</label>
// //                     <input
// //                     id="secondaryHighSchoolName"
// //                     type="text"
// //                     required
// //                     placeholder='Enter your Secondary School Name'
// //                     value={formData.secondaryHighSchoolName}
// //                     onChange={(e) => setFormData({ ...formData, secondaryHighSchoolName: e.target.value })}
// //                     /><br/>
// //                     <label htmlFor="secondaryHighSchoolGradYear">Secondary School Passing Year:</label>
// //                     <input
// //                     id="secondaryHighSchoolGradYear"
// //                     type="number"
// //                     placeholder='Enter your Secondary School Passing Year'
// //                     min="2000"
// //                     required
// //                     value={formData.secondaryHighSchoolGradYear}
// //                     onChange={(e) => setFormData({ ...formData, secondaryHighSchoolGradYear: e.target.value })}
// //                     /><br/>
// //                     <label htmlFor="secondaryHighSchoolPercentage">Secondary School Percentage:</label>
// //                     <input
// //                     id="secondaryHighSchoolPercentage"
// //                     type="number"
// //                     min="0"
// //                     max="100"
// //                     required
// //                     value={formData.secondaryHighSchoolPercentage}
// //                     onChange={(e) => setFormData({ ...formData, secondaryHighSchoolPercentage: e.target.value })}
// //                     /><br/>
// //                     <label htmlFor='entranceExamFor'>Entrance Exam Score:</label>
// //                     <input
// //                     id="entranceExamScore"
// //                     type="number"
// //                     min="0"
// //                     max="100"
// //                     required
// //                     value={formData.entranceExamScore}
// //                     onChange={(e) => setFormData({ ...formData, entranceExamScore: e.target.value })}
// //                     /><br/>
// //                     <label htmlFor='previousCollege'>Previous College:</label>
// //                     <input
// //                     id="previousCollege"
// //                     type="text"
// //                     placeholder='Enter Previous College Name'
// //                     value={formData.previousCollege}
// //                     onChange={(e) => setFormData({ ...formData, previousCollege: e.target.value })}
// //                     /><br/>
// //                     <label htmlFor='certifications'>Certifications:</label>
// //                     <input
// //                     id="certifications"
// //                     type="text"
// //                     placeholder='Enter your Certifications'
// //                     value={formData.certifications}
// //                     onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
// //                     /><br/>
// //                     <label htmlFor='extraCurriculars'>Extra Curriculars:</label>
// //                     <input
// //                     id="extraCurriculars"
// //                     type="text"
// //                     placeholder='Extra Curriculars'
// //                     required
// //                     value={formData.extraCurriculars}
// //                     onChange={(e) => setFormData({ ...formData, extraCurriculars: e.target.value })}
// //                     /><br/>
// //                     <div className="button">
// //                         {index > 1 && (
// //                             <button className="prev-button" onClick={prevForm}>
// //                             {'<'} Previous
// //                             </button>
// //                         )}
// //                         <p>{index}/14</p>
// //                         {index < 14 && (
// //                             <button className="next-button" onClick={nextForm}>
// //                             Next {'>'}
// //                             </button>
// //                         )}
// //                         </div>
// //                 </div>
// //             );
// //         case 5: 
// //         return(
// //             <div className="course-info registration" id='course-info'>
// //                 <h1>Course Information:</h1>
// //                 <label htmlFor='courseName'>Course Name:</label>
// //                 <input
// //                     id="courseName"
// //                     type="text"
// //                     placeholder='Enter Course Name'
// //                     required
// //                     value={formData.courseName}
// //                     onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
// //                     /><br/>
// //                 <label htmlFor='department'>Department Name:</label>
// //                 <input
// //                     id="department"
// //                     type="text"
// //                     placeholder='Enter Department Name'
// //                     required
// //                     value={formData.department}
// //                     onChange={(e) => setFormData({ ...formData, department: e.target.value })}
// //                  /><br/>
// //                 <label htmlFor='batchYear'>Batch Year:</label>
// //                 <input
// //                     id="batchYear"
// //                     type="number"
// //                     placeholder='Enter Batch Year'
// //                     required
// //                     min="2000"
// //                     value={formData.batchYear}
// //                     onChange={(e) => setFormData({ ...formData, batchYear: e.target.value })}
// //                  /><br/>
// //                 <label htmlFor='expectedGradYear'>Expected Graduation Year:</label>
// //                 <input
// //                     id="expectedGradYear"
// //                     type="number"
// //                     placeholder='Enter Expected Graduation Year'
// //                     required
// //                     min="2020"
// //                     value={formData.expectedGradYear}
// //                     onChange={(e) => setFormData({ ...formData, expectedGradYear: e.target.value })}
// //                  /><br/>
// //                 <label htmlFor='studentType'>Student Type:</label>
// //                 <select
// //                     id="studentType"
// //                     value={formData.studentType}
// //                     required
// //                     onChange={(e) => setFormData({ ...formData, studentType: e.target.value })}
// //                     >
// //                     <option value="Regular">Regular</option>
// //                     <option value="Ex">Ex</option>
// //                 </select>
// //                 <br />
// //                 <label htmlFor='specialization'>Specialization:</label>
// //                 <input
// //                     id="specialization"
// //                     type="text"
// //                     placeholder='Enter your Specialization'
// //                     value={formData.specialization}
// //                     onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
// //                  /><br/>
                 
// //                 <div className="button">
// //                         {index > 1 && (
// //                             <button className="prev-button" onClick={prevForm}>
// //                             {'<'} Previous
// //                             </button>
// //                         )}
// //                         <p>{index}/14</p>
// //                         {index < 14 && (
// //                             <button className="next-button" onClick={nextForm}>
// //                             Next {'>'}
// //                             </button>
// //                         )}
// //                 </div>
// //             </div>
// //         );
// //     case 6:
// //         return(
// //             <div className="academic-records registration" id='academic-records'>
// //                 <h1>Academic Records:</h1>
// //                 <label htmlFor='semester'>Semester:</label>
// //                 <input
// //                     id="semester"
// //                     type="text"
// //                     placeholder='Enter Semester'
// //                     required
// //                     value={formData.semester}
// //                     onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
// //                  />
// //                  <label htmlFor='courseCode'>Course Code:</label>
// //                 <input
// //                     id="courseCode"
// //                     type="text"
// //                     placeholder='Enter Course Code'
// //                     required
// //                     value={formData.courseCode}
// //                     onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
// //                  /><br/>
// //                 <label htmlFor='courseName'>Course Name:</label>
// //                 <input
// //                     id="courseName"
// //                     type="text"
// //                     placeholder='Enter Course Name'
// //                     required
// //                     value={formData.courseName}
// //                     onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
// //                  /><br/>
// //                 <label htmlFor='grade'>Grade:</label>
// //                 <input
// //                     id="grade"
// //                     type="text"
// //                     placeholder='Enter Grade'
// //                     required
// //                     value={formData.grade}
// //                     onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
// //                  /><br/>
// //                  <label htmlFor='credits'>Credits:</label>
// //                 <input
// //                     id="credits"
// //                     type="text"
// //                     placeholder='Enter Credits'
// //                     required
// //                     value={formData.credits}
// //                     onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
// //                  /><br/>
// //                  <label htmlFor='semesterGPA'>Semester GPA:</label>
// //                  <input
// //                     id="semesterGPA"
// //                     type="text"
// //                     placeholder='Enter Semester GPA'
// //                     required
// //                     value={formData.semesterGPA}
// //                     onChange={(e) => setFormData({ ...formData, semesterGPA: e.target.value })}
// //                  /><br/>
// //                  <label htmlFor='cumulativeGPA'>Cumulative GPA:</label>
// //                  <input
// //                     id="cumulativeGPA"
// //                     type="text"
// //                     placeholder='Enter Cumulative GPA'
// //                     required
// //                     value={formData.cumulativeGPA}
// //                     onChange={(e) => setFormData({ ...formData, cumulativeGPA: e.target.value })}
// //                  /><br/>
// //                 <div className="button">
// //                         {index > 1 && (
// //                             <button className="prev-button" onClick={prevForm}>
// //                             {'<'} Previous
// //                             </button>
// //                         )}
// //                         <p>{index}/14</p>
// //                         {index < 14 && (
// //                             <button className="next-button" onClick={nextForm}>
// //                             Next {'>'}
// //                             </button>
// //                         )}
// //                 </div>
// //             </div>
// //         );
// //       case 7:
// //         return(
// //           <div className="idDocuments registration" id='idDocuments'>
// //             <h1>Documents:</h1>
// //             <label htmlFor='studentId'>Student ID:</label>
// //             <input
// //                id="studentId"
// //                type="text"
// //                placeholder='Enter Student ID'
// //                required
// //                value={formData.studentId}
// //                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
// //             /><br/>
// //             <label htmlFor='passportNo'>Passport Number:</label>
// //             <input
// //                id="passportNo"
// //                type="text"
// //                placeholder='Enter Passport Number'
// //                required
// //                value={formData.passportNo}
// //                onChange={(e) => setFormData({ ...formData, passportNo: e.target.value })}
// //             /><br/>
// //             <label htmlFor='birthCertificate'>Birth Certificate:</label>
// //             <input
// //                id="birthCertificate"
// //                type="file"
// //                required
// //                value={formData.birthCertificate}
// //                onChange={(e) => setFormData({ ...formData, birthCertificate: e.target.value })}
// //             /><br/>
// //             <label htmlFor='addressProof'>Address Proof:</label>
// //             <input
// //                id="addressProof"
// //                type="file"
// //                required
// //                value={formData.addressProof}
// //                onChange={(e) => setFormData({ ...formData, addressProof: e.target.value })}
// //             /><br/>
// //             <label htmlFor='drivingLicense'>Driving License:</label>
// //             <input
// //                id="drivingLicense"
// //                type="file"
// //                required
// //                value={formData.drivingLicense}
// //                onChange={(e) => setFormData({ ...formData, drivingLicense: e.target.value })}
// //             /><br/>
// //             <label htmlFor='voterId'>Voter ID:</label>
// //             <input
// //                id="voterId"
// //                type="file"
// //                required
// //                value={formData.voterId}
// //                onChange={(e) => setFormData({ ...formData, voterId: e.target.value })}
// //             /><br/>

// //             <div className="button">
// //                         {index > 1 && (
// //                             <button className="prev-button" onClick={prevForm}>
// //                             {'<'} Previous
// //                             </button>
// //                         )}
// //                         <p>{index}/14</p>
// //                         {index < 14 && (
// //                             <button className="next-button" onClick={nextForm}>
// //                             Next {'>'}
// //                             </button>
// //                         )}
// //                 </div>
// //           </div>
// //         );
// //       case 8:
// //         return(
// //           <div className="health-info registration" id='health-info'>
// //             <h1>Health Information</h1>
// //             <label htmlFor='emergencyContactname'>Emergency Contact Name</label>
// //             <input
// //                id="emergencyContactname"
// //                type="text"
// //                placeholder='Enter Emergency Contact Name'
// //                required
// //                value={formData.emergencyContact.name}
// //                onChange={(e) => setFormData({
// //                 ...formData,
// //                 emergencyContact: { 
// //                     ...formData.emergencyContact, 
// //                     name: e.target.value 
// //                 }
// //             })}
            
// //             /><br/>
// //             <label htmlFor='emergencyContactnumber'>Emergency Contact Number</label>
// //             <input
// //                id="emergencyContactnumber"
// //                type="tel"
// //                placeholder='Enter Emergency Contact Number'
// //                required
// //                value={formData.emergencyContact.contactNumber}
// //                onChange={(e) => setFormData({
// //                 ...formData,
// //                 emergencyContact: { 
// //                     ...formData.emergencyContact, 
// //                     contactNumber: e.target.value 
// //                 }
// //             })}
            
// //             /><br/>
// //             <label htmlFor='medicalcond'>Medical Conditions:</label>
// //             <input
// //               id='medicalcond'
// //               type='text'
// //               placeholder='Enter medical condition'
// //               value={formData.medicalConditions}
// //               onChange={(e)=> setFormData({...formData,medicalConditions: e.target.value})}
// //             /><br/>
// //             <label id='healthInsuranceInfo'>Health Insurance Information</label>
// //             <input
// //               id='healthInsuranceInfo'
// //               type='text'
// //               placeholder='Health Insurance Information'
// //               required
// //               value={formData.healthInsuranceInfo}
// //               onChange={(e)=> setFormData({...formData, healthInsuranceInfo: e.target.value})}
// //             /><br/>
// //             <label htmlFor='vaccinationRecords'>Vaccination Records: </label>
// //             <input 
// //               id='vaccinationRecords'
// //               type="text"
// //               placeholder='Vaccination Records'
// //               required
// //               value={formData.vaccinationRecords}
// //               onChange={(e)=> setFormData({...formData, vaccinationRecords: e.target.value})}
// //             /><br/>
// //             <div className="button">
// //                         {index > 1 && (
// //                             <button className="prev-button" onClick={prevForm}>
// //                             {'<'} Previous
// //                             </button>
// //                         )}
// //                         <p>{index}/14</p>
// //                         {index < 14 && (
// //                             <button className="next-button" onClick={nextForm}>
// //                             Next {'>'}
// //                             </button>
// //                         )}
// //                 </div>
// //           </div>
// //         );
// //       case 9: 
// //       return(
// //         <div className="hostel-info registration" id='hostel-info'>
// //           <h1>Hostel Information: </h1>
// //           <label htmlFor='hostelAllotmentStatus'>Hostel Allotment Status:* </label>
// //           <select
// //             id='hostelAllotmentStatus'
// //             value={formData.hostelAllotmentStatus === "true"}
// //             required
// //             onChange={(e) => setFormData({
// //                 ...formData,
// //                 hostelAllotmentStatus: e.target.value === 'true' // Convert string back to boolean
// //             })}

// //           >
// //             <option value="false">No</option>
// //             <option value="true">Yes</option>
// //           </select><br/>
// //           {formData.hostelAllotmentStatus && (
// //             <div>
// //               <label htmlFor='roomNo'>Room Number:</label>
// //               <input 
// //                 id='roomNo'
// //                 type='text'
// //                 placeholder='Enter Room Number'
// //                 required
// //                 value={formData.roomNumber}
// //                 onChange={(e)=> setFormData({...formData, roomNumber: e.target.value})}
// //               /><br/>
// //               <label htmlFor='roommatePref'>Roommate Preference:</label>
// //               <input 
// //                 id='roommatePref'
// //                 type='text'
// //                 placeholder='Roommate Preference'
// //                 required
// //                 value={formData.roommatePreference}
// //                 onChange={(e)=> setFormData({...formData, roomNumber: e.target.value})}
// //               /><br/>
// //               <label htmlFor='accomodationReq'>Special Accomodation Requirements:</label>
// //               <input
// //                 id='accomodationReq'
// //                 placeholder='Enter Accomodation Requirements'
// //                 value={formData.specialAccommodationRequirements}
// //                 type='text'
// //                 onChange={(e)=> setFormData({...formData, specialAccommodationRequirements: e.target.value})}
// //               /><br/>
// //             </div>
// //           )}          

// //           <div className="button">
// //             {index > 1 && (
// //                 <button className="prev-button" onClick={prevForm}>
// //                 {'<'} Previous
// //                 </button>
// //             )}
// //             <p>{index}/14</p>
// //             {index < 14 && (
// //                 <button className="next-button" onClick={nextForm}>
// //                 Next {'>'}
// //                 </button>
// //             )}
// //           </div>
// //         </div>
// //       );
// //     case 10:
// //       return(
// //         <div className="fin-scholarship-info registration" id='fin-scholarship-info'>
// //           <h1>Financial & Scholarship Information: </h1>
// //           <label htmlFor='tuitionFees'>Tuition Fees: </label>
// //           <input 
// //             id='tuitionFees'
// //             type='text'
// //             placeholder='Tuition Fees'
// //             required
// //             value={formData.tuitionFees.amount}
// //             onChange={(e) => setFormData({
// //               ...formData,
// //               tuitionFees: { 
// //                   ...formData.tuitionFees, 
// //                   amount: e.target.value 
// //               }
// //           })}
          
// //           /><br />
// //           <label htmlFor='paymentStatus'>Payment Status: </label>
// //           <select
// //             id='paymentStatus'
// //             value={formData.tuitionFees.paymentStatus}
// //             required
// //             onChange={(e) => setFormData({
// //               ...formData,
// //               tuitionFees: { 
// //                   ...formData.tuitionFees, 
// //                   paymentStatus: e.target.value 
// //               }
// //           })}
// //           >
// //             <option value="unpaid">Unpaid</option>
// //             <option value="paid">Paid</option>
// //           </select>
// //           <label htmlFor='paymentMethod'>Payment Method: </label>
// //           <input 
// //             id='paymentMethod'
// //             type='text'
// //             placeholder='Enter Payment Method'
// //             value={formData.tuitionFees.paymentMethod}
// //             required
// //             onChange={(e) => setFormData({
// //               ...formData,
// //               tuitionFees: { 
// //                   ...formData.tuitionFees, 
// //                   paymentMethod: e.target.value 
// //               }
// //           })}
          
// //           /><br />
// //           <label htmlFor='scholarships'>Scholarships: </label>
// //           <input 
// //             id='scholarships'
// //             type='text'
// //             placeholder='Scholarships'
// //             value={formData.scholarships}
// //             required
// //             onChange={(e)=> setFormData({...formData, scholarships: e.target.value})}
// //           /><br/>
// //           <label htmlFor='financialAidStatus'>Financial Aid Status: </label>
// //           <input
// //             id='financialAidStatus'
// //             type='text'
// //             required
// //             value={formData.financialAidStatus}
// //           />
// //           <br/>
// //           <label htmlFor='installmentPlan'>Installment Plan: </label>
// //           <input
// //             id='installmentPlan'
// //             type='text'
// //             required
// //             value={formData.installmentPlan}
// //           />
// //           <label htmlFor='accNo'>Bank Account Number: </label>
// //           <input
// //             id='accNo'
// //             type='text'
// //             placeholder='Account Number'
// //             required
// //             value={formData.bankAccountNumber}
// //             onChange={(e)=> setFormData({...formData, bankAccountNumber:e.target.value})}
// //           /><br/>
// //           <label htmlFor='loanDetails'>Loan Details: </label>
// //           <input
// //             id='loanDetails'
// //             type='text'
// //             required
// //             value={formData.loanDetails}
// //             onChange={(e)=> setFormData({...formData, loanDetails: e.target.value})}
// //           /><br/>
// //           <div className="button">
// //             {index > 1 && (
// //                 <button className="prev-button" onClick={prevForm}>
// //                 {'<'} Previous
// //                 </button>
// //             )}
// //             <p>{index}/14</p>
// //             {index < 14 && (
// //                 <button className="next-button" onClick={nextForm}>
// //                 Next {'>'}
// //                 </button>
// //             )}
// //           </div>
// //         </div>
// //       );
// //     case 11:
// //       return(
// //         <div className="attendance-discipline registration" id='attendance-discipline'>
// //           <h1>Attendance & Discipline: </h1>
// //           <label htmlFor='records-sem'>Semester</label>
// //           <input
// //             id='recors-sem'
// //             type='text'
// //             placeholder='Semester'
// //             required
// //             value={formData.records.semester}
// //             onChange={(e) => setFormData({
// //               ...formData,
// //               records: { 
// //                   ...formData.records, 
// //                   semester: e.target.value 
// //               }
// //           })}
          
// //           />
// //           <label htmlFor='totalClasses'>Total Classes:</label>
// //           <input
// //             id='totalClasses'
// //             type='text'
// //             required
// //             value={formData.records.totalClasses}
// //             onChange={(e) => setFormData({
// //               ...formData,
// //               records: { 
// //                   ...formData.records, 
// //                   totalClasses: e.target.value 
// //               }
// //           })}
          
// //           />
// //           <label htmlFor='attended-classes'>Attended Classes: </label>
// //           <input
// //             id='attended-classes'
// //             type='text'
// //             required
// //             value={formData.records.attendedClasses}
// //             onChange={(e) => setFormData({
// //               ...formData,
// //               records: { 
// //                   ...formData.records, 
// //                   attendedClasses: e.target.value 
// //               }
// //           })}
          
// //           />
// //           <label htmlFor='disciplinaryActions'>Disciplinary Actions: </label>
// //           <input
// //             id='disciplinaryActions'
// //             type='text'
// //             value={formData.disciplinaryActions}
// //             onChange={(e)=> setFormData({...formData, disciplinaryActions: e.target.value})}
// //           />
// //           <div className="button">
// //             {index > 1 && (
// //               <button className="prev-button" onClick={prevForm}>
// //               {'<'} Previous
// //               </button>
// //             )}
// //             <p>{index}/14</p>
// //             {index < 14 && (
// //               <button className="next-button" onClick={nextForm}>
// //               Next {'>'}
// //               </button>
// //             )}
// //           </div>
// //         </div>
// //       );
// //     case 12:
// //       return(
// //         <div className="awards registration" id='awards'>
// //           <h1>Awards & Recognitions: </h1>
// //           <label htmlFor='awards'>Awards: </label>
// //           <input
// //             id='awards'
// //             type='text'
// //             placeholder='Awards'
// //             value={formData.awards}
// //             onChange={(e)=> setFormData({...formData, awards: e.target.value})}
// //           />
// //           <label htmlFor='extraCurricularInvolvement'>Extra-Curricular Involvement: </label>
// //           <input
// //             id='extraCurricularInvolvement'
// //             type='text'
// //             value={formData.extraCurricularInvolvement}
// //             onChange={(e)=> setFormData({...formData, extraCurricularInvolvement: e.target.value})}
// //           />
// //           <div className="button">
// //             {index > 1 && (
// //               <button className="prev-button" onClick={prevForm}>
// //               {'<'} Previous
// //               </button>
// //             )}
// //             <p>{index}/14</p>
// //             {index < 14 && (
// //               <button className="next-button" onClick={nextForm}>
// //               Next {'>'}
// //               </button>
// //             )}
// //           </div>
// //         </div>
// //       );
// //     case 13:
// //       return(
// //         <div className="graduation-info registration" id='graduation-info'>
// //           <h1>Graduation Information: </h1>
// //           <label htmlFor='grad-date'>Graduation Date: </label>
// //           <input
// //             id='grad-date'
// //             type='date'
// //             required
// //             value={formData.graduationDate}
// //             onChange={(e)=> setFormData({...formData, graduationDate: e.target.value})}
// //           /><br/>
// //           <label htmlFor='finalcgpa'>Final CGPA: </label>
// //           <input
// //             id='finalcgpa'
// //             type='text'
// //             required
// //             value={formData.finalCGPA}
// //             onChange={(e)=> setFormData({...formData, finalCGPA: e.target.value})}
// //           /><br/>
// //           <label htmlFor='degree-status'>Degree Conferred: </label>
// //           <select
// //             id='degree-status'
// //             required
// //             value={formData.degreeConferred === 'true'}
// //             onChange={(e) => setFormData({
// //                 ...formData,
// //                 degreeConferred: e.target.value === 'true' 
// //             })}

// //           >
// //             <option value="false">No</option>
// //             <option value="true">Yes</option>
// //           </select><br/>
// //           <label htmlFor='placement-status'>Placement Status: </label>
// //           <input
// //             id='placement-status'
// //             value={formData.placementStatus}
// //             type='text'
// //             required
// //           /><br/>
// //           <label htmlFor='company-info'>Company Info: </label>
// //           <input
// //             id='company-info'
// //             value={formData.companyInfo}
// //             required
// //           /><br/>
// //           <div className="button">
// //             {index > 1 && (
// //               <button className="prev-button" onClick={prevForm}>
// //               {'<'} Previous
// //               </button>
// //             )}
// //             <p>{index}/14</p>
// //             {index < 14 && (
// //               <button className="next-button" onClick={nextForm}>
// //               Next {'>'}
// //               </button>
// //             )}
// //           </div>
// //         </div>
// //       );
// //     case 14:
// //       return(
// //         <div className="consents registration" id='consents'>
// //           <h1>Consents & Declarations: </h1>
// //           <input type='checkbox' id='dataUsage' value={formData.dataUsageConsent} 
// //           onChange={(e) => setFormData({
// //             ...formData,
// //             dataUsageConsent: e.target.checked
// //         })}
// //         />
// //           <label htmlFor='dataUsage'>Allow data Usage</label><br/>
// //           <input type='checkbox' id='termsAgreement' value={formData.termsAgreement} 
// //           onChange={(e) => setFormData({
// //             ...formData,
// //             termsAgreement: e.target.checked
// //         })}
// //         />
// //           <label htmlFor='termsAgreement'>I agree to all terms & Conditions.</label><br/>
// //           <input type='checkbox' id='authenticity' value={formData.authenticityDeclaration} 
// //           onChange={(e) => setFormData({
// //             ...formData,
// //             authenticityDeclaration: e.target.checked
// //         })}
// //         />
// //           <label htmlFor='authenticity'>I ensure all the data provided above is authentic.</label><br/>
// //           <input type='checkbox' id='promotionalConsent' value={formData.promotionalConsent} 
// //           onChange={(e) => setFormData({
// //             ...formData,
// //             promotionalConsent: e.target.checked
// //         })}
// //         />
// //           <label htmlFor='promotionalConsent'>Promotional Consent</label>

// //           <div className="button">
// //             {index > 1 && (
// //               <button className="prev-button" onClick={prevForm}>
// //               {'<'} Previous
// //               </button>
// //             )}
// //             <p>{index}/14</p>
// //             {index < 14 && (
// //               <button className="next-button" onClick={nextForm}>
// //               Next {'>'}
// //               </button>
// //             )}
// //             <button className='submit-btn'>Submit</button>
// //           </div>
// //         </div>
// //       );
// //     }
// //   };

// //   return (
// //     <>
// //       <section className="main">
// //         <h1 className='heading'>Register Yourself</h1>
// //         {renderForm()}
// //       </section>

// //       <style jsx>{`
// //         * {
// //           font-family: Arial, Helvetica, sans-serif;
// //         }
// //         body{
// //           background-color: #2452dd;
// //         }
// //         .main {
// //           display: flex;
// //           flex-direction: column;
// //           align-items: center;
// //         }

// //         label {
// //           margin: 40px 0;
// //         }

// //         input,
// //         select {
// //           width: calc(100% - 40px);
// //           margin: 10px 0;
// //           border-radius: 5px;
// //           border: 1px solid rgba(0, 0, 0, 0.223);
// //           padding: 5px;
// //         }

// //         .registration {
// //           padding: 30px;
// //           width: 40vw;
// //           max-width: 600px;
// //           border-radius: 10px;
// //           box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.267);
// //           color: #4169e1;
// //           display: block;
// //           background-color: white;
// //         }

// //         input[type="file"]::file-selector-button {
// //           background-color: #4169e1;
// //           color: white;
// //           border: none;
// //           border-radius: 5px;
// //           padding: 5px;
// //           cursor: pointer;
// //         }

// //         input[type="date"] {
// //           color: grey;
// //         }

// //         .prev-button,
// //         .next-button,
// //         .submit-btn {
// //           color: #2452dd;
// //           font-weight: 700;
// //           border: none;
// //           background-color: transparent;
// //           font-size: 1rem;
// //           cursor: pointer;
// //         }

// //         .next-button,.submit-btn {
// //           background-color: #2452dd;
// //           color: white;
// //           padding: 10px;
// //           border-radius: 5px;
// //         }
// //         input[type="checkbox"]{
// //             width: 20px;
// //             margin: 5px;
// //         }
// //         .button {
// //           margin-top: 30px;
// //           display: flex;
// //           justify-content: space-between;
// //           width: 100%;
// //         }
// //         .heading{
// //           color: white;
// //           width: 98svw;
// //           font-size: 4rem;
// //           padding: 20px;
// //           margin-top: 0;
// //           margin-bottom: 0;
// //         }
// //         @media (max-width: 700px){
// //           .registration{
// //             width: 80%;
// //           }
// //           .heading{
// //             font-size: 3rem;
// //             height: auto;
// //           }
// //         }
// //         @media (max-width: 1020px){
// //           .registration{
// //             width: 50%;
// //           }
// //         }
// //       `}</style>
// //     </>
// //   );
// // }

// // export default Registration;










// import { useState } from 'react';
// import { 
//   User, 
//   CalendarDays, 
//   Phone, 
//   Mail, 
//   Home, 
//   FileText, 
//   Users, 
//   BookOpen, 
//   Heart, 
//   Bus, 
//   AlertCircle
// } from 'lucide-react';

// export default function Registration() {
//   const [step, setStep] = useState(1);
//   const [formData, setFormData] = useState({
//     // Basic Information
//     firstName: '',
//     middleName: '',
//     lastName: '',
//     gender: '',
//     dateOfBirth: '',
//     placeOfBirth: '',
//     nationality: '',
//     religion: '',
//     motherTongue: '',
//     bloodGroup: '',
    
//     // Contact Information
//     email: '',
//     phone: '',
//     emergencyContactName: '',
//     emergencyContactPhone: '',
//     emergencyContactRelation: '',
    
//     // Address
//     addressLine1: '',
//     addressLine2: '',
//     city: '',
//     state: '',
//     pincode: '',
    
//     // Academic Details
//     admissionNumber: '',
//     admissionDate: '',
//     academicYear: '',
//     grade: '',
//     section: '',
//     previousSchool: '',
//     previousGrade: '',
    
//     // Parent/Guardian Information
//     fatherName: '',
//     fatherOccupation: '',
//     fatherPhone: '',
//     fatherEmail: '',
//     motherName: '',
//     motherOccupation: '',
//     motherPhone: '',
//     motherEmail: '',
//     guardianName: '',
//     guardianRelation: '',
//     guardianPhone: '',
//     guardianEmail: '',
    
//     // Additional Information
//     healthIssues: '',
//     allergies: '',
//     medications: '',
//     transportRequired: false,
//     pickupPoint: '',
//     hostelRequired: false,
//     remarks: '',
    
//     // Documents
//     birthCertificate: false,
//     transferCertificate: false,
//     previousMarksheets: false,
//     medicalCertificate: false,
//     addressProof: false,
//     photograph: false,
//   });
  
//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData({
//       ...formData,
//       [name]: type === 'checkbox' ? checked : value
//     });
//   };
  
//   const handleSubmit = (e) => {
//     e.preventDefault();
//     // Here you would typically send the data to your backend
//     console.log('Form submitted:', formData);
//     alert('Student registration completed successfully!');
//     // Reset form or redirect
//   };
  
//   const nextStep = () => {
//     setStep(step + 1);
//   };
  
//   const prevStep = () => {
//     setStep(step - 1);
//   };
  
//   // Form sections based on current step
//   const renderForm = () => {
//     switch(step) {
//       case 1:
//         return (
//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold flex items-center mb-4">
//               <User className="mr-2" size={20} />
//               Basic Information
//             </h2>
            
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1">First Name*</label>
//                 <input
//                   type="text"
//                   name="firstName"
//                   value={formData.firstName}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Middle Name</label>
//                 <input
//                   type="text"
//                   name="middleName"
//                   value={formData.middleName}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Last Name*</label>
//                 <input
//                   type="text"
//                   name="lastName"
//                   value={formData.lastName}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1">Gender*</label>
//                 <select
//                   name="gender"
//                   value={formData.gender}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   required
//                 >
//                   <option value="">Select Gender</option>
//                   <option value="male">Male</option>
//                   <option value="female">Female</option>
//                   <option value="other">Other</option>
//                 </select>
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Date of Birth*</label>
//                 <input
//                   type="date"
//                   name="dateOfBirth"
//                   value={formData.dateOfBirth}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1">Place of Birth</label>
//                 <input
//                   type="text"
//                   name="placeOfBirth"
//                   value={formData.placeOfBirth}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Nationality*</label>
//                 <input
//                   type="text"
//                   name="nationality"
//                   value={formData.nationality}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1">Religion</label>
//                 <input
//                   type="text"
//                   name="religion"
//                   value={formData.religion}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Mother Tongue</label>
//                 <input
//                   type="text"
//                   name="motherTongue"
//                   value={formData.motherTongue}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Blood Group</label>
//                 <select
//                   name="bloodGroup"
//                   value={formData.bloodGroup}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                 >
//                   <option value="">Select Blood Group</option>
//                   <option value="A+">A+</option>
//                   <option value="A-">A-</option>
//                   <option value="B+">B+</option>
//                   <option value="B-">B-</option>
//                   <option value="AB+">AB+</option>
//                   <option value="AB-">AB-</option>
//                   <option value="O+">O+</option>
//                   <option value="O-">O-</option>
//                 </select>
//               </div>
//             </div>
//           </div>
//         );
        
//       case 2:
//         return (
//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold flex items-center mb-4">
//               <Phone className="mr-2" size={20} />
//               Contact Information
//             </h2>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1">Email Address</label>
//                 <input
//                   type="email"
//                   name="email"
//                   value={formData.email}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Phone Number*</label>
//                 <input
//                   type="tel"
//                   name="phone"
//                   value={formData.phone}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>
//             </div>
            
//             <div className="border-t pt-4">
//               <h3 className="font-medium mb-2">Emergency Contact</h3>
              
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Name*</label>
//                   <input
//                     type="text"
//                     name="emergencyContactName"
//                     value={formData.emergencyContactName}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                     required
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Phone*</label>
//                   <input
//                     type="tel"
//                     name="emergencyContactPhone"
//                     value={formData.emergencyContactPhone}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                     required
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Relation*</label>
//                   <input
//                     type="text"
//                     name="emergencyContactRelation"
//                     value={formData.emergencyContactRelation}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                     required
//                   />
//                 </div>
//               </div>
//             </div>
            
//             <div className="border-t pt-4">
//               <h3 className="font-medium flex items-center mb-2">
//                 <Home className="mr-2" size={16} />
//                 Address Details
//               </h3>
              
//               <div className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Address Line 1*</label>
//                   <input
//                     type="text"
//                     name="addressLine1"
//                     value={formData.addressLine1}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                     required
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Address Line 2</label>
//                   <input
//                     type="text"
//                     name="addressLine2"
//                     value={formData.addressLine2}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
                
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium mb-1">City*</label>
//                     <input
//                       type="text"
//                       name="city"
//                       value={formData.city}
//                       onChange={handleChange}
//                       className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                   </div>
                  
//                   <div>
//                     <label className="block text-sm font-medium mb-1">State*</label>
//                     <input
//                       type="text"
//                       name="state"
//                       value={formData.state}
//                       onChange={handleChange}
//                       className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                   </div>
                  
//                   <div>
//                     <label className="block text-sm font-medium mb-1">Pincode*</label>
//                     <input
//                       type="text"
//                       name="pincode"
//                       value={formData.pincode}
//                       onChange={handleChange}
//                       className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         );
        
//       case 3:
//         return (
//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold flex items-center mb-4">
//               <BookOpen className="mr-2" size={20} />
//               Academic Details
//             </h2>
            
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1">Admission Number*</label>
//                 <input
//                   type="text"
//                   name="admissionNumber"
//                   value={formData.admissionNumber}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Admission Date*</label>
//                 <input
//                   type="date"
//                   name="admissionDate"
//                   value={formData.admissionDate}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Academic Year*</label>
//                 <input
//                   type="text"
//                   name="academicYear"
//                   value={formData.academicYear}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   placeholder="e.g. 2025-2026"
//                   required
//                 />
//               </div>
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1">Grade/Class*</label>
//                 <select
//                   name="grade"
//                   value={formData.grade}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   required
//                 >
//                   <option value="">Select Grade</option>
//                   <option value="Nursery">Nursery</option>
//                   <option value="LKG">LKG</option>
//                   <option value="UKG">UKG</option>
//                   <option value="1">Grade 1</option>
//                   <option value="2">Grade 2</option>
//                   <option value="3">Grade 3</option>
//                   <option value="4">Grade 4</option>
//                   <option value="5">Grade 5</option>
//                   <option value="6">Grade 6</option>
//                   <option value="7">Grade 7</option>
//                   <option value="8">Grade 8</option>
//                   <option value="9">Grade 9</option>
//                   <option value="10">Grade 10</option>
//                   <option value="11">Grade 11</option>
//                   <option value="12">Grade 12</option>
//                 </select>
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium mb-1">Section</label>
//                 <select
//                   name="section"
//                   value={formData.section}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                 >
//                   <option value="">Select Section</option>
//                   <option value="A">A</option>
//                   <option value="B">B</option>
//                   <option value="C">C</option>
//                   <option value="D">D</option>
//                 </select>
//               </div>
//             </div>
            
//             <div className="border-t pt-4">
//               <h3 className="font-medium mb-2">Previous School Information (if applicable)</h3>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Previous School Name</label>
//                   <input
//                     type="text"
//                     name="previousSchool"
//                     value={formData.previousSchool}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Previous Grade/Class</label>
//                   <input
//                     type="text"
//                     name="previousGrade"
//                     value={formData.previousGrade}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         );
        
//       case 4:
//         return (
//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold flex items-center mb-4">
//               <Users className="mr-2" size={20} />
//               Parent/Guardian Information
//             </h2>
            
//             <div className="border-t pt-4">
//               <h3 className="font-medium mb-2">Father's Details</h3>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Full Name*</label>
//                   <input
//                     type="text"
//                     name="fatherName"
//                     value={formData.fatherName}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                     required
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Occupation</label>
//                   <input
//                     type="text"
//                     name="fatherOccupation"
//                     value={formData.fatherOccupation}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Phone Number*</label>
//                   <input
//                     type="tel"
//                     name="fatherPhone"
//                     value={formData.fatherPhone}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                     required
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Email</label>
//                   <input
//                     type="email"
//                     name="fatherEmail"
//                     value={formData.fatherEmail}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//               </div>
//             </div>
            
//             <div className="border-t pt-4">
//               <h3 className="font-medium mb-2">Mother's Details</h3>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Full Name*</label>
//                   <input
//                     type="text"
//                     name="motherName"
//                     value={formData.motherName}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                     required
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Occupation</label>
//                   <input
//                     type="text"
//                     name="motherOccupation"
//                     value={formData.motherOccupation}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Phone Number*</label>
//                   <input
//                     type="tel"
//                     name="motherPhone"
//                     value={formData.motherPhone}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                     required
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Email</label>
//                   <input
//                     type="email"
//                     name="motherEmail"
//                     value={formData.motherEmail}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//               </div>
//             </div>
            
//             <div className="border-t pt-4">
//               <h3 className="font-medium mb-2">Guardian's Details (if different from parents)</h3>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Full Name</label>
//                   <input
//                     type="text"
//                     name="guardianName"
//                     value={formData.guardianName}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Relation</label>
//                   <input
//                     type="text"
//                     name="guardianRelation"
//                     value={formData.guardianRelation}
//                     onChange={handleChange}
//                     placeholder="e.g. Grandparent, Uncle, etc."
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Phone Number</label>
//                   <input
//                     type="tel"
//                     name="guardianPhone"
//                     value={formData.guardianPhone}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Email</label>
//                   <input
//                     type="email"
//                     name="guardianEmail"
//                     value={formData.guardianEmail}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         );
        
//       case 5:
//         return (
//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold flex items-center mb-4">
//               <Heart className="mr-2" size={20} />
//               Additional Information
//             </h2>
            
//             <div className="border-t pt-4">
//               <h3 className="font-medium mb-2">Health Information</h3>
              
//               <div className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Health Issues/Disabilities (if any)</label>
//                   <textarea
//                     name="healthIssues"
//                     value={formData.healthIssues}
//                     onChange={handleChange}
//                     className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 h-20"
//                     placeholder="Please mention any specific health conditions that the school should be aware of"
//                   ></textarea>
//                 </div>
                
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium mb-1">Allergies (if any)</label>
//                     <input
//                       type="text"
//                       name="allergies"
//                       value={formData.allergies}
//                       onChange={handleChange}
//                       className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                     />
//                   </div>
                  
//                   <div>
//                     <label className="block text-sm font-medium mb-1">Regular Medications (if any)</label>
//                     <input
//                       type="text"
//                       name="medications"
//                       value={formData.medications}
//                       onChange={handleChange}
//                       className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>
            
//             <div className="border-t pt-4">
//               <h3 className="font-medium flex items-center mb-2">
//                 <Bus className="mr-2" size={16} />
//                 Transportation & Hostel
//               </h3>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <div className="flex items-center mb-2">
//                     <input
//                       type="checkbox"
//                       id="transportRequired"
//                       name="transportRequired"
//                       checked={formData.transportRequired}
//                       onChange={handleChange}
//                       className="mr-2 h-4 w-4"
//                     />
//                     <label htmlFor="transportRequired" className="text-sm">School Transport Required</label>
//                   </div>
                  
//                   {formData.transportRequired && (
//                     <div>
//                       <label className="block text-sm font-medium mb-1">Pickup Point</label>
//                       <input
//                         type="text"
//                         name="pickupPoint"
//                         value={formData.pickupPoint}
//                         onChange={handleChange}
//                         className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
//                       />
//                     </div>
//                   )}
//                 </div>
                
//                 <div>
//                   <div className="flex items-center">
//                     <input
//                       type="checkbox"
//                       id="hostelRequired"
//                       name="hostelRequired"
//                       checked={formData.hostelRequired}
//                       onChange={handleChange}
//                       className="mr-2 h-4 w-4"
//                     />
//                     <label htmlFor="hostelRequired" className="text-sm">Hostel Accommodation Required</label>
//                   </div>
//                 </div>
//               </div>
//             </div>
            
//             <div>
//               <label className="block text-sm font-medium mb-1">Additional Remarks</label>
//               <textarea
//                 name="remarks"
//                 value={formData.remarks}
//                 onChange={handleChange}
//                 className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 h-20"
//                 placeholder="Any additional information you would like to provide"
//               ></textarea>
//             </div>
//           </div>
//         );
        
//       case 6:
//         return (
//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold flex items-center mb-4">
//               <FileText className="mr-2" size={20} />
//               Required Documents
//             </h2>
            
//             <div className="p-4 bg-blue-50 rounded-lg mb-4 flex items-start">
//               <AlertCircle className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" size={18} />
//               <p className="text-sm text-blue-700">
//                 Please confirm that you have the following documents ready. Original documents will need to be presented at the school office for verification.
//               </p>
//             </div>
            
//             <div className="space-y-2">
//               <div className="flex items-center p-2 hover:bg-gray-50 rounded">
//                 <input
//                   type="checkbox"
//                   id="birthCertificate"
//                   name="birthCertificate"
//                   checked={formData.birthCertificate}
//                   onChange={handleChange}
//                   className="mr-2 h-4 w-4"
//                 />
//                 <label htmlFor="birthCertificate" className="text-sm">Birth Certificate</label>
//               </div>
              
//               <div className="flex items-center p-2 hover:bg-gray-50 rounded">
//                 <input
//                   type="checkbox"
//                   id="transferCertificate"
//                   name="transferCertificate"
//                   checked={formData.transferCertificate}
//                   onChange={handleChange}
//                   className="mr-2 h-4 w-4"
//                 />
//                 <label htmlFor="transferCertificate" className="text-sm">Transfer Certificate (if applicable)</label>
//               </div>
              
//               <div className="flex items-center p-2 hover:bg-gray-50 rounded">
//                 <input
//                   type="checkbox"
//                   id="previousMarksheets"
//                   name="previousMarksheets"
//                   checked={formData.previousMarksheets}
//                   onChange={handleChange}
//                   className="mr-2 h-4 w-4"
//                 />
//                 <label htmlFor="previousMarksheets" className="text-sm">Previous Academic Records/Marksheets</label>
//               </div>
              
//               <div className="flex items-center p-2 hover:bg-gray-50 rounded">
//                 <input
//                   type="checkbox"
//                   id="medicalCertificate"
//                   name="medicalCertificate"
//                   checked={formData.medicalCertificate}
//                   onChange={handleChange}
//                   className="mr-2 h-4 w-4"
//                 />
//                 <label htmlFor="medicalCertificate" className="text-sm">Medical Certificate</label>
//               </div>
              
//               <div className="flex items-center p-2 hover:bg-gray-50 rounded">
//                 <input
//                   type="checkbox"
//                   id="addressProof"
//                   name="addressProof"
//                   checked={formData.addressProof}
//                   onChange={handleChange}
//                   className="mr-2 h-4 w-4"
//                 />
//                 <label htmlFor="addressProof" className="text-sm">Address Proof</label>
//               </div>
              
//               <div className="flex items-center p-2 hover:bg-gray-50 rounded">
//                 <input
//                   type="checkbox"
//                   id="photograph"
//                   name="photograph"
//                   checked={formData.photograph}
//                   onChange={handleChange}
//                   className="mr-2 h-4 w-4"
//                 />
//                 <label htmlFor="photograph" className="text-sm">Recent Passport Size Photographs</label>
//               </div>
//             </div>
            
//             <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
//               <h3 className="font-medium mb-2 text-yellow-800">Declaration</h3>
//               <p className="text-sm text-yellow-700">
//                 I hereby declare that all the information provided above is true and correct to the best of my knowledge. 
//                 I understand that providing any false information may result in the cancellation of my child's admission.
//                 I also agree to abide by all the rules and regulations of the school.
//               </p>
              
//               <div className="mt-4 flex items-center">
//                 <input
//                   type="checkbox"
//                   id="declaration"
//                   className="mr-2 h-4 w-4"
//                   required
//                 />
//                 <label htmlFor="declaration" className="text-sm font-medium">I accept the above declaration</label>
//               </div>
//             </div>
//           </div>
//         );
        
//       default:
//         return null;
//     }
//   };
  
//   return (
//     <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden p-6">
//       <div className="mb-6">
//         <h1 className="text-2xl font-bold text-center text-gray-800">Student Registration Form</h1>
//         <p className="text-center text-gray-600 mt-1">Please fill out all the required information</p>
        
//         <div className="flex justify-between items-center mt-6 mb-4">
//           {[1, 2, 3, 4, 5, 6].map((stepNumber) => (
//             <div 
//               key={stepNumber}
//               className={`flex flex-col items-center ${stepNumber <= step ? 'text-blue-600' : 'text-gray-400'}`}
//             >
//               <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
//                 stepNumber < step ? 'bg-blue-600 border-blue-600 text-white' :
//                 stepNumber === step ? 'border-blue-600 text-blue-600' :
//                 'border-gray-300 text-gray-400'
//               }`}>
//                 {stepNumber < step ? '✓' : stepNumber}
//               </div>
//               <span className="text-xs mt-1">
//                 {stepNumber === 1 && 'Basic'}
//                 {stepNumber === 2 && 'Contact'}
//                 {stepNumber === 3 && 'Academic'}
//                 {stepNumber === 4 && 'Parents'}
//                 {stepNumber === 5 && 'Additional'}
//                 {stepNumber === 6 && 'Documents'}
//               </span>
//             </div>
//           ))}
//         </div>
//       </div>
      
//       <form onSubmit={handleSubmit}>
//         {renderForm()}
        
//         <div className="mt-8 pt-4 border-t flex justify-between">
//           {step > 1 && (
//             <button
//               type="button"
//               onClick={prevStep}
//               className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
//             >
//               Previous
//             </button>
//           )}
          
//           {step < 6 ? (
//             <button
//               type="button"
//               onClick={nextStep}
//               className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ml-auto"
//             >
//               Next
//             </button>
//           ) : (
//             <button
//               type="submit"
//               className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 ml-auto"
//             >
//               Submit Registration
//             </button>
//           )}
//         </div>
//       </form>
//     </div>
//   );
// }


// import React, { useState } from 'react';
// import axios from 'axios';

// const StudentRegistrationForm = () => {
//   const [formData, setFormData] = useState({
//     firstName: '',
//     middleName: '',
//     lastName: '',
//     gender: '',
//     dateOfBirth: '',
//     placeOfBirth: '',
//     nationality: 'india',
//     religion: '',
//     motherTongue: '',
//     bloodGroup: '',
//     email: '',
//     phone: '',
//     emergencyContactName: '',
//     emergencyContactPhone: '',
//     emergencyContactRelation: '',
//     addressLine1: '',
//     addressLine2: '',
//     city: '',
//     state: '',
//     pincode: '',
//     admissionNumber: '',
//     admissionDate: '',
//     academicYear: '',
//     grade: '',
//     section: '',
//     rollno: '',
//     previousSchool: '',
//     previousGrade: '',
//     fatherName: '',
//     fatherOccupation: '',
//     fatherPhone: '',
//     fatherEmail: '',
//     motherName: '',
//     motherOccupation: '',
//     motherPhone: '',
//     motherEmail: '',
//     guardianName: '',
//     guardianRelation: '',
//     guardianPhone: '',
//     guardianEmail: '',
//     healthIssues: '',
//     allergies: '',
//     medications: '',
//     transportRequired: false,
//     pickupPoint: '',
//     hostelRequired: false,
//     remarks: '',
//     birthCertificate: false,
//     transferCertificate: false,
//     previousMarksheets: false,
//     medicalCertificate: false,
//     addressProof: false,
//     photograph: false,
//     password: '12345678',
//   });

//   const [activeTab, setActiveTab] = useState('personal');
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [formSubmitted, setFormSubmitted] = useState(false);
//   const [formError, setFormError] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');
  
//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData({
//       ...formData,
//       [name]: type === 'checkbox' ? checked : value,
//     });
//   };

//   const handleSwitchChange = (name, checked) => {
//     setFormData({
//       ...formData,
//       [name]: checked,
//     });
//   };

//   const handleSelectChange = (name, value) => {
//     setFormData({
//       ...formData,
//       [name]: value,
//     });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setIsSubmitting(true);
//     setFormError(false);
    
//     try {
//       // Dummy API call
//       // await new Promise((resolve, reject) => {
//       //   setTimeout(() => {
//       //     // Simulate a 90% success rate
//       //     if (Math.random() > 0.1) {
//       //       resolve();
//       //     } else {
//       //       reject(new Error('Server error: Could not process the registration'));
//       //     }
//       //   }, 2000);
//       // });
//       const response = await axios.post(`${import.meta.env.VITE_PORT}/api/v1/user/signup`,formData)
//       setFormSubmitted(true);
//       // Reset form after 3 seconds
//       setTimeout(() => {
//         setFormSubmitted(false);
//         // Reset form data if needed
//         // setFormData({ ...initialFormData });
//       }, 3000);
//     } catch (error) {
//       setFormError(true);
//       console.log(error)
//       setErrorMessage(error.message);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <div className="container mx-auto py-10 px-4 max-w-6xl">
//       <h1 className="text-3xl font-bold text-center mb-2 text-indigo-700">Student Registration Portal</h1>
//       <p className="text-center mb-8 text-gray-600">Complete the form below to register a new student</p>
      
//       <form onSubmit={handleSubmit}>
//         {/* Tabs Navigation */}
//         <div className="grid grid-cols-6 mb-8">
//           {['personal', 'contact', 'academic', 'parents', 'health', 'documents'].map((tab) => (
//             <button
//               key={tab}
//               type="button"
//               onClick={() => setActiveTab(tab)}
//               className={`py-2 px-4 font-medium text-sm ${
//                 activeTab === tab
//                   ? 'bg-indigo-600 text-white'
//                   : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//               }`}
//             >
//               {tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([A-Z])/g, ' $1')}
//             </button>
//           ))}
//         </div>
          
//         {/* Personal Details Tab */}
//         {activeTab === 'personal' && (
//           <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//             <div className="mb-4">
//               <h2 className="text-xl font-bold mb-1">Personal Details</h2>
//               <p className="text-gray-600 text-sm">Enter the student's personal information</p>
//             </div>
//             <div className="space-y-4">
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                 <div className="space-y-2">
//                   <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
//                     First Name <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     id="firstName" 
//                     name="firstName" 
//                     value={formData.firstName} 
//                     onChange={handleChange} 
//                     required 
//                     placeholder="First Name"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="middleName" className="block text-sm font-medium text-gray-700">
//                     Middle Name
//                   </label>
//                   <input 
//                     id="middleName" 
//                     name="middleName" 
//                     value={formData.middleName} 
//                     onChange={handleChange} 
//                     placeholder="Middle Name"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
//                     Last Name <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     id="lastName" 
//                     name="lastName" 
//                     value={formData.lastName} 
//                     onChange={handleChange} 
//                     required 
//                     placeholder="Last Name"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-2">
//                   <label className="block text-sm font-medium text-gray-700">
//                     Gender <span className="text-red-500">*</span>
//                   </label>
//                   <div className="flex space-x-4">
//                     {['male', 'female', 'other'].map((option) => (
//                       <div key={option} className="flex items-center space-x-2">
//                         <input
//                           type="radio"
//                           id={`gender-${option}`}
//                           name="gender"
//                           value={option}
//                           checked={formData.gender === option}
//                           onChange={(e) => handleSelectChange('gender', e.target.value)}
//                           className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
//                           required
//                         />
//                         <label htmlFor={`gender-${option}`} className="text-sm text-gray-700">
//                           {option.charAt(0).toUpperCase() + option.slice(1)}
//                         </label>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
//                     Date of Birth <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     id="dateOfBirth" 
//                     name="dateOfBirth" 
//                     type="date" 
//                     value={formData.dateOfBirth} 
//                     onChange={handleChange} 
//                     required 
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-2">
//                   <label htmlFor="placeOfBirth" className="block text-sm font-medium text-gray-700">
//                     Place of Birth
//                   </label>
//                   <input 
//                     id="placeOfBirth" 
//                     name="placeOfBirth" 
//                     value={formData.placeOfBirth} 
//                     onChange={handleChange} 
//                     placeholder="Place of Birth"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">
//                     Nationality <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     id="nationality" 
//                     name="nationality" 
//                     value={formData.nationality} 
//                     onChange={handleChange} 
//                     required 
//                     placeholder="Nationality"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                 <div className="space-y-2">
//                   <label htmlFor="religion" className="block text-sm font-medium text-gray-700">
//                     Religion
//                   </label>
//                   <input 
//                     id="religion" 
//                     name="religion" 
//                     value={formData.religion} 
//                     onChange={handleChange} 
//                     placeholder="Religion"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="motherTongue" className="block text-sm font-medium text-gray-700">
//                     Mother Tongue
//                   </label>
//                   <input 
//                     id="motherTongue" 
//                     name="motherTongue" 
//                     value={formData.motherTongue} 
//                     onChange={handleChange} 
//                     placeholder="Mother Tongue"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-700">
//                     Blood Group
//                   </label>
//                   <select 
//                     id="bloodGroup"
//                     name="bloodGroup"
//                     value={formData.bloodGroup} 
//                     onChange={(e) => handleSelectChange('bloodGroup', e.target.value)}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   >
//                     <option value="">Select Blood Group</option>
//                     <option value="A+">A+</option>
//                     <option value="A-">A-</option>
//                     <option value="B+">B+</option>
//                     <option value="B-">B-</option>
//                     <option value="AB+">AB+</option>
//                     <option value="AB-">AB-</option>
//                     <option value="O+">O+</option>
//                     <option value="O-">O-</option>
//                     <option value="Unknown">Unknown</option>
//                   </select>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
          
//         {/* Contact Information Tab */}
//         {activeTab === 'contact' && (
//           <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//             <div className="mb-4">
//               <h2 className="text-xl font-bold mb-1">Contact Information</h2>
//               <p className="text-gray-600 text-sm">Enter the student's contact and address details</p>
//             </div>
//             <div className="space-y-4">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-2">
//                   <label htmlFor="email" className="block text-sm font-medium text-gray-700">
//                     Email
//                   </label>
//                   <input 
//                     id="email" 
//                     name="email" 
//                     type="email" 
//                     value={formData.email} 
//                     onChange={handleChange} 
//                     placeholder="student@example.com"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
//                     Phone Number
//                   </label>
//                   <input 
//                     id="phone" 
//                     name="phone" 
//                     value={formData.phone} 
//                     onChange={handleChange} 
//                     placeholder="Phone Number"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                 <div className="space-y-2">
//                   <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700">
//                     Emergency Contact Name <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     id="emergencyContactName" 
//                     name="emergencyContactName" 
//                     value={formData.emergencyContactName} 
//                     onChange={handleChange} 
//                     required 
//                     placeholder="Emergency Contact Name"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700">
//                     Emergency Contact Phone <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     id="emergencyContactPhone" 
//                     name="emergencyContactPhone" 
//                     value={formData.emergencyContactPhone} 
//                     onChange={handleChange} 
//                     required 
//                     placeholder="Emergency Contact Phone"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="emergencyContactRelation" className="block text-sm font-medium text-gray-700">
//                     Relation
//                   </label>
//                   <input 
//                     id="emergencyContactRelation" 
//                     name="emergencyContactRelation" 
//                     value={formData.emergencyContactRelation} 
//                     onChange={handleChange} 
//                     placeholder="Relation"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-1 gap-4">
//                 <div className="space-y-2">
//                   <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700">
//                     Address Line 1 <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     id="addressLine1" 
//                     name="addressLine1" 
//                     value={formData.addressLine1} 
//                     onChange={handleChange} 
//                     required 
//                     placeholder="Address Line 1"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700">
//                     Address Line 2
//                   </label>
//                   <input 
//                     id="addressLine2" 
//                     name="addressLine2" 
//                     value={formData.addressLine2} 
//                     onChange={handleChange} 
//                     placeholder="Address Line 2"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                 <div className="space-y-2">
//                   <label htmlFor="city" className="block text-sm font-medium text-gray-700">
//                     City <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     id="city" 
//                     name="city" 
//                     value={formData.city} 
//                     onChange={handleChange} 
//                     required 
//                     placeholder="City"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="state" className="block text-sm font-medium text-gray-700">
//                     State <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     id="state" 
//                     name="state" 
//                     value={formData.state} 
//                     onChange={handleChange} 
//                     required 
//                     placeholder="State"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="pincode" className="block text-sm font-medium text-gray-700">
//                     Pincode <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     id="pincode" 
//                     name="pincode" 
//                     value={formData.pincode} 
//                     onChange={handleChange} 
//                     required 
//                     placeholder="Pincode"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
          
//         {/* Academic Details Tab */}
//         {activeTab === 'academic' && (
//           <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//             <div className="mb-4">
//               <h2 className="text-xl font-bold mb-1">Academic Details</h2>
//               <p className="text-gray-600 text-sm">Enter the student's academic information</p>
//             </div>
//             <div className="space-y-4">
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                 <div className="space-y-2">
//                   <label htmlFor="admissionNumber" className="block text-sm font-medium text-gray-700">
//                     Admission Number <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     id="admissionNumber" 
//                     name="admissionNumber" 
//                     value={formData.admissionNumber} 
//                     onChange={handleChange} 
//                     required 
//                     placeholder="Admission Number"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="admissionDate" className="block text-sm font-medium text-gray-700">
//                     Admission Date <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     id="admissionDate" 
//                     name="admissionDate" 
//                     type="date" 
//                     value={formData.admissionDate} 
//                     onChange={handleChange} 
//                     required 
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700">
//                     Academic Year <span className="text-red-500">*</span>
//                   </label>
//                   <input 
//                     id="academicYear" 
//                     name="academicYear" 
//                     value={formData.academicYear} 
//                     onChange={handleChange} 
//                     required 
//                     placeholder="e.g. 2024-2025"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                 <div className="space-y-2">
//                   <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
//                     Grade/Class <span className="text-red-500">*</span>
//                   </label>
//                   <select 
//                     id="grade"
//                     name="grade"
//                     value={formData.grade}
//                     onChange={(e) => handleSelectChange('grade', e.target.value)}
//                     required
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   >
//                     <option value="">Select Grade</option>
//                     <option value="Nursery">Nursery</option>
//                     <option value="KG">KG</option>
//                     <option value="1">Class 1</option>
//                     <option value="2">Class 2</option>
//                     <option value="3">Class 3</option>
//                     <option value="4">Class 4</option>
//                     <option value="5">Class 5</option>
//                     <option value="6">Class 6</option>
//                     <option value="7">Class 7</option>
//                     <option value="8">Class 8</option>
//                     <option value="9">Class 9</option>
//                     <option value="10">Class 10</option>
//                     <option value="11">Class 11</option>
//                     <option value="12">Class 12</option>
//                   </select>
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="section" className="block text-sm font-medium text-gray-700">
//                     Section
//                   </label>
//                   <select 
//                     id="section"
//                     name="section"
//                     value={formData.section}
//                     onChange={(e) => handleSelectChange('section', e.target.value)}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   >
//                     <option value="">Select Section</option>
//                     <option value="A">A</option>
//                     <option value="B">B</option>
//                     <option value="C">C</option>
//                     <option value="D">D</option>
//                     <option value="E">E</option>
//                   </select>
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="rollno" className="block text-sm font-medium text-gray-700">
//                     Roll Number
//                   </label>
//                   <input 
//                     id="rollno" 
//                     name="rollno" 
//                     value={formData.rollno} 
//                     onChange={handleChange} 
//                     placeholder="Roll Number"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-2">
//                   <label htmlFor="previousSchool" className="block text-sm font-medium text-gray-700">
//                     Previous School
//                   </label>
//                   <input 
//                     id="previousSchool" 
//                     name="previousSchool" 
//                     value={formData.previousSchool} 
//                     onChange={handleChange} 
//                     placeholder="Previous School Name"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label htmlFor="previousGrade" className="block text-sm font-medium text-gray-700">
//                     Previous Grade/Class
//                   </label>
//                   <input 
//                     id="previousGrade" 
//                     name="previousGrade" 
//                     value={formData.previousGrade} 
//                     onChange={handleChange} 
//                     placeholder="Previous Grade/Class"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
        
//         {/* Parents/Guardian Tab */}
//         {activeTab === 'parents' && (
//           <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//             <div className="mb-4">
//               <h2 className="text-xl font-bold mb-1">Parents/Guardian Information</h2>
//               <p className="text-gray-600 text-sm">Enter the details of the student's parents or guardian</p>
//             </div>
//             <div className="space-y-6">
//               <div>
//                 <h3 className="text-lg font-medium mb-4 text-indigo-700">Father's Details</h3>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   <div className="space-y-2">
//                     <label htmlFor="fatherName" className="block text-sm font-medium text-gray-700">
//                       Father's Name
//                     </label>
//                     <input 
//                       id="fatherName" 
//                       name="fatherName" 
//                       value={formData.fatherName} 
//                       onChange={handleChange} 
//                       placeholder="Father's Name"
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                     />
//                   </div>
//                   <div className="space-y-2">
//                     <label htmlFor="fatherOccupation" className="block text-sm font-medium text-gray-700">
//                       Occupation
//                     </label>
//                     <input 
//                       id="fatherOccupation" 
//                       name="fatherOccupation" 
//                       value={formData.fatherOccupation} 
//                       onChange={handleChange} 
//                       placeholder="Father's Occupation"
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                     />
//                   </div>
//                   <div className="space-y-2">
//                     <label htmlFor="fatherPhone" className="block text-sm font-medium text-gray-700">
//                       Phone Number
//                     </label>
//                     <input 
//                       id="fatherPhone" 
//                       name="fatherPhone" 
//                       value={formData.fatherPhone} 
//                       onChange={handleChange} 
//                       placeholder="Father's Phone Number"
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                       />
//                     </div>
//                     <div className="space-y-2">
//                       <label htmlFor="fatherEmail" className="block text-sm font-medium text-gray-700">
//                         Email
//                       </label>
//                       <input 
//                         id="fatherEmail" 
//                         name="fatherEmail" 
//                         type="email"
//                         value={formData.fatherEmail} 
//                         onChange={handleChange} 
//                         placeholder="Father's Email"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                       />
//                     </div>
//                   </div>
//                 </div>
                
//                 <div>
//                   <h3 className="text-lg font-medium mb-4 text-indigo-700">Mother's Details</h3>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div className="space-y-2">
//                       <label htmlFor="motherName" className="block text-sm font-medium text-gray-700">
//                         Mother's Name
//                       </label>
//                       <input 
//                         id="motherName" 
//                         name="motherName" 
//                         value={formData.motherName} 
//                         onChange={handleChange} 
//                         placeholder="Mother's Name"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                       />
//                     </div>
//                     <div className="space-y-2">
//                       <label htmlFor="motherOccupation" className="block text-sm font-medium text-gray-700">
//                         Occupation
//                       </label>
//                       <input 
//                         id="motherOccupation" 
//                         name="motherOccupation" 
//                         value={formData.motherOccupation} 
//                         onChange={handleChange} 
//                         placeholder="Mother's Occupation"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                       />
//                     </div>
//                     <div className="space-y-2">
//                       <label htmlFor="motherPhone" className="block text-sm font-medium text-gray-700">
//                         Phone Number
//                       </label>
//                       <input 
//                         id="motherPhone" 
//                         name="motherPhone" 
//                         value={formData.motherPhone} 
//                         onChange={handleChange} 
//                         placeholder="Mother's Phone Number"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                       />
//                     </div>
//                     <div className="space-y-2">
//                       <label htmlFor="motherEmail" className="block text-sm font-medium text-gray-700">
//                         Email
//                       </label>
//                       <input 
//                         id="motherEmail" 
//                         name="motherEmail" 
//                         type="email"
//                         value={formData.motherEmail} 
//                         onChange={handleChange} 
//                         placeholder="Mother's Email"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                       />
//                     </div>
//                   </div>
//                 </div>
                
//                 <div>
//                   <h3 className="text-lg font-medium mb-4 text-indigo-700">Guardian's Details (If different from parents)</h3>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div className="space-y-2">
//                       <label htmlFor="guardianName" className="block text-sm font-medium text-gray-700">
//                         Guardian's Name
//                       </label>
//                       <input 
//                         id="guardianName" 
//                         name="guardianName" 
//                         value={formData.guardianName} 
//                         onChange={handleChange} 
//                         placeholder="Guardian's Name"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                       />
//                     </div>
//                     <div className="space-y-2">
//                       <label htmlFor="guardianRelation" className="block text-sm font-medium text-gray-700">
//                         Relation
//                       </label>
//                       <input 
//                         id="guardianRelation" 
//                         name="guardianRelation" 
//                         value={formData.guardianRelation} 
//                         onChange={handleChange} 
//                         placeholder="Relation to Student"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                       />
//                     </div>
//                     <div className="space-y-2">
//                       <label htmlFor="guardianPhone" className="block text-sm font-medium text-gray-700">
//                         Phone Number
//                       </label>
//                       <input 
//                         id="guardianPhone" 
//                         name="guardianPhone" 
//                         value={formData.guardianPhone} 
//                         onChange={handleChange} 
//                         placeholder="Guardian's Phone Number"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                       />
//                     </div>
//                     <div className="space-y-2">
//                       <label htmlFor="guardianEmail" className="block text-sm font-medium text-gray-700">
//                         Email
//                       </label>
//                       <input 
//                         id="guardianEmail" 
//                         name="guardianEmail" 
//                         type="email"
//                         value={formData.guardianEmail} 
//                         onChange={handleChange} 
//                         placeholder="Guardian's Email"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                       />
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
          
//           {/* Health Information Tab */}
//           {activeTab === 'health' && (
//             <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//               <div className="mb-4">
//                 <h2 className="text-xl font-bold mb-1">Health Information</h2>
//                 <p className="text-gray-600 text-sm">Enter the student's health-related information</p>
//               </div>
//               <div className="space-y-4">
//                 <div className="space-y-2">
//                   <label htmlFor="healthIssues" className="block text-sm font-medium text-gray-700">
//                     Known Health Issues
//                   </label>
//                   <textarea 
//                     id="healthIssues" 
//                     name="healthIssues" 
//                     value={formData.healthIssues} 
//                     onChange={handleChange} 
//                     rows="3"
//                     placeholder="Any known health issues or conditions"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   ></textarea>
//                 </div>
                
//                 <div className="space-y-2">
//                   <label htmlFor="allergies" className="block text-sm font-medium text-gray-700">
//                     Allergies
//                   </label>
//                   <textarea 
//                     id="allergies" 
//                     name="allergies" 
//                     value={formData.allergies} 
//                     onChange={handleChange} 
//                     rows="3"
//                     placeholder="Any known allergies"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   ></textarea>
//                 </div>
                
//                 <div className="space-y-2">
//                   <label htmlFor="medications" className="block text-sm font-medium text-gray-700">
//                     Regular Medications
//                   </label>
//                   <textarea 
//                     id="medications" 
//                     name="medications" 
//                     value={formData.medications} 
//                     onChange={handleChange} 
//                     rows="3"
//                     placeholder="Any regular medications"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   ></textarea>
//                 </div>
                
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
//                   <div className="space-y-4">
//                     <div className="flex items-center">
//                       <input
//                         id="transportRequired"
//                         name="transportRequired"
//                         type="checkbox"
//                         checked={formData.transportRequired}
//                         onChange={e => handleSwitchChange('transportRequired', e.target.checked)}
//                         className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                       />
//                       <label htmlFor="transportRequired" className="ml-2 block text-sm text-gray-700">
//                         Transport Required
//                       </label>
//                     </div>
                    
//                     {formData.transportRequired && (
//                       <div className="space-y-2 pl-6">
//                         <label htmlFor="pickupPoint" className="block text-sm font-medium text-gray-700">
//                           Pickup Point
//                         </label>
//                         <input 
//                           id="pickupPoint" 
//                           name="pickupPoint" 
//                           value={formData.pickupPoint} 
//                           onChange={handleChange} 
//                           placeholder="Specify pickup point"
//                           className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                         />
//                       </div>
//                     )}
//                   </div>
                  
//                   <div className="space-y-2">
//                     <div className="flex items-center">
//                       <input
//                         id="hostelRequired"
//                         name="hostelRequired"
//                         type="checkbox"
//                         checked={formData.hostelRequired}
//                         onChange={e => handleSwitchChange('hostelRequired', e.target.checked)}
//                         className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                       />
//                       <label htmlFor="hostelRequired" className="ml-2 block text-sm text-gray-700">
//                         Hostel Required
//                       </label>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
          
//           {/* Documents Tab */}
//           {activeTab === 'documents' && (
//             <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//               <div className="mb-4">
//                 <h2 className="text-xl font-bold mb-1">Documents Checklist</h2>
//                 <p className="text-gray-600 text-sm">Check the documents that have been submitted</p>
//               </div>
//               <div className="space-y-4">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="flex items-center">
//                     <input
//                       id="birthCertificate"
//                       name="birthCertificate"
//                       type="checkbox"
//                       checked={formData.birthCertificate}
//                       onChange={e => handleSwitchChange('birthCertificate', e.target.checked)}
//                       className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                     />
//                     <label htmlFor="birthCertificate" className="ml-2 block text-sm text-gray-700">
//                       Birth Certificate
//                     </label>
//                   </div>
                  
//                   <div className="flex items-center">
//                     <input
//                       id="transferCertificate"
//                       name="transferCertificate"
//                       type="checkbox"
//                       checked={formData.transferCertificate}
//                       onChange={e => handleSwitchChange('transferCertificate', e.target.checked)}
//                       className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                     />
//                     <label htmlFor="transferCertificate" className="ml-2 block text-sm text-gray-700">
//                       Transfer Certificate
//                     </label>
//                   </div>
                  
//                   <div className="flex items-center">
//                     <input
//                       id="previousMarksheets"
//                       name="previousMarksheets"
//                       type="checkbox"
//                       checked={formData.previousMarksheets}
//                       onChange={e => handleSwitchChange('previousMarksheets', e.target.checked)}
//                       className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                     />
//                     <label htmlFor="previousMarksheets" className="ml-2 block text-sm text-gray-700">
//                       Previous Marksheets
//                     </label>
//                   </div>
                  
//                   <div className="flex items-center">
//                     <input
//                       id="medicalCertificate"
//                       name="medicalCertificate"
//                       type="checkbox"
//                       checked={formData.medicalCertificate}
//                       onChange={e => handleSwitchChange('medicalCertificate', e.target.checked)}
//                       className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                     />
//                     <label htmlFor="medicalCertificate" className="ml-2 block text-sm text-gray-700">
//                       Medical Certificate
//                     </label>
//                   </div>
                  
//                   <div className="flex items-center">
//                     <input
//                       id="addressProof"
//                       name="addressProof"
//                       type="checkbox"
//                       checked={formData.addressProof}
//                       onChange={e => handleSwitchChange('addressProof', e.target.checked)}
//                       className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                     />
//                     <label htmlFor="addressProof" className="ml-2 block text-sm text-gray-700">
//                       Address Proof
//                     </label>
//                   </div>
                  
//                   <div className="flex items-center">
//                     <input
//                       id="photograph"
//                       name="photograph"
//                       type="checkbox"
//                       checked={formData.photograph}
//                       onChange={e => handleSwitchChange('photograph', e.target.checked)}
//                       className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
//                     />
//                     <label htmlFor="photograph" className="ml-2 block text-sm text-gray-700">
//                       Photograph
//                     </label>
//                   </div>
//                 </div>
                
//                 <div className="space-y-2 mt-6">
//                   <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">
//                     Additional Remarks
//                   </label>
//                   <textarea 
//                     id="remarks" 
//                     name="remarks" 
//                     value={formData.remarks} 
//                     onChange={handleChange} 
//                     rows="3"
//                     placeholder="Any additional remarks or notes"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                   ></textarea>
//                 </div>
//               </div>
//             </div>
//           )}
          
//           {/* Form Actions */}
//           <div className="flex flex-wrap justify-between items-center mt-8">
//             <div className="flex space-x-4 mb-4 sm:mb-0">
//               <button
//                 type="button"
//                 onClick={() => {
//                   const tabs = ['personal', 'contact', 'academic', 'parents', 'health', 'documents'];
//                   const currentIndex = tabs.indexOf(activeTab);
//                   const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
//                   setActiveTab(tabs[prevIndex]);
//                 }}
//                 disabled={activeTab === 'personal'}
//                 className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
//                   activeTab === 'personal'
//                     ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
//                     : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
//                 }`}
//               >
//                 Previous
//               </button>
//               <button
//                 type="button"
//                 onClick={() => {
//                   const tabs = ['personal', 'contact', 'academic', 'parents', 'health', 'documents'];
//                   const currentIndex = tabs.indexOf(activeTab);
//                   const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : currentIndex;
//                   setActiveTab(tabs[nextIndex]);
//                 }}
//                 disabled={activeTab === 'documents'}
//                 className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
//                   activeTab === 'documents'
//                     ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
//                     : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
//                 }`}
//               >
//                 Next
//               </button>
//             </div>
            
//             <div>
//               <button
//                 type="submit"
//                 disabled={isSubmitting}
//                 className={`px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
//                   isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
//                 }`}
//               >
//                 {isSubmitting ? 'Submitting...' : 'Submit Registration'}
//               </button>
//             </div>
//           </div>
          
//           {/* Success Message */}
//           {formSubmitted && (
//             <div className="mt-6 rounded-md bg-green-50 p-4">
//               <div className="flex">
//                 <div className="flex-shrink-0">
//                   <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
//                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                   </svg>
//                 </div>
//                 <div className="ml-3">
//                   <h3 className="text-sm font-medium text-green-800">Registration successful</h3>
//                   <div className="mt-2 text-sm text-green-700">
//                     <p>The student has been registered successfully. Admission number: {formData.admissionNumber}</p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
          
//           {/* Error Message */}
//           {formError && (
//             <div className="mt-6 rounded-md bg-red-50 p-4">
//               <div className="flex">
//                 <div className="flex-shrink-0">
//                   <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
//                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                   </svg>
//                 </div>
//                 <div className="ml-3">
//                   <h3 className="text-sm font-medium text-red-800">Registration failed</h3>
//                   <div className="mt-2 text-sm text-red-700">
//                     <p>{errorMessage || 'There was an error processing your registration. Please try again.'}</p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
//         </form>
//       </div>
//     );
//   };
  
//   export default StudentRegistrationForm;




import React, { useState } from 'react';
import axios from 'axios';

const StudentRegistrationForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    placeOfBirth: '',
    nationality: 'india',
    religion: '',
    motherTongue: '',
    bloodGroup: '',
    email: '',
    phone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    admissionNumber: '',
    admissionDate: '',
    academicYear: '',
    grade: '',
    section: '',
    rollno: '',
    previousSchool: '',
    previousGrade: '',
    fatherName: '',
    fatherOccupation: '',
    fatherPhone: '',
    fatherEmail: '',
    motherName: '',
    motherOccupation: '',
    motherPhone: '',
    motherEmail: '',
    guardianName: '',
    guardianRelation: '',
    guardianPhone: '',
    guardianEmail: '',
    healthIssues: '',
    allergies: '',
    medications: '',
    transportRequired: false,
    pickupPoint: '',
    hostelRequired: false,
    remarks: '',
    birthCertificate: false,
    transferCertificate: false,
    previousMarksheets: false,
    medicalCertificate: false,
    addressProof: false,
    photograph: false,
    password: '12345678',
  });

  const [activeTab, setActiveTab] = useState('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [formProgress, setFormProgress] = useState(0);
  
  // Tabs configuration
  const tabs = [
    { id: 'personal', label: 'Personal Details' },
    { id: 'contact', label: 'Contact' },
    { id: 'academic', label: 'Academic' },
    { id: 'parents', label: 'Parents' },
    { id: 'health', label: 'Health' },
    { id: 'documents', label: 'Documents' }
  ];

  // Validate fields based on the current tab
  const validateTabFields = (tabId) => {
    const errors = {};
    
    if (tabId === 'personal') {
      if (!formData.firstName.trim()) errors.firstName = 'First name is required';
      if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
      if (!formData.gender) errors.gender = 'Gender is required';
      if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
      if (!formData.nationality.trim()) errors.nationality = 'Nationality is required';
    } 
    else if (tabId === 'contact') {
      if (!formData.email) errors.email = 'Email is required';
      // if (!formData.phone) errors.phone = 'Phone number is required';


      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
      if (!formData.emergencyContactName.trim()) errors.emergencyContactName = 'Emergency contact name is required';
      if (!formData.emergencyContactPhone.trim()) errors.emergencyContactPhone = 'Emergency contact phone is required';
      if (!formData.addressLine1.trim()) errors.addressLine1 = 'Address is required';
      if (!formData.city.trim()) errors.city = 'City is required';
      if (!formData.state.trim()) errors.state = 'State is required';
      if (!formData.pincode.trim()) errors.pincode = 'Pincode is required';
    }
    else if (tabId === 'academic') {
      if (!formData.admissionNumber.trim()) errors.admissionNumber = 'Admission number is required';
      if (!formData.admissionDate) errors.admissionDate = 'Admission date is required';
      if (!formData.academicYear.trim()) errors.academicYear = 'Academic year is required';
      if (!formData.grade) errors.grade = 'Grade is required';
    }

   
    return errors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Clear the specific field error when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSwitchChange = (name, checked) => {
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  const handleSelectChange = (name, value) => {
    // Clear the specific field error when user selects a value
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
    
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const calculateProgress = () => {
    const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab);
    const progress = Math.round(((currentTabIndex) / (tabs.length - 1)) * 100);
    setFormProgress(progress);
  };

  const navigateTab = (direction) => {
    const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab);
    
    if (direction === 'next') {
      // Validate current tab before proceeding
      const errors = validateTabFields(activeTab);
      
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
      
      const nextTab = tabs[currentTabIndex + 1];
      if (nextTab) {
        setActiveTab(nextTab.id);
      }
    } else {
      const prevTab = tabs[currentTabIndex - 1];
      if (prevTab) {
        setActiveTab(prevTab.id);
      }
    }
  };

  // Update progress whenever active tab changes
  React.useEffect(() => {
    calculateProgress();
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final validation of all required fields
    const personalErrors = validateTabFields('personal');
    const contactErrors = validateTabFields('contact');
    const academicErrors = validateTabFields('academic');
    
    const allErrors = {
      ...personalErrors,
      ...contactErrors,
      ...academicErrors
    };
    
    if (Object.keys(allErrors).length > 0) {
      setFormErrors(allErrors);
      
      // Navigate to the first tab with errors
      if (Object.keys(personalErrors).length > 0) {
        setActiveTab('personal');
      } else if (Object.keys(contactErrors).length > 0) {
        setActiveTab('contact');
      } else if (Object.keys(academicErrors).length > 0) {
        setActiveTab('academic');
      }
      
      return;
    }
    
    setIsSubmitting(true);
    setServerError('');
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_PORT}/api/v1/user/signup`, formData);
      setFormSubmitted(true);
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Reset form after 5 seconds
      setTimeout(() => {
        setFormSubmitted(false);
      }, 5000);
    } catch (error) {
      setServerError(
        error.response?.data?.message || 
        error.message || 
        'An unexpected error occurred. Please try again.'
      );
      
      // Scroll to error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header with progress bar */}
        <div className="bg-indigo-700 px-6 py-4">
          <h1 className="text-2xl font-bold text-white mb-1">Student Registration Portal</h1>
          <p className="text-indigo-100 text-sm mb-3">Complete all sections to register a new student</p>
          
          {/* Progress bar */}
          <div className="w-full bg-indigo-200 rounded-full h-2.5">
            <div 
              className="bg-white h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${formProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Success Message */}
        {formSubmitted && (
          <div className="mx-6 mt-6 rounded-md bg-green-50 p-4 border border-green-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Registration successful!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>The student has been registered successfully. Admission number: {formData.admissionNumber}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {serverError && (
          <div className="mx-6 mt-6 rounded-md bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Registration failed</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{serverError}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Tabs Navigation - Improved UI */}
          <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-6 text-sm font-medium whitespace-nowrap transition-colors duration-200 
                  ${activeTab === tab.id 
                    ? 'border-b-2 border-indigo-600 text-indigo-600 bg-white' 
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
                  }`}
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs
                  ${index < tabs.findIndex(t => t.id === activeTab) 
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                  }"
                >
                  {index + 1}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
            
          <div className="p-6">
            {/* Personal Details Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold mb-1 text-gray-800">Personal Details</h2>
                  <p className="text-gray-600 text-sm">Enter the student's personal information</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="firstName" 
                      name="firstName" 
                      value={formData.firstName} 
                      onChange={handleChange} 
                      placeholder="First Name"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="middleName" className="block text-sm font-medium text-gray-700">
                      Middle Name
                    </label>
                    <input 
                      id="middleName" 
                      name="middleName" 
                      value={formData.middleName} 
                      onChange={handleChange} 
                      placeholder="Middle Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="lastName" 
                      name="lastName" 
                      value={formData.lastName} 
                      onChange={handleChange} 
                      placeholder="Last Name"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.lastName}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-4">
                      {['male', 'female', 'other'].map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`gender-${option}`}
                            name="gender"
                            value={option}
                            checked={formData.gender === option}
                            onChange={(e) => handleSelectChange('gender', e.target.value)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                          />
                          <label htmlFor={`gender-${option}`} className="text-sm text-gray-700">
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </label>
                        </div>
                      ))}
                    </div>
                    {formErrors.gender && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.gender}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="dateOfBirth" 
                      name="dateOfBirth" 
                      type="date" 
                      value={formData.dateOfBirth} 
                      onChange={handleChange} 
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.dateOfBirth ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.dateOfBirth && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.dateOfBirth}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="placeOfBirth" className="block text-sm font-medium text-gray-700">
                      Place of Birth
                    </label>
                    <input 
                      id="placeOfBirth" 
                      name="placeOfBirth" 
                      value={formData.placeOfBirth} 
                      onChange={handleChange} 
                      placeholder="Place of Birth"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">
                      Nationality <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="nationality" 
                      name="nationality" 
                      value={formData.nationality} 
                      onChange={handleChange} 
                      placeholder="Nationality"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.nationality ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.nationality && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.nationality}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="religion" className="block text-sm font-medium text-gray-700">
                      Religion
                    </label>
                    <input 
                      id="religion" 
                      name="religion" 
                      value={formData.religion} 
                      onChange={handleChange} 
                      placeholder="Religion"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="motherTongue" className="block text-sm font-medium text-gray-700">
                      Mother Tongue
                    </label>
                    <input 
                      id="motherTongue" 
                      name="motherTongue" 
                      value={formData.motherTongue} 
                      onChange={handleChange} 
                      placeholder="Mother Tongue"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-700">
                      Blood Group
                    </label>
                    <select 
                      id="bloodGroup"
                      name="bloodGroup"
                      value={formData.bloodGroup} 
                      onChange={(e) => handleSelectChange('bloodGroup', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
              
            {/* Contact Information Tab */}
            {activeTab === 'contact' && (
              <div className="space-y-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold mb-1 text-gray-800">Contact Information</h2>
                  <p className="text-gray-600 text-sm">Enter the student's contact and address details</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleChange} 
                      placeholder="student@example.com"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input 
                      id="phone" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleChange} 
                      placeholder="Phone Number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700">
                      Emergency Contact Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="emergencyContactName" 
                      name="emergencyContactName" 
                      value={formData.emergencyContactName} 
                      onChange={handleChange} 
                      placeholder="Emergency Contact Name"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.emergencyContactName ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.emergencyContactName && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.emergencyContactName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700">
                      Emergency Contact Phone <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="emergencyContactPhone" 
                      name="emergencyContactPhone" 
                      value={formData.emergencyContactPhone} 
                      onChange={handleChange} 
                      placeholder="Emergency Contact Phone"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.emergencyContactPhone ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.emergencyContactPhone && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.emergencyContactPhone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="emergencyContactRelation" className="block text-sm font-medium text-gray-700">
                      Relation
                    </label>
                    <input 
                      id="emergencyContactRelation" 
                      name="emergencyContactRelation" 
                      value={formData.emergencyContactRelation} 
                      onChange={handleChange} 
                      placeholder="Relation"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700">
                      Address Line 1 <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="addressLine1" 
                      name="addressLine1" 
                      value={formData.addressLine1} 
                      onChange={handleChange} 
                      placeholder="Address Line 1"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.addressLine1 ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.addressLine1 && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.addressLine1}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700">
                      Address Line 2
                    </label>
                    <input 
                      id="addressLine2" 
                      name="addressLine2" 
                      value={formData.addressLine2} 
                      onChange={handleChange} 
                      placeholder="Address Line 2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="city" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleChange} 
                      placeholder="City"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.city ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.city && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="state" 
                      name="state" 
                      value={formData.state} 
                      onChange={handleChange} 
                      placeholder="State"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.state ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.state && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.state}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="pincode" className="block text-sm font-medium text-gray-700">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="pincode" 
                      name="pincode" 
                      value={formData.pincode} 
                      onChange={handleChange} 
                      placeholder="Pincode"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.pincode ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.pincode && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.pincode}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Academic Information Tab */}
            {activeTab === 'academic' && (
              <div className="space-y-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold mb-1 text-gray-800">Academic Information</h2>
                  <p className="text-gray-600 text-sm">Enter the student's academic details</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="admissionNumber" className="block text-sm font-medium text-gray-700">
                      Admission Number <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="admissionNumber" 
                      name="admissionNumber" 
                      value={formData.admissionNumber} 
                      onChange={handleChange} 
                      placeholder="Admission Number"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.admissionNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.admissionNumber && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.admissionNumber}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="admissionDate" className="block text-sm font-medium text-gray-700">
                      Admission Date <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="admissionDate" 
                      name="admissionDate" 
                      type="date" 
                      value={formData.admissionDate} 
                      onChange={handleChange} 
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.admissionDate ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.admissionDate && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.admissionDate}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700">
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="academicYear" 
                      name="academicYear" 
                      value={formData.academicYear} 
                      onChange={handleChange} 
                      placeholder="e.g. 2024-2025"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.academicYear ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    />
                    {formErrors.academicYear && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.academicYear}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
                      Grade <span className="text-red-500">*</span>
                    </label>
                    <select 
                      id="grade"
                      name="grade"
                      value={formData.grade} 
                      onChange={(e) => handleSelectChange('grade', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${formErrors.grade ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    >
                      <option value="">Select Grade</option>
                      <option value="Nursery">Nursery</option>
                      <option value="LKG">LKG</option>
                      <option value="UKG">UKG</option>
                      {[...Array(12)].map((_, i) => (
                        <option key={i+1} value={`Grade ${i+1}`}>Grade {i+1}</option>
                      ))}
                    </select>
                    {formErrors.grade && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.grade}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="section" className="block text-sm font-medium text-gray-700">
                      Section
                    </label>
                    <select
                      id="section"
                      name="section"
                      value={formData.section}
                      onChange={(e) => handleSelectChange('section', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select Section</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="rollno" className="block text-sm font-medium text-gray-700">
                      Roll Number
                    </label>
                    <input 
                      id="rollno" 
                      name="rollno" 
                      value={formData.rollno} 
                      onChange={handleChange} 
                      placeholder="Roll Number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="previousSchool" className="block text-sm font-medium text-gray-700">
                      Previous School
                    </label>
                    <input 
                      id="previousSchool" 
                      name="previousSchool" 
                      value={formData.previousSchool} 
                      onChange={handleChange} 
                      placeholder="Previous School"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="previousGrade" className="block text-sm font-medium text-gray-700">
                      Previous Grade
                    </label>
                    <input 
                      id="previousGrade" 
                      name="previousGrade" 
                      value={formData.previousGrade} 
                      onChange={handleChange} 
                      placeholder="Previous Grade"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Parents Information Tab */}
            {activeTab === 'parents' && (
              <div className="space-y-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold mb-1 text-gray-800">Parents & Guardian Information</h2>
                  <p className="text-gray-600 text-sm">Enter the student's family details</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-md mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Father's Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="fatherName" className="block text-sm font-medium text-gray-700">
                        Father's Name
                      </label>
                      <input 
                        id="fatherName" 
                        name="fatherName" 
                        value={formData.fatherName} 
                        onChange={handleChange} 
                        placeholder="Father's Name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="fatherOccupation" className="block text-sm font-medium text-gray-700">
                        Occupation
                      </label>
                      <input 
                        id="fatherOccupation" 
                        name="fatherOccupation" 
                        value={formData.fatherOccupation} 
                        onChange={handleChange} 
                        placeholder="Occupation"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-2">
                      <label htmlFor="fatherPhone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input 
                        id="fatherPhone" 
                        name="fatherPhone" 
                        value={formData.fatherPhone} 
                        onChange={handleChange} 
                        placeholder="Phone Number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="fatherEmail" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input 
                        id="fatherEmail" 
                        name="fatherEmail" 
                        type="email"
                        value={formData.fatherEmail} 
                        onChange={handleChange} 
                        placeholder="Email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-md mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Mother's Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="motherName" className="block text-sm font-medium text-gray-700">
                        Mother's Name
                      </label>
                      <input 
                        id="motherName" 
                        name="motherName" 
                        value={formData.motherName} 
                        onChange={handleChange} 
                        placeholder="Mother's Name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="motherOccupation" className="block text-sm font-medium text-gray-700">
                        Occupation
                      </label>
                      <input 
                        id="motherOccupation" 
                        name="motherOccupation" 
                        value={formData.motherOccupation} 
                        onChange={handleChange} 
                        placeholder="Occupation"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-2">
                      <label htmlFor="motherPhone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input 
                        id="motherPhone" 
                        name="motherPhone" 
                        value={formData.motherPhone} 
                        onChange={handleChange} 
                        placeholder="Phone Number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="motherEmail" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input 
                        id="motherEmail" 
                        name="motherEmail" 
                        type="email"
                        value={formData.motherEmail} 
                        onChange={handleChange} 
                        placeholder="Email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Guardian's Details (If different from parents)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="guardianName" className="block text-sm font-medium text-gray-700">
                        Guardian's Name
                      </label>
                      <input 
                        id="guardianName" 
                        name="guardianName" 
                        value={formData.guardianName} 
                        onChange={handleChange} 
                        placeholder="Guardian's Name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="guardianRelation" className="block text-sm font-medium text-gray-700">
                        Relation
                      </label>
                      <input 
                        id="guardianRelation" 
                        name="guardianRelation" 
                        value={formData.guardianRelation} 
                        onChange={handleChange} 
                        placeholder="Relation"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-2">
                      <label htmlFor="guardianPhone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input 
                        id="guardianPhone" 
                        name="guardianPhone" 
                        value={formData.guardianPhone} 
                        onChange={handleChange} 
                        placeholder="Phone Number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="guardianEmail" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input 
                        id="guardianEmail" 
                        name="guardianEmail" 
                        type="email"
                        value={formData.guardianEmail} 
                        onChange={handleChange} 
                        placeholder="Email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Health Information Tab */}
            {activeTab === 'health' && (
              <div className="space-y-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold mb-1 text-gray-800">Health & Transport Information</h2>
                  <p className="text-gray-600 text-sm">Enter the student's health and transport details</p>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="healthIssues" className="block text-sm font-medium text-gray-700">
                      Health Issues/Conditions
                    </label>
                    <textarea
                      id="healthIssues"
                      name="healthIssues"
                      rows="3"
                      value={formData.healthIssues}
                      onChange={handleChange}
                      placeholder="Any known health conditions or issues"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    ></textarea>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="allergies" className="block text-sm font-medium text-gray-700">
                      Allergies
                    </label>
                    <textarea
                      id="allergies"
                      name="allergies"
                      rows="2"
                      value={formData.allergies}
                      onChange={handleChange}
                      placeholder="Any known allergies"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    ></textarea>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="medications" className="block text-sm font-medium text-gray-700">
                      Current Medications
                    </label>
                    <textarea
                      id="medications"
                      name="medications"
                      rows="2"
                      value={formData.medications}
                      onChange={handleChange}
                      placeholder="Any current medications"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    ></textarea>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Transport & Accommodation</h3>
                  
                  <div className="flex items-center mb-4">
                    <input
                      id="transportRequired"
                      name="transportRequired"
                      type="checkbox"
                      checked={formData.transportRequired}
                      onChange={(e) => handleSwitchChange('transportRequired', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="transportRequired" className="ml-2 block text-sm text-gray-700">
                      School Transport Required
                    </label>
                  </div>
                  
                  {formData.transportRequired && (
                    <div className="ml-6 mb-4">
                      <label htmlFor="pickupPoint" className="block text-sm font-medium text-gray-700 mb-1">
                        Pickup Point
                      </label>
                      <input 
                        id="pickupPoint" 
                        name="pickupPoint" 
                        value={formData.pickupPoint} 
                        onChange={handleChange} 
                        placeholder="Pickup Point Location"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center mb-4">
                    <input
                      id="hostelRequired"
                      name="hostelRequired"
                      type="checkbox"
                      checked={formData.hostelRequired}
                      onChange={(e) => handleSwitchChange('hostelRequired', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="hostelRequired" className="ml-2 block text-sm text-gray-700">
                      Hostel Accommodation Required
                    </label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">
                    Additional Remarks
                  </label>
                  <textarea
                    id="remarks"
                    name="remarks"
                    rows="3"
                    value={formData.remarks}
                    onChange={handleChange}
                    placeholder="Any additional information or special requirements"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  ></textarea>
                </div>
              </div>
            )}
            
            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold mb-1 text-gray-800">Required Documents</h2>
                  <p className="text-gray-600 text-sm">Mark the documents that have been submitted</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      id="birthCertificate"
                      name="birthCertificate"
                      type="checkbox"
                      checked={formData.birthCertificate}
                      onChange={(e) => handleSwitchChange('birthCertificate', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="birthCertificate" className="ml-2 block text-sm text-gray-700">
                      Birth Certificate
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="transferCertificate"
                      name="transferCertificate"
                      type="checkbox"
                      checked={formData.transferCertificate}
                      onChange={(e) => handleSwitchChange('transferCertificate', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="transferCertificate" className="ml-2 block text-sm text-gray-700">
                      Transfer Certificate (TC)
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="previousMarksheets"
                      name="previousMarksheets"
                      type="checkbox"
                      checked={formData.previousMarksheets}
                      onChange={(e) => handleSwitchChange('previousMarksheets', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="previousMarksheets" className="ml-2 block text-sm text-gray-700">
                      Previous Class Marksheets
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="medicalCertificate"
                      name="medicalCertificate"
                      type="checkbox"
                      checked={formData.medicalCertificate}
                      onChange={(e) => handleSwitchChange('medicalCertificate', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="medicalCertificate" className="ml-2 block text-sm text-gray-700">
                      Medical Certificate
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="addressProof"
                      name="addressProof"
                      type="checkbox"
                      checked={formData.addressProof}
                      onChange={(e) => handleSwitchChange('addressProof', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="addressProof" className="ml-2 block text-sm text-gray-700">
                      Address Proof
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="photograph"
                      name="photograph"
                      type="checkbox"
                      checked={formData.photograph}
                      onChange={(e) => handleSwitchChange('photograph', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="photograph" className="ml-2 block text-sm text-gray-700">
                      Recent Passport Size Photographs
                    </label>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <p className="text-sm text-gray-600 mb-4">
                    By submitting this form, you confirm that all the information provided is accurate to the best of your knowledge.
                  </p>
                </div>
              </div>
            )}
            
            {/* Navigation buttons */}
            <div className="pt-6 border-t border-gray-200 mt-8 flex justify-between">
              {activeTab !== tabs[0].id && (
                <button
                  type="button"
                  onClick={() => navigateTab('prev')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
              )}
              {activeTab !== tabs[tabs.length - 1].id ? (
                <button
                  type="button"
                  onClick={() => navigateTab('next')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ml-auto"
                >
                  Next
                  <svg className="ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ml-auto"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : 'Submit Registration'}
                </button>
              )}
            </div>
          </div>
        </form>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-500 text-center">
          <p>For any assistance, please contact the school admission office.</p>
        </div>
      </div>
    </div>
  );
};

export default StudentRegistrationForm;