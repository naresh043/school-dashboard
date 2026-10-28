import { useQuery } from "@tanstack/react-query";
import { currentUserQueryKey, fetchCurrentUser } from "./authApi.js";

export function useCurrentUser() {
  return useQuery({ queryKey: currentUserQueryKey, queryFn: fetchCurrentUser, retry: false, staleTime: 30000 });
}
