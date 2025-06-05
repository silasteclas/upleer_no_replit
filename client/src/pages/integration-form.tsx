import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Save, TestTube } from "lucide-react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import EndpointTester from "@/components/integrations/endpoint-tester";

const integrationSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  baseUrl: z.string().url("URL deve ser válida"),
  authType: z.enum(["api_key", "oauth", "bearer", "basic"]),
  authConfig: z.object({
    apiKey: z.string().optional(),
    token: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  }),
  headers: z.record(z.string()).optional(),
  isActive: z.boolean(),
});

type IntegrationData = z.infer<typeof integrationSchema>;

export default function IntegrationForm() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditing = !!id;

  const { data: integration, isLoading } = useQuery<any>({
    queryKey: [`/api/integrations/${id}`],
    enabled: isEditing,
  });

  const form = useForm<IntegrationData>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      name: "",
      description: "",
      baseUrl: "",
      authType: "api_key",
      authConfig: {},
      headers: {},
      isActive: true,
    },
  });

  const watchAuthType = form.watch("authType");

  useEffect(() => {
    if (integration && isEditing) {
      const integrationData = integration as any;
      form.reset({
        name: integrationData.name || "",
        description: integrationData.description || "",
        baseUrl: integrationData.baseUrl || "",
        authType: integrationData.authType || "api_key",
        authConfig: integrationData.authConfig || {},
        headers: integrationData.headers || {},
        isActive: integrationData.isActive ?? true,
      });
    }
  }, [integration, isEditing, form]);

  const createMutation = useMutation({
    mutationFn: async (data: IntegrationData) => {
      const response = await apiRequest("/api/integrations", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Integração criada com sucesso!",
        description: "A nova integração foi configurada.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      setLocation("/integrations");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar integração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: IntegrationData) => {
      const response = await apiRequest(`/api/integrations/${id}`, "PUT", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Integração atualizada com sucesso!",
        description: "As configurações foram salvas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      setLocation("/integrations");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar integração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (data: IntegrationData) => {
      const response = await apiRequest("/api/integrations/test", "POST", data);
      return response.json();
    },
    onSuccess: (response: any) => {
      toast({
        title: "Teste realizado com sucesso!",
        description: `Status: ${response.status} - ${response.message}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: IntegrationData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const onTest = () => {
    const data = form.getValues();
    testMutation.mutate(data);
  };

  const renderAuthFields = () => {
    switch (watchAuthType) {
      case "api_key":
        return (
          <FormField
            control={form.control}
            name="authConfig.apiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Key</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Sua API key" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "bearer":
        return (
          <FormField
            control={form.control}
            name="authConfig.token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bearer Token</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Seu token de acesso" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "oauth":
        return (
          <>
            <FormField
              control={form.control}
              name="authConfig.clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Client ID do OAuth" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authConfig.clientSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Secret</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Client Secret do OAuth" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      case "basic":
        return (
          <>
            <FormField
              control={form.control}
              name="authConfig.username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuário</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome de usuário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authConfig.password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Senha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      default:
        return null;
    }
  };

  if (isLoading && isEditing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Carregando..."
          subtitle="Aguarde"
        />
        <Sidebar />
        <main className="ml-64 pt-20 p-6 min-h-screen overflow-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Carregando integração...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={isEditing ? "Editar Integração" : "Nova Integração"}
        subtitle={isEditing ? "Modifique as configurações da integração" : "Configure uma nova integração com API externa"}
      />
      <Sidebar />
      <main className="ml-64 pt-20 p-6 min-h-screen overflow-auto">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => setLocation("/integrations")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Integrações
            </Button>
          </div>

          <Card>
              <CardHeader>
                <CardTitle>Configurações da Integração</CardTitle>
                <CardDescription>
                  Configure os parâmetros de conexão e autenticação
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Integração</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Pagamento Stripe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="authType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Autenticação</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="api_key">API Key</SelectItem>
                                <SelectItem value="bearer">Bearer Token</SelectItem>
                                <SelectItem value="oauth">OAuth 2.0</SelectItem>
                                <SelectItem value="basic">Basic Auth</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="baseUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Base da API</FormLabel>
                          <FormControl>
                            <Input placeholder="https://api.exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição (Opcional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descreva o propósito desta integração..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Configurações de Autenticação</h3>
                      {renderAuthFields()}
                    </div>

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Integração Ativa</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Habilitar esta integração para uso
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-4">
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isEditing ? "Atualizar" : "Criar"} Integração
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={onTest}
                        disabled={testMutation.isPending}
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        Testar Conexão
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Endpoint Tester - Show when form has valid data */}
            {form.watch("baseUrl") && form.watch("authType") && (
              <EndpointTester
                baseUrl={form.watch("baseUrl")}
                authType={form.watch("authType")}
                authConfig={form.watch("authConfig") || {}}
              />
            )}
        </div>
      </main>
    </div>
  );
}