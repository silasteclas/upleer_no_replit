import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, FileText, Image, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Product } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PDFDocument } from "pdf-lib";

const editProductSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  isbn: z.string().optional(),
  author: z.string().min(1, "Autor é obrigatório"),
  coAuthors: z.string().optional(),
  genre: z.string().min(1, "Gênero é obrigatório"),
  language: z.string().min(1, "Idioma é obrigatório"),
  targetAudience: z.string().optional(),
  salePrice: z.number().min(0.01, "Preço deve ser maior que zero"),
});

type EditProductData = z.infer<typeof editProductSchema>;

export default function ProductEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Pricing states
  const [authorEarnings, setAuthorEarnings] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [platformCommission, setPlatformCommission] = useState(0);
  
  // File upload states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<{isValid: boolean; pageCount?: number; message?: string} | null>(null);
  const [pageCount, setPageCount] = useState(0);
  
  // Constants for pricing calculation
  const fixedFee = 9.90;
  const printingCostPerPage = 0.10;
  const commissionRate = 30.00;

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
      author: "",
      coAuthors: "",
      genre: "",
      language: "português",
      targetAudience: "",
      salePrice: 0,
    },
  });

  // Handle PDF upload
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const numPages = pdfDoc.getPageCount();
        
        setPageCount(numPages);
        setValidation({
          isValid: true,
          pageCount: numPages,
          message: `✅ PDF válido com ${numPages} páginas`
        });
        
        // Recalculate pricing with new page count
        if (authorEarnings > 0) {
          const printingCost = numPages * printingCostPerPage;
          const commissionAmount = authorEarnings * (commissionRate / 100);
          const platformGain = fixedFee + printingCost + commissionAmount;
          const newSalePrice = platformGain + authorEarnings;
          
          setPlatformCommission(platformGain);
          setSalePrice(newSalePrice);
        }
        
      } catch (error) {
        console.error("Erro ao validar PDF:", error);
        setValidation({
          isValid: false,
          message: "❌ Arquivo PDF inválido ou corrompido"
        });
        setPdfFile(null);
        setPageCount(0);
      }
    } else {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo PDF válido.",
        variant: "destructive",
      });
    }
  };

  // Handle cover upload
  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setCoverFile(file);
    } else {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem válido.",
        variant: "destructive",
      });
    }
  };

  // Handle earnings change
  const handleEarningsChange = (earnings: number) => {
    setAuthorEarnings(earnings);
    form.setValue("salePrice", earnings); // Keep form in sync
    
    // Calculate pricing using current page count (either from product or new PDF)
    const currentPageCount = pageCount || (product?.pageCount || 0);
    const printingCost = currentPageCount * printingCostPerPage;
    const commissionAmount = earnings * (commissionRate / 100);
    const platformGain = fixedFee + printingCost + commissionAmount;
    const newSalePrice = platformGain + earnings;
    
    setPlatformCommission(platformGain);
    setSalePrice(newSalePrice);
  };

  // Update form when product data loads
  useEffect(() => {
    if (product) {
      console.log("Product data loaded:", product);
      
      // Initialize pricing states and page count
      const initialEarnings = parseFloat(product.authorEarnings || "0");
      const initialPageCount = product.pageCount || 0;
      
      setAuthorEarnings(initialEarnings);
      setPageCount(initialPageCount);
      
      form.reset({
        title: product.title || "",
        description: product.description || "",
        isbn: product.isbn || "",
        author: product.author || "",
        coAuthors: product.coAuthors || "",
        genre: product.genre || "",
        language: product.language || "português",
        targetAudience: product.targetAudience || "",
        salePrice: parseFloat(product.salePrice || "0"),
      });
      
      // Calculate initial pricing
      if (initialEarnings > 0) {
        handleEarningsChange(initialEarnings);
      }
    }
  }, [product, form]);

  const updateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log("[PRODUCT-EDIT] Submitting update with FormData");
      
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Update error:", error);
        throw new Error(`Erro ${response.status}: ${error}`);
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
    // Create FormData for file uploads
    const formData = new FormData();
    
    // Add all form fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    // Add pricing fields
    formData.append("authorEarnings", authorEarnings.toString());
    formData.append("platformCommission", platformCommission.toString());
    formData.append("fixedFee", fixedFee.toString());
    formData.append("printingCostPerPage", printingCostPerPage.toString());
    formData.append("commissionRate", commissionRate.toString());
    
    // Add page count (use new PDF page count if available, otherwise keep current)
    formData.append("pageCount", pageCount.toString());
    
    // Add files if they exist
    if (pdfFile) {
      formData.append("pdf", pdfFile);
    }
    if (coverFile) {
      formData.append("cover", coverFile);
    }
    
    updateMutation.mutate(formData);
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
                    className="bg-gray-100"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    O título não pode ser alterado
                  </p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="author">Autor *</Label>
                  <Input
                    id="author"
                    {...form.register("author")}
                    className={form.formState.errors.author ? "border-red-500" : ""}
                    placeholder="Nome do autor principal"
                  />
                  {form.formState.errors.author && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.author.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="coAuthors">Co-autores</Label>
                  <Input
                    id="coAuthors"
                    {...form.register("coAuthors")}
                    placeholder="Nomes dos co-autores (opcional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="genre">Gênero *</Label>
                  <Select 
                    value={form.watch("genre")} 
                    onValueChange={(value) => form.setValue("genre", value)}
                  >
                    <SelectTrigger className={form.formState.errors.genre ? "border-red-500" : ""}>
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="educacao">Educação</SelectItem>
                      <SelectItem value="academico">Acadêmico</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="profissional">Profissional</SelectItem>
                      <SelectItem value="preparatorio">Preparatório</SelectItem>
                      <SelectItem value="religioso">Religioso</SelectItem>
                      <SelectItem value="infantil">Infantil</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.genre && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.genre.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="language">Idioma *</Label>
                  <Select 
                    value={form.watch("language")} 
                    onValueChange={(value) => form.setValue("language", value)}
                  >
                    <SelectTrigger className={form.formState.errors.language ? "border-red-500" : ""}>
                      <SelectValue placeholder="Selecione o idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="português">Português</SelectItem>
                      <SelectItem value="english">Inglês</SelectItem>
                      <SelectItem value="español">Espanhol</SelectItem>
                      <SelectItem value="français">Francês</SelectItem>
                      <SelectItem value="italiano">Italiano</SelectItem>
                      <SelectItem value="deutsch">Alemão</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.language && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.language.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="targetAudience">Público-alvo</Label>
                  <Input
                    id="targetAudience"
                    {...form.register("targetAudience")}
                    placeholder="Ex: Estudantes universitários"
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

              {/* File Update Section */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Atualizar Arquivos</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* PDF Upload */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-700">Novo Arquivo PDF (opcional)</Label>
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer" onClick={() => document.getElementById('pdf-update')?.click()}>
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                          <FileText className="text-blue-600 w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-gray-600 text-sm">Clique para selecionar um novo PDF</p>
                          <span className="text-blue-600 font-medium text-sm cursor-pointer hover:text-blue-700">
                            Escolher arquivo
                          </span>
                          <Input
                            id="pdf-update"
                            type="file"
                            accept=".pdf"
                            onChange={handlePdfUpload}
                            className="hidden"
                          />
                        </div>
                        <p className="text-xs text-gray-500">Máximo 50MB • PDF apenas</p>
                      </div>
                    </div>
                    
                    {validation?.isValid && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center text-green-800">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span className="text-sm">{validation.message}</span>
                        </div>
                      </div>
                    )}
                    
                    {validation?.isValid === false && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center text-red-800">
                          <span className="text-sm">{validation.message}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cover Upload */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-700">Nova Capa (opcional)</Label>
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer" onClick={() => document.getElementById('cover-update')?.click()}>
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                          <Image className="text-blue-600 w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-gray-600 text-sm">Clique para selecionar nova capa</p>
                          <span className="text-blue-600 font-medium text-sm cursor-pointer hover:text-blue-700">
                            Escolher arquivo
                          </span>
                          <Input
                            id="cover-update"
                            type="file"
                            accept="image/*"
                            onChange={handleCoverUpload}
                            className="hidden"
                          />
                        </div>
                        <p className="text-xs text-gray-500">JPG, PNG • Mínimo 400x600px</p>
                      </div>
                    </div>
                    
                    {coverFile && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center text-green-800">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span className="text-sm">Nova capa selecionada: {coverFile.name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {(pdfFile || coverFile) && (
                  <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">
                      ⚠️ Arquivos serão atualizados apenas após salvar as alterações
                    </p>
                  </div>
                )}
              </div>

              {/* Pricing Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-6">Precificação</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Pricing Controls */}
                  <div className="space-y-6">
                    {/* Product Info */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Produto:</p>
                          <p className="font-medium">{product.title}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Número de páginas:</p>
                          <p className="font-medium">
                            {pageCount || product.pageCount} páginas
                            {pdfFile && <span className="text-blue-600 text-xs ml-1">(atualizado)</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Earnings Input */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">Quanto você quer ganhar? (R$)</Label>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">R$</span>
                        <Input
                          type="number"
                          value={authorEarnings}
                          onChange={(e) => handleEarningsChange(Number(e.target.value))}
                          className="w-32 text-center"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Digite o valor que você deseja receber por venda
                      </p>
                    </div>
                    
                    {/* Channel Prices */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-4">Preços por Canal de Venda:</h5>
                      <div className="space-y-3">
                        {/* Upleer Store */}
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">U</span>
                            </div>
                            <span className="font-medium text-gray-900">Loja Upleer</span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-600">R$ {salePrice.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Plataforma oficial</p>
                          </div>
                        </div>

                        {/* Mercado Livre */}
                        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                              <span className="text-blue-800 text-xs font-bold">ML</span>
                            </div>
                            <span className="font-medium text-gray-900">Mercado Livre</span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-orange-600">R$ {(salePrice * 1.15).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Maior alcance</p>
                          </div>
                        </div>

                        {/* Shopee */}
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">S</span>
                            </div>
                            <span className="font-medium text-gray-900">Shopee</span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-orange-500">R$ {(salePrice * 1.12).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Público jovem</p>
                          </div>
                        </div>

                        {/* Amazon */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-300">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">A</span>
                            </div>
                            <span className="font-medium text-gray-900">Amazon</span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-800">R$ {(salePrice * 1.18).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Mercado premium</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column: Pricing Breakdown */}
                  <div className="space-y-6">
                    {/* Pricing Breakdown */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200 h-fit">
                      <h5 className="font-medium text-gray-900 mb-4">Como é calculado o preço de venda</h5>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">Seus ganhos:</span>
                          <span className="font-medium">R$ {authorEarnings.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600 flex-1 pr-2">Custo do produto (Impressão + taxas/impostos):</span>
                          <span className="font-medium flex-shrink-0">R$ {platformCommission.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-green-200 pt-3 mt-3">
                          <div className="flex justify-between items-center font-semibold">
                            <span className="text-gray-800">Preço final:</span>
                            <span className="text-green-600">R$ {salePrice.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Product Summary */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 h-fit">
                      <h5 className="font-medium text-gray-900 mb-3">Resumo do Produto</h5>
                      <div className="text-sm text-gray-700 space-y-2">
                        <p><strong>Título:</strong> {product.title}</p>
                        {product.author && (
                          <p><strong>Autor:</strong> {product.author}</p>
                        )}
                        {product.coAuthors && (
                          <p><strong>Co-autores:</strong> {product.coAuthors}</p>
                        )}
                        {product.genre && (
                          <p><strong>Gênero:</strong> {product.genre}</p>
                        )}
                        {product.language && (
                          <p><strong>Idioma:</strong> {product.language}</p>
                        )}
                        {product.targetAudience && (
                          <p><strong>Público-alvo:</strong> {product.targetAudience}</p>
                        )}
                        {product.description && (
                          <p><strong>Descrição:</strong> {product.description.length > 100 
                            ? product.description.substring(0, 100) + "..." 
                            : product.description}
                          </p>
                        )}
                        {product.isbn && (
                          <p><strong>ISBN:</strong> {product.isbn}</p>
                        )}
                      </div>
                    </div>
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