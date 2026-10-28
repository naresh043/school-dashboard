import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: (failureCount, error) => error?.response?.status !== 401 && error?.response?.status !== 403 && failureCount < 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
