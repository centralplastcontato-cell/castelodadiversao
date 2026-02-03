import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Wifi, WifiOff, Plus, RefreshCw, Settings2, Copy, Check, MessageSquare, CreditCard, Calendar, Building2, Pencil, Trash2, QrCode, Loader2 } from "lucide-react";
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
  unit: string | null;
}

interface WhatsAppConfigProps {
  userId: string;
  isAdmin: boolean;
}

const UNITS = [
  { value: "Manchester", label: "Manchester" },
  { value: "Trujillo", label: "Trujillo" },
];

export function WhatsAppConfig({ userId, isAdmin }: WhatsAppConfigProps) {
  const [instances, setInstances] = useState<WapiInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editingInstance, setEditingInstance] = useState<WapiInstance | null>(null);
  
  // QR Code states
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrInstance, setQrInstance] = useState<WapiInstance | null>(null);
  const [qrPolling, setQrPolling] = useState(false);

  const [formData, setFormData] = useState({
    instanceId: "",
    instanceToken: "",
    unit: "",
  });

  const webhookUrl = `https://knyzkwgdmclcwvzhdmyk.supabase.co/functions/v1/wapi-webhook`;

  useEffect(() => {
    fetchInstances();
  }, [userId]);

  const fetchInstances = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("wapi_instances")
      .select("*")
      .order("unit", { ascending: true });

    if (data) {
      setInstances(data as WapiInstance[]);
    }
    setIsLoading(false);
  };

  const handleSaveInstance = async () => {
    if (!formData.instanceId || !formData.instanceToken || !formData.unit) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Check if unit already has an instance (if creating new)
    if (!editingInstance) {
      const existingUnit = instances.find(i => i.unit === formData.unit);
      if (existingUnit) {
        toast({
          title: "Erro",
          description: `A unidade ${formData.unit} já possui uma instância configurada.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      if (editingInstance) {
        // Update existing
        const { error } = await supabase
          .from("wapi_instances")
          .update({
            instance_id: formData.instanceId,
            instance_token: formData.instanceToken,
            unit: formData.unit,
          })
          .eq("id", editingInstance.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Instância atualizada com sucesso!",
        });
      } else {
        // Create new
        const { error } = await supabase
          .from("wapi_instances")
          .insert({
            user_id: userId,
            instance_id: formData.instanceId,
            instance_token: formData.instanceToken,
            unit: formData.unit,
            status: "disconnected",
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: `Instância da unidade ${formData.unit} criada com sucesso!`,
        });
      }

      setIsDialogOpen(false);
      setEditingInstance(null);
      setFormData({ instanceId: "", instanceToken: "", unit: "" });
      fetchInstances();

      // Configure webhooks automatically
      await configureWebhooks(formData.instanceId, formData.instanceToken);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar instância.",
        variant: "destructive",
      });
    }

    setIsSaving(false);
  };

  const handleDeleteInstance = async (instance: WapiInstance) => {
    if (!confirm(`Tem certeza que deseja excluir a instância da unidade ${instance.unit}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("wapi_instances")
        .delete()
        .eq("id", instance.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Instância excluída com sucesso.",
      });

      fetchInstances();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir instância.",
        variant: "destructive",
      });
    }
  };

  const configureWebhooks = async (instanceId: string, instanceToken: string) => {
    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "configure-webhooks",
          webhookUrl: webhookUrl,
          instanceId,
          instanceToken,
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

  const handleRefreshStatus = async (instance: WapiInstance) => {
    setIsRefreshing(true);

    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: { 
          action: "get-status",
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Update status in database
      if (response.data?.status) {
        await supabase
          .from("wapi_instances")
          .update({ 
            status: response.data.status,
            phone_number: response.data.phoneNumber || null,
            connected_at: response.data.status === 'connected' ? new Date().toISOString() : null,
          })
          .eq("id", instance.id);
      }

      await fetchInstances();

      toast({
        title: "Status atualizado",
        description: `Instância ${instance.unit}: ${response.data?.status || 'verificado'}`,
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

  // Fetch QR Code
  const fetchQrCode = useCallback(async (instance: WapiInstance) => {
    setQrLoading(true);
    
    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: { 
          action: "get-qr",
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.qrCode) {
        setQrCode(response.data.qrCode);
      } else if (response.data?.error) {
        // Instance might be already connected or there's an issue
        toast({
          title: "Aviso",
          description: response.data.error,
          variant: "destructive",
        });
        setQrDialogOpen(false);
      }
    } catch (error: any) {
      console.error("Error fetching QR code:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao obter QR Code.",
        variant: "destructive",
      });
    }

    setQrLoading(false);
  }, []);

  // Poll for connection status
  const pollConnectionStatus = useCallback(async (instance: WapiInstance) => {
    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: { 
          action: "get-status",
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
        },
      });

      if (response.data?.status === 'connected') {
        // Update database
        await supabase
          .from("wapi_instances")
          .update({ 
            status: 'connected',
            phone_number: response.data.phoneNumber || null,
            connected_at: new Date().toISOString(),
          })
          .eq("id", instance.id);

        setQrPolling(false);
        setQrDialogOpen(false);
        toast({
          title: "Conectado!",
          description: `WhatsApp da unidade ${instance.unit} conectado com sucesso!`,
        });
        fetchInstances();
        return true;
      }
    } catch (error) {
      console.error("Error polling status:", error);
    }
    return false;
  }, []);

  // Open QR Code dialog
  const handleOpenQrDialog = (instance: WapiInstance) => {
    setQrInstance(instance);
    setQrCode(null);
    setQrDialogOpen(true);
    setQrPolling(true);
    fetchQrCode(instance);
  };

  // Effect for polling connection status when QR dialog is open
  useEffect(() => {
    if (!qrDialogOpen || !qrInstance || !qrPolling) return;

    const interval = setInterval(async () => {
      const connected = await pollConnectionStatus(qrInstance);
      if (connected) {
        clearInterval(interval);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [qrDialogOpen, qrInstance, qrPolling, pollConnectionStatus]);

  // Effect to refresh QR code periodically (QR codes expire)
  useEffect(() => {
    if (!qrDialogOpen || !qrInstance || !qrPolling) return;

    const interval = setInterval(() => {
      fetchQrCode(qrInstance);
    }, 30000); // Refresh QR every 30 seconds

    return () => clearInterval(interval);
  }, [qrDialogOpen, qrInstance, qrPolling, fetchQrCode]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenDialog = (instance?: WapiInstance) => {
    if (instance) {
      setEditingInstance(instance);
      setFormData({
        instanceId: instance.instance_id,
        instanceToken: instance.instance_token,
        unit: instance.unit || "",
      });
    } else {
      setEditingInstance(null);
      setFormData({ instanceId: "", instanceToken: "", unit: "" });
    }
    setIsDialogOpen(true);
  };

  const getAvailableUnits = () => {
    const usedUnits = instances.map(i => i.unit);
    if (editingInstance) {
      // When editing, include the current unit
      return UNITS;
    }
    return UNITS.filter(u => !usedUnits.includes(u.value));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // QR Code Dialog Component (reusable for both admin and non-admin)
  const QrCodeDialog = () => (
    <Dialog open={qrDialogOpen} onOpenChange={(open) => {
      setQrDialogOpen(open);
      if (!open) {
        setQrPolling(false);
        setQrCode(null);
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Conectar WhatsApp - {qrInstance?.unit}
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp para conectar
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-4">
          {qrLoading && !qrCode ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg">
                {qrCode.startsWith('data:image') ? (
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                ) : (
                  // If it's a base64 string without data URI prefix
                  <img 
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                    alt="QR Code" 
                    className="w-64 h-64" 
                  />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className={`w-4 h-4 ${qrLoading ? 'animate-spin' : ''}`} />
                <span>Aguardando conexão...</span>
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Abra o WhatsApp no seu celular, vá em Configurações → Aparelhos conectados → Conectar aparelho
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <WifiOff className="w-12 h-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Não foi possível gerar o QR Code</p>
              <Button variant="outline" onClick={() => qrInstance && fetchQrCode(qrInstance)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (!isAdmin) {
    // Non-admin view: show status with connect button
    return (
      <div className="space-y-4">
        <QrCodeDialog />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Status das Instâncias
            </CardTitle>
            <CardDescription>
              Clique em "Conectar" para escanear o QR Code e conectar o WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {instances.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma instância configurada pelo administrador.
              </p>
            ) : (
              instances.map((instance) => (
                <div key={instance.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${instance.status === 'connected' ? 'bg-primary/10' : 'bg-muted'}`}>
                      {instance.status === 'connected' ? (
                        <Wifi className="w-5 h-5 text-primary" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {instance.unit}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {instance.status === 'connected' ? 'Conectado' : 'Desconectado'}
                        {instance.phone_number && ` • ${instance.phone_number}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {instance.status !== 'connected' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleOpenQrDialog(instance)}
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Conectar
                      </Button>
                    )}
                    <Badge variant={instance.status === 'connected' ? 'default' : 'secondary'}>
                      {instance.status === 'connected' ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin view: full configuration
  return (
    <div className="space-y-6">
      <QrCodeDialog />
      {/* Instances Management Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Gerenciar Instâncias W-API
            </CardTitle>
            <CardDescription>Configure as instâncias do WhatsApp para cada unidade</CardDescription>
          </div>
          {getAvailableUnits().length > 0 && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Instância
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {instances.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <WifiOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Nenhuma instância configurada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure uma instância W-API para cada unidade.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Configurar Primeira Instância
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {instances.map((instance) => (
                <Card key={instance.id}>
                  <CardContent className="pt-4">
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
                            <Building2 className="w-4 h-4" />
                            {instance.unit || "Sem unidade"}
                            <Badge variant={instance.status === 'connected' ? 'default' : 'secondary'}>
                              {instance.status === 'connected' ? 'Online' : 'Offline'}
                            </Badge>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ID: {instance.instance_id}
                          </p>
                          {instance.phone_number && (
                            <p className="text-sm text-muted-foreground">
                              📞 {instance.phone_number}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {instance.status !== 'connected' && (
                          <Button 
                            size="sm"
                            onClick={() => handleOpenQrDialog(instance)}
                          >
                            <QrCode className="w-4 h-4 mr-2" />
                            Conectar
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRefreshStatus(instance)}
                          disabled={isRefreshing}
                        >
                          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenDialog(instance)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteInstance(instance)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <MessageSquare className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-lg font-bold">{instance.messages_count || 0}</p>
                        <p className="text-xs text-muted-foreground">Mensagens</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <CreditCard className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-lg font-bold">{instance.credits_available?.toLocaleString() || 0}</p>
                        <p className="text-xs text-muted-foreground">Créditos</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <Calendar className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-sm font-bold">
                          {instance.addon_valid_until 
                            ? format(new Date(instance.addon_valid_until), "dd/MM/yy", { locale: ptBR })
                            : "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">Válido até</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhooks Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Configuração de Webhooks
          </CardTitle>
          <CardDescription>
            Use esta URL para configurar os webhooks na W-API (mesma URL para todos os eventos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="font-mono text-xs bg-muted"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(webhookUrl, "webhook")}
            >
              {copiedField === "webhook" ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Configure esta URL para: Conectar, Desconectar, Enviar mensagem, Receber mensagem e Status da mensagem.
          </p>
        </CardContent>
      </Card>

      {/* Dialog for adding/editing instance */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingInstance ? "Editar Instância W-API" : "Nova Instância W-API"}
            </DialogTitle>
            <DialogDescription>
              Configure a instância do WhatsApp para uma unidade específica.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            Na W-API, acesse "<strong>Detalhes da instância</strong>" para copiar o ID e o Token.
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
                disabled={!!editingInstance}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {(editingInstance ? UNITS : getAvailableUnits()).map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {unit.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceId">ID da Instância *</Label>
              <Input
                id="instanceId"
                placeholder="Ex: LITE-YGE96V-MKGKLK"
                value={formData.instanceId}
                onChange={(e) => setFormData({ ...formData, instanceId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceToken">Token da Instância *</Label>
              <Input
                id="instanceToken"
                type="password"
                placeholder="Token de autenticação"
                value={formData.instanceToken}
                onChange={(e) => setFormData({ ...formData, instanceToken: e.target.value })}
              />
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
                  {editingInstance ? "Salvar" : "Criar Instância"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
