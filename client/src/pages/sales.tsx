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
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            title="Vendas" 
            subtitle="Acompanhe suas vendas e ganhos"
          />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
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
      </div>
    );
  }

  const totalRevenue = Array.isArray(sales) ? sales.reduce((sum: number, sale: any) => sum + sale.amount, 0) : 0;
  const totalSales = Array.isArray(sales) ? sales.length : 0;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Vendas" 
          subtitle="Acompanhe suas vendas e ganhos"
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
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
                <CardTitle className="flex items-center justify-between">
                  <span>Histórico de Vendas</span>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!Array.isArray(sales) || sales.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma venda ainda</h3>
                    <p className="mt-2 text-gray-500">
                      Suas vendas aparecerão aqui quando começarem a acontecer.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(sales) && sales.map((sale: any) => (
                      <div 
                        key={sale.id} 
                        className="border rounded-lg bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setLocation(`/sales/${sale.id}`)}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center text-gray-600">
                                <ChevronRight className="w-5 h-5" />
                              </div>
                              
                              <div className="flex items-center space-x-6">
                                <div>
                                  <p className="font-semibold text-gray-900">Pedido #{sale.id.toString().padStart(5, '0')}</p>
                                  <p className="text-sm text-gray-500">
                                    {format(new Date(sale.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                </div>
                                
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{sale.buyerEmail}</p>
                                  <p className="text-xs text-gray-500">Cliente</p>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <ShoppingBag className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">1 produto</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-6">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <CreditCard className="w-4 h-4 text-green-500" />
                                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                                    Pago
                                  </Badge>
                                </div>
                                

                              </div>
                              
                              <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">
                                  R$ {parseFloat(sale.salePrice).toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500">Total</p>
                              </div>
                            </div>
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
    </div>
  );
}