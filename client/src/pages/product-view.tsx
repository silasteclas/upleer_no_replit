import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Edit, FileText, Send, ShoppingCart, ExternalLink, Share2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Product } from "@shared/schema";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

const purchaseSchema = z.object({
  buyerName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  buyerEmail: z.string().email("Email inválido"),
  buyerPhone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  buyerCpf: z.string().min(11, "CPF deve ter 11 dígitos"),
  buyerAddress: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres"),
  buyerCity: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  buyerState: z.string().min(2, "Estado deve ter 2 caracteres"),
  buyerZipCode: z.string().min(8, "CEP deve ter 8 dígitos"),
});

type PurchaseData = z.infer<typeof purchaseSchema>;

export default function ProductView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: [`/api/products/${id}`],
    enabled: !!id && isAuthenticated,
  });

  const form = useForm<PurchaseData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      buyerName: "",
      buyerEmail: "",
      buyerPhone: "",
      buyerCpf: "",
      buyerAddress: "",
      buyerCity: "",
      buyerState: "",
      buyerZipCode: "",
    },
  });

  const simulatePurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseData) => {
      const response = await apiRequest(`/api/products/${id}/simulate-purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Compra simulada com sucesso!",
        description: "Uma nova venda foi criada no sistema",
      });
      setIsDialogOpen(false);
      form.reset();
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
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Detalhes do Produto" subtitle="Carregando..." />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando produto...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Produto Não Encontrado" subtitle="O produto solicitado não existe" />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Produto não encontrado</h2>
              <p className="text-gray-600 mb-4">O produto que você está procurando não existe.</p>
              <Button onClick={() => setLocation("/products")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Produtos
              </Button>
            </div>
          </main>
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
        return "Desconhecido";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Detalhes do Produto" subtitle="Visualizar informações do produto" />
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
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
                            <FileText className="w-12 h-12 mx-auto mb-2" />
                            <p className="text-sm">Sem capa</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <Badge className={`${getStatusColor(product.status)} mb-2`}>
                        {getStatusText(product.status)}
                      </Badge>
                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setLocation(`/products/${product.id}/edit`)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar Produto
                        </Button>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="w-full">
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Simular Compra
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Simular Compra</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                              <form onSubmit={form.handleSubmit((data) => simulatePurchaseMutation.mutate(data))} className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="buyerName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Nome Completo</FormLabel>
                                      <FormControl>
                                        <Input placeholder="João Silva" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="buyerEmail"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Email</FormLabel>
                                      <FormControl>
                                        <Input type="email" placeholder="joao@email.com" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <FormField
                                    control={form.control}
                                    name="buyerPhone"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Telefone</FormLabel>
                                        <FormControl>
                                          <Input placeholder="11999999999" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="buyerCpf"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>CPF</FormLabel>
                                        <FormControl>
                                          <Input placeholder="12345678901" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <FormField
                                  control={form.control}
                                  name="buyerAddress"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Endereço</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Rua das Flores, 123" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <FormField
                                    control={form.control}
                                    name="buyerCity"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Cidade</FormLabel>
                                        <FormControl>
                                          <Input placeholder="São Paulo" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="buyerState"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Estado</FormLabel>
                                        <FormControl>
                                          <Input placeholder="SP" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="buyerZipCode"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>CEP</FormLabel>
                                        <FormControl>
                                          <Input placeholder="01234567" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <Button 
                                  type="submit" 
                                  className="w-full"
                                  disabled={simulatePurchaseMutation.isPending}
                                >
                                  {simulatePurchaseMutation.isPending ? "Processando..." : "Confirmar Compra"}
                                </Button>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Product Details */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <CardTitle className="text-2xl">{product.title}</CardTitle>
                        <p className="text-lg text-gray-600">por {product.author}</p>
                      </div>
                      {product.publicUrl && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => window.open(product.publicUrl, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ver na Loja
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => {
                              navigator.clipboard.writeText(product.publicUrl);
                            }}
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Compartilhar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">Ganho do Autor</h3>
                        <p className="text-2xl font-bold text-green-600">R$ {(parseFloat(product.salePrice) - parseFloat(product.baseCost)).toFixed(2)}</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">Páginas</h3>
                        <p className="text-xl">{product.pageCount} páginas</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">Gênero</h3>
                        <p className="text-gray-700">{product.genre}</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">Idioma</h3>
                        <p className="text-gray-700">{product.language}</p>
                      </div>
                    </div>

                    {product.targetAudience && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">Público-Alvo</h3>
                        <p className="text-gray-700">{product.targetAudience}</p>
                      </div>
                    )}

                    {product.coAuthors && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">Co-Autores</h3>
                        <p className="text-gray-700">{product.coAuthors}</p>
                      </div>
                    )}

                    {product.isbn && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">ISBN</h3>
                        <p className="text-gray-700">{product.isbn}</p>
                      </div>
                    )}



                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Data de Criação</h3>
                      <p className="text-gray-700">
                        {product.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                      </p>
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
          </div>
        </main>
      </div>
    </div>
  );
}