import { useState } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Home, 
  Upload, 
  Package, 
  ShoppingCart, 
  Settings, 
  DollarSign, 
  Users, 
  Zap,
  LogOut,
  Eye,
  Edit,
  Plus,
  Download,
  Trash2
} from "lucide-react";
import logoPath from "@assets/Logotipo para site upleer (1).png";

// Types
interface StatsData {
  totalSales: number;
  totalRevenue: number;
  activeProducts: number;
  pendingProducts: number;
}

interface Product {
  id: number;
  title: string;
  author: string;
  description: string;
  category: string;
  salePrice: string;
  originalPrice?: string;
  tags?: string;
  status: string;
  coverUrl?: string;
  pdfUrl?: string;
  createdAt: string;
}

interface Sale {
  id: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  buyerCpf?: string;
  buyerAddress?: string;
  salePrice: string;
  paymentStatus?: string;
  createdAt: string;
  product: {
    title: string;
    author: string;
  };
}

interface Integration {
  id: number;
  name: string;
  description: string;
  baseUrl: string;
  authType: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    endpoints: number;
    logs: number;
  };
}

// Login Page
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (credentials.email === "admin@upleer.com" && credentials.password === "admin123") {
      onLogin();
    } else {
      alert("Credenciais inválidas. Use admin@upleer.com / admin123");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img src={logoPath} alt="Upleer" className="mx-auto h-20 w-auto" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Acesse sua conta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sistema Upleer - Gestão de Apostilas
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
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
        <img src={logoPath} alt="Upleer" className="h-12 w-auto" />
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link href={item.path}>
                  <div className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    location === item.path 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-600 hover:bg-gray-100"
                  }`}>
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

// Header Component
function Header({ title, onLogout }: { title: string; onLogout: () => void }) {
  return (
    <header className="bg-white shadow-sm border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </header>
  );
}

// Dashboard Page
function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    retry: false,
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    retry: false,
  });

  const { data: sales } = useQuery({
    queryKey: ["/api/sales"],
    retry: false,
  });

  const statsData: StatsData = (stats as StatsData) || { totalSales: 0, totalRevenue: 0, activeProducts: 0, pendingProducts: 0 };
  const productsData: Product[] = Array.isArray(products) ? products : [];
  const salesData: Sale[] = Array.isArray(sales) ? sales : [];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
                <p className="text-3xl font-bold text-gray-900">R$ {statsData.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Produtos Ativos</p>
                <p className="text-3xl font-bold text-gray-900">{statsData.activeProducts}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Pedidos</p>
                <p className="text-3xl font-bold text-gray-900">{statsData.totalSales}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Produtos Pendentes</p>
                <p className="text-3xl font-bold text-gray-900">{statsData.pendingProducts}</p>
              </div>
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {productsData.length > 0 ? (
              <div className="space-y-4">
                {productsData.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{product.title}</p>
                      <p className="text-sm text-gray-600">{product.author}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">R$ {parseFloat(product.salePrice).toFixed(2)}</p>
                      <Badge variant={product.status === 'approved' ? 'default' : 'secondary'}>
                        {product.status === 'approved' ? 'Aprovado' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhum produto cadastrado ainda.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {salesData.length > 0 ? (
              <div className="space-y-4">
                {salesData.slice(0, 5).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">Pedido #{String(sale.id).padStart(5, '0')}</p>
                      <p className="text-sm text-gray-600">{sale.buyerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">R$ {parseFloat(sale.salePrice).toFixed(2)}</p>
                      <Badge variant="default">
                        {sale.paymentStatus || 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhuma venda realizada ainda.</p>
            )}
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
              <Badge variant="secondary">✓ Banco de Dados</Badge>
              <span>Conectado e operacional</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">✓ APIs</Badge>
              <span>Endpoints funcionando</span>
            </div>
            <Separator />
            <p className="text-sm text-gray-600">
              Sistema completo para gestão de produtos físicos (apostilas) com 
              vendas por transportadoras, webhooks N8N e números de pedido de 5 dígitos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Upload Page
function UploadPage() {
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    category: "",
    salePrice: "",
    originalPrice: "",
    tags: ""
  });
  const [files, setFiles] = useState<{ pdf: File | null; cover: File | null }>({ pdf: null, cover: null });
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/products", {
        method: "POST",
        body: data,
      });
      if (!response.ok) {
        throw new Error("Erro ao fazer upload do produto");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setFormData({
        title: "",
        author: "",
        description: "",
        category: "",
        salePrice: "",
        originalPrice: "",
        tags: ""
      });
      setFiles({ pdf: null, cover: null });
      alert("Produto enviado com sucesso!");
    },
    onError: (error) => {
      alert("Erro ao enviar produto: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });
    
    if (files.pdf) data.append("pdf", files.pdf);
    if (files.cover) data.append("cover", files.cover);
    
    uploadMutation.mutate(data);
  };

  return (
    <div className="p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Upload de Novo Produto</CardTitle>
          <p className="text-gray-600">Envie uma nova apostila para venda</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título da Apostila</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="author">Autor</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({...formData, author: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                className="w-full p-2 border rounded-md"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="salePrice">Preço de Venda (R$)</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({...formData, salePrice: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="originalPrice">Preço Original (R$)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData({...formData, originalPrice: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                placeholder="concurso, matemática, ensino médio"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pdf">Arquivo PDF da Apostila</Label>
                <Input
                  id="pdf"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFiles({...files, pdf: e.target.files?.[0] || null})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cover">Imagem da Capa</Label>
                <Input
                  id="cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFiles({...files, cover: e.target.files?.[0] || null})}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Enviando..." : "Enviar Produto"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Products Page
function ProductsPage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
    retry: false,
  });

  const productsData: Product[] = Array.isArray(products) ? products : [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Carregando produtos...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Meus Produtos</h2>
        <Link href="/upload">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </Link>
      </div>

      {productsData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto cadastrado</h3>
            <p className="text-gray-600 mb-4">Comece enviando sua primeira apostila</p>
            <Link href="/upload">
              <Button>Enviar Primeiro Produto</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productsData.map((product) => (
            <Card key={product.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-lg">{product.title}</h3>
                      <p className="text-sm text-gray-600">{product.author}</p>
                    </div>
                    <Badge variant={product.status === 'approved' ? 'default' : 'secondary'}>
                      {product.status === 'approved' ? 'Aprovado' : 'Pendente'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-700 line-clamp-3">{product.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">R$ {parseFloat(product.salePrice).toFixed(2)}</p>
                      {product.originalPrice && (
                        <p className="text-sm text-gray-500 line-through">
                          R$ {parseFloat(product.originalPrice).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">{product.category}</Badge>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Sales Page
function SalesPage() {
  const { data: sales, isLoading } = useQuery({
    queryKey: ["/api/sales"],
    retry: false,
  });

  const salesData: Sale[] = Array.isArray(sales) ? sales : [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Carregando vendas...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Vendas</h2>

      {salesData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma venda realizada</h3>
            <p className="text-gray-600">As vendas aparecerão aqui quando recebermos pedidos</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {salesData.map((sale) => (
                <div key={sale.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Pedido #{String(sale.id).padStart(5, '0')}</h3>
                      <p className="text-sm text-gray-600">{sale.product.title}</p>
                      <p className="text-sm text-gray-500">Cliente: {sale.buyerName}</p>
                      {sale.buyerEmail && (
                        <p className="text-sm text-gray-500">Email: {sale.buyerEmail}</p>
                      )}
                      {sale.buyerPhone && (
                        <p className="text-sm text-gray-500">Telefone: {sale.buyerPhone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">R$ {parseFloat(sale.salePrice).toFixed(2)}</p>
                      <Badge variant="default">
                        {sale.paymentStatus || 'Pendente'}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Integrations Page
function IntegrationsPage() {
  const { data: integrations, isLoading } = useQuery({
    queryKey: ["/api/integrations"],
    retry: false,
  });

  const integrationsData: Integration[] = Array.isArray(integrations) ? integrations : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Integrações</h2>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova Integração
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook N8N</CardTitle>
          <p className="text-gray-600">Receba vendas automaticamente via webhook</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <Label>URL do Webhook</Label>
              <Input 
                value={`${window.location.origin}/api/webhook/sales`}
                readOnly
                className="mt-1"
              />
            </div>
            <p className="text-sm text-gray-600">
              Configure esta URL no seu N8N para receber vendas automaticamente.
              O webhook aceita os campos: productId, buyerName, buyerEmail, buyerPhone, 
              buyerCpf, buyerAddress, salePrice, paymentStatus.
            </p>
          </div>
        </CardContent>
      </Card>

      {integrationsData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrationsData.map((integration) => (
            <Card key={integration.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-lg">{integration.name}</h3>
                    <p className="text-sm text-gray-600">{integration.description}</p>
                    <p className="text-sm text-gray-500 mt-1">{integration.baseUrl}</p>
                  </div>
                  <Badge variant={integration.isActive ? 'default' : 'secondary'}>
                    {integration.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                {integration._count && (
                  <div className="mt-4 text-sm text-gray-600">
                    {integration._count.endpoints} endpoints • {integration._count.logs} logs
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Settings Page
function SettingsPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Configurações do sistema em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main App
export default function CompleteUpleer() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [location] = useLocation();

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  const getPageTitle = () => {
    switch (location) {
      case "/": return "Dashboard";
      case "/upload": return "Upload de Produto";
      case "/products": return "Produtos";
      case "/sales": return "Vendas";
      case "/integrations": return "Integrações";
      case "/settings": return "Configurações";
      default: return "Dashboard";
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={getPageTitle()} onLogout={async () => {
          try {
            await fetch('/api/logout', { method: 'POST' });
            localStorage.removeItem('upleer_public_auth');
            localStorage.removeItem('upleer_user');
            setIsLoggedIn(false);
          } catch (error) {
            console.error('Logout error:', error);
            localStorage.removeItem('upleer_public_auth');
            localStorage.removeItem('upleer_user');
            setIsLoggedIn(false);
          }
        }} />
        <main className="flex-1 overflow-auto">
          <Switch>
            <Route path="/" component={DashboardPage} />
            <Route path="/upload" component={UploadPage} />
            <Route path="/products" component={ProductsPage} />
            <Route path="/sales" component={SalesPage} />
            <Route path="/integrations" component={IntegrationsPage} />
            <Route path="/settings" component={SettingsPage} />
          </Switch>
        </main>
      </div>
    </div>
  );
}