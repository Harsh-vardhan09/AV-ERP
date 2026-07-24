// import React, { useState } from "react";
// import axios from "axios"; 

// function ComplaintForm() {
//     const [members, setMembers] = useState([]); 
//     const [inputs, setInputs] = useState([{ enrollmentNo: "", name: "" }]); 
//     const [complaintType, setComplaintType] = useState("All");
//     const [complaintData, setComplaintData] = useState({
//         category: "Academic Complaint ",
//         description: "",
//         suggestion: ""
//     });
    

//     function handleDetailChange(event) {
//         const { name, value } = event.target;
//         setComplaintData((prev) => ({ ...prev, [name]: value }));
//     }

//     function handleInputChange(index, event) {
//         const { name, value } = event.target;
//         const newInputs = [...inputs];
//         newInputs[index][name] = value;
//         setInputs(newInputs);
//     }

//     function addMembers() {
//         const currentInputs = inputs.filter(input => input.enrollmentNo);
//         console.log(inputs);
//         const newMembers = currentInputs.filter(input => 
//             !members.some(member => 
//                 member.enrollmentNo === input.enrollmentNo && member.name === input.name
//             )
//         );
//         setMembers(m => [...m, ...newMembers]);
//     }

//     function handleAddMoreClick() {
//         setInputs([...inputs, { enrollmentNo: "", name: "" }]); 
//     }

//     function handleComplaintTypeChange(event) {
//         setComplaintType(event.target.value); 
//     }

//     async function handleSubmit() {
//         try {
//             let apiUrl = "http://127.0.0.1:4000/api/v1/complain"; 
//             let payload = {
//                 category: complaintData.category,
//                 description: complaintData.description,
//                 suggestion: complaintData.suggestion,
//                 status: "pending"
//             };

//             if (complaintType === "Solo") {
               
//                 payload.sentto = null;  
//                 await axios.post(`${apiUrl}/67000c5c3a4def779eff1605`, payload);
//             } else if (complaintType === "Group" ) {
            
//                 const selectedStudents = members.map(member => member.enrollmentNo);
//                 payload.selectedStudents = selectedStudents;
//                 await axios.post(`${apiUrl}/multiple/67000c5c3a4def779eff1605?info={"semester":"V","section":"A"}`, payload);
//             } else if (complaintType === "All") {
                
//                 await axios.post(`${apiUrl}/all/67000c5c3a4def779eff1605?info={"semester":"V","section":"A"}`, payload);
//             }
            
//             alert("Your Complaint was Submitted.");
//         } catch (error) {
//             console.log("Error submitting complaint:", error.response.data.message);
//             alert(error.response.data.message);
//         }
//     }

//     return (
//         <>
//             <section className="main">
//                 <h1>Add your Complaint</h1>
//                 <div className="complaint-form">
//                     <h2>Complaint Details:</h2>
//                     <hr/>
//                     <p>
//                         <label htmlFor="cb">Complaint by: </label>
//                         <select name="cb" onChange={handleComplaintTypeChange}>
//                             <option value="All">All</option>
//                             <option value="Solo">Solo</option>
//                             <option value="Group">Group</option>
//                         </select>
//                     </p>
//                     <p>
//                         <label htmlFor="category">Category: </label>
//                         <select name="category" onChange={handleDetailChange}>
//                             <option value="Academic Complaint " selected>Academic Complaint</option>
//                             <option value="College Resources">College Resources</option>
//                             <option value="Infrastructure Services">Infrastructure Services</option>
//                             <option value="Discrimination">Discrimination</option>
//                             <option value="Registration Issues">Registration Issues</option>
//                             <option value="Safety & Security">Safety & Security</option>
//                         </select>
//                     </p>
//                     <p className="description">
//                         Description: <input placeholder="Describe your complaint..." type="text" name="description" onChange={handleDetailChange} />
//                     </p>
//                     <p className="suggestion">
//                         Suggestion: <input placeholder="Enter any suggestions..." type="text" name="suggestion" onChange={handleDetailChange} />
//                     </p>
                    
