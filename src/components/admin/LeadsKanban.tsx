import { Lead, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LeadStatus } from "@/types/crm";
import { UserWithRole } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ExternalLink,
  MessageSquare,
  User,
  GripVertical,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadsKanbanProps {
  leads: Lead[];
  responsaveis: UserWithRole[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  canEdit: boolean;
}

export function LeadsKanban({
  leads,
  responsaveis,
  onLeadClick,
  onStatusChange,
  canEdit,
}: LeadsKanbanProps) {
  const columns: LeadStatus[] = [
    "novo",
    "em_contato",
    "orcamento_enviado",
    "aguardando_resposta",
    "fechado",
    "perdido",
  ];

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter((lead) => lead.status === status);
  };

  const getResponsavelName = (responsavelId: string | null) => {
    if (!responsavelId) return null;
    const r = responsaveis.find((r) => r.user_id === responsavelId);
    return r?.full_name || null;
  };

  const formatWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.startsWith("55")
      ? cleanPhone
      : `55${cleanPhone}`;
    return `https://wa.me/${phoneWithCountry}`;
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId && canEdit) {
      onStatusChange(leadId, status);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((status) => {
        const columnLeads = getLeadsByStatus(status);
        return (
          <div
            key={status}
            className="flex-shrink-0 w-72 bg-muted/30 rounded-xl border border-border"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column Header */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${LEAD_STATUS_COLORS[status]}`}
                  />
                  <span className="font-medium text-sm">
                    {LEAD_STATUS_LABELS[status]}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {columnLeads.length}
                </Badge>
              </div>
            </div>

            {/* Column Content */}
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-2 space-y-2">
                {columnLeads.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhum lead
                  </div>
                ) : (
                  columnLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable={canEdit}
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onClick={() => onLeadClick(lead)}
                      className={`
                        bg-card rounded-lg border border-border p-3 
                        cursor-pointer hover:border-primary/50 transition-colors
                        ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}
                      `}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {canEdit && (
                              <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            )}
                            <p className="font-medium text-sm truncate">
                              {lead.name}
                            </p>
                          </div>

                          <div className="mt-2 space-y-1">
                            {lead.unit && (
                              <p className="text-xs text-muted-foreground">
                                📍 {lead.unit}
                              </p>
                            )}
                            {lead.month && (
                              <p className="text-xs text-muted-foreground">
                                📅 {lead.day_of_month || lead.day_preference || "-"}/
                                {lead.month}
                              </p>
                            )}
                            {lead.guests && (
                              <p className="text-xs text-muted-foreground">
                                👥 {lead.guests} convidados
                              </p>
                            )}
                          </div>

                          {getResponsavelName(lead.responsavel_id) && (
                            <div className="mt-2 flex items-center gap-1">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate">
                                {getResponsavelName(lead.responsavel_id)}
                              </span>
                            </div>
                          )}

                          {lead.observacoes && (
                            <div className="mt-2">
                              <MessageSquare className="w-3 h-3 text-primary inline" />
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(formatWhatsAppLink(lead.whatsapp), "_blank");
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(lead.created_at), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
