import { Switch, Route } from "wouter";
import { createContext, useContext, useState, ReactNode } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Products from "@/pages/products";
import ProductView from "@/pages/product-view";
import ProductEdit from "@/pages/product-edit";
import Sales from "@/pages/sales";
import Settings from "@/pages/settings";

interface ProfileContextType {
  profileImage: string | null;
  setProfileImage: (image: string | null) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile deve ser usado dentro de um ProfileProvider");
  }
  return context;
}

function ProfileProvider({ children }: { children: ReactNode }) {
  const [profileImage, setProfileImage] = useState<string | null>(null);

  return (
    <ProfileContext.Provider value={{ profileImage, setProfileImage }}>
      {children}
    </ProfileContext.Provider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/upload" component={Upload} />
          <Route path="/products" component={Products} />
          <Route path="/products/:id" component={ProductView} />
          <Route path="/products/:id/edit" component={ProductEdit} />
          <Route path="/sales" component={Sales} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ProfileProvider>
    </QueryClientProvider>
  );
}

export default App;
