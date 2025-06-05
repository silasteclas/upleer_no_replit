import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Product } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const editProductSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  isbn: z.string().optional(),
  salePrice: z.number().min(0.01, "Preço deve ser maior que zero"),
});

type EditProductData = z.infer<typeof editProductSchema>;

export default function ProductEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
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

  const { data: product, isLoading: productLoading } = useQuery<Product>({
    queryKey: [`/api/products/${id}`],
    enabled: !!id && isAuthenticated,
  });

  const form = useForm<EditProductData>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      title: "",
      description: "",
      isbn: "",
      salePrice: 0,
    },
  });

  // Update form when product data loads
  useEffect(() => {
    if (product) {
      console.log("Product data loaded:", product);
      form.reset({
        title: product.title || "",
        description: product.description || "",
        isbn: product.isbn || "",
        salePrice: parseFloat(product.salePrice || "0"),
      });
    }
  }, [product, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: EditProductData) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${response.status}: ${error}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Produto atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${id}`] });
      setLocation(`/products/${id}`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      console.error("Update error:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar produto. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditProductData) => {
    updateMutation.mutate(data);
  };

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
          <p className="text-gray-600 mb-4">O produto que você está tentando editar não existe.</p>
          <Button onClick={() => setLocation("/products")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Produtos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Editar Produto" subtitle="Atualizar informações do produto" />
      <Sidebar />
      <main className="ml-64 pt-32 p-6 min-h-screen overflow-auto">
        <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setLocation(`/products/${id}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Produto
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Editar Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    className={form.formState.errors.title ? "border-red-500" : ""}
                  />
                  {form.formState.errors.title && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input
                    id="isbn"
                    {...form.register("isbn")}
                    placeholder="000-0-00-000000-0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  rows={4}
                  placeholder="Descreva o conteúdo da apostila..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salePrice">Preço de Venda (R$) *</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...form.register("salePrice", { valueAsNumber: true })}
                    className={form.formState.errors.salePrice ? "border-red-500" : ""}
                  />
                  {form.formState.errors.salePrice && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.salePrice.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label>Páginas</Label>
                  <Input
                    value={product.pageCount}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Número de páginas não pode ser alterado
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Informações do Arquivo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Custo base:</span>
                    <span className="ml-2 font-medium">R$ {product.baseCost}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Criado em:</span>
                    <span className="ml-2 font-medium">
                      {new Date(product.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/products/${id}`)}
                >
                  Cancelar
                </Button>
                
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-primary hover:bg-blue-600 text-white"
                >
                  {updateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      </main>
    </div>
  );
}