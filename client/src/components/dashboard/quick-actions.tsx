import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, Settings } from "lucide-react";
import { Link } from "wouter";

export default function QuickActions() {
  return (
    <Card className="shadow-sm border border-gray-100">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Link href="/upload">
            <Button className="w-full bg-primary text-white hover:bg-blue-600 transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              Nova Apostila
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Ver Relatórios
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
