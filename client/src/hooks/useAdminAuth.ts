import { useQuery } from "@tanstack/react-query";

export function useAdminAuth() {
  const { data: adminUser, isLoading } = useQuery({
    queryKey: ["/api/admin/user"],
    retry: false,
  });

  return {
    adminUser,
    isLoading,
    isAuthenticated: !!adminUser,
  };
}