import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Calendar, DollarSign, Package, User, ShoppingBag, Truck, CreditCard, FileText, Download, Mail, MapPin, Phone, CreditCard as IdCard, Home } from "lucide-react";

export default function SaleDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  
  const { data: sales, isLoading } = useQuery({
    queryKey: ["/api/sales"],
  });

  const sale = Array.isArray(sales) ? sales.find((s: any) => s.id.toString() === id) : null;

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Carregando..." subtitle="Buscando detalhes do pedido" />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Pedido não encontrado" subtitle="O pedido solicitado não foi encontrado" />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto text-center">
              <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido não encontrado</h2>
              <p className="text-gray-600 mb-6">O pedido #{id} não foi encontrado em sua conta.</p>
              <Button onClick={() => setLocation("/sales")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para vendas
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={`Pedido #${sale.id.toString().padStart(6, '0')}`}
          subtitle="Detalhes completos do pedido"
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/sales")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para vendas</span>
              </Button>
            </div>

            {/* Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Resumo do Pedido</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <CreditCard className="w-3 h-3 mr-1" />
                      Pago
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      <Truck className="w-3 h-3 mr-1" />
                      Digital
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Data do pedido</div>
                    <div className="font-semibold text-gray-900">
                      {format(new Date(sale.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(sale.createdAt), "HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Valor total</div>
                    <div className="text-2xl font-bold text-green-600">
                      R$ {parseFloat(sale.salePrice).toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <User className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Cliente</div>
                    <div className="font-semibold text-gray-900 truncate">
                      {sale.buyerEmail}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <ShoppingBag className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Produtos</div>
                    <div className="text-2xl font-bold text-orange-600">1</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Informações do Cliente</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <User className="w-4 h-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Nome completo</div>
                      <div className="font-medium">{sale.buyerName || "Não informado"}</div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <IdCard className="w-4 h-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">CPF</div>
                      <div className="font-medium">{sale.buyerCpf || "Não informado"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Mail className="w-4 h-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Email</div>
                      <div className="font-medium">{sale.buyerEmail || "Não informado"}</div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Phone className="w-4 h-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Telefone</div>
                      <div className="font-medium">{sale.buyerPhone || "Não informado"}</div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Home className="w-4 h-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Endereço completo</div>
                      <div className="font-medium">
                        {sale.buyerAddress ? (
                          <>
                            <div>{sale.buyerAddress}</div>
                            <div className="text-sm text-gray-500">{sale.buyerCity} - {sale.buyerState}</div>
                            <div className="text-sm text-gray-500">CEP: {sale.buyerZipCode}</div>
                          </>
                        ) : (
                          "Não informado"
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Método de entrega</div>
                      <div className="font-medium">Download digital</div>
                      <div className="text-xs text-gray-500 mt-1">Não requer entrega física</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="w-5 h-5" />
                    <span>Informações de Pagamento</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status</span>
                    <Badge className="bg-green-100 text-green-700">Aprovado</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Método</span>
                    <span className="font-medium">Simulação</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Data do pagamento</span>
                    <span className="font-medium">
                      {format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>Produtos do Pedido</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-20 bg-gray-100 rounded flex items-center justify-center">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{sale.product?.title}</h4>
                        <p className="text-sm text-gray-600">por {sale.product?.author}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">PDF Digital</span>
                          <span className="text-xs text-gray-500">Quantidade: 1</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        R$ {parseFloat(sale.salePrice).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Resumo Financeiro</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal do produto</span>
                    <span className="font-medium">R$ {parseFloat(sale.salePrice).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Frete</span>
                    <span className="font-medium text-blue-600">Grátis (Digital)</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Cupom de desconto</span>
                    <span className="font-medium text-gray-500">Não aplicado</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Total da venda</span>
                    <span className="font-bold">R$ {parseFloat(sale.salePrice).toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Taxa da plataforma (30%)</span>
                    <span className="font-medium text-red-600">- R$ {parseFloat(sale.commission).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Seus ganhos</span>
                    <span className="text-green-600">R$ {parseFloat(sale.authorEarnings).toFixed(2)}</span>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mt-4">
                    <div className="text-sm text-gray-600 mb-2">Cronograma de repasse</div>
                    <div className="text-sm">
                      <span className="font-medium">Próximo repasse:</span> {format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "dd 'de' MMMM", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Pagamento aprovado</div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(sale.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Download className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Produto disponível para download</div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(sale.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Pedido criado</div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(sale.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}