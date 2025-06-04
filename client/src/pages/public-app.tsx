import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import PublicLogin from "@/pages/public-login";
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
import NotFound from "@/pages/not-found";

export default function PublicApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authStatus = localStorage.getItem('upleer_public_auth');
    setIsLoggedIn(authStatus === 'true');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const authStatus = localStorage.getItem('upleer_public_auth');
      setIsLoggedIn(authStatus === 'true');
    };

    // Listen for localStorage changes
    const interval = setInterval(() => {
      const authStatus = localStorage.getItem('upleer_public_auth');
      if ((authStatus === 'true') !== isLoggedIn) {
        setIsLoggedIn(authStatus === 'true');
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        Carregando...
      </div>
    );
  }

  if (!isLoggedIn) {
    return <PublicLogin />;
  }

  return (
    <Switch>
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
      <Route component={NotFound} />
    </Switch>
  );
}