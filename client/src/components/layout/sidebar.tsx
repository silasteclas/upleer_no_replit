import { Link, useLocation } from "wouter";
import { BookOpen, BarChart3, Upload, Package, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoPath from "@assets/Logotipo para site upleer (1).png";

export default function Sidebar() {
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navItems = [
    { href: "/", icon: BarChart3, label: "Dashboard" },
    { href: "/upload", icon: Upload, label: "Nova Apostila" },
    { href: "/products", icon: Package, label: "Meus Produtos" },
    { href: "/sales", icon: BarChart3, label: "Vendas" },
    { href: "/settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <aside className="w-64 bg-surface shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-center">
          <img 
            src={logoPath} 
            alt="Upleer" 
            className="h-14 w-auto object-contain"
          />
        </div>
        <div className="text-center mt-3">
          <p className="text-sm text-gray-500">Painel do Autor</p>
        </div>
      </div>
      
      <nav className="mt-6">
        <div className="px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer ${
                  isActive 
                    ? "text-primary bg-blue-50" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}>
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
        
        <div className="px-4 mt-8">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start text-gray-600 hover:text-gray-800"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </Button>
        </div>
      </nav>
    </aside>
  );
}
