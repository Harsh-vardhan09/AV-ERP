import React, { useState } from 'react';

function AdminTt() {
    const [entries, setEntries] = useState([createEmptyEntry()]);

    function createEmptyEntry() {
        return {
            name: '',
            subject: '',
            startTime: '',
            endTime: '',
            day: '',
        };
    }

    const handleChange = (index, event) => {
        const { name, value } = event.target;
        const newEntries = [...entries];
        newEntries[index][name] = value;
        setEntries(newEntries);
    };

    const handleAddEntry = () => {
        setEntries([...entries, createEmptyEntry()]);
    };

    const handleRemoveEntry = (index) => {
        const newEntries = entries.filter((_, i) => i !== index);
        setEntries(newEntries);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log(entries);
    };

    return (
        <>
            <style>{`
                body {
                    font-family: 'Arial', sans-serif;
                    background-color: #f4f7f8;
                    color: #333;
                }

                .form-container {
                    background-color: #ffffff;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    max-width: 600px;
                    margin: 40px auto;
                }

                h1 {
                    text-align: center;
                    margin-bottom: 20px;
                    color: #4CAF50;
                }

                .entry-card {
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 15px;
                    transition: box-shadow 0.3s ease;
                }

                .entry-card:hover {
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                }

                .input {
                    margin-bottom: 15px;
                }

                .input label {
                    display: block;
                    margin-bottom: 5px;
                }

                .input input,
                .input select {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                }

                button {
                    padding: 10px 15px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.3s ease;
                }

                .add-btn {
                    background-color: #4CAF50;
                    color: white;
                    margin-right: 10px;
                }

                .add-btn:hover {
                    background-color: #45a049;
                }

                .submit-btn {
                    background-color: #007BFF;
                    color: white;
                }

                .submit-btn:hover {
                    background-color: #0056b3;
                }

                .remove-btn {
                    background-color: #f44336;
                    color: white;
                    margin-top: 10px;
                }

                .remove-btn:hover {
                    background-color: #d32f2f;
                }
            `}</style>
            <div className="form-container">
                <h1>Teacher Timetable Entry</h1>
                <form onSubmit={handleSubmit}>
                    {entries.map((entry, index) => (
                        <div key={index} className='entry-card'>
                            <h3>Entry {index + 1}</h3>
                            <div className='input'>
                                <label htmlFor={`name-${index}`}>Teacher Name</label>
                                <input
                                    type='text'
                                    id={`name-${index}`}
                                    name='name'
                                    value={entry.name}
                                    onChange={(e) => handleChange(index, e)}
                                    required
                                />
                            </div>

                            <div className='input'>
                                <label htmlFor={`subject-${index}`}>Subject</label>
                                <input
                                    type='text'
                                    id={`subject-${index}`}
                                    name='subject'
                                    value={entry.subject}
                                    onChange={(e) => handleChange(index, e)}
                                    required
                                />
                            </div>

                            <div className='input'>
                                <label htmlFor={`start-time-${index}`}>Start Time</label>
                                <input
                                    type='time'
                                    id={`start-time-${index}`}
                                    name='startTime'
                                    value={entry.startTime}
                                    onChange={(e) => handleChange(index, e)}
                                    required
                                />
                            </div>

                            <div className='input'>
                                <label htmlFor={`end-time-${index}`}>End Time</label>
                                <input
                                    type='time'
                                    id={`end-time-${index}`}
                                    name='endTime'
                                    value={entry.endTime}
                                    onChange={(e) => handleChange(index, e)}
                                    required
                                />
                            </div>

                            <button type='button' className='remove-btn' onClick={() => handleRemoveEntry(index)}>Remove Entry</button>
                        </div>
                    ))}
                    <button type='button' className='add-btn' onClick={handleAddEntry}>Add More</button>
                    <button type='submit' className='submit-btn'>Submit</button>
                </form>
            </div>
        </>
    );
}

export default AdminTt;
