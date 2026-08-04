import React from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useCreateassignmentMutation } from '../redux/api/assignmentapi';

function TeacherAssign() {
const teacherid= useSelector(state=>state?.user?.user?.user?._id);
const {register,handleSubmit} =useForm();
const [createassignment] =useCreateassignmentMutation();
const onSubmit=async (data)=>{
  console.log(data);
   const assignmentdata = new FormData();
   assignmentdata.append('section',data.section);
   assignmentdata.append('subject' ,data.subject);
   assignmentdata.append('dueDate',data.dueDate);
   assignmentdata.append('teacherid',teacherid)
   assignmentdata.append('title' , data.title)
   assignmentdata.append('description',data.description)
   assignmentdata.append('semester',data.semester)

   assignmentdata.append('photo',data.file[0])

  //  assignmentdata.append('section')
console.log(assignmentdata)
try{
  await createassignment(assignmentdata).unwrap();
  alert("Assignment created successfully");
}
catch{
  alert("Failed to create assignment");
}
}
  return (
    <>
      <style>
        {`
        * {
          font-family: Arial, Helvetica, sans-serif;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background-color: #f4f7fc;
        }

        .container {
          display: flex;
          flex-direction: column;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
          background-color: white;
        }

        h1 {
          text-align: center;
          background-color: #27408b;
          color: white;
          padding: 15px;
          border-radius: 10px 10px 0 0;
          margin-bottom: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 15px;
        }

        label {
          font-weight: bold;
          margin-bottom: 5px;
        }

        input, textarea, select {
          padding: 10px;
          border-radius: 5px;
          border: 1px solid #ccc;
          font-size: 16px;
          width: 100%;
        }

        textarea {
          resize: none;
        }

        .form-group-inline {
          display: flex;
          justify-content: space-between;
        }

        .form-group-inline .form-group {
          flex: 1;
          margin-right: 10px;
        }

        .form-group-inline .form-group:last-child {
          margin-right: 0;
        }

        .file-upload {
          background-color: #fff;
          border: 2px dashed #27408b;
          border-radius: 5px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
        }

        .file-upload input {
          display: none;
        }

        .file-upload:hover {
          background-color: #f0f4ff;
        }

        .file-upload p {
          color: #27408b;
          font-weight: bold;
          margin: 0;
        }

        .submit-btn {
          background-color: #27408b;
          color: white;
          padding: 15px;
          border: none;
          border-radius: 5px;
          font-size: 18px;
          cursor: pointer;
          margin-top: 20px;
        }

        .submit-btn:hover {
          background-color: #1b2d6b;
        }

        @media (max-width: 768px) {
          .form-group-inline {
            flex-direction: column;
          }

          .form-group-inline .form-group {
            margin-right: 0;
            margin-bottom: 10px;
          }
        }

        `}
      </style>
      {/* const { title, description, subject, dueDate, teacherid, section } = req.body; */}

      <div className="container">
        <h1>Add New Assignment</h1>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group-inline">
            <div className="form-group">
              <label htmlFor="subjectCode">     
                subject code         
              </label>
                <input  type="text" id="subjectCode" placeholder="Enter Section" {...register('section')} required />
              {/* <input  type="text" id="subjectCode" placeholder="Enter Subject Code" {...register('section')} required /> */}
            </div>
            <div className="form-group">
              <label htmlFor="subjectCode">Semester</label>
              <input  type="text" id="subjectCode" placeholder="Enter Semester" {...register('semester')} required />
            </div>
            <div className="form-group">
              <label htmlFor="subjectName">Subject Name</label>
              <input type="text" id="subjectName" placeholder="Enter Subject Name"  {...register('subject')} required />
            </div>
          </div>

          {/* <div className="form-group-inline">
            <div className="form-group">
              <label htmlFor="facultyName">Faculty Name</label>
              <input  type="text" id="facultyName" placeholder="Enter Faculty Name"  {...register('')} required />
            </div> */}
            <div className="form-group">
              <label htmlFor="dueDate">Due Date</label>
              <input  type="date" id="dueDate"  {...register('dueDate')} required />
            </div>
          {/* </div> */}

          <div className="form-group">
            <label htmlFor="title">Assignment Title</label>
            <input type="text" id="title" placeholder="Enter Assignment Title"  {...register('title')} required />
          </div>

          <div className="form-group">
            <label htmlFor="description">Assignment Description</label>
            <textarea id="description" placeholder="Enter Assignment Description"  {...register('description')} rows="4" required></textarea>
          </div>

          <div className="form-group">
            <label>Upload Assignment File</label>
            <div className="file-upload">
              <label htmlFor="fileUpload">
                <input type="file" id="fileUpload" accept="application/pdf"  {...register('file')} />
                <p>Click here or drag & drop to upload a PDF</p>
              </label>
            </div>
          </div>

          <button type="submit" className="submit-btn">Submit Assignment</button>
        </form>
      </div>
    </>
  );
}

export default TeacherAssign;
