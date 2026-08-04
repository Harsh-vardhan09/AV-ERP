
import React from 'react';

export function GroupEventForm({ maxMembers }) {
    return (
        <>
            <div className="flex justify-center mt-8">
                <form action="#" className="flex flex-col border rounded-lg shadow-lg p-6 w-full max-w-md bg-white">
                    <h2 className="text-2xl font-semibold text-center mb-4">Student Event Registration</h2>
                    <div className="flex flex-col">
                        <label htmlFor="name" className="m-2">Student Name</label>
                        <input type="text" placeholder="Your name" id="name" className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

                        <label htmlFor="sem" className="m-2">Current Semester</label>
                        <input type="text" placeholder="Your current sem" id="sem" className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

                        <label htmlFor="rollno" className="m-2">Enrollment No.</label>
                        <input type="text" placeholder="Your enrollment number" id="rollno" className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

                        <label htmlFor="collagename" className="m-2">College Name</label>
                        <input type="text" placeholder="Your college name" id="collagename" className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

                        <label htmlFor="mobileNo" className="m-2">Phone No.</label>
                        <input type="text" placeholder="Your phone no" id="mobileNo" className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

                        <label htmlFor="Emailid" className="m-2">Email ID</label>
                        <input type="email" placeholder="Your Email" id="Emailid" className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

                        <hr className="border-black" />

                        <h2 className="text-2xl font-semibold text-center mb-4 mt-2">Members Details</h2>

                        {/* Loop to generate member fields based on maxMembers */}
                        {[...Array(5)].map((_, index) => (
                            <div key={index} className="flex flex-col">
                                <label htmlFor={`memberName${index}`} className="m-2">Student Name</label>
                                <input
                                    type="text"
                                    placeholder="Your name"
                                    id={`memberName${index}`}
                                    className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />

                                <label htmlFor={`memberRollNo${index}`} className="m-2">Enrollment No.</label>
                                <input
                                    type="text"
                                    placeholder="Your enrollment number"
                                    id={`memberRollNo${index}`}
                                    className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />

                                <label htmlFor={`memberEmail${index}`} className="m-2">Email ID</label>
                                <input
                                    type="email"
                                    placeholder="Your Email"
                                    id={`memberEmail${index}`}
                                    className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <hr className="border-black" />
                            </div>
                        ))}

                        <button type="submit" className="bg-blue-500 text-white w-full h-12 rounded-md mt-4 hover:bg-blue-600 transition duration-200">Submit</button>
                    </div>
                </form>
            </div>
        </>
    );
}
