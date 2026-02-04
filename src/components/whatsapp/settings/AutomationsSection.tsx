import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Clock, Forward, Zap, Plus, Trash2, Phone, Shield, Beaker, Power, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WapiInstance {
  id: string;
  instance_id: string;
  unit: string | null;
  status: string | null;
}

interface BotSettings {
  id: string;
  instance_id: string;
  bot_enabled: boolean;
  test_mode_enabled: boolean;
  test_mode_number: string | null;
  welcome_message: string;
}

interface VipNumber {
  id: string;
  instance_id: string;
  phone: string;
  name: string | null;
  reason: string | null;
}

export function AutomationsSection() {
  const [instances, setInstances] = useState<WapiInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<WapiInstance | null>(null);
  const [botSettings, setBotSettings] = useState<BotSettings | null>(null);
  const [vipNumbers, setVipNumbers] = useState<VipNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // New VIP number form state
  const [showAddVipDialog, setShowAddVipDialog] = useState(false);
  const [newVipPhone, setNewVipPhone] = useState("");
  const [newVipName, setNewVipName] = useState("");
  const [newVipReason, setNewVipReason] = useState("");
  const [isAddingVip, setIsAddingVip] = useState(false);

  useEffect(() => {
    fetchInstances();
  }, []);

  useEffect(() => {
    if (selectedInstance) {
      fetchBotSettings();
      fetchVipNumbers();
    }
  }, [selectedInstance]);

  const fetchInstances = async () => {
    const { data, error } = await supabase
      .from("wapi_instances")
      .select("id, instance_id, unit, status")
      .order("unit", { ascending: true });

    if (error) {
      console.error("Error fetching instances:", error);
      return;
    }

    if (data && data.length > 0) {
      setInstances(data);
      setSelectedInstance(data[0]);
    }
    setIsLoading(false);
  };

  const fetchBotSettings = async () => {
    if (!selectedInstance) return;

    const { data, error } = await supabase
      .from("wapi_bot_settings")
      .select("*")
      .eq("instance_id", selectedInstance.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching bot settings:", error);
      return;
    }

    if (data) {
      setBotSettings(data);
    } else {
      // Create default settings for this instance
      const { data: newSettings, error: createError } = await supabase
        .from("wapi_bot_settings")
        .insert({
          instance_id: selectedInstance.id,
          bot_enabled: false,
          test_mode_enabled: false,
          test_mode_number: null,
          welcome_message: "Olá! 👋 Bem-vindo ao Castelo da Diversão! Para podermos te ajudar melhor, preciso de algumas informações.",
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating bot settings:", createError);
      } else {
        setBotSettings(newSettings);
      }
    }
  };

  const fetchVipNumbers = async () => {
    if (!selectedInstance) return;

    const { data, error } = await supabase
      .from("wapi_vip_numbers")
      .select("*")
      .eq("instance_id", selectedInstance.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching VIP numbers:", error);
      return;
    }

    setVipNumbers(data || []);
  };

  const updateBotSettings = async (updates: Partial<BotSettings>) => {
    if (!botSettings) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("wapi_bot_settings")
      .update(updates)
      .eq("id", botSettings.id);

    if (error) {
      console.error("Error updating bot settings:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar as configurações.",
        variant: "destructive",
      });
    } else {
      setBotSettings({ ...botSettings, ...updates });
      toast({
        title: "Configurações salvas",
        description: "As alterações foram aplicadas com sucesso.",
      });
    }

    setIsSaving(false);
  };

  const addVipNumber = async () => {
    if (!selectedInstance || !newVipPhone.trim()) return;

    setIsAddingVip(true);

    // Normalize phone number
    const normalizedPhone = newVipPhone.replace(/\D/g, "");

    const { error } = await supabase
      .from("wapi_vip_numbers")
      .insert({
        instance_id: selectedInstance.id,
        phone: normalizedPhone,
        name: newVipName.trim() || null,
        reason: newVipReason.trim() || null,
      });

    if (error) {
      console.error("Error adding VIP number:", error);
      toast({
        title: "Erro ao adicionar",
        description: error.code === "23505" ? "Este número já está na lista VIP." : "Não foi possível adicionar o número.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Número adicionado",
        description: "O número foi adicionado à lista VIP.",
      });
      setNewVipPhone("");
      setNewVipName("");
      setNewVipReason("");
      setShowAddVipDialog(false);
      fetchVipNumbers();
    }

    setIsAddingVip(false);
  };

  const removeVipNumber = async (id: string) => {
    const { error } = await supabase
      .from("wapi_vip_numbers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing VIP number:", error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o número.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Número removido",
        description: "O número foi removido da lista VIP.",
      });
      fetchVipNumbers();
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.length === 13) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    } else if (phone.length === 12) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="bg-muted/50 rounded-lg p-6 text-center">
        <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">Nenhuma instância configurada</h3>
        <p className="text-sm text-muted-foreground">
          Configure uma instância do WhatsApp na aba "Conexão" para habilitar as automações.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instance Selector */}
      {instances.length > 1 && (
        <div className="flex items-center gap-3">
          <Label className="shrink-0">Unidade:</Label>
          <Select
            value={selectedInstance?.id || ""}
            onValueChange={(value) => {
              const instance = instances.find((i) => i.id === value);
              if (instance) setSelectedInstance(instance);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              {instances.map((instance) => (
                <SelectItem key={instance.id} value={instance.id}>
                  {instance.unit || "Sem unidade"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Bot Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Bot de Qualificação
          </CardTitle>
          <CardDescription>
            Qualifica leads automaticamente perguntando nome, mês, dia e número de convidados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${botSettings?.bot_enabled ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium">Bot Global</h4>
                <p className="text-sm text-muted-foreground">
                  Ativa o bot para todos os novos contatos nesta unidade
                </p>
              </div>
            </div>
            <Switch
              checked={botSettings?.bot_enabled || false}
              onCheckedChange={(checked) => updateBotSettings({ bot_enabled: checked })}
              disabled={isSaving}
            />
          </div>

          {/* Test Mode Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg border-dashed border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${botSettings?.test_mode_enabled ? "bg-yellow-100 text-yellow-600" : "bg-muted text-muted-foreground"}`}>
                <Beaker className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  Modo de Teste
                  <Badge variant="outline" className="text-yellow-600 border-yellow-500">Beta</Badge>
                </h4>
                <p className="text-sm text-muted-foreground">
                  Ativa o bot apenas para o número de teste (ignora toggle global)
                </p>
              </div>
            </div>
            <Switch
              checked={botSettings?.test_mode_enabled || false}
              onCheckedChange={(checked) => updateBotSettings({ test_mode_enabled: checked })}
              disabled={isSaving}
            />
          </div>

          {/* Test Number Input */}
          {botSettings?.test_mode_enabled && (
            <div className="ml-4 p-4 border-l-2 border-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/5 rounded-r-lg">
              <Label htmlFor="test-number" className="text-sm font-medium">Número de Teste</Label>
              <p className="text-xs text-muted-foreground mb-2">
                O bot será ativado apenas para este número, independente do toggle global
              </p>
              <div className="flex gap-2">
                <Input
                  id="test-number"
                  placeholder="+55 15 98112-1710"
                  value={botSettings?.test_mode_number || ""}
                  onChange={(e) => setBotSettings({ ...botSettings, test_mode_number: e.target.value })}
                  className="max-w-[200px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateBotSettings({ test_mode_number: botSettings?.test_mode_number })}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          )}

          {/* Status Summary */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status atual:</span>
            {botSettings?.bot_enabled ? (
              <Badge variant="default" className="bg-green-500">Bot Ativo para Todos</Badge>
            ) : botSettings?.test_mode_enabled ? (
              <Badge variant="outline" className="text-yellow-600 border-yellow-500">Apenas Modo Teste</Badge>
            ) : (
              <Badge variant="secondary">Bot Desativado</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* VIP List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Lista VIP
              </CardTitle>
              <CardDescription>
                Números que nunca receberão mensagens automáticas do bot
              </CardDescription>
            </div>
            <Dialog open={showAddVipDialog} onOpenChange={setShowAddVipDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Número VIP</DialogTitle>
                  <DialogDescription>
                    Este número não receberá mensagens automáticas do bot de qualificação
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="vip-phone">Número de Telefone *</Label>
                    <Input
                      id="vip-phone"
                      placeholder="+55 11 99999-9999"
                      value={newVipPhone}
                      onChange={(e) => setNewVipPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vip-name">Nome (opcional)</Label>
                    <Input
                      id="vip-name"
                      placeholder="Ex: João Silva"
                      value={newVipName}
                      onChange={(e) => setNewVipName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vip-reason">Motivo (opcional)</Label>
                    <Input
                      id="vip-reason"
                      placeholder="Ex: Cliente antigo, Fornecedor"
                      value={newVipReason}
                      onChange={(e) => setNewVipReason(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddVipDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={addVipNumber} disabled={!newVipPhone.trim() || isAddingVip}>
                    {isAddingVip ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {vipNumbers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhum número na lista VIP</p>
              <p className="text-xs mt-1">Adicione números que não devem receber mensagens automáticas</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {vipNumbers.map((vip) => (
                  <div
                    key={vip.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Phone className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {vip.name || formatPhoneNumber(vip.phone)}
                        </p>
                        {vip.name && (
                          <p className="text-xs text-muted-foreground">{formatPhoneNumber(vip.phone)}</p>
                        )}
                        {vip.reason && (
                          <p className="text-xs text-muted-foreground">{vip.reason}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeVipNumber(vip.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon Features */}
      <div className="space-y-4 opacity-60">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Em Desenvolvimento
        </h3>
        
        {/* Respostas Fora do Horário */}
        <Card className="opacity-75">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Respostas Fora do Horário
              </CardTitle>
              <Badge variant="secondary">Em breve</Badge>
            </div>
            <CardDescription className="text-xs">
              Envie mensagens automáticas fora do expediente
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Encaminhamento Automático */}
        <Card className="opacity-75">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Forward className="w-4 h-4" />
                Encaminhamento Automático
              </CardTitle>
              <Badge variant="secondary">Em breve</Badge>
            </div>
            <CardDescription className="text-xs">
              Direcione conversas automaticamente para o responsável correto
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
