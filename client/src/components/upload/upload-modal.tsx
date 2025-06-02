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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { FileText, Image, CheckCircle } from "lucide-react";

const uploadSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  isbn: z.string().optional(),
  marginPercent: z.number().min(0).max(1000).default(150),
});

type UploadFormData = z.infer<typeof uploadSchema>;

interface ValidationResult {
  isValid: boolean;
  pageCount?: number;
  format?: string;
  message?: string;
}

export default function UploadModal() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [baseCost, setBaseCost] = useState(0);
  const [salePrice, setSalePrice] = useState(0);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      description: "",
      isbn: "",
      marginPercent: 150,
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData & { pdf: File; cover?: File }) => {
      const formData = new FormData();
      formData.append("pdf", data.pdf);
      if (data.cover) {
        formData.append("cover", data.cover);
      }
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      formData.append("isbn", data.isbn || "");
      formData.append("marginPercent", data.marginPercent.toString());
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
      
      // Reset form
      form.reset();
      setPdfFile(null);
      setCoverFile(null);
      setValidation(null);
      setPageCount(0);
      setBaseCost(0);
      setSalePrice(0);
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

  const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      
      // Simulate PDF validation (in real app, you'd use pdf-lib)
      const simulatedPageCount = Math.floor(Math.random() * 50) + 10;
      const calculatedBaseCost = simulatedPageCount * 0.5; // R$ 0.50 per page
      
      setPageCount(simulatedPageCount);
      setBaseCost(calculatedBaseCost);
      setSalePrice(calculatedBaseCost * (form.getValues("marginPercent") / 100));
      
      setValidation({
        isValid: true,
        pageCount: simulatedPageCount,
        format: "A4",
        message: `PDF válido • ${simulatedPageCount} páginas • Formato A4`,
      });
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

  const handleMarginChange = (margin: number) => {
    form.setValue("marginPercent", margin);
    if (baseCost > 0) {
      setSalePrice(baseCost * (margin / 100));
    }
  };

  const onSubmit = (data: UploadFormData) => {
    if (!pdfFile) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo PDF.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({
      ...data,
      pdf: pdfFile,
      cover: coverFile || undefined,
    });
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900">
          Nova Apostila
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            <Label className="text-sm font-medium text-gray-700">Capa da Apostila</Label>
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
          </div>

          {/* Product Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">Título</Label>
              <Input
                {...form.register("title")}
                placeholder="Digite o título da apostila"
                className={form.formState.errors.title ? "border-red-500" : ""}
              />
              {form.formState.errors.title && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">ISBN (opcional)</Label>
              <Input
                {...form.register("isbn")}
                placeholder="000-0-00-000000-0"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">Descrição</Label>
            <Textarea
              {...form.register("description")}
              rows={4}
              placeholder="Descreva o conteúdo da apostila..."
            />
          </div>

          {/* Pricing */}
          {pageCount > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Precificação</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Custo base ({pageCount} páginas):</p>
                  <p className="font-medium">R$ {baseCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Margem desejada:</p>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={form.watch("marginPercent")}
                      onChange={(e) => handleMarginChange(Number(e.target.value))}
                      className="w-16 text-center"
                    />
                    <span>%</span>
                  </div>
                </div>
                <div className="col-span-2 pt-2 border-t border-gray-200">
                  <p className="text-gray-600">Preço de venda sugerido:</p>
                  <p className="text-xl font-bold text-primary">R$ {salePrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="submit"
              disabled={uploadMutation.isPending || !pdfFile}
              className="bg-primary hover:bg-blue-600 text-white px-6"
            >
              {uploadMutation.isPending ? "Enviando..." : "Enviar para Avaliação"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
