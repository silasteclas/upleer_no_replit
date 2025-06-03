import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Filter, RefreshCw, Search, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

interface ApiLog {
  id: number;
  integrationId: number;
  endpointId?: number;
  method: string;
  url: string;
  responseStatus?: number;
  responseTime?: number;
  errorMessage?: string;
  createdAt: string;
  integration: {
    name: string;
  };
  endpoint?: {
    name: string;
  };
}

export default function IntegrationLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);

  const { data: logs = [], isLoading, refetch } = useQuery<ApiLog[]>({
    queryKey: ["/api/integrations/logs"],
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.integration.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "success" && log.responseStatus && log.responseStatus < 400) ||
                         (statusFilter === "error" && (!log.responseStatus || log.responseStatus >= 400));
    
    const matchesMethod = methodFilter === "all" || log.method === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const getStatusBadge = (status?: number, errorMessage?: string) => {
    if (errorMessage) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>;
    }
    if (!status) {
      return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
    if (status < 400) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Sucesso</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Erro {status}</Badge>;
  };

  const getMethodBadge = (method: string) => {
    const colors = {
      GET: "bg-blue-100 text-blue-800",
      POST: "bg-green-100 text-green-800",
      PUT: "bg-yellow-100 text-yellow-800",
      DELETE: "bg-red-100 text-red-800",
      PATCH: "bg-purple-100 text-purple-800",
    };
    
    return (
      <Badge className={colors[method as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {method}
      </Badge>
    );
  };

  const formatResponseTime = (time?: number) => {
    if (!time) return "N/A";
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Logs de Integrações"
          subtitle="Monitore chamadas de API e diagnostique problemas"
        />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-6">
              <Link to="/integrations">
                <Button variant="ghost">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para Integrações
                </Button>
              </Link>
              
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Buscar por URL ou integração..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="error">Erro</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Métodos</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="text-sm text-gray-500 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {filteredLogs.length} registros
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Chamadas</CardTitle>
                <CardDescription>
                  Todas as requisições realizadas pelas integrações
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum log encontrado
                    </h3>
                    <p className="text-gray-500">
                      Não há registros que correspondam aos filtros aplicados.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredLogs.map((log) => (
                      <div 
                        key={log.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedLog(log)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getMethodBadge(log.method)}
                            {getStatusBadge(log.responseStatus, log.errorMessage)}
                            <span className="font-medium">{log.integration.name}</span>
                            {log.endpoint && (
                              <span className="text-sm text-gray-500">• {log.endpoint.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{formatResponseTime(log.responseTime)}</span>
                            <span>{formatDate(log.createdAt)}</span>
                          </div>
                        </div>
                        <div className="text-sm font-mono bg-gray-100 p-2 rounded text-gray-800">
                          {log.url}
                        </div>
                        {log.errorMessage && (
                          <div className="text-sm text-red-600 mt-2">
                            Erro: {log.errorMessage}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Detalhes da Requisição</h2>
                <Button variant="ghost" onClick={() => setSelectedLog(null)}>×</Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Integração</label>
                    <p>{selectedLog.integration.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data/Hora</label>
                    <p>{formatDate(selectedLog.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Método</label>
                    <p>{selectedLog.method}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tempo de Resposta</label>
                    <p>{formatResponseTime(selectedLog.responseTime)}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">URL</label>
                  <p className="font-mono bg-gray-100 p-2 rounded text-sm">{selectedLog.url}</p>
                </div>
                
                {selectedLog.responseStatus && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status da Resposta</label>
                    <p>{selectedLog.responseStatus}</p>
                  </div>
                )}
                
                {selectedLog.errorMessage && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Mensagem de Erro</label>
                    <p className="text-red-600">{selectedLog.errorMessage}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}