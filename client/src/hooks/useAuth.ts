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
      // Make logout request first
      try {
        await fetch("/api/auth/logout", {
          method: "GET",
          credentials: "include",
        });
      } catch (error) {
        // Continue with logout even if request fails
        console.log("Logout request completed");
      }
    },
    onSuccess: () => {
      // Clear cache and let React handle routing naturally
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/user"], null);
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
    },
    onError: () => {
      // Even on error, clear the session
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/user"], null);
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
