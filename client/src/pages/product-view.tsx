import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Edit, FileText, Send, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

export default function ProductView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: product, isLoading: productLoading } = useQuery<Product>({
    queryKey: [`/api/products/${id}`],
    enabled: !!id && isAuthenticated,
  });

  const webhookMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/products/${id}/send-webhook`, "POST");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Webhook enviado com sucesso!",
        description: "Dados do produto enviados para N8N",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar webhook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const simulatePurchaseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/products/${id}/simulate-purchase`, "POST");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Compra simulada com sucesso!",
        description: "Uma nova venda foi criada no sistema",
      });
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/sales-data"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao simular compra",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || productLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Produto não encontrado</h2>
          <p className="text-gray-600 mb-4">O produto que você está procurando não existe.</p>
          <Button onClick={() => setLocation("/products")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Produtos
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Aprovado";
      case "pending":
        return "Pendente";
      case "rejected":
        return "Rejeitado";
      default:
        return "Desconhecido";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setLocation("/products")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Produtos
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Image */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-[3/4] bg-gray-100 relative rounded-t-lg overflow-hidden">
                  {product.coverImageUrl ? (
                    <img
                      src={product.coverImageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-gray-400 text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded mx-auto mb-2 flex items-center justify-center">
                          <FileText className="w-8 h-8" />
                        </div>
                        <p className="text-sm">Sem capa</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex flex-col space-y-2">
                    <div className="flex space-x-2">
                      <Button className="flex-1" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setLocation(`/products/${id}/edit`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => webhookMutation.mutate()}
                      disabled={webhookMutation.isPending}
                      className="w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {webhookMutation.isPending ? "Enviando..." : "Enviar para N8N"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => simulatePurchaseMutation.mutate()}
                      disabled={simulatePurchaseMutation.isPending}
                      className="w-full"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {simulatePurchaseMutation.isPending ? "Processando..." : "Simular Compra"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-2xl">{product.title}</CardTitle>
                  <Badge className={getStatusColor(product.status)}>
                    {getStatusText(product.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sales Stats */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Estatísticas de Vendas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">0</div>
                      <div className="text-sm text-gray-600">Vendas</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">R$ 0,00</div>
                      <div className="text-sm text-gray-600">Receita</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">0%</div>
                      <div className="text-sm text-gray-600">Taxa de conversão</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Informações do Produto</h3>
                    <div className="space-y-2 text-sm">
                      {product.author && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Autor:</span>
                          <span className="font-medium">{product.author}</span>
                        </div>
                      )}
                      {product.coAuthors && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Co-autores:</span>
                          <span className="font-medium">{product.coAuthors}</span>
                        </div>
                      )}
                      {product.genre && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gênero:</span>
                          <span className="font-medium">{product.genre}</span>
                        </div>
                      )}
                      {product.language && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Idioma:</span>
                          <span className="font-medium">{product.language}</span>
                        </div>
                      )}
                      {product.targetAudience && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Público-alvo:</span>
                          <span className="font-medium">{product.targetAudience}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Páginas:</span>
                        <span className="font-medium">{product.pageCount}</span>
                      </div>
                      {product.isbn && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">ISBN:</span>
                          <span className="font-medium">{product.isbn}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Precificação</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Custo base:</span>
                        <span className="font-medium">R$ {product.baseCost}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Preço de venda:</span>
                        <span className="font-medium text-lg text-primary">
                          R$ {product.salePrice}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Criado em:</span>
                        <span className="font-medium">
                          {new Date(product.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {product.description && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Descrição</h3>
                    <p className="text-gray-700 leading-relaxed">{product.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}