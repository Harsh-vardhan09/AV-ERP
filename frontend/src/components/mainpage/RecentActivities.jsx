// RecentActivities.js
import React from 'react';

const RecentActivities = () => {
    const activities = [
        "Attended Guest Lecture on AI",
        "Submitted Assignment on Web Development",
        "Registered for the Annual Sports Meet",
        "Joined Study Group for Mathematics"
    ];

    return (
        <div className="p-4">
            <h2 className="font-bold text-lg">Recent Activities</h2>
            <ul className="list-disc ml-5">
                {activities.map((activity, index) => (
                    <li key={index} className="text-gray-700">{activity}</li>
                ))}
            </ul>
        </div>
    );
};

export default RecentActivities;
