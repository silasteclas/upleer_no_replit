import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, DollarSign, Package, TrendingUp } from "lucide-react";

interface StatsData {
  totalSales: number;
  totalRevenue: number;
  activeProducts: number;
  pendingProducts: number;
}

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ["/api/analytics/stats"],
  });

  const statsCards = [
    {
      title: "Total de Vendas",
      value: stats?.totalSales || 0,
      change: "+12% vs mês anterior",
      changeType: "positive" as const,
      icon: ShoppingCart,
      iconBg: "bg-blue-100",
      iconColor: "text-primary",
    },
    {
      title: "Receita Total",
      value: `R$ ${(stats?.totalRevenue || 0).toFixed(2)}`,
      change: "+8% vs mês anterior",
      changeType: "positive" as const,
      icon: DollarSign,
      iconBg: "bg-green-100",
      iconColor: "text-accent",
    },
    {
      title: "Produtos Ativos",
      value: stats?.activeProducts || 0,
      change: `${stats?.pendingProducts || 0} em avaliação`,
      changeType: "neutral" as const,
      icon: Package,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "Taxa de Conversão",
      value: "3.2%",
      change: "-2% vs mês anterior",
      changeType: "negative" as const,
      icon: TrendingUp,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="shadow-sm border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className={`text-sm mt-1 ${
                    card.changeType === "positive" 
                      ? "text-accent" 
                      : card.changeType === "negative" 
                      ? "text-red-500" 
                      : "text-gray-500"
                  }`}>
                    {card.changeType === "positive" && "↑ "}
                    {card.changeType === "negative" && "↓ "}
                    {card.change}
                  </p>
                </div>
                <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${card.iconColor} text-xl w-6 h-6`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
