import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronRight, Database, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// SQL Schema definitions for all tables
const tableSchemas: Record<string, string> = {
  campaign_leads: `CREATE TABLE public.campaign_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  unit TEXT,
  month TEXT,
  day_of_month INTEGER,
  day_preference TEXT,
  guests TEXT,
  status lead_status NOT NULL DEFAULT 'novo'::lead_status,
  responsavel_id UUID,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

-- Enum for lead status
CREATE TYPE public.lead_status AS ENUM (
  'novo',
  'em_contato',
  'orcamento_enviado',
  'aguardando_resposta',
  'fechado',
  'perdido',
  'transferido'
);`,

  b2b_leads: `CREATE TABLE public.b2b_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  state TEXT,
  monthly_parties INTEGER,
  current_tools TEXT,
  main_challenges TEXT,
  how_found_us TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'novo'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_leads ENABLE ROW LEVEL SECURITY;`,

  profiles: `CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`,

  user_roles: `CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'visualizacao'::app_role,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'comercial', 'visualizacao');

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;`,

  user_permissions: `CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  permission TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;`,

  permission_definitions: `CREATE TABLE public.permission_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.permission_definitions ENABLE ROW LEVEL SECURITY;`,

  wapi_instances: `CREATE TABLE public.wapi_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instance_id TEXT NOT NULL,
  instance_token TEXT NOT NULL,
  unit TEXT,
  status TEXT DEFAULT 'disconnected'::text,
  phone_number TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  credits_available INTEGER DEFAULT 0,
  messages_count INTEGER DEFAULT 0,
  addon_valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wapi_instances ENABLE ROW LEVEL SECURITY;`,

  wapi_conversations: `CREATE TABLE public.wapi_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.wapi_instances(id),
  remote_jid TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  contact_picture TEXT,
  lead_id UUID REFERENCES public.campaign_leads(id),
  bot_enabled BOOLEAN DEFAULT true,
  bot_step TEXT,
  bot_data JSONB DEFAULT '{}'::jsonb,
  is_closed BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  is_equipe BOOLEAN NOT NULL DEFAULT false,
  is_freelancer BOOLEAN NOT NULL DEFAULT false,
  has_scheduled_visit BOOLEAN NOT NULL DEFAULT false,
  unread_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_content TEXT,
  last_message_from_me BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wapi_conversations ENABLE ROW LEVEL SECURITY;`,

  wapi_messages: `CREATE TABLE public.wapi_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.wapi_conversations(id),
  message_id TEXT,
  message_type TEXT NOT NULL DEFAULT 'text'::text,
  content TEXT,
  from_me BOOLEAN NOT NULL DEFAULT false,
  status TEXT DEFAULT 'pending'::text,
  media_url TEXT,
  media_key TEXT,
  media_direct_path TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wapi_messages ENABLE ROW LEVEL SECURITY;`,

  wapi_bot_settings: `CREATE TABLE public.wapi_bot_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL UNIQUE REFERENCES public.wapi_instances(id),
  bot_enabled BOOLEAN NOT NULL DEFAULT false,
  test_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  test_mode_number TEXT,
  message_delay_seconds INTEGER DEFAULT 5,
  welcome_message TEXT,
  completion_message TEXT,
  transfer_message TEXT,
  qualified_lead_message TEXT,
  next_step_question TEXT,
  next_step_visit_response TEXT,
  next_step_questions_response TEXT,
  next_step_analyze_response TEXT,
  follow_up_enabled BOOLEAN DEFAULT true,
  follow_up_delay_hours INTEGER DEFAULT 24,
  follow_up_message TEXT,
  follow_up_2_enabled BOOLEAN DEFAULT false,
  follow_up_2_delay_hours INTEGER DEFAULT 48,
  follow_up_2_message TEXT,
  auto_send_materials BOOLEAN DEFAULT true,
  auto_send_pdf BOOLEAN DEFAULT true,
  auto_send_pdf_intro TEXT,
  auto_send_photos BOOLEAN DEFAULT true,
  auto_send_photos_intro TEXT,
  auto_send_presentation_video BOOLEAN DEFAULT true,
  auto_send_promo_video BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wapi_bot_settings ENABLE ROW LEVEL SECURITY;`,

  wapi_bot_questions: `CREATE TABLE public.wapi_bot_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.wapi_instances(id),
  step TEXT NOT NULL,
  question_text TEXT NOT NULL,
  confirmation_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wapi_bot_questions ENABLE ROW LEVEL SECURITY;`,

  wapi_vip_numbers: `CREATE TABLE public.wapi_vip_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.wapi_instances(id),
  phone TEXT NOT NULL,
  name TEXT,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wapi_vip_numbers ENABLE ROW LEVEL SECURITY;`,

  message_templates: `CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;`,

  sales_materials: `CREATE TABLE public.sales_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  unit TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT,
  photo_urls TEXT[] DEFAULT '{}'::text[],
  guest_count INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_materials ENABLE ROW LEVEL SECURITY;`,

  sales_material_captions: `CREATE TABLE public.sales_material_captions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caption_type TEXT NOT NULL,
  caption_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_material_captions ENABLE ROW LEVEL SECURITY;`,

  notifications: `CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;`,

  lead_history: `CREATE TABLE public.lead_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.campaign_leads(id),
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;`,

  user_filter_preferences: `CREATE TABLE public.user_filter_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  filter_order TEXT[] NOT NULL DEFAULT ARRAY['all', 'unread', 'closed', 'fechados', 'oe', 'visitas', 'freelancer', 'equipe', 'favorites', 'grupos'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_filter_preferences ENABLE ROW LEVEL SECURITY;`,

  proposals: `CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prospect_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  plan TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  subtotal NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  valid_days INTEGER NOT NULL DEFAULT 7,
  custom_features TEXT[] DEFAULT '{}'::text[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;`,
};

