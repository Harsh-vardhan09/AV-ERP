import React, { useState, useEffect } from 'react';
import { FiDownload } from 'react-icons/fi'; // For download icon
import { useParams } from 'react-router';
import { useStudentuploadassignmentQuery } from '../redux/api/assignmentapi';

function UploadedFiles() {
  const { id } = useParams();
  const { data, error, isLoading ,refetch} = useStudentuploadassignmentQuery({ assignmentid: id });
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (data && data.detailedUploads) {
      setFiles(data.detailedUploads);
      refetch();
    }
  }, [data]);

  const styles = {
    container: {
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f2f5',
      padding: '20px',
    },
    header: {
      height: '100px',
      background: 'linear-gradient(90deg, #673ab7, #7e57c2)',
      padding: '20px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '28px',
      fontWeight: 'bold',
    },
    tableContainer: {
      width: '90%',
      margin: '40px auto',
      backgroundColor: '#fff',
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      overflowX: 'auto',
    },
    tableHeader: {
      backgroundColor: '#512da8',
      color: 'white',
      fontSize: '18px',
      textAlign: 'left',
      padding: '12px',
    },
    tableRow: {
      borderBottom: '1px solid #ddd',
      textAlign: 'left',
    },
    studentName: {
      fontSize: '16px',
      fontWeight: 'bold',
    },
    // status: (uploaded) => ({
    //   color: uploaded ? '#4caf50' : '#f44336',
    //   fontWeight: 'bold',
    //   textAlign: 'center',
    // }),
    downloadButton: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#4caf50',
      color: 'white',
      borderRadius: '5px',
      padding: '8px 12px',
      cursor: 'pointer',
      border: 'none',
      fontSize: '14px',
      textAlign: 'center',
    },
    icon: {
      marginLeft: '8px',
    },
    noFile: {
      fontStyle: 'italic',
      color: '#757575',
      textAlign: 'center',
    },
    tableCell: {
      padding: '15px',
    },
    responsiveTable: {
      width: '100%',
      borderCollapse: 'collapse',
      overflowX: 'auto',
      minWidth: '600px', // Ensures the table is wide enough on smaller screens
    },
  };

  const AddRow = ({ index, rollNo, name, uploaded, fileUrl }) => (
    <tr style={styles.tableRow}>
      <td style={styles.tableCell}>{index + 1}</td>
      <td style={styles.tableCell}>{rollNo}</td>
      <td style={styles.tableCell}>
        <span style={styles.studentName}>{name}</span>
      </td>
      <td style={styles.tableCell}>
        {/* {uploaded ? ( */}
          <a href={fileUrl} style={styles.downloadButton} download>
            Download <FiDownload style={styles.icon} />
          </a>
        {/* ) : (
          <span style={styles.noFile}>No file uploaded</span>
        )} */}
      </td>
      <td style={styles.tableCell}>
        <span >
           Uploaded
        </span>
      </td>
    </tr>
  );

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error fetching uploaded assignments: {error.message}</p>;

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Uploaded Assignments</h1>
      <div style={styles.tableContainer}>
        <table style={styles.responsiveTable}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>#</th>
              <th style={styles.tableHeader}>Roll No.</th>
              <th style={styles.tableHeader}>Student Name</th>
              <th style={styles.tableHeader}>Action</th>
              <th style={styles.tableHeader}>Status</th>
            </tr>
          </thead>
          <tbody>
            {files.map((fileData, index) => (
              <AddRow
                key={index}
                index={index}
                rollNo={fileData.student.enroll}
                name={fileData.student.name}
                uploaded={fileData.uploaded}
                fileUrl={fileData.upload?.photo} 
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UploadedFiles;
