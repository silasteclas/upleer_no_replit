import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAdminAuth() {
  const { data: adminUser, isLoading, error } = useQuery({
    queryKey: ["/api/admin/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  console.log("🔐 useAdminAuth status:", { adminUser, isLoading, error, isAuthenticated: !!adminUser });

  return {
    adminUser,
    isLoading,
    isAuthenticated: !!adminUser,
  };
}