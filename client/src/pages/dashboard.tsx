import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsCards from "@/components/dashboard/stats-cards";
import SalesChart from "@/components/dashboard/sales-chart";
import QuickActions from "@/components/dashboard/quick-actions";
import RecentProducts from "@/components/dashboard/recent-products";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Dashboard" 
        subtitle="Acompanhe o desempenho dos seus produtos" 
      />
      <Sidebar />
      <main className="ml-64 pt-20 p-6 min-h-screen overflow-auto">
        <div className="space-y-6">
          <StatsCards />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SalesChart />
            <QuickActions />
          </div>
          
          <RecentProducts />
        </div>
      </main>
    </div>
  );
}
