import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';

// Register necessary components
Chart.register(ArcElement, Tooltip, Legend);

const Charts = () => {
  const data = {
    labels: ['Present', 'Absent', 'Leave '],
    datasets: [
      {
        label: 'Attendance',
        data: ["50","35","15"],
        backgroundColor: ['rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 205, 86)'],
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#333', // Customize label color if needed
        },
      },
      tooltip: {
        enabled: true, // Ensure tooltips are enabled
        callbacks: {
          label: function (tooltipItem) {
            return `${tooltipItem.label}: ${tooltipItem.raw}`;
          },
        },
      },
    },
  };

  return (
    <div className='h-auto w-80 bg-white ml-8 mt-1 rounded-lg flex flex-col shadow-xl transition-shadow duration-300 ease-out overflow-hidden text-gray-800'>
      <div className='h-16 w-full border-b-2 flex items-center justify-center'>
        <h3 className='text-lg font-semibold'>Attendance Performance</h3>
      </div>
      <div className='flex-1 p-4'>
        <div className='h-full w-full flex items-center justify-center'>
          <Doughnut data={data} options={options} />
        </div>
      </div>
    </div>
  );
};

export default Charts;
