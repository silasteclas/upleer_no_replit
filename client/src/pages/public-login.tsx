import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const logoPath = "https://via.placeholder.com/200x100/0066CC/FFFFFF?text=UPLEER";

export default function PublicLogin() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState({
    email: "",
    password: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (credentials.email === "admin@upleer.com" && credentials.password === "admin123") {
      localStorage.setItem('upleer_public_auth', 'true');
      localStorage.setItem('upleer_user', JSON.stringify({
        id: 'admin',
        email: 'admin@upleer.com',
        firstName: 'Admin',
        lastName: 'Upleer'
      }));
      
      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso!",
        variant: "default",
      });
      
      // Force page reload to trigger auth check
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      toast({
        title: "Erro",
        description: "Credenciais inválidas. Use: admin@upleer.com / admin123",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src={logoPath} alt="Upleer" className="h-12 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Acesso ao Painel
          </CardTitle>
          <p className="text-gray-600">
            Entre com suas credenciais
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-blue-600"
            >
              Entrar
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              Credenciais para demonstração:
            </p>
            <p className="text-sm text-blue-700">
              Email: admin@upleer.com
            </p>
            <p className="text-sm text-blue-700">
              Senha: admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}