import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaDownload, FaEye } from 'react-icons/fa';
import { fileUrl } from '@shared/utils/fileUrl';

const LeaveSection = () => {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPdfs = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_PORT}/application/leaves`);
        if (!response.ok) {
          throw new Error('Failed to fetch PDFs');
        }
        const data = await response.json();
        setPdfs(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchPdfs();
  }, []);

  if (loading) {
    return <p className="text-center text-gray-500 mt-6">Loading leave applications...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 mt-6">Error fetching leave applications: {error}</p>;
  }
   console.log(pdfs);
  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-center text-gray-900 mb-12">Student Leave Applications</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {pdfs.data.map((pdf) => (
          <div key={pdf.id} className="bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden transition transform hover:scale-105 duration-300 ease-in-out">
            {/* Header Section */}
            <div className="bg-zinc-200 p-4 text-zinc-600">
              <h3 className="text-xl  text-zinc-600 font-semibold">Name: {pdf.name}</h3>
              <p className="text-xl font-semibold text-zinc-600">Enrollment: {pdf.enrollment}</p>
              <p className="text-xl font-semibold text-zinc-600">Section: {pdf.section}</p>
            </div>

            {/* Body Section */}
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <p className="text-gray-700">Subject: <span className="font-medium">{pdf.subject}</span></p>
                <p className="text-sm text-gray-500">Date: {pdf.S_date}</p>
              </div>

              {/* File Attachments */}
              <div className="mb-4">
                {!fileUrl(pdf.file?.[0]) ? (
                  <p className="text-gray-500 italic">No Attachments</p>
                ) : (
                  <a
                    href={fileUrl(pdf.file[0])}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800 transition"
                  >
                    View Attachment
                  </a>
                )}
              </div>

              {/* Actions Section */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    to={`/showleaves/${pdf.file[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    <FaEye className="mr-2" /> View PDF
                  </Link>
                  <a
                    href={fileUrl(pdf.file?.[0])}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center border border-blue-500 text-blue-500 px-4 py-2 rounded-lg hover:bg-blue-500 hover:text-white transition"
                  >
                    <FaDownload className="mr-2" /> Download
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <button
                    className="flex items-center justify-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                  >
                    <FaCheckCircle className="mr-2" /> Accept
                  </button>
                  <button
                    className="flex items-center justify-center bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    <FaTimesCircle className="mr-2" /> Deny
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaveSection;