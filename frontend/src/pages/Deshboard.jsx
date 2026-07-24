import React from "react";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { FaUserGraduate, FaTasks, FaChartLine, FaAward, FaArrowUp, FaArrowDown } from "react-icons/fa";
import { MdAssignment, MdTrendingUp } from "react-icons/md";
import { useStudentuploadassignmentcountQuery, useSubjectQuery } from "../redux/api/assignmentapi";
import { useSelector } from "react-redux";

Chart.register(...registerables);

const StudentAnalyticsDashboard = () => {
  const { section } = useSelector(state => state?.user?.user?.user.academicDetails)
  const ids = useSelector(state => state?.user?.user?.user?._id);
  const semester = useSelector(state => state?.user?.user?.user?.academicDetails.grade);
  
  const { data, isLoading } = useSubjectQuery({ section, semester });
  const { data: uploadCount } = useStudentuploadassignmentcountQuery({ ids, semester });
  console.log(uploadCount)  
  const pendingAssignments = data?.totalassignment - uploadCount?.totalassignmentcomplete || 0;
  const completedAssignments = uploadCount?.totalassignmentcomplete || 0;
  
  const attendanceData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [
      {
        label: "Attendance (%)",
        data: [85, 90, 92, 88, 94],
        backgroundColor: "rgba(79, 70, 229, 0.8)",
        borderColor: "rgba(79, 70, 229, 1)",
        borderWidth: 1,
        borderRadius: 6,
        barPercentage: 0.6,
      },
    ],
  };

  const gradesData = {
    labels: ["Math", "Science", "History", "English", "IT"],
    datasets: [
      {
        label: "Grades",
        data: [85, 89, 91, 87, 90],
        backgroundColor: [
          "rgba(79, 70, 229, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(236, 72, 153, 0.8)"
        ],
        borderColor: [
          "rgba(79, 70, 229, 1)",
          "rgba(59, 130, 246, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(245, 158, 11, 1)",
          "rgba(236, 72, 153, 1)"
        ],
        borderWidth: 1,
        hoverOffset: 4
      },
    ],
  };

  const progressData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
    datasets: [
      {
        label: "Performance",
        data: [70, 75, 80, 82, 88, 90],
        fill: true,
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        borderColor: "rgba(79, 70, 229, 1)",
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "rgba(79, 70, 229, 1)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 16,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        cornerRadius: 6,
        displayColors: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          drawBorder: false,
          color: 'rgba(226, 232, 240, 0.7)'
        },
        ticks: {
          font: {
            size: 12
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12
          }
        }
      }
    }
  };
  
  const doughnutOptions = {
    ...chartOptions,
    cutout: '70%',
    plugins: {
      ...chartOptions.plugins,
      legend: {
        ...chartOptions.plugins.legend,
        position: 'right'
      }
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Loading dashboard data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-xl shadow-lg mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Student Analytics Dashboard</h1>
              <p className="text-indigo-100 mt-1">Academic performance overview for {semester} semester</p>
            </div>
            <div className="mt-4 md:mt-0 bg-white bg-opacity-20 px-4 py-2 rounded-lg">
              <p className="text-white font-medium">Current Section: <span className="font-bold">{section}</span></p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 border-l-4 border-indigo-600">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Overall Attendance</p>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">91%</h3>
                <div className="flex items-center mt-2 text-sm">
                  <FaArrowUp className="text-green-500 mr-1" />
                  <span className="text-green-500 font-medium">3%</span>
                  <span className="text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <FaUserGraduate className="text-2xl text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Assignments</p>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{completedAssignments} / {data?.totalassignment}</h3>
                <div className="flex items-center mt-2 text-sm">
                  <span className="text-gray-500">
                    {pendingAssignments > 0 ? (
                      <span className="text-amber-500 font-medium">{pendingAssignments} pending</span>
                    ) : (
                      <span className="text-green-500 font-medium">All complete</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <MdAssignment className="text-2xl text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Overall Grades</p>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">88%</h3>
                <div className="flex items-center mt-2 text-sm">
                  <MdTrendingUp className="text-green-500 mr-1" />
                  <span className="text-green-500 font-medium">B+</span>
                  <span className="text-gray-500 ml-1">average grade</span>
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <FaChartLine className="text-2xl text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 border-l-4 border-purple-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Achievements</p>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">3 Awards</h3>
                <div className="flex items-center mt-2 text-sm">
                  <span className="text-gray-500">This semester</span>
                </div>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <FaAward className="text-2xl text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Attendance Analysis */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">Monthly Attendance</h2>
              <div className="bg-indigo-100 text-indigo-800 text-xs font-medium px-3 py-1 rounded-full">Last 5 Months</div>
            </div>
            <div className="h-72">
              <Bar data={attendanceData} options={chartOptions} />
            </div>
          </div>

          {/* Grades Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">Subject Performance</h2>
              <div className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">Current Semester</div>
            </div>
            <div className="h-72">
              <Doughnut data={gradesData} options={doughnutOptions} />
            </div>
          </div>
        </div>

        {/* Performance Over Time */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800">Academic Progress</h2>
            <div className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">Weekly Tracking</div>
          </div>
          <div className="h-72">
            <Line data={progressData} options={{...chartOptions, interaction: { mode: 'index', intersect: false }}} />
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-white p-4 rounded-xl shadow-md text-center">
          <p className="text-gray-500 text-sm">Data last updated: Today at {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};

export default StudentAnalyticsDashboard;