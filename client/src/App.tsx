import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Products from "@/pages/products";
import Sales from "@/pages/sales";
import Settings from "@/pages/settings";
import Integrations from "@/pages/integrations";
import IntegrationForm from "@/pages/integration-form";
import IntegrationLogs from "@/pages/integration-logs";
import ProductView from "@/pages/product-view";
import ProductEdit from "@/pages/product-edit";
import SaleDetails from "@/pages/sale-details";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminProducts from "@/pages/admin-products";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith('/admin');
  
  // Only use author auth for non-admin routes
  const authData = isAdminRoute ? { isAuthenticated: true, isLoading: false } : useAuth();
  const { isAuthenticated, isLoading } = authData;

  return (
    <Switch>
      {/* Admin routes - completely separate from author authentication */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/*">
        {() => {
          window.location.href = '/admin/dashboard';
          return null;
        }}
      </Route>
      
      {/* Author routes */}
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/upload" component={Upload} />
          <Route path="/products" component={Products} />
          <Route path="/products/:id" component={ProductView} />
          <Route path="/products/:id/edit" component={ProductEdit} />
          <Route path="/sales" component={Sales} />
          <Route path="/sales/:id" component={SaleDetails} />
          <Route path="/settings" component={Settings} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/integrations/new" component={IntegrationForm} />
          <Route path="/integrations/logs" component={IntegrationLogs} />
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
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;