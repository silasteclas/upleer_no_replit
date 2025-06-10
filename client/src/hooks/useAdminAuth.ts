import { useQuery } from "@tanstack/react-query";

export function useAdminAuth() {
  const { data: adminUser, isLoading, error } = useQuery({
    queryKey: ["/api/admin/user"],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  console.log("🔐 useAdminAuth status:", { adminUser, isLoading, error, isAuthenticated: !!adminUser });

  return {
    adminUser,
    isLoading,
    isAuthenticated: !!adminUser,
  };
}