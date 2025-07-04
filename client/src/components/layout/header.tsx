import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, LogOut } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user, logout, isLoggingOut } = useAuth();

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getDisplayName = () => {
    if ((user as any)?.firstName || (user as any)?.lastName) {
      return `${(user as any).firstName || ""} ${(user as any).lastName || ""}`.trim();
    }
    return (user as any)?.email || "Usuário";
  };

  return (
    <header className="fixed top-0 left-64 right-0 bg-white shadow-sm border-b border-gray-200 px-6 py-6 z-40">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600 text-sm">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={logout} 
            disabled={isLoggingOut}
            className="text-red-600 hover:text-red-700"
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage 
                src={(user as any)?.profileImageUrl || ""} 
                alt="Foto do perfil"
                className="object-cover"
              />
              <AvatarFallback>
                {getInitials((user as any)?.firstName, (user as any)?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900">{getDisplayName()}</p>
              <p className="text-sm text-gray-500">Autor</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;