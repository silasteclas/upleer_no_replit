import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Product } from "@shared/schema";

export default function Products() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

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

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: isAuthenticated,
  });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "published":
        return "Publicado";
      case "approved":
        return "Aprovado";
      case "pending":
        return "Pendente";
      case "rejected":
        return "Rejeitado";
      case "archived":
        return "Arquivado";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Meus Produtos" 
        subtitle="Gerencie suas apostilas e acompanhe o status" 
      />
      <Sidebar />
      <main className="ml-64 pt-32 p-6 min-h-screen overflow-auto">
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {products?.length || 0} produtos cadastrados
              </h3>
            </div>
            <Link href="/upload">
              <Button className="bg-primary hover:bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Nova Apostila
              </Button>
            </Link>
          </div>

          {productsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando produtos...</p>
            </div>
          ) : !products || products.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum produto cadastrado
              </h3>
              <p className="text-gray-600 mb-6">
                Comece fazendo upload da sua primeira apostila
              </p>
              <Link href="/upload">
                <Button className="bg-primary hover:bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Apostila
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {products.map((product) => (
                <Card 
                  key={product.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setLocation(`/products/${product.id}`)}
                >
                  <div className="aspect-[3/4] bg-gray-100 relative">
                    {product.coverImageUrl ? (
                      <img
                        src={product.coverImageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-gray-400 text-center">
                          <div className="w-6 h-6 bg-gray-200 rounded mx-auto mb-1 flex items-center justify-center text-xs">
                            📚
                          </div>
                          <p className="text-xs">Sem capa</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2">
                    <div className="mb-1">
                      <h3 className="font-medium text-gray-900 truncate text-xs">
                        {product.title}
                      </h3>
                      <Badge className={`${getStatusColor(product.status)} text-xs mt-1`}>
                        {getStatusText(product.status)}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                      <span>{product.pageCount}p</span>
                      <span className="font-medium text-green-600">
                        R$ {(parseFloat(product.salePrice) - parseFloat(product.baseCost)).toFixed(2)}
                      </span>
                    </div>
                    

                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
