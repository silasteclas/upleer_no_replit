import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
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

  // Debug: Log completo dos dados da venda
  console.log('🔍 DADOS COMPLETOS DA VENDA:', JSON.stringify(sale, null, 2));

  // Calculate total products in this order
  const getProductCount = () => {
    if (!sale || !Array.isArray(sales)) return 1;
    
    // FASE 4: NOVA ESTRUTURA MARKETPLACE
    // Usar saleItems para contar produtos reais
    if (sale.saleItems && sale.saleItems.length > 0) {
      return sale.saleItems.reduce((total: number, item: any) => total + item.quantity, 0);
    }
    
    // Fallback: se não há saleItems, usar quantity da venda
    return sale.quantity || 1;
  };

  const productCount = getProductCount();

  // Obter informações do pedido
  const orderInfo = sale?.order || {
    cliente_nome: sale?.buyerName || '',
    cliente_email: sale?.buyerEmail || '',
    valor_total: Number(sale?.salePrice) || 0,
  };

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
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={`Pedido #${String(sale.vendorOrderNumber || 1).padStart(3, '0')}`}
        subtitle="Detalhes completos do pedido"
      />
      <Sidebar />
      <main className="ml-64 pt-32 p-6 min-h-screen overflow-auto">
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Package className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Número do pedido</div>
                    <div className="text-2xl font-bold text-purple-600">
                      #{String(sale.vendorOrderNumber || 1).padStart(3, '0')}
                    </div>
                  </div>
                  
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
                  
                  <div className="text-center p-4 bg-indigo-50 rounded-lg">
                    <User className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Cliente</div>
                    <div className="font-semibold text-gray-900 truncate">
                      {/* FASE 4: Usar dados do order quando disponível */}
                      {orderInfo.cliente_nome 
                        ? orderInfo.cliente_nome.split(' ')[0] 
                        : (sale.buyerName ? sale.buyerName.split(' ')[0] : sale.buyerEmail.split('@')[0])
                      }
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <ShoppingBag className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Produtos</div>
                    <div className="text-2xl font-bold text-orange-600">{productCount}</div>
                  </div>
                  
                  <div className="text-center p-4 bg-teal-50 rounded-lg">
                    <Truck className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Status do envio</div>
                    <div className="font-semibold text-gray-900">
                      {(() => {
                        // Tradução dinâmica do status de envio para português do Brasil
                        const statusEnvio = sale.order?.status_envio || 'unpacked';
                        switch(statusEnvio) {
                          case 'unpacked':
                          case 'not_packed':
                          case 'pending':
                            return 'Preparando';
                          case 'packed':
                          case 'ready':
                          case 'ready_to_ship':
                            return 'Pronto';
                          case 'shipped':
                          case 'sent':
                          case 'dispatched':
                            return 'Enviado';
                          case 'in_transit':
                          case 'transit':
                          case 'on_the_way':
                            return 'Em trânsito';
                          case 'out_for_delivery':
                          case 'delivering':
                            return 'Saiu para entrega';
                          case 'delivered':
                          case 'completed':
                            return 'Entregue';
                          case 'returned':
                          case 'return':
                            return 'Devolvido';
                          case 'cancelled':
                          case 'canceled':
                            return 'Cancelado';
                          case 'failed':
                          case 'failed_delivery':
                            return 'Falha na entrega';
                          case 'lost':
                            return 'Extraviado';
                          default:
                            return 'Preparando';
                        }
                      })()}
                    </div>
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
                      <div className="font-medium">
                        {/* FASE 4: Priorizar dados do order */}
                        {orderInfo.cliente_nome || sale.buyerName || "Não informado"}
                      </div>
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
                    <User className="w-4 h-4 text-blue-400 mt-1" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Tipo de cliente</div>
                      <div className="font-medium">
                        {(() => {
                          // Verificar se é cliente novo baseado no nome e CPF
                          const hasFullName = (orderInfo.cliente_nome || sale.buyerName);
                          const hasCpf = sale.buyerCpf;
                          
                          if (hasFullName && hasCpf) {
                            return (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Cliente Recorrente
                              </span>
                            );
                          } else {
                            return (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Cliente Novo
                              </span>
                            );
                          }
                        })()}
                      </div>
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
                    <Badge className={`${
                      sale.paymentStatus === 'aprovado' ? 'bg-green-100 text-green-700' :
                      sale.paymentStatus === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                      sale.paymentStatus === 'devolvido' ? 'bg-red-100 text-red-700' :
                      sale.paymentStatus === 'cancelado' ? 'bg-gray-100 text-gray-700' :
                      sale.paymentStatus === 'processando' ? 'bg-blue-100 text-blue-700' :
                      sale.paymentStatus === 'estornado' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {(() => {
                        // Tradução dinâmica do status para português do Brasil
                        switch(sale.paymentStatus) {
                          case 'aprovado':
                          case 'approved':
                          case 'paid':
                            return 'Aprovado';
                          case 'pendente':
                          case 'pending':
                            return 'Pendente';
                          case 'devolvido':
                          case 'refunded':
                            return 'Devolvido';
                          case 'cancelado':
                          case 'cancelled':
                          case 'canceled':
                            return 'Cancelado';
                          case 'processando':
                          case 'processing':
                            return 'Processando';
                          case 'estornado':
                          case 'chargeback':
                            return 'Estornado';
                          case 'rejeitado':
                          case 'rejected':
                          case 'denied':
                            return 'Rejeitado';
                          case 'expirado':
                          case 'expired':
                            return 'Expirado';
                          default:
                            return 'Pendente';
                        }
                      })()}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Método</span>
                    <span className="font-medium">
                      {(() => {
                        // Tradução dinâmica do método de pagamento para português do Brasil
                        switch(sale.paymentMethod) {
                          case 'cartao_credito':
                          case 'credit_card':
                          case 'creditcard':
                            return 'Cartão de Crédito';
                          case 'cartao_debito':
                          case 'debit_card':
                          case 'debitcard':
                            return 'Cartão de Débito';
                          case 'pix':
                          case 'PIX':
                            return 'PIX';
                          case 'boleto':
                          case 'bank_slip':
                          case 'bankslip':
                            return 'Boleto Bancário';
                          case 'transferencia':
                          case 'bank_transfer':
                          case 'transfer':
                            return 'Transferência Bancária';
                          case 'dinheiro':
                          case 'cash':
                          case 'money':
                            return 'Dinheiro';
                          case 'paypal':
                          case 'PayPal':
                            return 'PayPal';
                          case 'mercadopago':
                          case 'mercado_pago':
                          case 'MercadoPago':
                            return 'Mercado Pago';
                          case 'pagseguro':
                          case 'pag_seguro':
                          case 'PagSeguro':
                            return 'PagSeguro';
                          case 'cielo':
                          case 'Cielo':
                            return 'Cielo';
                          case 'stone':
                          case 'Stone':
                            return 'Stone';
                          case 'simulacao':
                          case 'simulation':
                          case 'test':
                            return 'Simulação';
                          case '':
                          case null:
                          case undefined:
                            return 'Não informado';
                          default:
                            // Se não reconhecer, capitaliza a primeira letra
                            return sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1);
                        }
                      })()}
                    </span>
                  </div>

                  {sale.paymentMethod === 'cartao_credito' && sale.installments > 1 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Parcelas</span>
                      <span className="font-medium">{sale.installments}x de R$ {(parseFloat(sale.salePrice) / sale.installments).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* Mostrar data do pagamento apenas quando o pagamento estiver aprovado */}
                  {(sale.paymentStatus === 'aprovado' || sale.paymentStatus === 'approved' || sale.paymentStatus === 'paid') && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Data do pagamento</span>
                      <span className="font-medium">
                        {sale.orderDate ? 
                          format(new Date(sale.orderDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) :
                          format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        }
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Delivery Information */}
              {(sale.shippingCarrier || sale.deliveryDays || (sale.shippingCost && parseFloat(sale.shippingCost) > 0)) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="w-5 h-5" />
                      <span>Informações de Entrega</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {sale.shippingCarrier && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Transportadora</span>
                        <span className="font-medium">{sale.shippingCarrier}</span>
                      </div>
                    )}

                    {sale.deliveryDays && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Prazo de entrega</span>
                        <span className="font-medium">{sale.deliveryDays} dias úteis</span>
                      </div>
                    )}

                    {sale.shippingCost && parseFloat(sale.shippingCost) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Valor do frete</span>
                        <span className="font-medium">R$ {parseFloat(sale.shippingCost).toFixed(2)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
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
                {/* FASE 4: NOVA ESTRUTURA MARKETPLACE - Mostrar saleItems */}
                {sale.saleItems && sale.saleItems.length > 0 ? (
                  <div className="space-y-4">
                    {sale.saleItems.map((item: any, index: number) => {
                      // DEBUG: Verificar se foto_produto existe
                      console.log('🖼️ DEBUG foto_produto:', item.foto_produto);
                      
                      return (
                        <div key={index} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-16 h-20 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                                {item.foto_produto ? (
                                  <img 
                                    src={item.foto_produto} 
                                    alt={item.product_name}
                                    className="w-full h-full object-cover rounded"
                                    onLoad={() => console.log('✅ Imagem carregada:', item.foto_produto)}
                                    onError={(e) => {
                                      console.log('❌ Erro ao carregar imagem:', item.foto_produto);
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : (
                                  <>
                                    {console.log('📄 Usando ícone FileText - foto_produto não existe')}
                                    <FileText className="w-8 h-8 text-gray-400" />
                                  </>
                                )}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{item.product_name}</h4>
                                <div className="flex items-center space-x-4 mt-2">
                                  <span className="text-xs text-gray-500">Quantidade: {item.quantity}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                R$ {Number(item.price).toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Unitário: R$ {(Number(item.price) / item.quantity).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Fallback: mostrar produto principal se não há saleItems
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-20 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                          {sale.product?.foto_produto ? (
                            <img 
                              src={sale.product?.foto_produto} 
                              alt={sale.product?.title}
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                // Fallback para ícone se a imagem não carregar
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <FileText className={`w-8 h-8 text-gray-400 ${sale.product?.foto_produto ? 'hidden' : 'block'}`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{sale.product?.title}</h4>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-gray-500">Quantidade: {sale.quantity || 1}</span>
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
                )}
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
                  

                  

                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Total da venda</span>
                    <span className="font-bold">R$ {parseFloat(sale.salePrice).toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Custo do produto (Impressão + taxas/impostos):</span>
                    <span className="font-medium">R$ {parseFloat(sale.commission).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Seus ganhos</span>
                    <span className="text-green-600">R$ {parseFloat(sale.authorEarnings).toFixed(2)}</span>
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
                  {/* Pedido criado - sempre existe */}
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Pedido criado</div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(sale.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>

                  {/* Pagamento aprovado - apenas se o pagamento foi aprovado */}
                  {(sale.paymentStatus === 'aprovado' || sale.paymentStatus === 'approved' || sale.paymentStatus === 'paid') && (
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Pagamento aprovado</div>
                        <div className="text-sm text-gray-600">
                          {sale.orderDate ? 
                            format(new Date(sale.orderDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) :
                            format(new Date(sale.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Produto enviado - apenas se foi enviado */}
                  {(sale.order?.status_envio === 'shipped' || sale.order?.status_envio === 'sent' || sale.order?.status_envio === 'dispatched') && (
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <Truck className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Produto enviado</div>
                        <div className="text-sm text-gray-600">
                          {sale.shippingDate ? 
                            format(new Date(sale.shippingDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) :
                            "Data não informada"
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Produto entregue - apenas se foi entregue */}
                  {(sale.order?.status_envio === 'delivered' || sale.order?.status_envio === 'completed') && (
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Produto entregue</div>
                        <div className="text-sm text-gray-600">
                          {sale.deliveryDate ? 
                            format(new Date(sale.deliveryDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) :
                            "Data não informada"
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}