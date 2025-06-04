import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Products from "@/pages/products";
import ProductView from "@/pages/product-view";
import ProductEdit from "@/pages/product-edit";
import Sales from "@/pages/sales";
import SaleDetails from "@/pages/sale-details";
import Settings from "@/pages/settings";
import Integrations from "@/pages/integrations";
import IntegrationForm from "@/pages/integration-form";
import IntegrationLogs from "@/pages/integration-logs";
import PublicLogin from "@/pages/public-login";
import SimpleDashboard from "@/pages/simple-dashboard";
import PublicApp from "@/pages/public-app";
import UpleerDemo from "@/pages/upleer-demo";

function Router() {
  const isPublicDomain = window.location.hostname === "prompt-flow-adm64.replit.app" || 
                        window.location.hostname === "127.0.0.1" || 
                        window.location.hostname.includes("replit.app");

  // For public domain, use simple auth system
  if (isPublicDomain) {
    return <PublicApp />;
  }

  // For development domain, use full auth system
  const { isAuthenticated, isLoading, user } = useAuth();

  // Debug logs for authentication state
  console.log("Auth State:", { isAuthenticated, isLoading, user, hostname: window.location.hostname });

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Login routes */}
      <Route path="/login" component={isPublicDomain ? PublicLogin : Login} />
      <Route path="/register" component={Register} />
      
      {/* Simple dashboard for public domain */}
      {isPublicDomain && <Route path="/dashboard" component={SimpleDashboard} />}
      
      {/* Protected routes - only show if authenticated */}
      {isAuthenticated ? (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/upload" component={Upload} />
          <Route path="/products" component={Products} />
          <Route path="/products/:id" component={ProductView} />
          <Route path="/products/:id/edit" component={ProductEdit} />
          <Route path="/sales" component={Sales} />
          <Route path="/sales/:id" component={SaleDetails} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/integrations/new" component={IntegrationForm} />
          <Route path="/integrations/:id/edit" component={IntegrationForm} />
          <Route path="/integrations/logs" component={IntegrationLogs} />
          <Route path="/settings" component={Settings} />
        </>
      ) : (
        /* Public routes - show if not authenticated */
        <>
          <Route path="/" component={isPublicDomain ? PublicApp : Landing} />
        </>
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
