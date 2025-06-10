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

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return await apiRequest('/api/admin/login', 'POST', credentials);
    },
    onSuccess: (response) => {
      console.log("Login admin bem-sucedido:", response);
      toast({
        title: "Login realizado com sucesso",
        description: "Redirecionando...",
      });
      
      // Redirecionamento robusto com múltiplas tentativas
      console.log("ADMIN LOGIN SUCCESS - Iniciando redirecionamento");
      
      const performRedirect = () => {
        console.log("Executando redirecionamento para /admin/dashboard");
        
        // Método mais compatível
        if (typeof window !== 'undefined') {
          try {
            // Primeira tentativa - mais direta
            window.location.href = '/admin/dashboard';
            console.log("Redirecionamento 1 executado");
          } catch (error) {
            console.log("Redirecionamento 1 falhou, tentando método 2:", error);
            
            try {
              // Segunda tentativa
              window.location.assign('/admin/dashboard');
              console.log("Redirecionamento 2 executado");
            } catch (error2) {
              console.log("Redirecionamento 2 falhou, tentando método 3:", error2);
              
              // Terceira tentativa - força refresh
              window.location.replace('/admin/dashboard');
              console.log("Redirecionamento 3 executado");
            }
          }
        }
      };
      
      // Executa o redirecionamento após pequeno delay para garantir que o toast apareça
      setTimeout(performRedirect, 200);
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