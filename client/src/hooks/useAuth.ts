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
      try {
        await fetch("/api/auth/logout", {
          method: "GET",
          credentials: "include",
        });
      } catch (error) {
        // Even if fetch fails, we'll proceed with logout
        console.log("Logout request completed");
      }
    },
    onSuccess: () => {
      // Clear all queries from cache
      queryClient.clear();
      // Specifically invalidate the user query
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
      // Force a page reload to clear any remaining state
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: Error) => {
      // Even on error, clear the session and reload
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/user"], null);
      window.location.reload();
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
