import { Link, useLocation } from "wouter";
import { BookOpen, BarChart3, Upload, Package, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

import Logotipo_para_site_upleer from "@assets/Logotipo para site upleer.png";

const logoPath = "https://via.placeholder.com/200x100/0066CC/FFFFFF?text=UPLEER";

export function Sidebar() {
  const [location] = useLocation();
  const { logout, isLoggingOut } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const navItems = [
    { href: "/", icon: BarChart3, label: "Dashboard" },
    { href: "/upload", icon: Upload, label: "Nova Apostila" },
    { href: "/products", icon: Package, label: "Meus Produtos" },
    { href: "/sales", icon: BarChart3, label: "Vendas" },
    { href: "/settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <aside className="fixed left-0 top-0 w-64 bg-white shadow-lg h-screen flex flex-col z-30">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-center">
          <img 
            src={Logotipo_para_site_upleer} 
            alt="Upleer" 
            className="h-14 w-auto object-contain"
          />
        </div>
        <div className="text-center mt-3">
          <p className="text-sm text-gray-500">Painel do Autor</p>
        </div>
      </div>
      <nav className="flex-1 flex flex-col">
        <div className="mt-6 px-4 space-y-2">
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
        
        <div className="mt-auto px-4 pb-6 border-t border-gray-200 pt-4">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full justify-start text-gray-600 hover:text-gray-800"
          >
            <LogOut className="w-5 h-5 mr-3" />
            {isLoggingOut ? "Saindo..." : "Sair"}
          </Button>
        </div>
      </nav>
    </aside>
  );
}

export default Sidebar;