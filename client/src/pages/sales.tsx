import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Calendar, DollarSign, Package, User, ChevronRight, ShoppingBag, Truck, CreditCard } from "lucide-react";

export default function Sales() {
  const [, setLocation] = useLocation();
  
  const { data: sales, isLoading } = useQuery({
    queryKey: ["/api/sales"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

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
              <CardTitle className="flex items-center">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Histórico de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!Array.isArray(sales) || sales.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma venda realizada</h3>
                  <p className="text-gray-600">Quando você tiver vendas, elas aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sales.map((sale: any) => (
                    <div key={sale.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{sale.product?.title || 'Produto'}</h4>
                              <p className="text-sm text-gray-600">por {sale.product?.author || user?.firstName || 'Autor'}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Comprador</p>
                              <p className="font-medium">{sale.buyerName}</p>
                              <p className="text-sm text-gray-600">{sale.buyerEmail}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Valor</p>
                              <p className="text-lg font-bold text-green-600">R$ {parseFloat(sale.salePrice).toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Data</p>
                              <p className="font-medium">{format(new Date(sale.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
                              <p className="text-sm text-gray-600">{format(new Date(sale.createdAt), "HH:mm", { locale: ptBR })}</p>
                            </div>
                            <div className="text-center">
                              <Badge variant={sale.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                                <CreditCard className="w-3 h-3 mr-1" />
                                {sale.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/sales/${sale.id}`)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
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