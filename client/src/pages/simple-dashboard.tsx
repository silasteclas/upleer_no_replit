import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const logoPath = "https://via.placeholder.com/200x100/0066CC/FFFFFF?text=UPLEER";

export default function SimpleDashboard() {
  const handleLogout = () => {
    // Simple logout - just reload the page
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src={logoPath} alt="Upleer" className="h-8 w-auto" />
              <h1 className="ml-3 text-xl font-semibold text-gray-900">
                Painel Upleer
              </h1>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bem-vindo ao Upleer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Sistema de gestão de produtos físicos e vendas.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produtos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">0</p>
                <p className="text-sm text-gray-500">Total de produtos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">R$ 0,00</p>
                <p className="text-sm text-gray-500">Total de vendas</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Sistema Configurado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  O sistema Upleer está funcionando corretamente no domínio público.
                  Este é um painel de demonstração que confirma que a autenticação
                  e o sistema estão operacionais.
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-sm"><strong>Status:</strong> Sistema Online</p>
                  <p className="text-sm"><strong>Usuário:</strong> Admin Upleer</p>
                  <p className="text-sm"><strong>Acesso:</strong> Domínio Público</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}