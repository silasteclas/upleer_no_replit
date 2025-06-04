import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function useAuth() {
  const [publicUser, setPublicUser] = useState(null);
  const [publicLoading, setPublicLoading] = useState(true);
  
  // Check if we're on public domain
  const isPublicDomain = window.location.hostname === "prompt-flow-adm64.replit.app" || 
                        window.location.hostname.includes("replit.app");

  // For public domain, use localStorage auth
  useEffect(() => {
    if (isPublicDomain) {
      const isLoggedIn = localStorage.getItem('upleer_public_auth') === 'true';
      const userData = localStorage.getItem('upleer_user');
      
      if (isLoggedIn && userData) {
        try {
          setPublicUser(JSON.parse(userData));
        } catch (error) {
          localStorage.removeItem('upleer_public_auth');
          localStorage.removeItem('upleer_user');
        }
      }
      setPublicLoading(false);
    }
  }, [isPublicDomain]);

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !isPublicDomain, // Only run for non-public domains
  });

  if (isPublicDomain) {
    return {
      user: publicUser,
      isLoading: publicLoading,
      isAuthenticated: !!publicUser,
    };
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
