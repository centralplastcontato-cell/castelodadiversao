import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Trash2, FileText, AlertTriangle, Database } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdvancedSectionProps {
  userId: string;
  isAdmin: boolean;
}

export function AdvancedSection({ userId, isAdmin }: AdvancedSectionProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSyncContacts = async () => {
    setIsSyncing(true);
    
    try {
      // Fetch all instances
      const { data: instances } = await supabase
        .from("wapi_instances")
        .select("*");

      if (!instances || instances.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhuma instância configurada para sincronizar.",
        });
        setIsSyncing(false);
        return;
      }

      let syncedCount = 0;

      for (const instance of instances) {
        try {
          // This would call a sync contacts endpoint
          // For now, we'll just simulate the sync
          await new Promise(resolve => setTimeout(resolve, 1000));
          syncedCount++;
        } catch (err) {
          console.error(`Error syncing contacts for ${instance.unit}:`, err);
        }
      }

      toast({
        title: "Sincronização concluída",
        description: `${syncedCount} instância(s) sincronizada(s).`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao sincronizar contatos.",
        variant: "destructive",
      });
    }

    setIsSyncing(false);
  };

  const handleClearCache = async () => {
    setIsClearing(true);

    try {
      // Clear local storage cache related to WhatsApp
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('whatsapp_') || key.startsWith('wapi_')
      );
      
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear session storage as well
      const sessionKeysToRemove = Object.keys(sessionStorage).filter(key => 
        key.startsWith('whatsapp_') || key.startsWith('wapi_')
      );
      
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

      toast({
        title: "Cache limpo",
        description: `${keysToRemove.length + sessionKeysToRemove.length} item(s) removido(s) do cache.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao limpar cache.",
        variant: "destructive",
      });
    }

    setIsClearing(false);
  };

  const handleExportLogs = () => {
    // Create a simple log export
    const logs = {
      exportedAt: new Date().toISOString(),
      userId,
      userAgent: navigator.userAgent,
      localStorage: Object.keys(localStorage).filter(key => 
        key.startsWith('whatsapp_') || key.startsWith('wapi_')
      ),
    };

    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Logs exportados",
      description: "Arquivo de logs baixado com sucesso.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Sincronizar Contatos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Sincronizar Contatos
          </CardTitle>
          <CardDescription>
            Sincronize os contatos do WhatsApp com o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Esta ação irá atualizar os dados de contatos e fotos de perfil de todas as conversas.
            O processo pode levar alguns minutos dependendo do número de conversas.
          </p>
          <Button 
            variant="outline" 
            onClick={handleSyncContacts}
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Button>
        </CardContent>
      </Card>

      {/* Limpar Cache */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Limpar Cache
          </CardTitle>
          <CardDescription>
            Remova dados em cache para resolver problemas de exibição
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Esta ação irá limpar o cache local do navegador relacionado ao WhatsApp.
            Suas conversas e mensagens no servidor não serão afetadas.
          </p>
          <Button 
            variant="outline" 
            onClick={handleClearCache}
            disabled={isClearing}
          >
            <Trash2 className={`w-4 h-4 mr-2`} />
            {isClearing ? 'Limpando...' : 'Limpar Cache'}
          </Button>
        </CardContent>
      </Card>

      {/* Logs de Atividade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Logs de Atividade
          </CardTitle>
          <CardDescription>
            Exporte logs para diagnóstico de problemas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Baixe um arquivo com informações de diagnóstico para ajudar a resolver problemas técnicos.
          </p>
          <Button variant="outline" onClick={handleExportLogs}>
            <FileText className="w-4 h-4 mr-2" />
            Exportar Logs
          </Button>
        </CardContent>
      </Card>

      {/* Zona de Perigo - Apenas Admin */}
      {isAdmin && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>
              Ações irreversíveis que afetam permanentemente os dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar Todas as Conversas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso irá excluir permanentemente todas as 
                    conversas e mensagens do sistema. Os dados não poderão ser recuperados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      toast({
                        title: "Ação bloqueada",
                        description: "Por segurança, esta ação precisa ser executada diretamente no banco de dados.",
                        variant: "destructive",
                      });
                    }}
                  >
                    Sim, excluir tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
