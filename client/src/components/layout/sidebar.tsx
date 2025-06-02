import { Link, useLocation } from "wouter";
import { BookOpen, BarChart3, Upload, Package, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <BookOpen className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Upleer</h1>
            <p className="text-sm text-gray-500">Painel do Autor</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-6">
        <div className="px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <a className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? "text-primary bg-blue-50" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}>
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </a>
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
