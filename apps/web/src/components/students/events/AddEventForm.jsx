import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
    setMainEvent,
    setImage,
    setTitle,
    setDate,
    setDescription,
    setCoordinatorType,
    setStudentCoordinator,
    setFacultyCoordinator,
    setStudentContact,
    setFacultyContact,
    resetForm,
} from '../../../redux/reducers/FormSlice';

const AddEventForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const {
        isMainEvent,
        image,
        title,
        date,
        description,
        coordinatorType,
        studentCoordinator,
        facultyCoordinator,
        studentContact,
        facultyContact,
    } = useSelector((state) => state.form);

    // Handle adding new coordinator fields
    const addStudentCoordinatorField = () => {
        dispatch(setStudentCoordinator([...studentCoordinator, '']));
        dispatch(setStudentContact([...studentContact, '']));
    };
    const addFacultyCoordinatorField=()=>{
    
        dispatch(setStudentCoordinator([...studentCoordinator, '']));
            dispatch(setStudentContact([...studentContact, '']));
    }
    const deleteStudentCoordinator = () => {
        if (studentCoordinator.length > 0 && studentContact.length > 0) {
            dispatch(setStudentCoordinator(studentCoordinator.slice(0, -1)));
            dispatch(setStudentContact(studentContact.slice(0, -1)));
        } else {
            toast.error("No more Student Coordinators to delete.");
        }
    };
    const deleteFacultyCoordinator = () => {
        if (facultyCoordinator.length > 0 && facultyContact.length > 0) {
            dispatch(setFacultyCoordinator(facultyCoordinator.slice(0, -1)));
            dispatch(setFacultyContact(facultyContact.slice(0, -1)));
        } else {
            toast.error("No more Faculty Coordinators to delete.");
        }
    };


    const handleSubmit = async (e) => {
            e.preventDefault();
  const formData = new FormData();
  formData.append('isMainEvent', isMainEvent);
  formData.append('title', title);
  formData.append('date', date);
  formData.append('description', description);
  formData.append('coordinatorType', coordinatorType);
   
  studentCoordinator.forEach((coordinator, index) => {
    formData.append(`studentCoordinator[${index}]`, coordinator);
  });
  studentContact.forEach((contact, index) => {
    formData.append(`studentContact[${index}]`, contact);
  });
  facultyCoordinator.forEach((coordinator, index) => {
    formData.append(`facultyCoordinator[${index}]`, coordinator);
  });
  facultyContact.forEach((contact, index) => {
    formData.append(`facultyContact[${index}]`, contact);
  });
  
  // Append the image file separately
  if (image) {
    formData.append('image', image);
  }
//   for (let [key, value] of formData.entries()) {
//     console.log(`${key}:`, value);
// }
            try {
                const response = await fetch(`${import.meta.env.VITE_PORT}/events/addevent`, {
                    method: 'POST',
                    body: formData,
                });
        
                const data = await response.json();
        
                if (response.ok) {
                    // Handle success
                    toast.success("Event Added Sucessfully")
                    // navigate(`/Events`);
                } else {
                    // Handle errors
                    console.error('Error adding event:', data.message);
                    toast.error("Error in adding Event");
                }
                dispatch(resetForm());
            } catch (error) {
                console.error('Error:', error);
                toast.info('Something went wrong. Please try again later.');
            }
        
        dispatch(resetForm());
        navigate(`/events`);
    };

    return (
        <div className="bg-white  rounded-lg p-4  h-screen max-w-4xl  mx-auto">
            <ToastContainer/>
            <form onSubmit={handleSubmit}>
                <fieldset className="border-black-300 border-[2px] p-3">
                    <legend className="text-xl font-bold mb-4 ml-20">Add an Event</legend>

                    {/* Toggle Main/Sub Event */}
                    <span
                        className={`font-semibold transition-transform ${
                            isMainEvent ? 'translate-x-8 text-green-500' : 'text-yellow-400 -translate-x-8'
                        }`}
                    >
                        {isMainEvent ? 'Main Event' : 'SUB Event'}
                    </span>
                    <button
                        type="button"
                        onClick={() => dispatch(setMainEvent(!isMainEvent))}
                        className={`relative flex items-center p-2 w-36 h-10 rounded-full transition-colors ${
                            isMainEvent ? 'bg-green-500' : 'bg-yellow-300'
                        }`}
                    >
                        <div
                            className={`absolute w-16 h-8 bg-white rounded-full shadow-md transition-transform ${
                                isMainEvent ? 'translate-x-16' : 'translate-x-0'
                            }`}
                        />
                    </button>

                    {/* Image Upload */}
                    <div className="mb-4">
                        <label htmlFor="image" className="block text-gray-700">Upload Image:</label>
                        <input
                            type="file"
                            id="image"
                            accept="image/*"
                            onChange={(e) => dispatch(setImage(e.target.files[0]))}
                            className="mt-1 block w-full border border-gray-300 rounded-lg p-2"
                            required
                        />
                    </div>

                    {/* Title */}
                    <div className="mb-4">
                        <label htmlFor="title" className="block text-gray-700">Title:</label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => dispatch(setTitle(e.target.value))}
                            className="mt-1 block w-full border border-gray-300 rounded-lg p-2"
                            placeholder="Enter event title"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                        <label htmlFor="description" className="block text-gray-700">Description:</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => dispatch(setDescription(e.target.value))}
                            className="mt-1 block w-full border border-gray-300 rounded-lg p-2"
                            placeholder="Enter event description"
                            rows="6"
                            required
                        />
                    </div>

                    {/* Date */}
                  
                        <div className="mb-4">
                            <label htmlFor="date" className="block text-gray-700">Date:</label>
                            <input
                                type="date"
                                id="date"
                                value={date}
                                onChange={(e) => dispatch(setDate(e.target.value))}
                                className="mt-1 block w-full border border-gray-300 rounded-lg p-2"
                                required
                            />
                        </div>
                        {!isMainEvent && (        
                                        <div>
                    {/* Coordinator Type */}
                    <div className="mb-4">
                        <fieldset className="border border-gray-300 rounded-lg p-2">
                            <legend className="text-gray-700 mb-2">Coordinator Type:</legend>
                            <label className="block">
                                <input
                                    type="radio"
                                    name="coordinatorType"
                                    value="student"
                                    checked={coordinatorType === 'student'}
                                    onChange={(e) => dispatch(setCoordinatorType(e.target.value))}
                                    className="mr-2"
                                />
                                Student Coordinator
                            </label>
                            <label className="block">
                                <input
                                    type="radio"
                                    name="coordinatorType"
                                    value="faculty"
                                    checked={coordinatorType === 'faculty'}
                                    onChange={(e) => dispatch(setCoordinatorType(e.target.value))}
                                    className="mr-2"
                                />
                                Faculty Coordinator
                            </label>
                        </fieldset>
                    </div>

                    {/* Student Coordinators */}
                    {coordinatorType === 'student' && (
                        <div>

                            {studentCoordinator.map((value, index) => (
                                <div key={index} className="mb-4">
                                    <label htmlFor={`studentCoordinator-${index}`} className="block text-gray-700">
                                        Student Coordinator {index + 1} Name:
                                    </label>
                                    <input
                                        type="text"
                                        id={`studentCoordinator-${index}`}
                                        value={value}
                                        onChange={(e) =>
                                            dispatch(
                                                setStudentCoordinator(
                                                    studentCoordinator.map((item, i) =>
                                                        i === index ? e.target.value : item
                                                    )
                                                )
                                            )
                                        }
                                        className="mt-1 block w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="Enter student coordinator name"
                                        required
                                    />

                                    <label htmlFor={`studentContact-${index}`} className="block text-gray-700 mt-2">
                                        Student Coordinator {index + 1} Contact:
                                    </label>
                                    <input
                                        type="text"
                                        id={`studentContact-${index}`}
                                        value={studentContact[index] || ''}
                                        onChange={(e) =>
                                            dispatch(
                                                setStudentContact(
                                                    studentContact.map((item, i) =>
                                                        i === index ? e.target.value : item
                                                    )
                                                )
                                            )
                                        }
                                        className="mt-1 block w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="Enter student coordinator contact"
                                        required
                                    />
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addStudentCoordinatorField}
                                className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 m-5"
                            >
                                Add Student Coordinator
                            </button>
                            <button
                                type="button"
                                onClick={deleteStudentCoordinator}
                                className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 m-5"
                            >
                                Delete Student Coordinator
                            </button>
                        </div>
                    )}

                    {/* Faculty Coordinators */}
                    {coordinatorType === 'faculty' && (
                        <div>
                            {facultyCoordinator.map((value, index) => (
                                <div key={index} className="mb-4">
                                    <label htmlFor={`facultyCoordinator-${index}`} className="block text-gray-700">
                                        Faculty Coordinator {index + 1} Name:
                                    </label>
                                    <input
                                        type="text"
                                        id={`facultyCoordinator-${index}`}
                                        value={value}
                                        onChange={(e) =>
                                            dispatch(
                                                setFacultyCoordinator(
                                                    facultyCoordinator.map((item, i) =>
                                                        i === index ? e.target.value : item
                                                    )
                                                )
                                            )
                                        }
                                        className="mt-1 block w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="Enter faculty coordinator name"
                                        required
                                    />

                                    <label htmlFor={`facultyContact-${index}`} className="block text-gray-700 mt-2">
                                        Faculty Coordinator {index + 1} Contact:
                                    </label>
                                    <input
                                        type="text"
                                        id={`facultyContact-${index}`}
                                        value={facultyContact[index] || ''}
                                        onChange={(e) =>
                                            dispatch(
                                                setFacultyContact(
                                                    facultyContact.map((item, i) =>
                                                        i === index ? e.target.value : item
                                                    )
                                                )
                                            )
                                        }
                                        className="mt-1 block w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="Enter faculty coordinator contact"
                                        required
                                    />
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addFacultyCoordinatorField}
                                className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 m-5"
                            >
                                Add Faculty Coordinator
                            </button>
                            <button
                                type="button"
                                onClick={deleteFacultyCoordinator}
                                className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 m-5"
                            >
                                Delete Faculty Coordinator
                            </button>
                        </div>
                    )}
                 </div>         )}
                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                    >
                        Add Event
                    </button>
                </fieldset>
            </form>
        </div>
    );
};

export default AddEventForm;