import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Wifi, WifiOff, Plus, RefreshCw, Settings2, Copy, Check, MessageSquare, CreditCard, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WapiInstance {
  id: string;
  user_id: string;
  instance_id: string;
  instance_token: string;
  status: string;
  phone_number: string | null;
  connected_at: string | null;
  messages_count: number;
  credits_available: number;
  addon_valid_until: string | null;
}

interface WhatsAppConfigProps {
  userId: string;
}

export function WhatsAppConfig({ userId }: WhatsAppConfigProps) {
  const [instance, setInstance] = useState<WapiInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [configTab, setConfigTab] = useState("whatsapp");

  const [formData, setFormData] = useState({
    instanceId: "",
    instanceToken: "",
  });

  const webhookUrl = `https://knyzkwgdmclcwvzhdmyk.supabase.co/functions/v1/wapi-webhook`;

  useEffect(() => {
    fetchInstance();
  }, [userId]);

  const fetchInstance = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("wapi_instances")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data) {
      setInstance(data as WapiInstance);
    }
    setIsLoading(false);
  };

  const handleSaveInstance = async () => {
    if (!formData.instanceId || !formData.instanceToken) {
      toast({
        title: "Erro",
        description: "Preencha o ID e Token da instância.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      if (instance) {
        // Update existing
        const { error } = await supabase
          .from("wapi_instances")
          .update({
            instance_id: formData.instanceId,
            instance_token: formData.instanceToken,
          })
          .eq("id", instance.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("wapi_instances")
          .insert({
            user_id: userId,
            instance_id: formData.instanceId,
            instance_token: formData.instanceToken,
            status: "disconnected",
          });

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Instância W-API salva com sucesso!",
      });

      setIsDialogOpen(false);
      fetchInstance();

      // Configure webhooks automatically
      await configureWebhooks();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar instância.",
        variant: "destructive",
      });
    }

    setIsSaving(false);
  };

  const configureWebhooks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "configure-webhooks",
          webhookUrl: webhookUrl,
        },
      });

      if (response.error) {
        console.error("Error configuring webhooks:", response.error);
      } else {
        console.log("Webhooks configured successfully");
      }
    } catch (error) {
      console.error("Error configuring webhooks:", error);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);

    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: { action: "get-status" },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      await fetchInstance();

      toast({
        title: "Status atualizado",
        description: "Informações da instância atualizadas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status.",
        variant: "destructive",
      });
    }

    setIsRefreshing(false);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenDialog = () => {
    if (instance) {
      setFormData({
        instanceId: instance.instance_id,
        instanceToken: instance.instance_token,
      });
    } else {
      setFormData({ instanceId: "", instanceToken: "" });
    }
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Configurações
            </CardTitle>
            <CardDescription>Gerencie suas preferências de conta</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={configTab} onValueChange={setConfigTab}>
            <TabsList>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="webhooks">Configurar webhooks</TabsTrigger>
            </TabsList>

            <TabsContent value="whatsapp" className="mt-4">
              {instance ? (
                <div className="space-y-6">
                  {/* Connection Status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${instance.status === 'connected' ? 'bg-primary/10' : 'bg-muted'}`}>
                        {instance.status === 'connected' ? (
                          <Wifi className="w-6 h-6 text-primary" />
                        ) : (
                          <WifiOff className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold flex items-center gap-2">
                          {instance.status === 'connected' ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                          <Badge variant={instance.status === 'connected' ? 'default' : 'secondary'}>
                            {instance.status === 'connected' ? 'Online' : 'Offline'}
                          </Badge>
                        </p>
                        {instance.phone_number && (
                          <p className="text-sm text-muted-foreground">
                            📞 {instance.phone_number}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleRefreshStatus}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-sm">Mensagens este mês</span>
                        </div>
                        <p className="text-2xl font-bold">{instance.messages_count || 0}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <CreditCard className="w-4 h-4" />
                          <span className="text-sm">Créditos disponíveis</span>
                        </div>
                        <p className="text-2xl font-bold">{instance.credits_available?.toLocaleString() || 0}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Status message */}
                  {instance.status === 'connected' && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Check className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-semibold text-primary">Pronto para enviar mensagens!</p>
                      <p className="text-sm text-muted-foreground">
                        Seu WhatsApp está conectado e funcionando.
                      </p>
                      {instance.connected_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Conectado em {format(new Date(instance.connected_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Addon valid until */}
                  {instance.addon_valid_until && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Addon válido até {format(new Date(instance.addon_valid_until), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}

                  {/* Edit button */}
                  <Button variant="outline" onClick={handleOpenDialog}>
                    <Settings2 className="w-4 h-4 mr-2" />
                    Editar Configurações
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <WifiOff className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">Nenhuma instância configurada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure sua instância W-API para começar a usar o WhatsApp.
                  </p>
                  <Button onClick={handleOpenDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Configurar Instância
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="webhooks" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                ID da instância: <span className="font-mono">{instance?.instance_id || "Não configurado"}</span>
              </p>

              <div className="space-y-4">
                {[
                  { label: "Ao conectar o WhatsApp na instância", icon: "🔗" },
                  { label: "Ao desconectar da instância", icon: "📴" },
                  { label: "Ao enviar uma mensagem", icon: "📤" },
                  { label: "Ao receber uma mensagem", icon: "📥" },
                  { label: "Receber status da mensagem", icon: "✓" },
                ].map((webhook, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-sm font-medium">
                      {webhook.icon} {webhook.label}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={webhookUrl}
                        readOnly
                        className="font-mono text-xs bg-muted"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(webhookUrl, `webhook-${index}`)}
                      >
                        {copiedField === `webhook-${index}` ? (
                          <Check className="w-4 h-4 text-primary" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={configureWebhooks} className="w-full">
                Salvar alterações
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog for adding/editing instance */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {instance ? "Editar Instância W-API" : "Nova Instância W-API"}
            </DialogTitle>
            <DialogDescription>
              Insira as informações fornecidas pela W-API para {instance ? "editar seu" : "adicionar um novo"} motor.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            Na W-API, acesse "<strong>Detalhes da instância</strong>" para copiar o ID e o Token.
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instanceId">ID da Instância</Label>
              <Input
                id="instanceId"
                placeholder="Ex: LITE-YGE96V-MKGKLK"
                value={formData.instanceId}
                onChange={(e) => setFormData({ ...formData, instanceId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Copie o "ID da instância" da W-API
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceToken">Token da Instância</Label>
              <Input
                id="instanceToken"
                type="password"
                placeholder="Token de autenticação"
                value={formData.instanceToken}
                onChange={(e) => setFormData({ ...formData, instanceToken: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Copie o "Token da instância" da W-API (usado no header Authorization)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveInstance} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {instance ? "Salvar" : "Criar Motor"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