//                     {complaintType === "Group" && (
//                         <section className="members">
//                             <p className="add-members">Add Members:</p>
//                             {inputs.map((input, index) => (
//                                 <div key={index}>
//                                     <p className="member">Member {index + 1}:</p>
//                                     <input 
//                                         className="add-input"
//                                         type="text" 
//                                         name="enrollmentNo" 
//                                         placeholder="Enter enrollment number..." 
//                                         value={input.enrollmentNo} 
//                                         onChange={event => handleInputChange(index, event)} 
//                                     /><br />
//                                 </div>
//                             ))}
//                             <button className="add-button" onClick={addMembers}>Add</button>
//                             <button className="add-button" onClick={handleAddMoreClick}>Add more</button><br/>
//                         </section>
//                     )}
//                     <button className="submit-button" onClick={handleSubmit}>Submit</button>
//                 </div>
//             </section>
           
//             <style jsx>{`
//                 * {
//                     font-family: Arial, Helvetica, sans-serif;
//                     color: #133E87;
//                 }
//                 body {
//                     background-color: #B9E5E8;
//                     margin: 0;
//                     padding: 0;
//                 }
//                 hr {
//                     width: 95%;
//                     background-color: #133E87;
//                     height: 3px; 
//                     margin-bottom: 70px;
//                     margin-left: 30px;
//                     animation: line 2s ease-in-out;
//                 }
//                 @keyframes line {
//                     0% { width: 0%; }
//                     100% { width: 95%; }
//                 }
//                 .main {
//                     display: flex;
//                     flex-direction: column;
//                     align-items: center;
//                     padding: 20px;
//                 }
//                 .complaint-form {
//                     background-color: #DFF2EB;
//                     box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.133);
//                     max-width: 900px;
//                     width: 100%;
//                     margin: 20px;
//                     padding: 40px;
//                     border-radius: 10px;
//                 }
//                 p {
//                     margin: 20px 0;
//                     font-size: 1.3rem;
//                     font-weight: 600;
//                 }
//                 label {
//                     font-size: 1.4rem;
//                     font-weight: 600;
//                 }
//                 select {
//                     height: 40px;
//                     width: auto;
//                     min-width: 90px;
//                     font-size: 1rem;
//                     border-radius: 10px;
//                     padding: 10px;  
//                 }
//                 h2 {
//                     margin: 20px 0;
//                     font-size: 2.5rem;
//                 }
//                 h1 {
//                     font-size: 3rem;
//                 }
//                 input {
//                     width: calc(100% - 40px);
//                     height: 40px;
//                     border-radius: 10px;
//                     border: 1px solid rgba(0, 0, 0, 0.197);
//                     margin: 10px 0;
//                     padding: 10px;
//                     font-size: 1rem;
//                 }
//                 .add-members {
//                     font-size: 1.6rem;
//                     font-weight: 600;
//                 }
//                 .member {
//                     font-weight: 600;
//                 }
//                 button {
//                     height: 40px;
//                     width: 90px;
//                     padding: 8px;
//                     font-size: 1rem;
//                     margin: 10px;
//                     border-radius: 10px;
//                     border: none;
//                     background-color: rgb(203, 203, 241);
//                     cursor: pointer;
//                 }
//                 .submit-button {
//                     background-color: rgb(24, 214, 24);
//                     width: 97%;
//                     color: white;
//                 }
//                 .add-input {
//                     margin-left: 0;
//                     width: calc(100% - 40px);
//                 }
//                 .add-button {
//                     background-color: rgb(108, 108, 246);
//                     color: white;
//                 }
//                 .add-button:hover {
//                     background-color: blue;
//                 }
//                 @media (max-width: 600px) {
//                     h1 {
//                         font-size: 2.5rem;
//                     }
//                     h2 {
//                         font-size: 2rem;
//                     }
//                     hr {
//                         margin-left: 20px;
//                     }
//                     p {
//                         font-size: 1.2rem;
//                     }
//                     input, select {
//                         width: 80%;
//                         font-size: 1rem;
//                     }
//                     select {
//                         margin: 20px 0;
//                     }
//                     .complaint-form {
//                         padding: 20px;
//                         width: 90%;
//                     }
//                 }
//                 @media (max-width: 1000px) {
//                     .complaint-form {
//                         width: 90%;
//                     }
//                 }
//             `}</style>
//         </>
//     );
// }

// export default ComplaintForm;


import React, { useState, useEffect } from "react";
import axios from "axios";

