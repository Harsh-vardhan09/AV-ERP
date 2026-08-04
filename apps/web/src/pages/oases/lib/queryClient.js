// ══════════════════════════════════════════════════════════════════
// OASES — React Query Client
// Scoped to the OASES module. Import this queryClient (and wrap
// the OASES subtree with its own <QueryClientProvider>) to keep
// OASES cache isolated from legacy Redux state.
// ══════════════════════════════════════════════════════════════════
import { QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const oasesQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 minutes
      gcTime:    1000 * 60 * 10,  // 10 minutes
      retry: (failureCount, error) => {
        // Never retry on auth/permission errors
        if (error?.response?.status === 401) return false;
        if (error?.response?.status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        toast.error(
          error?.response?.data?.error || 'Something went wrong'
        );
      },
    },
  },
});

export default oasesQueryClient;
