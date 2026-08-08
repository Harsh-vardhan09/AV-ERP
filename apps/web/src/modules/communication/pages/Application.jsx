import { useNavigate,Link } from 'react-router-dom';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
const Application = () => {
  const [isFileRequired, setIsFileRequired] = useState(false);
const id =useSelector(state=>state?.user?.user?.user?._id)
  const [sucess,setsucess]=useState(false);
  const [filedata,setfiledata]=useState(" ");
  const [formData, setFormData] = useState({
    To: '',
    subject: '',
    Body: '',
    startDate: '',
    endDate: '',
    file: null,
  });

  const handleFileChange = (event) => {
    setFormData({ ...formData, file: event.target.files[0] });
  };

  const navigate = useNavigate();

  const handleChange = (e) => {
    
    const { name, value } = e.target;
    if (name === 'subject') {
      if (
        value === 'Medical Leave' ||
        value === "Sister's Marriage" ||
        value === "Brother's Marriage" ||
        value === 'Death of Relative'
      ) {
        setIsFileRequired(true); // Set file as required based on subject
      } else {
        setIsFileRequired(false);
      }
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const formdata = new FormData();
    formdata.append('To', formData.To);
    formdata.append('S_date', formData.startDate);
    formdata.append('E_date', formData.endDate);
    formdata.append('subject', formData.subject);
    formdata.append('Body', formData.Body);
  
    if (formData.file) {
      formdata.append('files', formData.file);
    }
    console.log(formData);
    try {
      const response = await fetch(`${import.meta.env.VITE_PORT}/application/leaves/${id}`, {
        method: 'POST',
        body: formdata,
      });
      console.log(response)

      const data = await response.json();
      if (response.ok) {
        setfiledata(data);
        setsucess(true);
        toast.success("Application added successfully");
      //  navigate(`/showleaves`);
       

      } else {
        // console.error('Error adding Application', data.message);
        // alert(`Error adding Application: ${data.message}`);
        toast.error(`Error adding Application: ${data.message}`);
      }
    } catch (error) {
      // console.error('Error:', error);
      // alert('Something went wrong. Please try again later.');
      toast.error(`Something went wrong. Please try again later.`);
    }
    
    setFormData({
      To: '',
      subject: '',
      Body: '',
      startDate: '',
      endDate: '',
      file: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[800px]">
        <h2 className="text-2xl font-bold mb-6 text-center">Leave Application Form</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="To" className="block text-sm font-medium text-gray-700">Application To</label>
            <input
              type="text"
              name="To"
              id="To"
              value={formData.To}
              onChange={handleChange}
              className="mt-1 p-2 w-full border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Application To ?? "
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
            <select
              name="subject"
              id='subject'
              value={formData.subject}
              onChange={handleChange}
              className="mt-1 p-2 w-full border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Select a subject</option> {/* Prompt option */}
              <option value="Medical Leave">Medical Leave</option>
              <option value="Urgent Work">Urgent Work</option>
              <option value="Sister's Marriage">Sister's Marriage</option>
              <option value="Brother's Marriage">Brother's Marriage</option>
              <option value="Death of Relative">Death of Relative</option>
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="Body" className="block text-sm font-medium text-gray-700">Body of the Application</label>
            <input
              type="text"
              name="Body"
              id="Body"
              value={formData.Body}
              onChange={handleChange}
              className="mt-1 p-2 w-full border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Body of your Application"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              name="startDate"
              id="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="mt-1 p-2 w-full border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              name="endDate"
              id="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="mt-1 p-2 w-full border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Upload attachment like medical certificate or medical report */}
          <div className="mb-4">
            <label htmlFor="file" className="block text-gray-700">Upload Attachment (Optional):</label>
            <input
              type="file"
              id="file"
              name="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="mt-1 block w-full border border-gray-300 rounded-lg p-2"
              required={isFileRequired}
            />
          </div>
          
          {sucess? <Link
              to={`/showleaves/${filedata.data.file[1]}`}
                // href={`http://localhost:4000/uploads/${pdf.file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                onClick={()=>(navigate("/leavesection"))}
              >
                View Application
              </Link> :<button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
          >
             
            Apply for Leave
          </button>}
        </form>
      </div>
    </div>
  );
};

export default Application;