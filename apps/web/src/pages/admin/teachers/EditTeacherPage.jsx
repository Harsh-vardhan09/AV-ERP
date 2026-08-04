import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditTeacher from '../../admission/EditTeacher';

const EditTeacherPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/admin/teachers/all');
  };

  return (
    <div className="p-4">
      <EditTeacher teacherId={id} onClose={handleClose} />
    </div>
  );
};

export default EditTeacherPage;
