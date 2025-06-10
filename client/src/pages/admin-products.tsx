import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Eye, Search, FileText, Image, Calendar, User, DollarSign } from "lucide-react";
import { useLocation } from "wouter";

interface Product {
  id: number;
  title: string;
  author: string;
  authorId: string;
  description?: string;
  isbn?: string;
  coAuthors?: string;
  category: string;
  salePrice: string;
  originalPrice?: string;
  profitMargin?: string;
  tags?: string;
  status: string;
  coverUrl?: string;
  pdfUrl?: string;
  publicUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export default function AdminProducts() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");

  const { data: adminUser } = useQuery<{id: string; email: string; firstName?: string; lastName?: string; role: string}>({
    queryKey: ['/api/admin/user'],
    retry: false,
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/admin/all-products'],
    retry: false,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    retry: false,
  });

  if (!adminUser) {
    setLocation('/admin/login');
    return null;
  }

  const authors = users?.filter(u => u.role === 'author') || [];
  
  const filteredProducts = products?.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    const matchesAuthor = authorFilter === "all" || product.authorId === authorFilter;
    
    return matchesSearch && matchesStatus && matchesAuthor;
  }) || [];

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'approved': 'default',
      'pending': 'secondary',
      'rejected': 'destructive',
      'draft': 'outline'
    };
    
    const labels: Record<string, string> = {
      'approved': 'Aprovado',
      'pending': 'Pendente',
      'rejected': 'Rejeitado',
      'draft': 'Rascunho'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleDownloadPDF = (productId: number) => {
    const url = `/api/admin/download/pdf/${productId}`;
    window.open(url, '_blank');
  };

  const handleDownloadCover = (productId: number) => {
    const url = `/api/admin/download/cover/${productId}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Produtos Cadastrados</h1>
              <p className="text-sm text-gray-600">
                Gerencie todos os produtos cadastrados pelos autores
              </p>
            </div>
            <Button variant="outline" onClick={() => setLocation('/admin/dashboard')}>
              ← Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar produtos..."
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
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                </SelectContent>
              </Select>

              <Select value={authorFilter} onValueChange={setAuthorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Autor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Autores</SelectItem>
                  {authors.map((author) => (
                    <SelectItem key={author.id} value={author.id}>
                      {author.firstName && author.lastName 
                        ? `${author.firstName} ${author.lastName}` 
                        : author.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="text-sm text-gray-600 flex items-center">
                {filteredProducts.length} de {products?.length || 0} produtos
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products List */}
        {productsLoading ? (
          <div className="text-center py-8">Carregando produtos...</div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Product Info */}
                    <div className="lg:col-span-2">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{product.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <User className="w-4 h-4" />
                            <span>{product.author}</span>
                          </div>
                        </div>
                        {getStatusBadge(product.status)}
                      </div>
                      
                      {product.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Categoria:</span>
                          <span className="ml-2 text-gray-600">{product.category}</span>
                        </div>
                        {product.isbn && (
                          <div>
                            <span className="font-medium">ISBN:</span>
                            <span className="ml-2 text-gray-600">{product.isbn}</span>
                          </div>
                        )}
                        {product.coAuthors && (
                          <div className="col-span-2">
                            <span className="font-medium">Co-autores:</span>
                            <span className="ml-2 text-gray-600">{product.coAuthors}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pricing and Details */}
                    <div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <div>
                            <div className="font-semibold text-green-600">
                              {formatCurrency(product.salePrice)}
                            </div>
                            {product.originalPrice && (
                              <div className="text-sm text-gray-500 line-through">
                                {formatCurrency(product.originalPrice)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {product.profitMargin && (
                          <div className="text-sm">
                            <span className="font-medium">Margem:</span>
                            <span className="ml-2 text-gray-600">{product.profitMargin}%</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(product.createdAt)}</span>
                        </div>

                        {product.tags && (
                          <div className="text-sm">
                            <span className="font-medium">Tags:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {product.tags.split(',').map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag.trim()}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900 mb-3">Arquivos</h4>
                        
                        {product.pdfUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleDownloadPDF(product.id, product.pdfUrl?.split('/').pop())}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Baixar PDF
                          </Button>
                        )}
                        
                        {product.coverUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleDownloadCover(product.id, product.coverUrl?.split('/').pop())}
                          >
                            <Image className="w-4 h-4 mr-2" />
                            Baixar Capa
                          </Button>
                        )}
                        
                        {product.publicUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => window.open(product.publicUrl, '_blank')}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Público
                          </Button>
                        )}

                        <div className="pt-2 text-xs text-gray-500">
                          ID: {product.id}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredProducts.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">Nenhum produto encontrado com os filtros selecionados.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}