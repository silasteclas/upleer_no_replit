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
  const [showSignup, setShowSignup] = useState(false);
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    acceptTerms: false
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
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
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: typeof signupData) => {
      if (data.password !== data.confirmPassword) {
        throw new Error("As senhas não coincidem");
      }
      if (!data.acceptTerms) {
        throw new Error("Você deve aceitar os termos de uso");
      }
      
      const response = await apiRequest("POST", "/api/auth/register", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo ao Upleer",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
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

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    signupMutation.mutate(signupData);
  };

  const updateSignupField = (field: keyof typeof signupData, value: string | boolean) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
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
            Plataforma completa para autores publicarem e gerenciarem a venda de
            suas apostilas digitais
          </p>
        </div>

        {/* Login/Signup Form */}
        <div className="max-w-md mx-auto">
          {!showSignup ? (
            <Card className="p-6">
              <CardContent>
                <h2 className="text-2xl font-bold text-center mb-6">
                  Entrar no Upleer
                </h2>
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

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 text-center mb-3">
                    Novo na Upleer?
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowSignup(true)}
                  >
                    Criar Conta Gratuita
                  </Button>
                </div>

                <p className="text-sm text-gray-600 text-center mt-4">
                  Use qualquer email válido e senha para acessar o sistema
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-6">
              <CardContent>
                <h2 className="text-2xl font-bold text-center mb-6">
                  Criar Conta
                </h2>
                <p className="text-gray-600 text-center mb-6">
                  Junte-se ao Upleer e comece a vender seus materiais
                </p>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName">Nome</Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={signupData.firstName}
                        onChange={(e) => updateSignupField('firstName', e.target.value)}
                        placeholder="Seu nome"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Sobrenome</Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={signupData.lastName}
                        onChange={(e) => updateSignupField('lastName', e.target.value)}
                        placeholder="Sobrenome"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="signupEmail">Email</Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      value={signupData.email}
                      onChange={(e) => updateSignupField('email', e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={signupData.phone}
                      onChange={(e) => updateSignupField('phone', e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="signupPassword">Senha</Label>
                    <Input
                      id="signupPassword"
                      type="password"
                      value={signupData.password}
                      onChange={(e) => updateSignupField('password', e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={signupData.confirmPassword}
                      onChange={(e) => updateSignupField('confirmPassword', e.target.value)}
                      placeholder="Digite a senha novamente"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="acceptTerms"
                      checked={signupData.acceptTerms}
                      onChange={(e) => updateSignupField('acceptTerms', e.target.checked)}
                      className="mt-1"
                      required
                    />
                    <Label htmlFor="acceptTerms" className="text-sm leading-5">
                      Eu aceito os{" "}
                      <a href="#" className="text-blue-600 hover:underline">
                        Termos de Uso
                      </a>{" "}
                      e a{" "}
                      <a href="#" className="text-blue-600 hover:underline">
                        Política de Privacidade
                      </a>
                    </Label>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={signupMutation.isPending}
                  >
                    {signupMutation.isPending ? "Criando conta..." : "Criar Conta"}
                  </Button>
                </form>
                
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 text-center mb-3">
                    Já tem uma conta?
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowSignup(false)}
                  >
                    Fazer Login
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
