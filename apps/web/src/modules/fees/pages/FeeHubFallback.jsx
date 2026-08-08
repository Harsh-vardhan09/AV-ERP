import React from 'react';
import { MdTune } from 'react-icons/md';

const FeeHubFallback = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
    <MdTune size={40} className="mx-auto text-gray-200 mb-3" />
    <p className="text-gray-400 text-sm">Select a tab from the navigation above.</p>
  </div>
);

export default FeeHubFallback;
