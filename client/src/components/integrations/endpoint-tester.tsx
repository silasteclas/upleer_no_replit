import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Play, Loader2 } from "lucide-react";

const endpointTestSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  endpoint: z.string().min(1, "Endpoint é obrigatório"),
  headers: z.string().optional(),
  body: z.string().optional(),
});

type EndpointTestData = z.infer<typeof endpointTestSchema>;

interface EndpointTesterProps {
  baseUrl: string;
  authType: string;
  authConfig: Record<string, any>;
}

export default function EndpointTester({ baseUrl, authType, authConfig }: EndpointTesterProps) {
  const { toast } = useToast();
  const [response, setResponse] = useState<any>(null);

  const form = useForm<EndpointTestData>({
    resolver: zodResolver(endpointTestSchema),
    defaultValues: {
      method: "GET",
      endpoint: "/",
      headers: "{}",
      body: "",
    },
  });

  const testMutation = useMutation({
    mutationFn: async (data: EndpointTestData) => {
      const fullUrl = baseUrl.endsWith('/') ? baseUrl + data.endpoint.slice(1) : baseUrl + data.endpoint;
      
      // Parse headers
      let headers: Record<string, string> = {};
      try {
        headers = data.headers ? JSON.parse(data.headers) : {};
      } catch (e) {
        headers = {};
      }

      // Add authentication headers
      if (authType === 'api_key' && authConfig.apiKey) {
        headers['X-API-Key'] = authConfig.apiKey;
      } else if (authType === 'bearer' && authConfig.token) {
        headers['Authorization'] = `Bearer ${authConfig.token}`;
      } else if (authType === 'basic' && authConfig.username && authConfig.password) {
        const credentials = btoa(`${authConfig.username}:${authConfig.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }

      // Set content type for requests with body
      if (['POST', 'PUT', 'PATCH'].includes(data.method) && data.body) {
        headers['Content-Type'] = 'application/json';
      }

      const startTime = Date.now();
      const fetchResponse = await fetch(fullUrl, {
        method: data.method,
        headers,
        body: ['POST', 'PUT', 'PATCH'].includes(data.method) ? data.body : undefined,
      });
      
      const responseTime = Date.now() - startTime;
      const responseText = await fetchResponse.text();
      
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        responseJson = responseText;
      }

      return {
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        headers: Object.fromEntries(fetchResponse.headers.entries()),
        data: responseJson,
        responseTime,
        url: fullUrl,
      };
    },
    onSuccess: (response) => {
      setResponse(response);
      toast({
        title: "Teste executado com sucesso!",
        description: `Status: ${response.status} - Tempo: ${response.responseTime}ms`,
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

  const onSubmit = (data: EndpointTestData) => {
    testMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Teste de Endpoint
        </CardTitle>
        <CardDescription>
          Teste diferentes endpoints e métodos HTTP desta integração
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método HTTP</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endpoint"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Endpoint</FormLabel>
                    <FormControl>
                      <Input placeholder="/api/users" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="headers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headers (JSON)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder='{"Content-Type": "application/json"}'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body (JSON)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder='{"key": "value"}'
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={testMutation.isPending}
              className="w-full"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Executar Teste
                </>
              )}
            </Button>
          </form>
        </Form>

        {response && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Status:</span> {response.status} {response.statusText}
                  </div>
                  <div>
                    <span className="font-medium">Tempo:</span> {response.responseTime}ms
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">URL:</span> {response.url}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Headers de Resposta:</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                    {JSON.stringify(response.headers, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Dados:</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-64">
                    {typeof response.data === 'string' 
                      ? response.data 
                      : JSON.stringify(response.data, null, 2)
                    }
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}