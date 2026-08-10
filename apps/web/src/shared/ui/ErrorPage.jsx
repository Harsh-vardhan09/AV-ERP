import React from 'react';
import { useRouteError } from 'react-router-dom';

export default function ErrorPage() {
  const error = useRouteError();
  // Log full error to console for debugging
  console.error('Route error caught by ErrorPage:', error);

  const message = error?.statusText || error?.message || (error && JSON.stringify(error)) || 'An unexpected error occurred.';
  const status = error?.status || (error && error.statusText) || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-2xl w-full bg-white shadow rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl text-rose-600">⚠️</div>
          <div>
            <h2 className="text-xl font-semibold mb-1">Something went wrong{status ? ` (${status})` : ''}</h2>
            <p className="text-sm text-slate-600 mb-4">We ran into an issue while loading this page. Details are shown below for debugging.</p>
            <div className="bg-slate-100 p-3 rounded text-sm text-slate-800 whitespace-pre-wrap">{message}</div>
            <div className="mt-4 text-xs text-slate-500">Check the browser console for full error details.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
