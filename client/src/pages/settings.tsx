import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  FileText, 
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Save
} from "lucide-react";

const profileSchema = z.object({
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  bio: z.string().optional(),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
});

const bankingSchema = z.object({
  bankName: z.string().min(1, "Nome do banco é obrigatório"),
  accountType: z.enum(["corrente", "poupanca"], {
    required_error: "Tipo de conta é obrigatório",
  }),
  agency: z.string().min(1, "Agência é obrigatória"),
  account: z.string().min(1, "Conta é obrigatória"),
  accountDigit: z.string().min(1, "Dígito da conta é obrigatório"),
  cpf: z.string().min(11, "CPF deve ter 11 dígitos"),
  holderName: z.string().min(1, "Nome do titular é obrigatório"),
});

const notificationSchema = z.object({
  emailSales: z.boolean(),
  emailMarketing: z.boolean(),
  emailSystem: z.boolean(),
  pushNotifications: z.boolean(),
});

type ProfileData = z.infer<typeof profileSchema>;
type BankingData = z.infer<typeof bankingSchema>;
type NotificationData = z.infer<typeof notificationSchema>;

export default function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: (user as any)?.firstName || "",
      lastName: (user as any)?.lastName || "",
      email: (user as any)?.email || "",
      phone: (settings as any)?.phone || "",
      bio: (settings as any)?.bio || "",
      website: (settings as any)?.website || "",
    },
  });

  const bankingForm = useForm<BankingData>({
    resolver: zodResolver(bankingSchema),
    defaultValues: {
      bankName: (settings as any)?.banking?.bankName || "",
      accountType: (settings as any)?.banking?.accountType || "corrente",
      agency: (settings as any)?.banking?.agency || "",
      account: (settings as any)?.banking?.account || "",
      accountDigit: (settings as any)?.banking?.accountDigit || "",
      cpf: (settings as any)?.banking?.cpf || "",
      holderName: (settings as any)?.banking?.holderName || "",
    },
  });

  const notificationForm = useForm<NotificationData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailSales: (settings as any)?.notifications?.emailSales ?? true,
      emailMarketing: (settings as any)?.notifications?.emailMarketing ?? false,
      emailSystem: (settings as any)?.notifications?.emailSystem ?? true,
      pushNotifications: (settings as any)?.notifications?.pushNotifications ?? true,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      return apiRequest("/api/settings/profile", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar o perfil.",
        variant: "destructive",
      });
    },
  });

  const updateBankingMutation = useMutation({
    mutationFn: async (data: BankingData) => {
      return apiRequest("/api/settings/banking", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Dados bancários atualizados",
        description: "Suas informações bancárias foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar dados bancários.",
        variant: "destructive",
      });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: NotificationData) => {
      return apiRequest("/api/settings/notifications", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Notificações atualizadas",
        description: "Suas preferências foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar notificações.",
        variant: "destructive",
      });
    },
  });

  const tabs = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "banking", label: "Dados Bancários", icon: CreditCard },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "security", label: "Segurança", icon: Shield },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Configurações" 
          subtitle="Gerencie suas preferências e dados pessoais"
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar */}
              <div className="lg:col-span-1">
                <Card>
                  <CardContent className="p-0">
                    <nav className="space-y-1">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-none first:rounded-t-lg last:rounded-b-lg transition-colors ${
                              activeTab === tab.id
                                ? "bg-primary text-white"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <Icon className="w-4 h-4 mr-3" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </nav>
                  </CardContent>
                </Card>
              </div>

              {/* Content */}
              <div className="lg:col-span-3">
                {activeTab === "profile" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <User className="w-5 h-5 mr-2" />
                        Informações do Perfil
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="firstName">Nome</Label>
                            <Input
                              id="firstName"
                              {...profileForm.register("firstName")}
                              error={profileForm.formState.errors.firstName?.message}
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Sobrenome</Label>
                            <Input
                              id="lastName"
                              {...profileForm.register("lastName")}
                              error={profileForm.formState.errors.lastName?.message}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            {...profileForm.register("email")}
                            error={profileForm.formState.errors.email?.message}
                          />
                        </div>

                        <div>
                          <Label htmlFor="phone">Telefone</Label>
                          <Input
                            id="phone"
                            {...profileForm.register("phone")}
                            placeholder="(11) 99999-9999"
                          />
                        </div>

                        <div>
                          <Label htmlFor="website">Website</Label>
                          <Input
                            id="website"
                            {...profileForm.register("website")}
                            placeholder="https://meusite.com"
                          />
                        </div>

                        <div>
                          <Label htmlFor="bio">Biografia</Label>
                          <Textarea
                            id="bio"
                            {...profileForm.register("bio")}
                            placeholder="Conte um pouco sobre você..."
                            rows={4}
                          />
                        </div>

                        <Button 
                          type="submit" 
                          disabled={updateProfileMutation.isPending}
                          className="flex items-center"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "banking" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <CreditCard className="w-5 h-5 mr-2" />
                        Dados Bancários
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        Configure sua conta bancária para receber os pagamentos das vendas.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={bankingForm.handleSubmit((data) => updateBankingMutation.mutate(data))} className="space-y-6">
                        <div>
                          <Label htmlFor="holderName">Nome do Titular</Label>
                          <Input
                            id="holderName"
                            {...bankingForm.register("holderName")}
                            error={bankingForm.formState.errors.holderName?.message}
                          />
                        </div>

                        <div>
                          <Label htmlFor="cpf">CPF</Label>
                          <Input
                            id="cpf"
                            {...bankingForm.register("cpf")}
                            placeholder="000.000.000-00"
                            error={bankingForm.formState.errors.cpf?.message}
                          />
                        </div>

                        <div>
                          <Label htmlFor="bankName">Banco</Label>
                          <Input
                            id="bankName"
                            {...bankingForm.register("bankName")}
                            placeholder="Ex: Banco do Brasil"
                            error={bankingForm.formState.errors.bankName?.message}
                          />
                        </div>

                        <div>
                          <Label htmlFor="accountType">Tipo de Conta</Label>
                          <Select
                            value={bankingForm.watch("accountType")}
                            onValueChange={(value) => bankingForm.setValue("accountType", value as "corrente" | "poupanca")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="corrente">Conta Corrente</SelectItem>
                              <SelectItem value="poupanca">Poupança</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="agency">Agência</Label>
                            <Input
                              id="agency"
                              {...bankingForm.register("agency")}
                              error={bankingForm.formState.errors.agency?.message}
                            />
                          </div>
                          <div>
                            <Label htmlFor="account">Conta</Label>
                            <Input
                              id="account"
                              {...bankingForm.register("account")}
                              error={bankingForm.formState.errors.account?.message}
                            />
                          </div>
                          <div>
                            <Label htmlFor="accountDigit">Dígito</Label>
                            <Input
                              id="accountDigit"
                              {...bankingForm.register("accountDigit")}
                              error={bankingForm.formState.errors.accountDigit?.message}
                            />
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start">
                            <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                            <div>
                              <h4 className="font-medium text-blue-900">Segurança dos Dados</h4>
                              <p className="text-sm text-blue-700 mt-1">
                                Suas informações bancárias são criptografadas e armazenadas com segurança.
                                Nunca compartilharemos seus dados com terceiros.
                              </p>
                            </div>
                          </div>
                        </div>

                        <Button 
                          type="submit" 
                          disabled={updateBankingMutation.isPending}
                          className="flex items-center"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {updateBankingMutation.isPending ? "Salvando..." : "Salvar Dados Bancários"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "notifications" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Bell className="w-5 h-5 mr-2" />
                        Preferências de Notificação
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={notificationForm.handleSubmit((data) => updateNotificationsMutation.mutate(data))} className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base">Notificações de Vendas</Label>
                              <p className="text-sm text-gray-600">
                                Receba emails quando uma nova venda for realizada
                              </p>
                            </div>
                            <Switch
                              checked={notificationForm.watch("emailSales")}
                              onCheckedChange={(checked) => notificationForm.setValue("emailSales", checked)}
                            />
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base">Emails do Sistema</Label>
                              <p className="text-sm text-gray-600">
                                Atualizações importantes sobre sua conta e produtos
                              </p>
                            </div>
                            <Switch
                              checked={notificationForm.watch("emailSystem")}
                              onCheckedChange={(checked) => notificationForm.setValue("emailSystem", checked)}
                            />
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base">Emails de Marketing</Label>
                              <p className="text-sm text-gray-600">
                                Dicas, promoções e novidades da plataforma
                              </p>
                            </div>
                            <Switch
                              checked={notificationForm.watch("emailMarketing")}
                              onCheckedChange={(checked) => notificationForm.setValue("emailMarketing", checked)}
                            />
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base">Notificações Push</Label>
                              <p className="text-sm text-gray-600">
                                Notificações em tempo real no navegador
                              </p>
                            </div>
                            <Switch
                              checked={notificationForm.watch("pushNotifications")}
                              onCheckedChange={(checked) => notificationForm.setValue("pushNotifications", checked)}
                            />
                          </div>
                        </div>

                        <Button 
                          type="submit" 
                          disabled={updateNotificationsMutation.isPending}
                          className="flex items-center"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {updateNotificationsMutation.isPending ? "Salvando..." : "Salvar Preferências"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "security" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        Segurança da Conta
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <Shield className="w-5 h-5 text-green-600 mr-3" />
                            <div>
                              <h4 className="font-medium text-green-900">Conta Protegida</h4>
                              <p className="text-sm text-green-700 mt-1">
                                Sua conta está protegida por autenticação segura via Replit.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Atividade Recente</h4>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                                <span className="text-sm text-gray-600">Último login</span>
                                <span className="text-sm font-medium">Hoje, 19:30</span>
                              </div>
                              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                                <span className="text-sm text-gray-600">Último upload</span>
                                <span className="text-sm font-medium">Hoje, 19:18</span>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Dicas de Segurança</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• Mantenha suas informações pessoais atualizadas</li>
                              <li>• Não compartilhe suas credenciais de acesso</li>
                              <li>• Monitore regularmente suas vendas e estatísticas</li>
                              <li>• Reporte atividades suspeitas imediatamente</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}