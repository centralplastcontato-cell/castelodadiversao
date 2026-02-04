import { Lead, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LeadStatus } from "@/types/crm";
import { UserWithRole } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KanbanCard } from "./KanbanCard";

interface LeadsKanbanProps {
  leads: Lead[];
  responsaveis: UserWithRole[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onNameUpdate?: (leadId: string, newName: string) => Promise<void>;
  onDescriptionUpdate?: (leadId: string, newDescription: string) => Promise<void>;
  onTransfer?: (lead: Lead) => void;
  onDelete?: (leadId: string) => Promise<void>;
  canEdit: boolean;
  canEditName?: boolean;
  canEditDescription?: boolean;
  canDelete?: boolean;
}

export function LeadsKanban({
  leads,
  responsaveis,
  onLeadClick,
  onStatusChange,
  onNameUpdate,
  onDescriptionUpdate,
  onTransfer,
  onDelete,
  canEdit,
  canEditName = false,
  canEditDescription = false,
  canDelete = false,
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

  const getPreviousStatus = (currentStatus: LeadStatus): LeadStatus | null => {
    const currentIndex = columns.indexOf(currentStatus);
    if (currentIndex > 0) {
      return columns[currentIndex - 1];
    }
    return null;
  };

  const getNextStatus = (currentStatus: LeadStatus): LeadStatus | null => {
    const currentIndex = columns.indexOf(currentStatus);
    if (currentIndex < columns.length - 1) {
      return columns[currentIndex + 1];
    }
    return null;
  };

  const handleNameUpdate = async (leadId: string, newName: string) => {
    if (onNameUpdate) {
      await onNameUpdate(leadId, newName);
    }
  };

  const handleDescriptionUpdate = async (leadId: string, newDescription: string) => {
    if (onDescriptionUpdate) {
      await onDescriptionUpdate(leadId, newDescription);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full scrollbar-thin scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent">
      {columns.map((status) => {
        const columnLeads = getLeadsByStatus(status);
        return (
          <div
            key={status}
            className="flex-shrink-0 w-72 bg-muted/30 rounded-xl border border-border flex flex-col max-h-[calc(100vh-220px)]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column Header */}
            <div className="p-3 border-b border-border flex-shrink-0">
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
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-2">
                {columnLeads.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhum lead
                  </div>
                ) : (
                  columnLeads.map((lead) => (
                    <div key={lead.id} className="group">
                      <KanbanCard
                        lead={lead}
                        responsavelName={getResponsavelName(lead.responsavel_id)}
                        canEdit={canEdit}
                        canEditName={canEditName}
                        canEditDescription={canEditDescription}
                        onLeadClick={onLeadClick}
                        onStatusChange={onStatusChange}
                        onNameUpdate={handleNameUpdate}
                        onDescriptionUpdate={handleDescriptionUpdate}
                        onTransfer={onTransfer}
                        onDelete={onDelete}
                        canDelete={canDelete}
                        getPreviousStatus={getPreviousStatus}
                        getNextStatus={getNextStatus}
                      />
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
