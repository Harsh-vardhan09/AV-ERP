// QuickAccess.js
import React from 'react';

const QuickAccess = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <div className="bg-white shadow-md rounded-lg p-4 text-center">
                <img src="/images/classroom.png" alt="Classroom" className="mx-auto" />
                <h2 className="font-semibold">Classroom</h2>
            </div>
            <div className="bg-white shadow-md rounded-lg p-4 text-center">
                <img src="/images/library.png" alt="Library" className="mx-auto" />
                <h2 className="font-semibold">Library</h2>
            </div>
            <div className="bg-white shadow-md rounded-lg p-4 text-center">
                <img src="https://www.univariety.com/blog/wp-content/uploads/2021/01/How-to-reduce-exam-stress-Helpful-tips-from-counsellors.jpg" alt="Exams" className="mx-auto" />
                <h2 className="font-semibold">Exams</h2>
            </div>
            <div className="bg-white shadow-md rounded-lg p-4 text-center">
                <img src="/images/events.png" alt="Events" className="mx-auto" />
                <h2 className="font-semibold">Events</h2>
            </div>
        </div>
    );
};

export default QuickAccess;
