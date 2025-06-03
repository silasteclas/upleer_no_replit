import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Calendar, DollarSign, Package, User, ChevronDown, ChevronRight, ShoppingBag, Truck, CreditCard } from "lucide-react";
import { useState } from "react";

export default function Sales() {
  const [expandedSales, setExpandedSales] = useState<Set<number>>(new Set());
  
  const { data: sales, isLoading } = useQuery({
    queryKey: ["/api/sales"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const toggleExpanded = (saleId: number) => {
    const newExpanded = new Set(expandedSales);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedSales(newExpanded);
  };

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
                    {Array.isArray(sales) && sales.map((sale: any) => {
                      const isExpanded = expandedSales.has(sale.id);
                      return (
                        <div key={sale.id} className="border rounded-lg bg-white shadow-sm">
                          <div 
                            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleExpanded(sale.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center text-gray-600">
                                  {isExpanded ? (
                                    <ChevronDown className="w-5 h-5" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5" />
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-6">
                                  <div>
                                    <p className="font-semibold text-gray-900">Pedido #{sale.id.toString().padStart(6, '0')}</p>
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
                                  
                                  <div className="flex items-center space-x-2">
                                    <Truck className="w-4 h-4 text-blue-500" />
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                      Digital
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
                          
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t bg-gray-50">
                              <div className="pt-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <h4 className="font-medium text-gray-900 mb-3">Produtos</h4>
                                    <div className="bg-white rounded p-3 border">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium text-gray-900">{sale.product?.title}</p>
                                          <p className="text-sm text-gray-500">por {sale.product?.author}</p>
                                          <p className="text-xs text-gray-400 mt-1">Quantidade: 1</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-semibold text-gray-900">R$ {parseFloat(sale.salePrice).toFixed(2)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-medium text-gray-900 mb-3">Detalhes Financeiros</h4>
                                    <div className="bg-white rounded p-3 border space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Subtotal:</span>
                                        <span>R$ {parseFloat(sale.salePrice).toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Taxa da plataforma (30%):</span>
                                        <span>R$ {parseFloat(sale.commission).toFixed(2)}</span>
                                      </div>
                                      <Separator />
                                      <div className="flex justify-between font-semibold">
                                        <span>Seus ganhos:</span>
                                        <span className="text-green-600">R$ {parseFloat(sale.authorEarnings).toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-3">Informações da Venda</h4>
                                  <div className="bg-white rounded p-3 border">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-600">Data do pedido:</span>
                                        <p className="font-medium">{format(new Date(sale.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Status do pagamento:</span>
                                        <p className="font-medium text-green-600">Aprovado</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Método de entrega:</span>
                                        <p className="font-medium">Download digital</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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