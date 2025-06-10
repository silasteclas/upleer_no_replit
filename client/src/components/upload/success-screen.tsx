import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { CheckCircle, Package, Shield, Truck, Users, Eye, CreditCard, Gift } from "lucide-react";
import { useEffect, useState } from "react";

interface SuccessScreenProps {
  product: {
    title: string;
    coverUrl?: string;
    pageCount: number;
    salePrice: number;
    authorEarnings: number;
  };
  onClose?: () => void;
}

export function SuccessScreen({ product, onClose }: SuccessScreenProps) {
  const [, setLocation] = useLocation();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Fade-in animation
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const benefits = [
    {
      icon: Package,
      text: "Impressão sem custo: você não paga nada para imprimir suas apostilas.",
      delay: "delay-100"
    },
    {
      icon: Package,
      text: "Zero estoque: esqueça preocupações com armazenamento e desperdício.",
      delay: "delay-200"
    },
    {
      icon: Truck,
      text: "Logística facilitada: cuidamos de toda entrega diretamente ao seu cliente.",
      delay: "delay-300"
    },
    {
      icon: Shield,
      text: "Proteção reforçada: seu produto agora está protegido contra pirataria digital.",
      delay: "delay-400"
    },
    {
      icon: Users,
      text: "Novos clientes: seu produto atingirá novos públicos que preferem material físico.",
      delay: "delay-500"
    },
    {
      icon: Eye,
      text: "Mais visibilidade: venda nos maiores canais como Mercado Livre, Shopee e Amazon.",
      delay: "delay-600"
    },
    {
      icon: CreditCard,
      text: "Pagamento facilitado: receba diretamente na sua conta, rápido e seguro.",
      delay: "delay-700"
    },
    {
      icon: Gift,
      text: "Embalagens profissionais: sem custos adicionais, cuidamos de tudo para você.",
      delay: "delay-800"
    }
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 transition-all duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`transform transition-all duration-1000 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                🎉 Parabéns! Seu produto foi enviado para avaliação.
              </h1>
              <p className="text-xl text-gray-600 font-medium">
                Você acaba de dar um grande passo rumo a novas oportunidades!
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            
            {/* Mockup Section */}
            <div className={`transform transition-all duration-1000 delay-300 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <Card className="bg-white/80 backdrop-blur-sm shadow-2xl border-0">
                <CardContent className="p-8">
                  {/* Product Mockup */}
                  <div className="relative max-w-64 mx-auto">
                    {/* Book Stack Effect */}
                    <div className="relative">
                      {/* Shadow pages */}
                      <div className="absolute inset-0 bg-gray-300 rounded-lg transform translate-x-2 translate-y-2 aspect-[3/4]"></div>
                      <div className="absolute inset-0 bg-gray-200 rounded-lg transform translate-x-1 translate-y-1 aspect-[3/4]"></div>
                      
                      {/* Main book cover */}
                      <div className="relative bg-white rounded-lg shadow-xl aspect-[3/4] overflow-hidden transform hover:scale-105 transition-all duration-500">
                        {product.coverUrl ? (
                          <div className="h-full relative">
                            <img
                              src={product.coverUrl}
                              alt="Capa da apostila"
                              className="w-full h-full object-cover"
                            />
                            {/* Professional overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4">
                              <h3 className="text-white text-sm font-bold leading-tight">
                                {product.title}
                              </h3>
                              <div className="text-white/80 text-xs mt-1">
                                Material Impresso Profissional
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative flex flex-col p-6">
                            <div className="text-center mb-4">
                              <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-semibold">
                                UPLEER
                              </div>
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                              <Package className="w-16 h-16 text-white/30" />
                            </div>
                            <div className="text-center space-y-2">
                              <h3 className="text-white text-sm font-bold leading-tight">
                                {product.title}
                              </h3>
                              <div className="text-white/60 text-xs">
                                Material Impresso Profissional
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Info badges */}
                    <div className="absolute -top-3 -right-3 bg-orange-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-semibold animate-pulse">
                      {product.pageCount} páginas
                    </div>
                    
                    <div className="absolute -bottom-3 -left-3 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-semibold animate-pulse">
                      R$ {product.salePrice.toFixed(2)}
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-green-700 font-semibold">
                        💰 Você receberá R$ {product.authorEarnings.toFixed(2)} por venda
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Benefits Section */}
            <div className={`transform transition-all duration-1000 delay-500 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <Card className="bg-white/80 backdrop-blur-sm shadow-2xl border-0">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <Badge className="bg-blue-100 text-blue-800 px-4 py-2 text-sm font-semibold">
                      🚀 Benefícios Imediatos
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    {benefits.map((benefit, index) => (
                      <div
                        key={index}
                        className={`flex items-start space-x-3 p-3 rounded-lg bg-green-50/50 border border-green-100 transform transition-all duration-500 hover:scale-[1.02] hover:bg-green-50 ${benefit.delay} ${showContent ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {benefit.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Final Message */}
          <div className={`mt-8 text-center transform transition-all duration-1000 delay-1000 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 max-w-2xl mx-auto">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="text-gray-700 text-lg leading-relaxed">
                    💬 <strong>Em breve, nossa equipe revisará seu produto e, após aprovado, estará disponível para venda.</strong>
                    <br />
                    Fique atento ao seu painel para acompanhar o andamento.
                  </div>
                  
                  <Button
                    onClick={() => {
                      setLocation('/');
                      // Reset modal state if onClose is provided
                      if (onClose) onClose();
                    }}
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    📌 Voltar para o Painel do Autor
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}