function ComplaintForm() {
  const [members, setMembers] = useState([]);
  const [inputs, setInputs] = useState([{ enrollmentNo: "", name: "" }]);
  const [complaintType, setComplaintType] = useState("All");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [notification, setNotification] = useState({ show: false, type: "", message: "" });
  const [isValidForm, setIsValidForm] = useState(false);
  const [complaintData, setComplaintData] = useState({
    category: "Academic Complaint",
    description: "",
    suggestion: ""
  });

  // Validate form on every change
  useEffect(() => {
    const isValid = validateForm();
    setIsValidForm(isValid);
  }, [complaintData, complaintType, members]);

  function validateForm() {
    if (!complaintData.description.trim()) {
      return false;
    }
    
    if (complaintType === "Group" && members.length === 0) {
      return false;
    }
    
    return true;
  }

  function handleDetailChange(event) {
    const { name, value } = event.target;
    setComplaintData((prev) => ({ ...prev, [name]: value }));
  }

  function handleInputChange(index, event) {
    const { name, value } = event.target;
    const newInputs = [...inputs];
    newInputs[index][name] = value;
    setInputs(newInputs);
  }

  function addMembers() {
    const currentInputs = inputs.filter(input => input.enrollmentNo.trim());
    const newMembers = currentInputs.filter(input =>
      !members.some(member => member.enrollmentNo === input.enrollmentNo)
    );
    
    if (newMembers.length) {
      setMembers(m => [...m, ...newMembers]);
      setInputs([{ enrollmentNo: "", name: "" }]);
      showNotification("success", `${newMembers.length} member(s) added successfully!`);
    } else {
      showNotification("error", "Please enter valid enrollment numbers.");
    }
  }

  function showNotification(type, message) {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: "", message: "" });
    }, 3000);
  }

  function handleAddMoreClick() {
    setInputs([...inputs, { enrollmentNo: "", name: "" }]);
  }

  function handleComplaintTypeChange(event) {
    setComplaintType(event.target.value);
  }

  function removeMember(index) {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  }

  function nextStep() {
    setStep(prevStep => prevStep + 1);
  }

  function prevStep() {
    setStep(prevStep => prevStep - 1);
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      let apiUrl =`${import.meta.env.VITE_PORT}/api/v1/complain`;
      let payload = {
        category: complaintData.category,
        description: complaintData.description,
        suggestion: complaintData.suggestion,
        status: "pending"
      };

      if (complaintType === "Solo") {
        payload.sentto = null;
        await axios.post(`${apiUrl}/67000c5c3a4def779eff1605`, payload);
      } else if (complaintType === "Group") {
        const selectedStudents = members.map(member => member.enrollmentNo);
        payload.selectedStudents = selectedStudents;
        await axios.post(`${apiUrl}/multiple/67000c5c3a4def779eff1605?info={"semester":"V","section":"A"}`, payload);
      } else if (complaintType === "All") {
        await axios.post(`${apiUrl}/all/67000c5c3a4def779eff1605?info={"semester":"V","section":"A"}`, payload);
      }

      // Reset form after successful submission
      setComplaintData({
        category: "Academic Complaint",
        description: "",
        suggestion: ""
      });
      setMembers([]);
      setInputs([{ enrollmentNo: "", name: "" }]);
      setStep(3); // Move to success step
      
    } catch (error) {
      console.log("Error submitting complaint:", error.response?.data?.message || error.message);
      showNotification("error", error.response?.data?.message || "An error occurred while submitting your complaint");
    } finally {
      setSubmitting(false);
    }
  }

  // Render based on current step
  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="step-content">
            <h2>Complaint Details</h2>
            <div className="form-group">
              <label htmlFor="cb">Who is filing this complaint?</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="complaintType" 
                    value="All" 
                    checked={complaintType === "All"} 
                    onChange={handleComplaintTypeChange} 
                  />
                  <span className="radio-text">All Students</span>
                </label>
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="complaintType" 
                    value="Solo" 
                    checked={complaintType === "Solo"} 
                    onChange={handleComplaintTypeChange} 
                  />
                  <span className="radio-text">Just Me</span>
                </label>
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="complaintType" 
                    value="Group" 
                    checked={complaintType === "Group"} 
                    onChange={handleComplaintTypeChange} 
                  />
                  <span className="radio-text">Group of Students</span>
                </label>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="category">Complaint Category</label>
              <div className="select-wrapper">
                <select 
                  id="category" 
                  name="category" 
                  value={complaintData.category} 
                  onChange={handleDetailChange}
                >
                  <option value="Academic Complaint">Academic Complaint</option>
                  <option value="College Resources">College Resources</option>
                  <option value="Infrastructure Services">Infrastructure Services</option>
                  <option value="Discrimination">Discrimination</option>
                  <option value="Registration Issues">Registration Issues</option>
                  <option value="Safety & Security">Safety & Security</option>
                </select>
                <div className="select-arrow"></div>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="description">
                Description <span className="required">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Please describe your complaint in detail..."
                value={complaintData.description}
                onChange={handleDetailChange}
                rows="5"
                required
              ></textarea>
              <div className="hint">Provide as much detail as possible to help us understand your concern.</div>
            </div>
            
            <div className="form-group">
              <label htmlFor="suggestion">Suggested Solution</label>
              <textarea
                id="suggestion"
                name="suggestion"
                placeholder="Do you have any suggestions to resolve this issue?"
                value={complaintData.suggestion}
                onChange={handleDetailChange}
                rows="3"
              ></textarea>
              <div className="hint">Optional: Your suggestions help us improve our services.</div>
            </div>
            
            <div className="form-buttons">
              <button 
                type="button" 
                className="primary-btn" 
                onClick={nextStep}
                disabled={!complaintData.description.trim()}
              >
                Next <span className="btn-icon">→</span>
              </button>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="step-content">
            {complaintType === "Group" ? (
              <>
                <h2>Group Members</h2>
                <p className="info-text">Add the enrollment numbers of students who are part of this complaint.</p>
                
                {members.length > 0 && (
                  <div className="members-list">
                    <h3>Added Members <span className="count">{members.length}</span></h3>
                    <div className="member-chips">
                      {members.map((member, index) => (
                        <div key={`member-${index}`} className="member-chip">
                          <span>{member.enrollmentNo}</span>
                          <button 
                            type="button" 
                            className="chip-remove"
                            onClick={() => removeMember(index)}
                            aria-label="Remove member"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="add-member">
                  <div className="form-row">
                    {inputs.map((input, index) => (
                      <div key={`input-${index}`} className="form-group">
                        <label>Enrollment Number {index + 1}</label>
                        <input
                          type="text"
                          name="enrollmentNo"
                          placeholder="Enter enrollment number..."
                          value={input.enrollmentNo}
                          onChange={(event) => handleInputChange(index, event)}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="action-buttons">
                    <button 
                      type="button" 
                      className="secondary-btn" 
                      onClick={addMembers}
                    >
                      <span className="btn-icon">+</span> Add Member
                    </button>
                    <button 
                      type="button" 
                      className="secondary-btn outline" 
                      onClick={handleAddMoreClick}
                    >
                      Add More Fields
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="review-section">
                <h2>Review Your Complaint</h2>
                <div className="review-item">
                  <h3>Complaint Type</h3>
                  <p>{complaintType === "All" ? "All Students" : "Just Me"}</p>
                </div>
                <div className="review-item">
                  <h3>Category</h3>
                  <p>{complaintData.category}</p>
                </div>
                <div className="review-item">
                  <h3>Description</h3>
                  <p>{complaintData.description}</p>
                </div>
                {complaintData.suggestion && (
                  <div className="review-item">
                    <h3>Suggested Solution</h3>
                    <p>{complaintData.suggestion}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="form-buttons">
              <button 
                type="button" 
                className="secondary-btn outline" 
                onClick={prevStep}
              >
                <span className="btn-icon">←</span> Back
              </button>
              <button 
                type="button" 
                className="primary-btn" 
                onClick={handleSubmit}
                disabled={!isValidForm || submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner"></span> Submitting...
                  </>
                ) : (
                  <>Submit Complaint</>
                )}
              </button>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="success-step">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" width="100" height="100">
                <circle cx="12" cy="12" r="11" fill="#4CAF50" />
                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="white" />
              </svg>
            </div>
            <h2>Complaint Submitted Successfully!</h2>
            <p>Your complaint has been recorded and will be reviewed by our team.</p>
            <p className="reference">Reference ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
            <div className="form-buttons">
              <button 
                type="button" 
                className="primary-btn" 
                onClick={() => {
                  setStep(1);
                  setComplaintType("All");
                }}
              >
                Submit Another Complaint
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="complaint-system">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.type === "success" && (
              <svg className="notification-icon" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="#4CAF50" />
                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="white" />
              </svg>
            )}
            {notification.type === "error" && (
              <svg className="notification-icon" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="#F44336" />
                <path d="M13.41 12l4.3-4.29a1 1 0 1 0-1.42-1.42L12 10.59l-4.29-4.3a1 1 0 0 0-1.42 1.42l4.3 4.29-4.3 4.29a1 1 0 0 0 0 1.42 1 1 0 0 0 1.42 0l4.29-4.3 4.29 4.3a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42z" fill="white" />
              </svg>
            )}
            <p>{notification.message}</p>
          </div>
        </div>
      )}
      
      <div className="card">
        <div className="header">
          <h1>Student Complaint Portal</h1>
          <p className="subtitle">We value your feedback and concerns</p>
        </div>
        
        {step < 3 && (
          <div className="progress-bar">
            <div className="progress-step">
              <div className={`step-circle ${step >= 1 ? 'active' : ''}`}>1</div>
              <span className="step-label">Details</span>
            </div>
            <div className="progress-line"></div>
            <div className="progress-step">
              <div className={`step-circle ${step >= 2 ? 'active' : ''}`}>2</div>
              <span className="step-label">{complaintType === "Group" ? "Members" : "Review"}</span>
            </div>
            <div className="progress-line"></div>
            <div className="progress-step">
              <div className={`step-circle ${step >= 3 ? 'active' : ''}`}>3</div>
              <span className="step-label">Complete</span>
            </div>
          </div>
        )}
        
        <div className="content">
          {renderStep()}
        </div>
      </div>
      
      <style jsx>{`
        .complaint-system {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #3a7bd5, #00d2ff);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          position: relative;
        }
        
        .card {
          background-color: #fff;
          border-radius: 16px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 800px;
          overflow: hidden;
          position: relative;
          z-index: 1;
        }
        
        .header {
          background: linear-gradient(135deg, #1976D2, #42A5F5);
          color: white;
          padding: 2rem;
          text-align: center;
          position: relative;
        }
        
        .header h1 {
          font-size: 2.2rem;
          margin: 0;
          font-weight: 600;
          color: white;
        }
        
        .subtitle {
          margin: 0.5rem 0 0;
          opacity: 0.9;
          font-size: 1rem;
        }
        
        .progress-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 4rem;
          background-color: #f9f9f9;
          border-bottom: 1px solid #eee;
        }
        
        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 0 0 auto;
          z-index: 2;
        }
        
        .step-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #e0e0e0;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: 600;
          color: #757575;
          margin-bottom: 0.5rem;
          transition: all 0.3s ease;
        }
        
        .step-circle.active {
          background-color: #2196F3;
          color: white;
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.3);
        }
        
        .step-label {
          font-size: 0.8rem;
          color: #757575;
          font-weight: 500;
        }
        
        .progress-line {
          flex: 1;
          height: 3px;
          background-color: #e0e0e0;
          margin: 0 10px;
          position: relative;
          top: -18px;
          z-index: 1;
        }
        
        .content {
          padding: 2rem;
        }
        
        .step-content {
          animation: fadeIn 0.5s ease-out;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #37474F;
        }
        
        .required {
          color: #F44336;
        }
        
        .hint {
          font-size: 0.8rem;
          color: #78909C;
          margin-top: 0.5rem;
        }
        
        .select-wrapper {
          position: relative;
        }
        
        .select-arrow {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #78909C;
        }
        
        select, input, textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #E0E0E0;
          border-radius: 8px;
          font-size: 1rem;
          color: #333;
          background-color: #FAFAFA;
          transition: all 0.3s;
        }
        
        select {
          appearance: none;
          padding-right: 30px;
        }
        
        select:focus, input:focus, textarea:focus {
          border-color: #2196F3;
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.2);
          outline: none;
          background-color: #fff;
        }
        
        .radio-group {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        
        .radio-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: 10px 15px;
          border: 2px solid #E0E0E0;
          border-radius: 8px;
          transition: all 0.3s;
        }
        
        .radio-label:hover {
          border-color: #BBDEFB;
        }
        
        .radio-label input {
          margin-right: 10px;
          width: auto;
        }
        
        input[type="radio"] {
          appearance: none;
          width: 20px;
          height: 20px;
          border: 2px solid #E0E0E0;
          border-radius: 50%;
          background-clip: content-box;
          padding: 3px;
          transition: all 0.3s;
        }
        
        input[type="radio"]:checked {
          background-color: #2196F3;
          border-color: #2196F3;
        }
        
        .radio-text {
          font-weight: 500;
        }
        
        .members-list {
          background-color: #f9f9f9;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          border: 1px solid #E0E0E0;
        }
        
        .members-list h3 {
          margin-top: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #37474F;
          font-size: 1.1rem;
          margin-bottom: 1rem;
        }
        
        .count {
          background-color: #2196F3;
          color: white;
          border-radius: 20px;
          padding: 2px 10px;
          font-size: 0.8rem;
        }
        
        .member-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .member-chip {
          display: flex;
          align-items: center;
          background-color: #E3F2FD;
          color: #1976D2;
          padding: 0.5rem 0.75rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .chip-remove {
          background: none;
          border: none;
          color: #1976D2;
          margin-left: 6px;
          cursor: pointer;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          transition: all 0.3s;
        }
        
        .chip-remove:hover {
          background-color: #BBDEFB;
        }
        
        .info-text {
          color: #607D8B;
          margin-bottom: 1.5rem;
        }
        
        .form-buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 2rem;
        }
        
        .form-buttons button {
          min-width: 120px;
        }
        
        .form-row {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .form-row .form-group {
          flex: 1;
          min-width: 200px;
        }
        
        .action-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .primary-btn, .secondary-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .primary-btn {
          background-color: #2196F3;
          color: white;
        }
        
        .primary-btn:hover:not(:disabled) {
          background-color: #1976D2;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .primary-btn:disabled {
          background-color: #90CAF9;
          cursor: not-allowed;
        }
        
        .secondary-btn {
          background-color: #E3F2FD;
          color: #1976D2;
          border: 1px solid transparent;
        }
        
        .secondary-btn:hover {
          background-color: #BBDEFB;
        }
        
        .secondary-btn.outline {
          background-color: white;
          border: 1px solid #E0E0E0;
          color: #546E7A;
        }
        
        .secondary-btn.outline:hover {
          border-color: #90CAF9;
          color: #1976D2;
        }
        
        .btn-icon {
          margin-right: 5px;
          margin-left: 5px;
          display: inline-block;
        }
        
        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
          margin-right: 10px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          animation: slideIn 0.5s ease-out;
        }
        
        .notification-content {
          background-color: white;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          min-width: 250px;
        }
        
        .notification.success .notification-content {
          border-left: 5px solid #4CAF50;
        }
        
        .notification.error .notification-content {
          border-left: 5px solid #F44336;
        }
        
        .notification-icon {
          width: 24px;
          height: 24px;
          margin-right: 15px;
          flex-shrink: 0;
        }
        
        .notification p {
          margin: 0;
          color: #333;
          font-weight: 500;
        }
        
        .review-section {
          background-color: #f9f9f9;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        
        .review-section h2 {
          margin-top: 0;
          color: #37474F;
          margin-bottom: 1.5rem;
        }
        
        .review-item {
          margin-bottom: 1.5rem;
        }
        
        .review-item h3 {
          font-size: 1rem;
          color: #78909C;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        
        .review-item p {
          font-size: 1rem;
          color: #37474F;
          margin: 0;
          padding: 0.5rem;
          background-color: #fff;
          border-radius: 6px;
          border: 1px solid #E0E0E0;
          max-height: 100px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-word;
        }
        
        .success-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2rem 1rem;
          animation: fadeIn 0.5s ease-out;
        }
        
        .success-icon {
          margin-bottom: 1.5rem;
          animation: scaleUp 0.5s ease-out;
        }
        
        .success-step h2 {
          color: #37474F;
          margin-bottom: 1rem;
        }
        
        .success-step p {
          color: #607D8B;
          margin-bottom: 1rem;
          max-width: 400px;
        }
        
        .reference {
          background-color: #E3F2FD;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          color: #1976D2;
          margin: 1rem 0;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes scaleUp {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        @media (max-width: 768px) {
          .complaint-system {
            padding: 1rem;
          }
          
   .header {
            padding: 1.5rem 1rem;
          }
          
          .header h1 {
            font-size: 1.8rem;
          }
          
          .progress-bar {
            padding: 1rem;
          }
          
          .content {
            padding: 1.5rem;
          }
          
          .form-buttons {
            flex-direction: column;
            gap: 1rem;
          }
          
          .form-buttons button {
            width: 100%;
          }
          
          .radio-group {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .radio-label {
            width: 100%;
          }
          
          .action-buttons {
            flex-direction: column;
            width: 100%;
          }
          
          .action-buttons button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default ComplaintForm;