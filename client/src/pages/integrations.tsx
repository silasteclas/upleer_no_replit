import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Activity, AlertCircle, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

interface ApiIntegration {
  id: number;
  name: string;
  description: string;
  baseUrl: string;
  authType: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    endpoints: number;
    logs: number;
  };
}

export default function Integrations() {
  const { data: integrations = [], isLoading } = useQuery<ApiIntegration[]>({
    queryKey: ["/api/integrations"],
  });

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <AlertCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getAuthTypeBadge = (authType: string) => {
    const colors = {
      api_key: "bg-blue-100 text-blue-800",
      oauth: "bg-green-100 text-green-800", 
      bearer: "bg-purple-100 text-purple-800",
      basic: "bg-gray-100 text-gray-800",
    };
    
    return (
      <Badge className={colors[authType as keyof typeof colors] || colors.basic}>
        {authType.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Integrações de API"
        subtitle="Gerencie conexões com sistemas externos"
      />
      <Sidebar />
      <main className="ml-64 pt-24 p-6 min-h-screen overflow-auto">
        <div className="max-w-7xl mx-auto">
            {/* Actions Bar */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  Integrações ({integrations.length})
                </h1>
                <Link to="/integrations/logs">
                  <Button variant="outline" size="sm">
                    <Activity className="w-4 h-4 mr-2" />
                    Ver Logs
                  </Button>
                </Link>
              </div>
              
              <Link to="/integrations/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Integração
                </Button>
              </Link>
            </div>

            {/* Integrations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))
              ) : integrations.length === 0 ? (
                <div className="col-span-full">
                  <Card className="text-center py-12">
                    <CardContent>
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhuma integração configurada
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Comece criando sua primeira integração com APIs externas.
                      </p>
                      <Link to="/integrations/new">
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Criar Primeira Integração
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                integrations.map((integration) => (
                  <Card key={integration.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(integration.isActive)}
                            {integration.name}
                          </CardTitle>
                          <CardDescription>
                            {integration.description || "Sem descrição"}
                          </CardDescription>
                        </div>
                        {getAuthTypeBadge(integration.authType)}
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">URL Base:</p>
                          <p className="text-sm font-mono bg-gray-100 p-2 rounded text-gray-800">
                            {integration.baseUrl}
                          </p>
                        </div>
                        
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>
                            {integration._count?.endpoints || 0} endpoints
                          </span>
                          <span>
                            {integration._count?.logs || 0} logs
                          </span>
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                          <Link to={`/integrations/${integration.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              <Settings className="w-4 h-4 mr-2" />
                              Configurar
                            </Button>
                          </Link>
                          <Link to={`/integrations/${integration.id}/test`}>
                            <Button variant="outline" size="sm">
                              <Activity className="w-4 h-4 mr-2" />
                              Testar
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
        </div>
      </main>
    </div>
  );
}