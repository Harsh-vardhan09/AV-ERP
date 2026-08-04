import React from "react";

function Notice() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-6">
          <svg className="w-24 h-24 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Coming Soon!</h1>
        <p className="text-lg text-gray-500">Notice feature is under development.</p>
        <p className="text-sm text-gray-400 mt-2">Stay tuned for updates.</p>
      </div>
    </div>
  );
}

export default Notice;