const tableCategories: Record<string, string[]> = {
  "Leads & CRM": ["campaign_leads", "b2b_leads", "lead_history", "proposals"],
  "Usuários": ["profiles", "user_roles", "user_permissions", "permission_definitions", "user_filter_preferences"],
  "WhatsApp": ["wapi_instances", "wapi_conversations", "wapi_messages", "wapi_vip_numbers"],
  "Automações": ["wapi_bot_settings", "wapi_bot_questions"],
  "Configurações": ["message_templates", "sales_materials", "sales_material_captions", "notifications"],
};

interface SqlSchemaSectionProps {
  isAdmin: boolean;
}

export function SqlSchemaSection({ isAdmin }: SqlSchemaSectionProps) {
  const [copiedTable, setCopiedTable] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const copyToClipboard = async (text: string, tableName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTable(tableName);
      toast({
        title: "SQL copiado!",
        description: `Schema da tabela ${tableName} copiado para a área de transferência.`,
      });
      setTimeout(() => setCopiedTable(null), 2000);
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o SQL. Tente selecionar manualmente.",
        variant: "destructive",
      });
    }
  };

  const copyAllSchemas = async () => {
    const allSql = Object.entries(tableSchemas)
      .map(([table, sql]) => `-- ============================================\n-- Table: ${table}\n-- ============================================\n\n${sql}`)
      .join("\n\n\n");
    
    try {
      await navigator.clipboard.writeText(allSql);
      toast({
        title: "Todos os schemas copiados!",
        description: `${Object.keys(tableSchemas).length} tabelas copiadas para a área de transferência.`,
      });
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar. Tente selecionar manualmente.",
        variant: "destructive",
      });
    }
  };

  const toggleTable = (table: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(table)) {
        next.delete(table);
      } else {
        next.add(table);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedTables(new Set(Object.keys(tableSchemas)));
  };

  const collapseAll = () => {
    setExpandedTables(new Set());
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Code className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Acesso Restrito</h3>
        <p className="text-muted-foreground max-w-md">
          Apenas administradores podem visualizar os schemas SQL.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            SQL das tabelas do sistema para migração
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expandir Tudo
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Recolher Tudo
          </Button>
          <Button onClick={copyAllSchemas} className="gap-2">
            <Copy className="w-4 h-4" />
            Copiar Tudo
          </Button>
        </div>
      </div>

      {/* Tables by Category */}
      {Object.entries(tableCategories).map(([category, tables]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Database className="w-4 h-4" />
            {category}
            <span className="text-xs font-normal">({tables.length} tabelas)</span>
          </h3>
          
          <div className="space-y-2">
            {tables.map(table => {
              const isExpanded = expandedTables.has(table);
              const isCopied = copiedTable === table;
              const sql = tableSchemas[table];
              
              if (!sql) return null;
              
              return (
                <Card key={table} className="overflow-hidden">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleTable(table)}>
                    <CardHeader className="p-3">
                      <div className="flex items-center justify-between">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="p-0 h-auto hover:bg-transparent gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <CardTitle className="text-sm font-mono">
                              {table}
                            </CardTitle>
                          </Button>
                        </CollapsibleTrigger>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(sql, table)}
                          className="h-7 px-2 gap-1"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-primary" />
                              <span className="text-xs">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span className="text-xs">Copiar</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CollapsibleContent>
                      <CardContent className="p-0 border-t">
                        <ScrollArea className="max-h-80">
                          <pre className={cn(
                            "p-4 text-xs font-mono overflow-x-auto",
                            "bg-muted/50 text-foreground"
                          )}>
                            <code>{sql}</code>
                          </pre>
                        </ScrollArea>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
