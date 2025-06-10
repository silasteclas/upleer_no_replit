import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, TrendingUp, DollarSign, Eye, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AdminStats {
  totalAuthors: number;
  totalProducts: number;
  activeProducts: number;
  pendingProducts: number;
  totalSales: number;
  totalRevenue: number;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  createdAt: string;
}

interface Product {
  id: number;
  title: string;
  author: string;
  status: string;
  salePrice: string;
  createdAt: string;
  authorId: string;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: adminUser } = useQuery<{id: string; email: string; firstName?: string; lastName?: string; role: string}>({
    queryKey: ['/api/admin/user'],
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/dashboard-stats'],
    retry: false,
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    retry: false,
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/admin/all-products'],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/logout', 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Logout realizado",
        description: "Sessão administrativa encerrada",
      });
      setLocation('/admin/login');
    },
  });

  if (!adminUser) {
    setLocation('/admin/login');
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'approved': 'default',
      'pending': 'secondary',
      'rejected': 'destructive',
      'draft': 'outline'
    };
    
    const labels: Record<string, string> = {
      'approved': 'Aprovado',
      'pending': 'Pendente',
      'rejected': 'Rejeitado',
      'draft': 'Rascunho'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
              <p className="text-sm text-gray-600">
                Bem-vindo, {adminUser?.firstName || adminUser?.email}
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Autores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalAuthors || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalProducts || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.activeProducts || 0} ativos, {stats?.pendingProducts || 0} pendentes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalSales || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Authors List */}
          <Card>
            <CardHeader>
              <CardTitle>Autores Cadastrados</CardTitle>
              <CardDescription>Lista de todos os autores na plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div>Carregando autores...</div>
              ) : (
                <div className="space-y-3">
                  {users?.filter(u => u.role === 'author').slice(0, 10).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}` 
                            : user.email}
                        </p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          Cadastrado em {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {users?.filter(u => u.role === 'author').length === 0 && (
                    <p className="text-center text-gray-500 py-4">Nenhum autor cadastrado</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Produtos Recentes</CardTitle>
                <CardDescription>Últimos produtos cadastrados na plataforma</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation('/admin/products')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Todos
              </Button>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div>Carregando produtos...</div>
              ) : (
                <div className="space-y-3">
                  {products?.slice(0, 10).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{product.title}</p>
                        <p className="text-sm text-gray-600">por {product.author}</p>
                        <p className="text-sm font-medium text-green-600">
                          {formatCurrency(parseFloat(product.salePrice))}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(product.status)}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(product.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {products?.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Nenhum produto cadastrado</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}