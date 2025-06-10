import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      console.log("🔐 ADMIN LOGIN - Email:", credentials.email);
      console.log("🔗 ADMIN LOGIN - URL: /api/admin/login");
      
      // Força a URL correta explicitamente
      const adminLoginUrl = '/api/admin/login';
      console.log("📡 Fazendo requisição para:", adminLoginUrl);
      
      const response = await apiRequest(adminLoginUrl, 'POST', credentials);
      console.log("📨 Resposta do servidor:", response);
      return response;
    },
    onSuccess: (response) => {
      console.log("✅ LOGIN ADMIN SUCESSO:", response);
      
      toast({
        title: "Login realizado com sucesso",
        description: "Redirecionando...",
      });
      
      // Limpa cache de consultas
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user"] });
      
      // Múltiplas abordagens de redirecionamento
      console.log("🔄 ADMIN: Iniciando redirecionamento");
      
      // Método 1: React Router (wouter)
      try {
        setLocation('/admin/dashboard');
        console.log("Método 1: setLocation executado");
      } catch (e) {
        console.log("setLocation falhou:", e);
      }
      
      // Método 2: window.location.href (com timeout)
      setTimeout(() => {
        console.log("Método 2: Executando window.location.href");
        window.location.href = '/admin/dashboard';
      }, 200);
      
      // Método 3: fallback final
      setTimeout(() => {
        console.log("Método 3: Fallback window.location.replace");
        window.location.replace('/admin/dashboard');
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha email e senha",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Acesso Administrativo</CardTitle>
          <CardDescription>
            Faça login para acessar o painel de administração da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Botão de teste para debug */}
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <p className="text-yellow-800 mb-2">Teste rápido:</p>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => {
                console.log("🧪 TESTE: Executando login com credenciais admin");
                loginMutation.mutate({ 
                  email: "adm@digiondigital.com", 
                  password: "admin#321" 
                });
              }}
            >
              Testar Login Admin
            </Button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adm@digiondigital.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
            {loginMutation.isSuccess && (
              <Button 
                type="button" 
                variant="outline"
                className="w-full mt-2"
                onClick={() => setLocation('/admin/dashboard')}
              >
                Ir para o Painel Administrativo
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}