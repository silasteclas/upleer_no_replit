import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const { toast } = useToast();
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Clear local state immediately
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // Make logout request in background
      fetch("/api/auth/logout", {
        method: "GET",
        credentials: "include",
      }).catch(() => {
        // Ignore errors - we're logging out anyway
      });
    },
    onSettled: () => {
      // Always clear state and redirect, regardless of success/error
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/user"], null);
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
      
      // Redirect to home page
      window.location.href = "/";
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}
