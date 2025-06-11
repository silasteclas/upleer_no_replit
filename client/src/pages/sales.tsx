import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Calendar, DollarSign, Package, User, ChevronRight, ShoppingBag, Truck, CreditCard, RefreshCw } from "lucide-react";

export default function Sales() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: sales, isLoading, refetch } = useQuery({
    queryKey: ["/api/sales"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  }) as { data: any };

  const handleRefresh = async () => {
    await refetch();
    // Also invalidate related queries
    queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          title="Vendas" 
          subtitle="Acompanhe suas vendas e ganhos"
        />
        <Sidebar />
        <main className="ml-64 pt-32 p-6 min-h-screen overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="grid gap-6">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const totalRevenue = Array.isArray(sales) ? sales.reduce((sum: number, sale: any) => sum + parseFloat(sale.salePrice), 0) : 0;
  const totalSales = Array.isArray(sales) ? sales.length : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Vendas" 
        subtitle="Acompanhe suas vendas e ganhos"
      />
      <Sidebar />
      <main className="ml-64 pt-32 p-6 min-h-screen overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Receita Total</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {totalRevenue.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
                    <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <User className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                    <p className="text-2xl font-bold text-gray-900">
                      R$ {totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Histórico de Vendas
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!Array.isArray(sales) || sales.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma venda realizada</h3>
                  <p className="text-gray-600">Quando você tiver vendas, elas aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sales.map((sale: any) => (
                    <div 
                      key={sale.id} 
                      onClick={() => setLocation(`/sales/${sale.id}`)}
                      className="border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                    >
                      {/* Desktop Layout */}
                      <div className="hidden lg:flex items-center justify-between">
                        <div className="flex items-center space-x-6 flex-1">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{sale.product?.title || 'Produto'}</h4>
                            <p className="text-sm text-gray-600 truncate">por {sale.product?.author || 'Autor'}</p>
                          </div>
                          <div className="text-left min-w-0 flex-shrink-0 w-48">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Comprador</p>
                            <p className="font-medium text-sm truncate">{sale.buyerName}</p>
                            <p className="text-xs text-gray-600 truncate">{sale.buyerEmail}</p>
                          </div>
                          <div className="text-center flex-shrink-0 w-24">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Comissão</p>
                            <p className="text-lg font-bold text-green-600">R$ {(parseFloat(sale.salePrice) * 0.8).toFixed(2)}</p>
                          </div>
                          <div className="text-center flex-shrink-0 w-24">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Data</p>
                            <p className="font-medium text-sm">{format(new Date(sale.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
                            <p className="text-xs text-gray-600">{format(new Date(sale.createdAt), "HH:mm", { locale: ptBR })}</p>
                          </div>
                          <div className="text-center flex-shrink-0 w-20">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                            <Badge variant={sale.paymentStatus === 'paid' ? 'default' : 'secondary'} className="text-xs">
                              <CreditCard className="w-3 h-3 mr-1" />
                              {sale.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                            </Badge>
                          </div>
                        </div>
                        <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>

                      {/* Tablet Layout */}
                      <div className="hidden md:flex lg:hidden flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{sale.product?.title || 'Produto'}</h4>
                            <p className="text-sm text-gray-600 truncate">por {sale.product?.author || 'Autor'}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">R$ {(parseFloat(sale.salePrice) * 0.8).toFixed(2)}</p>
                              <Badge variant={sale.paymentStatus === 'paid' ? 'default' : 'secondary'} className="text-xs">
                                <CreditCard className="w-3 h-3 mr-1" />
                                {sale.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                              </Badge>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-600 truncate">{sale.buyerName} • {sale.buyerEmail}</p>
                          </div>
                          <div className="text-gray-500">
                            {format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                      </div>

                      {/* Mobile Layout */}
                      <div className="flex md:hidden flex-col space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{sale.product?.title || 'Produto'}</h4>
                            <p className="text-sm text-gray-600 truncate">por {sale.product?.author || 'Autor'}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-600 truncate">{sale.buyerName}</p>
                            <p className="text-xs text-gray-500 truncate">{sale.buyerEmail}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">R$ {(parseFloat(sale.salePrice) * 0.8).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{format(new Date(sale.createdAt), "dd/MM HH:mm", { locale: ptBR })}</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Badge variant={sale.paymentStatus === 'paid' ? 'default' : 'secondary'} className="text-xs">
                            <CreditCard className="w-3 h-3 mr-1" />
                            {sale.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}