import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Upload, BarChart3, Shield } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoPath from "@assets/Logotipo para site upleer (1).png";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return await apiRequest("/api/simple-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao Upleer",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description: error.message || "Verifique suas credenciais",
        variant: "destructive",
      });
    }
  });

  const handleLogin = (e: React.FormEvent) => {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <img 
              src={logoPath} 
              alt="Upleer" 
              className="h-20 w-auto object-contain"
            />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Plataforma completa para autores publicarem e gerenciarem a venda de suas apostilas digitais
          </p>
        </div>

        {/* Login Form */}
        <div className="max-w-md mx-auto mb-16">
          <Card className="p-6">
            <CardContent>
              <h2 className="text-2xl font-bold text-center mb-6">Entrar no Upleer</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>
              <p className="text-sm text-gray-600 text-center mt-4">
                Use qualquer email válido e senha para acessar o sistema
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center p-6">
            <CardContent>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="text-primary text-2xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Fácil</h3>
              <p className="text-gray-600">
                Faça upload dos seus PDFs com validação automática de formato A4 e contagem de páginas
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="text-accent text-2xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytics Detalhado</h3>
              <p className="text-gray-600">
                Acompanhe suas vendas, receita e performance com dashboards visuais e relatórios
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent>
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-purple-600 text-2xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Seguro e Confiável</h3>
              <p className="text-gray-600">
                Seus arquivos e dados estão protegidos com segurança de nível empresarial
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-primary hover:bg-blue-600 text-white px-8 py-3 text-lg" onClick={() => window.location.href = '/api/login'}>
              Entrar
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-3 text-lg" onClick={() => window.location.href = '/api/login'}>
              Criar Conta
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Grátis para começar • Sem taxas de setup
          </p>
        </div>
      </div>
    </div>
  );
}
