import { useState } from "react";
import { Download, Database, Users, MessageSquare, Settings, Bot, FileText, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tables: string[];
  category: "database" | "users" | "whatsapp" | "config";
}

const exportOptions: ExportOption[] = [
  {
    id: "leads",
    title: "Leads de Campanhas",
    description: "Todos os leads com nome, WhatsApp, unidade, status e observações",
    icon: Database,
    tables: ["campaign_leads"],
    category: "database",
  },
  {
    id: "b2b_leads",
    title: "Leads B2B",
    description: "Leads de empresas interessadas na plataforma",
    icon: Database,
    tables: ["b2b_leads"],
    category: "database",
  },
  {
    id: "conversations",
    title: "Conversas WhatsApp",
    description: "Histórico de conversas com contatos e status do bot",
    icon: MessageSquare,
    tables: ["wapi_conversations"],
    category: "whatsapp",
  },
  {
    id: "messages",
    title: "Mensagens WhatsApp",
    description: "Todas as mensagens enviadas e recebidas",
    icon: MessageSquare,
    tables: ["wapi_messages"],
    category: "whatsapp",
  },
  {
    id: "users",
    title: "Usuários e Perfis",
    description: "Lista de usuários do sistema com nome e email",
    icon: Users,
    tables: ["profiles"],
    category: "users",
  },
  {
    id: "roles",
    title: "Roles e Permissões",
    description: "Papéis e permissões atribuídas aos usuários",
    icon: Users,
    tables: ["user_roles", "user_permissions"],
    category: "users",
  },
  {
    id: "instances",
    title: "Instâncias WhatsApp",
    description: "Configurações das instâncias conectadas",
    icon: Settings,
    tables: ["wapi_instances"],
    category: "whatsapp",
  },
  {
    id: "bot_settings",
    title: "Configurações do Bot",
    description: "Mensagens automáticas e configurações do chatbot",
    icon: Bot,
    tables: ["wapi_bot_settings", "wapi_bot_questions"],
    category: "config",
  },
  {
    id: "templates",
    title: "Templates de Mensagens",
    description: "Modelos de mensagens salvos",
    icon: FileText,
    tables: ["message_templates"],
    category: "config",
  },
  {
    id: "materials",
    title: "Materiais de Vendas",
    description: "PDFs, fotos e vídeos configurados",
    icon: FileText,
    tables: ["sales_materials", "sales_material_captions"],
    category: "config",
  },
  {
    id: "notifications",
    title: "Notificações",
    description: "Histórico de notificações do sistema",
    icon: Settings,
    tables: ["notifications"],
    category: "config",
  },
  {
    id: "lead_history",
    title: "Histórico de Leads",
    description: "Registro de alterações e ações nos leads",
    icon: Database,
    tables: ["lead_history"],
    category: "database",
  },
];

const categoryLabels: Record<string, { label: string; color: string }> = {
  database: { label: "Banco de Dados", color: "bg-primary/10 text-primary" },
  users: { label: "Usuários", color: "bg-secondary/50 text-secondary-foreground" },
  whatsapp: { label: "WhatsApp", color: "bg-accent/50 text-accent-foreground" },
  config: { label: "Configurações", color: "bg-muted text-muted-foreground" },
};

interface DataExportSectionProps {
  userId: string;
  isAdmin: boolean;
}

export function DataExportSection({ userId: _userId, isAdmin }: DataExportSectionProps) {
  const [exportingIds, setExportingIds] = useState<Set<string>>(new Set());
  const [exportedIds, setExportedIds] = useState<Set<string>>(new Set());

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({
        title: "Sem dados",
        description: "Não há dados para exportar nesta tabela.",
        variant: "destructive",
      });
      return false;
    }

    // Get all unique keys from data
    const headers = Array.from(
      new Set(data.flatMap(row => Object.keys(row)))
    );

    // Build CSV content
    const csvContent = [
      headers.join(";"),
      ...data.map(row =>
        headers
          .map(header => {
            const value = row[header];
            if (value === null || value === undefined) return "";
            if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(";")
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  };

  const handleExport = async (option: ExportOption) => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem exportar dados.",
        variant: "destructive",
      });
      return;
    }

    setExportingIds(prev => new Set(prev).add(option.id));

    try {
      const allData: any[] = [];
      
      for (const table of option.tables) {
        const { data, error } = await supabase
          .from(table as any)
          .select("*")
          .limit(10000);

        if (error) {
          console.error(`Error fetching ${table}:`, error);
          toast({
            title: "Erro ao exportar",
            description: `Falha ao buscar dados de ${table}: ${error.message}`,
            variant: "destructive",
          });
          continue;
        }

        if (data && data.length > 0) {
          // Add table source column if multiple tables
          if (option.tables.length > 1) {
            data.forEach(row => {
              (row as any)._source_table = table;
            });
          }
          allData.push(...data);
        }
      }

      const filename = `${option.id}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`;
      const success = exportToCSV(allData, filename);

      if (success) {
        setExportedIds(prev => new Set(prev).add(option.id));
        toast({
          title: "Exportação concluída",
          description: `${allData.length} registros exportados para ${filename}`,
        });
        
        // Clear success state after 3 seconds
        setTimeout(() => {
          setExportedIds(prev => {
            const next = new Set(prev);
            next.delete(option.id);
            return next;
          });
        }, 3000);
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setExportingIds(prev => {
        const next = new Set(prev);
        next.delete(option.id);
        return next;
      });
    }
  };

  const handleExportAll = async () => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem exportar dados.",
        variant: "destructive",
      });
      return;
    }

    for (const option of exportOptions) {
      await handleExport(option);
      // Small delay between exports
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const groupedOptions = exportOptions.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, ExportOption[]>);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Download className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Acesso Restrito</h3>
        <p className="text-muted-foreground max-w-md">
          Apenas administradores podem exportar dados do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export All button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Exporte dados do Lovable Cloud em formato CSV
          </p>
        </div>
        <Button
          onClick={handleExportAll}
          disabled={exportingIds.size > 0}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar Tudo
        </Button>
      </div>

      {/* Export Options by Category */}
      {Object.entries(groupedOptions).map(([category, options]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className={categoryLabels[category].color}>
              {categoryLabels[category].label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {options.length} {options.length === 1 ? "tabela" : "tabelas"}
            </span>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((option) => {
              const isExporting = exportingIds.has(option.id);
              const isExported = exportedIds.has(option.id);
              const Icon = option.icon;
              
              return (
                <Card 
                  key={option.id} 
                  className="hover:border-primary/50 transition-colors"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <CardTitle className="text-sm font-medium">
                          {option.title}
                        </CardTitle>
                      </div>
                      <Button
                        size="sm"
                        variant={isExported ? "outline" : "secondary"}
                        onClick={() => handleExport(option)}
                        disabled={isExporting}
                        className="h-7 px-2 gap-1"
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="sr-only">Exportando...</span>
                          </>
                        ) : isExported ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-primary" />
                            <span className="text-xs">OK</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3" />
                            <span className="text-xs">CSV</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <CardDescription className="text-xs">
                      {option.description}
                    </CardDescription>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {option.tables.map(table => (
                        <code 
                          key={table} 
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono"
                        >
                          {table}
                        </code>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
