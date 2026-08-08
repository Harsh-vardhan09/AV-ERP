// OASES module entry point. Wraps the whole OASES tree in its own
// QueryClientProvider so the OASES cache stays isolated from Redux state and
// from the rest of the app.
import React, { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Loader2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import oasesQueryClient from './lib/queryClient';
import { useOasesSocket } from './hooks/useSocket';

const OasesLoader = () => (
  <div className="flex items-center justify-center h-64 text-indigo-400">
    <Loader2 className="w-8 h-8 animate-spin" />
    <span className="ml-3 text-sm">Loading OASES…</span>
  </div>
);

// Inner component so it can call useQueryClient() from inside the provider.
const OasesSocketBridge = () => {
  useOasesSocket(true);
  return null;
};

const OasesHubLayout = () => {
  const isOasesEnabled = useSelector((state) => state?.oasesSettings?.isOasesEnabled ?? false);

  useEffect(() => {
    if (!isOasesEnabled) {
      oasesQueryClient.clear();
    }
  }, [isOasesEnabled]);

  if (!isOasesEnabled) {
    return (
      <div className="p-8 rounded-xl bg-red-50 border border-red-200 text-red-700 text-center mx-auto max-w-2xl mt-10">
        <h2 className="text-lg font-semibold">OASES module is disabled</h2>
        <p className="mt-2 text-sm text-red-600">Enable OASES from School Settings to access evaluation workflows.</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={oasesQueryClient}>
      <OasesSocketBridge />

      <Suspense fallback={<OasesLoader />}>
        <Outlet />
      </Suspense>

      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

export default OasesHubLayout;
