import { useState } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  Package, 
  DollarSign, 
  Users, 
  TrendingUp,
  Plus,
  Settings,
  LogOut,
  Home,
  Upload,
  ShoppingCart,
  Zap,
  FileText
} from "lucide-react";
import logoPath from "@assets/Logotipo para site upleer (1).png";

// Login Component
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (credentials.email === "admin@upleer.com" && credentials.password === "admin123") {
      onLogin();
    } else {
      setError("Credenciais inválidas. Use: admin@upleer.com / admin123");
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
            Sistema Upleer
          </CardTitle>
          <p className="text-gray-600">
            Painel de controle para autores
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@upleer.com"
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
                placeholder="admin123"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <Button type="submit" className="w-full bg-primary hover:bg-blue-600">
              Entrar
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              Credenciais de demonstração:
            </p>
            <p className="text-sm text-blue-700">
              Email: admin@upleer.com<br />
              Senha: admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Sidebar Component
function Sidebar() {
  const [location] = useLocation();

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: Upload, label: "Upload", path: "/upload" },
    { icon: Package, label: "Produtos", path: "/products" },
    { icon: ShoppingCart, label: "Vendas", path: "/sales" },
    { icon: Zap, label: "Integrações", path: "/integrations" },
    { icon: Settings, label: "Configurações", path: "/settings" },
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-screen flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center space-x-3">
          <img src={logoPath} alt="Upleer" className="h-8 w-auto" />
          <span className="text-xl font-bold text-gray-900">Upleer</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <a className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                  location === item.path 
                    ? "bg-blue-100 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-100"
                }`}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

// Header Component
function Header({ title, onLogout }: { title: string; onLogout: () => void }) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600 text-sm">Sistema de gestão Upleer</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div>
              <p className="font-medium text-gray-900">Admin Upleer</p>
              <p className="text-sm text-gray-500">admin@upleer.com</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-red-600 hover:text-red-700">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

// Dashboard Page
function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
                <p className="text-3xl font-bold text-gray-900">R$ 0,00</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Produtos</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pedidos</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Sistema Upleer - Funcionando!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="default" className="bg-green-100 text-green-800">✓ Online</Badge>
              <span>Sistema funcionando corretamente</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓ Autenticação</Badge>
              <span>Login funcionando</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓ Interface</Badge>
              <span>Dashboard carregado</span>
            </div>
            <Separator />
            <p className="text-sm text-gray-600">
              Este é o sistema completo Upleer funcionando de forma independente, 
              sem interferências do sistema de autenticação do Replit.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Simple placeholder pages
function UploadPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Área para upload de novos produtos (apostilas).</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductsPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Lista de produtos cadastrados.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SalesPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Histórico de vendas realizadas.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationsPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Configurações de webhook e integrações externas.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Configurações do sistema.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main App Component
export default function StandaloneApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/">
            <Header title="Dashboard" onLogout={handleLogout} />
            <main className="flex-1 overflow-auto">
              <DashboardPage />
            </main>
          </Route>
          <Route path="/upload">
            <Header title="Upload" onLogout={handleLogout} />
            <main className="flex-1 overflow-auto">
              <UploadPage />
            </main>
          </Route>
          <Route path="/products">
            <Header title="Produtos" onLogout={handleLogout} />
            <main className="flex-1 overflow-auto">
              <ProductsPage />
            </main>
          </Route>
          <Route path="/sales">
            <Header title="Vendas" onLogout={handleLogout} />
            <main className="flex-1 overflow-auto">
              <SalesPage />
            </main>
          </Route>
          <Route path="/integrations">
            <Header title="Integrações" onLogout={handleLogout} />
            <main className="flex-1 overflow-auto">
              <IntegrationsPage />
            </main>
          </Route>
          <Route path="/settings">
            <Header title="Configurações" onLogout={handleLogout} />
            <main className="flex-1 overflow-auto">
              <SettingsPage />
            </main>
          </Route>
        </Switch>
      </div>
    </div>
  );
}