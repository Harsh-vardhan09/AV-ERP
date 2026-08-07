import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditStudent from '../../../modules/admissions/pages/EditStudent';

const EditStudentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/admin/students/all');
  };

  return (
    <div className="p-4">
      <EditStudent studentId={id} onClose={handleClose} />
    </div>
  );
};

export default EditStudentPage;
