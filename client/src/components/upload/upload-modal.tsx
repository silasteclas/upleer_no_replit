import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { FileText, Image, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { PDFDocument } from "pdf-lib";

// Step 1: File upload
const fileUploadSchema = z.object({
  files: z.boolean().default(false),
});

// Step 2: Product information
const productInfoSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  isbn: z.string().optional(),
  author: z.string().min(1, "Autor é obrigatório"),
  coAuthors: z.string().optional(),
  genre: z.string().min(1, "Gênero é obrigatório"),
  language: z.string().min(1, "Idioma é obrigatório"),
  targetAudience: z.string().optional(),
});

// Step 3: Pricing
const pricingSchema = z.object({
  authorEarnings: z.number().min(0).default(0),
});

type FileUploadData = z.infer<typeof fileUploadSchema>;
type ProductInfoData = z.infer<typeof productInfoSchema>;
type PricingData = z.infer<typeof pricingSchema>;

interface ValidationResult {
  isValid: boolean;
  pageCount?: number;
  format?: string;
  message?: string;
}

export default function UploadModal() {
  const [currentStep, setCurrentStep] = useState(1);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [baseCost, setBaseCost] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [productInfo, setProductInfo] = useState<ProductInfoData>({
    title: "",
    description: "",
    isbn: "",
    author: "",
    coAuthors: "",
    genre: "",
    language: "português",
    targetAudience: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Forms for each step
  const fileForm = useForm<FileUploadData>({
    resolver: zodResolver(fileUploadSchema),
    defaultValues: { files: false },
  });

  const infoForm = useForm<ProductInfoData>({
    resolver: zodResolver(productInfoSchema),
    defaultValues: {
      title: "",
      description: "",
      isbn: "",
      author: "",
      coAuthors: "",
      genre: "",
      language: "português",
      targetAudience: "",
    },
  });

  const pricingForm = useForm<PricingData>({
    resolver: zodResolver(pricingSchema),
    defaultValues: { authorEarnings: 0 },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: ProductInfoData & PricingData & { pdf: File; cover?: File }) => {
      const formData = new FormData();
      formData.append("pdf", data.pdf);
      if (data.cover) {
        formData.append("cover", data.cover);
      }
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      formData.append("isbn", data.isbn || "");
      formData.append("author", data.author);
      formData.append("coAuthors", data.coAuthors || "");
      formData.append("genre", data.genre);
      formData.append("language", data.language);
      formData.append("targetAudience", data.targetAudience || "");
      formData.append("pageCount", pageCount.toString());
      formData.append("baseCost", baseCost.toString());
      formData.append("marginPercent", "150"); // Keep backend compatibility
      formData.append("salePrice", salePrice.toString());

      const response = await fetch("/api/products", {
        method: "POST",
        body: formData,
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
        description: "Apostila enviada para avaliação com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      // Reset everything
      setCurrentStep(1);
      setPdfFile(null);
      setCoverFile(null);
      setValidation(null);
      setPageCount(0);
      setBaseCost(0);
      setSalePrice(0);
      setProductInfo({
        title: "",
        description: "",
        isbn: "",
        author: "",
        coAuthors: "",
        genre: "",
        language: "português",
        targetAudience: "",
      });
      fileForm.reset();
      infoForm.reset();
      pricingForm.reset();
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
      toast({
        title: "Erro",
        description: "Falha ao enviar apostila. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      
      try {
        // Read the PDF file and get actual page count
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const actualPageCount = pdfDoc.getPageCount();
        
        const calculatedBaseCost = actualPageCount * 0.5; // R$ 0.50 per page
        
        setPageCount(actualPageCount);
        setBaseCost(calculatedBaseCost);
        // Set initial author earnings to suggest same as base cost
        const suggestedEarnings = calculatedBaseCost;
        pricingForm.setValue("authorEarnings", suggestedEarnings);
        setSalePrice(calculatedBaseCost + suggestedEarnings);
        
        setValidation({
          isValid: true,
          pageCount: actualPageCount,
          format: "A4",
          message: `PDF válido • ${actualPageCount} páginas • Formato A4`,
        });
      } catch (error) {
        console.error("Erro ao processar PDF:", error);
        toast({
          title: "Erro de validação",
          description: "Não foi possível processar o arquivo PDF. Tente novamente.",
          variant: "destructive",
        });
        setPdfFile(null);
        setValidation(null);
      }
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo PDF válido.",
        variant: "destructive",
      });
    }
  };

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setCoverFile(file);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem válida (JPG, PNG).",
        variant: "destructive",
      });
    }
  };

  const handleEarningsChange = (earnings: number) => {
    pricingForm.setValue("authorEarnings", earnings);
    if (baseCost > 0) {
      setSalePrice(baseCost + earnings);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && (!pdfFile || !validation?.isValid)) {
      toast({
        title: "Erro",
        description: "Por favor, faça upload de um arquivo PDF válido.",
        variant: "destructive",
      });
      return;
    }
    
    if (currentStep === 2) {
      const data = infoForm.getValues();
      
      // Validar campos obrigatórios
      if (!data.title) {
        toast({
          title: "Erro",
          description: "Por favor, preencha o título da apostila.",
          variant: "destructive",
        });
        return;
      }
      
      if (!data.author) {
        toast({
          title: "Erro",
          description: "Por favor, preencha o nome do autor.",
          variant: "destructive",
        });
        return;
      }
      
      if (!data.genre) {
        toast({
          title: "Erro",
          description: "Por favor, selecione o gênero da apostila.",
          variant: "destructive",
        });
        return;
      }
      
      if (!data.language) {
        toast({
          title: "Erro",
          description: "Por favor, selecione o idioma da apostila.",
          variant: "destructive",
        });
        return;
      }
      
      setProductInfo(data);
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = () => {
    const infoData = productInfo;
    const pricingData = pricingForm.getValues();

    if (!pdfFile) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo PDF.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({
      ...infoData,
      ...pricingData,
      pdf: pdfFile,
      cover: coverFile || undefined,
    });
  };

  // Step progress indicator
  const stepTitles = [
    "Upload dos Arquivos",
    "Informações do Produto", 
    "Precificação"
  ];

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900">
          Nova Apostila - {stepTitles[currentStep - 1]}
        </CardTitle>
        
        {/* Progress indicator */}
        <div className="flex items-center space-x-4 mt-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? "bg-primary text-white" 
                  : "bg-gray-200 text-gray-600"
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  step < currentStep ? "bg-primary" : "bg-gray-200"
                }`} />
              )}
            </div>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Step 1: File Upload */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* PDF Upload */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700">Arquivo PDF</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="text-red-500 text-2xl w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-gray-600">Arraste e solte o arquivo PDF aqui ou</p>
                    <Label htmlFor="pdf-upload" className="text-primary hover:text-blue-600 font-medium cursor-pointer">
                      clique para selecionar
                    </Label>
                    <Input
                      id="pdf-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Formato A4 • Máximo 50MB • PDF apenas</p>
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
            </div>

            {/* Cover Upload */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700">Capa da Apostila (opcional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Image className="text-gray-500 text-xl w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Selecione uma imagem para a capa</p>
                    <Label htmlFor="cover-upload" className="text-primary hover:text-blue-600 font-medium text-sm cursor-pointer">
                      Escolher arquivo
                    </Label>
                    <Input
                      id="cover-upload"
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
                    <span className="text-sm">Capa selecionada: {coverFile.name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Product Information */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Título</Label>
                  <Input
                    {...infoForm.register("title")}
                    placeholder="Digite o título da apostila"
                    className={infoForm.formState.errors.title ? "border-red-500" : ""}
                  />
                  {infoForm.formState.errors.title && (
                    <p className="text-red-500 text-sm mt-1">
                      {infoForm.formState.errors.title.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">ISBN (opcional)</Label>
                  <Input
                    {...infoForm.register("isbn")}
                    placeholder="000-0-00-000000-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Autor</Label>
                  <Input
                    {...infoForm.register("author")}
                    placeholder="Nome do autor principal"
                    className={infoForm.formState.errors.author ? "border-red-500" : ""}
                  />
                  {infoForm.formState.errors.author && (
                    <p className="text-red-500 text-sm mt-1">
                      {infoForm.formState.errors.author.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Co-autores (opcional)</Label>
                  <Input
                    {...infoForm.register("coAuthors")}
                    placeholder="Nomes dos co-autores separados por vírgula"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Gênero</Label>
                  <Select onValueChange={(value) => infoForm.setValue("genre", value)}>
                    <SelectTrigger className={infoForm.formState.errors.genre ? "border-red-500" : ""}>
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academico">Acadêmico</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="profissionalizante">Profissionalizante</SelectItem>
                      <SelectItem value="concurso">Concurso Público</SelectItem>
                      <SelectItem value="enem">ENEM/Vestibular</SelectItem>
                      <SelectItem value="idiomas">Idiomas</SelectItem>
                      <SelectItem value="informatica">Informática</SelectItem>
                      <SelectItem value="saude">Saúde</SelectItem>
                      <SelectItem value="direito">Direito</SelectItem>
                      <SelectItem value="administracao">Administração</SelectItem>
                      <SelectItem value="engenharia">Engenharia</SelectItem>
                      <SelectItem value="educacao">Educação</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  {infoForm.formState.errors.genre && (
                    <p className="text-red-500 text-sm mt-1">
                      {infoForm.formState.errors.genre.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Idioma</Label>
                  <Select onValueChange={(value) => infoForm.setValue("language", value)} defaultValue="português">
                    <SelectTrigger className={infoForm.formState.errors.language ? "border-red-500" : ""}>
                      <SelectValue placeholder="Selecione o idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="português">Português</SelectItem>
                      <SelectItem value="inglês">Inglês</SelectItem>
                      <SelectItem value="espanhol">Espanhol</SelectItem>
                      <SelectItem value="francês">Francês</SelectItem>
                      <SelectItem value="alemão">Alemão</SelectItem>
                      <SelectItem value="italiano">Italiano</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  {infoForm.formState.errors.language && (
                    <p className="text-red-500 text-sm mt-1">
                      {infoForm.formState.errors.language.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2">Público-alvo (palavras-chave)</Label>
                <Input
                  {...infoForm.register("targetAudience")}
                  placeholder="Ex: estudantes, profissionais, concurseiros, vestibulandos"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite palavras-chave separadas por vírgula para definir seu público-alvo
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2">Descrição</Label>
                <Textarea
                  {...infoForm.register("description")}
                  rows={4}
                  placeholder="Descreva o conteúdo da apostila..."
                />
              </div>
            </div>

            {/* Simple Book Preview */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Preview da Apostila</Label>
                <div className="relative max-w-48 mx-auto">
                  {/* Simple Book Stack */}
                  <div className="relative">
                    {/* Shadow pages */}
                    <div className="absolute inset-0 bg-gray-300 rounded-lg transform translate-x-1 translate-y-1 aspect-[3/4]"></div>
                    <div className="absolute inset-0 bg-gray-200 rounded-lg transform translate-x-0.5 translate-y-0.5 aspect-[3/4]"></div>
                    
                    {/* Main book cover */}
                    <div className="relative bg-white rounded-lg shadow-xl aspect-[3/4] overflow-hidden group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-rotate-1">
                      {coverFile ? (
                        <div className="h-full relative">
                          <img
                            src={URL.createObjectURL(coverFile)}
                            alt="Capa da apostila"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          {/* Title overlay */}
                          {productInfo.title && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                              <h3 className="text-white text-sm font-bold leading-tight break-words">
                                {productInfo.title}
                              </h3>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative flex flex-col p-6">
                          {/* Brand area */}
                          <div className="text-center mb-4">
                            <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-semibold">
                              UPLEER
                            </div>
                          </div>
                          
                          {/* Icon area */}
                          <div className="flex-1 flex items-center justify-center">
                            <FileText className="w-16 h-16 text-white/30 transition-all duration-300 group-hover:text-white/50 group-hover:scale-110" />
                          </div>
                          
                          {/* Title area */}
                          <div className="text-center space-y-2">
                            {productInfo.title ? (
                              <h3 className="text-white text-sm font-bold leading-tight break-words">
                                {productInfo.title}
                              </h3>
                            ) : (
                              <h3 className="text-white/70 text-xs italic">
                                Título da Apostila
                              </h3>
                            )}
                            <div className="text-white/60 text-xs font-medium">
                              Material de Estudo
                            </div>
                            <div className="w-12 h-0.5 bg-white/40 rounded mx-auto"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Animated info badges */}
                  <div className="absolute -top-3 -right-3 bg-orange-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-10 font-semibold transform transition-all duration-300 hover:scale-110">
                    {pageCount} páginas
                  </div>
                  
                  <div className="absolute -bottom-3 -left-3 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-10 font-semibold transform transition-all duration-300 hover:scale-110">
                    Premium
                  </div>
                </div>
                
                <div className="mt-8 text-center space-y-2">
                  <div className="text-sm font-medium text-gray-700">Preview em Tempo Real</div>
                  <div className="text-xs text-gray-500">
                    <div>Apostila Digital</div>
                    <div className="text-primary font-medium mt-1">Qualidade Profissional</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Pricing */}
        {currentStep === 3 && pageCount > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pricing Form */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Precificação Automática</h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Produto:</p>
                    <p className="font-medium">{productInfo.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Número de páginas:</p>
                    <p className="font-medium">{pageCount} páginas</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Custo base:</p>
                    <p className="font-medium">R$ {baseCost.toFixed(2)}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <Label className="text-sm font-medium text-gray-700 mb-2">Quanto você quer ganhar? (R$)</Label>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">R$</span>
                      <Input
                        type="number"
                        value={pricingForm.watch("authorEarnings")}
                        onChange={(e) => handleEarningsChange(Number(e.target.value))}
                        className="w-32 text-center"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Digite o valor que você deseja receber por venda
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">Preço de venda final:</p>
                    <p className="text-2xl font-bold text-primary">R$ {salePrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              {/* Product Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Resumo do Produto</h5>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Título:</strong> {productInfo.title}</p>
                  {productInfo.author && (
                    <p><strong>Autor:</strong> {productInfo.author}</p>
                  )}
                  {productInfo.coAuthors && (
                    <p><strong>Co-autores:</strong> {productInfo.coAuthors}</p>
                  )}
                  {productInfo.genre && (
                    <p><strong>Gênero:</strong> {productInfo.genre}</p>
                  )}
                  {productInfo.language && (
                    <p><strong>Idioma:</strong> {productInfo.language}</p>
                  )}
                  {productInfo.targetAudience && (
                    <p><strong>Público-alvo:</strong> {productInfo.targetAudience}</p>
                  )}
                  {productInfo.description && (
                    <p><strong>Descrição:</strong> {productInfo.description.length > 100 
                      ? productInfo.description.substring(0, 100) + "..." 
                      : productInfo.description}
                    </p>
                  )}
                  {productInfo.isbn && (
                    <p><strong>ISBN:</strong> {productInfo.isbn}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Final Book Preview */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Sua Apostila Está Pronta!</Label>
                <div className="relative max-w-48 mx-auto">
                  {/* Simple Book Stack */}
                  <div className="relative">
                    {/* Shadow pages */}
                    <div className="absolute inset-0 bg-gray-300 rounded-lg transform translate-x-1 translate-y-1 aspect-[3/4]"></div>
                    <div className="absolute inset-0 bg-gray-200 rounded-lg transform translate-x-0.5 translate-y-0.5 aspect-[3/4]"></div>
                    
                    {/* Main book cover */}
                    <div className="relative bg-white rounded-lg shadow-xl aspect-[3/4] overflow-hidden group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-rotate-1">
                      {coverFile ? (
                        <div className="h-full relative">
                          <img
                            src={URL.createObjectURL(coverFile)}
                            alt="Capa da apostila"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          {/* Title overlay */}
                          {productInfo.title && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                              <h3 className="text-white text-sm font-bold leading-tight break-words">
                                {productInfo.title}
                              </h3>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative flex flex-col p-6">
                          {/* Brand area */}
                          <div className="text-center mb-4">
                            <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-semibold">
                              UPLEER
                            </div>
                          </div>
                          
                          {/* Icon area */}
                          <div className="flex-1 flex items-center justify-center">
                            <FileText className="w-16 h-16 text-white/30 transition-all duration-300 group-hover:text-white/50 group-hover:scale-110" />
                          </div>
                          
                          {/* Title area */}
                          <div className="text-center space-y-2">
                            {productInfo.title ? (
                              <h3 className="text-white text-sm font-bold leading-tight break-words">
                                {productInfo.title}
                              </h3>
                            ) : (
                              <h3 className="text-white/70 text-xs italic">
                                Título da Apostila
                              </h3>
                            )}
                            <div className="text-white/60 text-xs font-medium">
                              Material de Estudo
                            </div>
                            <div className="w-12 h-0.5 bg-white/40 rounded mx-auto"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Animated info badges */}
                  <div className="absolute -top-3 -right-3 bg-orange-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-10 font-semibold transform transition-all duration-300 hover:scale-110">
                    {pageCount} páginas
                  </div>
                  
                  <div className="absolute -bottom-3 -left-3 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-10 font-semibold transform transition-all duration-300 hover:scale-110">
                    R$ {salePrice.toFixed(2)}
                  </div>
                </div>
                
                <div className="mt-8 text-center space-y-3">
                  <div className="text-sm font-medium text-gray-700">🎉 Parabéns!</div>
                  <div className="text-xs text-gray-500">
                    <div>Sua apostila está pronta</div>
                    <div>para começar a gerar vendas!</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                    <div className="text-xs text-green-700 font-medium">
                      💰 Você receberá R$ {pricingForm.watch("authorEarnings").toFixed(2)} por venda
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex space-x-3">
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="bg-primary hover:bg-blue-600 text-white flex items-center"
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onSubmit}
                disabled={uploadMutation.isPending}
                className="bg-primary hover:bg-blue-600 text-white px-6"
              >
                {uploadMutation.isPending ? "Enviando..." : "Enviar para Avaliação"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
