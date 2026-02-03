import { useState, useRef, useEffect } from "react";
import { Lead, LEAD_STATUS_LABELS, LeadStatus } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ExternalLink,
  MessageSquare,
  User,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KanbanCardProps {
  lead: Lead;
  responsavelName: string | null;
  canEdit: boolean;
  canEditName: boolean;
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onNameUpdate: (leadId: string, newName: string) => Promise<void>;
  getPreviousStatus: (status: LeadStatus) => LeadStatus | null;
  getNextStatus: (status: LeadStatus) => LeadStatus | null;
}

export function KanbanCard({
  lead,
  responsavelName,
  canEdit,
  canEditName,
  onLeadClick,
  onStatusChange,
  onNameUpdate,
  getPreviousStatus,
  getNextStatus,
}: KanbanCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(lead.name);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasPrev = getPreviousStatus(lead.status) !== null;
  const hasNext = getNextStatus(lead.status) !== null;

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const formatWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.startsWith("55")
      ? cleanPhone
      : `55${cleanPhone}`;
    return `https://wa.me/${phoneWithCountry}`;
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("leadId", lead.id);
  };

  const handleMoveLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevStatus = getPreviousStatus(lead.status);
    if (prevStatus && canEdit) {
      onStatusChange(lead.id, prevStatus);
    }
  };

  const handleMoveRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = getNextStatus(lead.status);
    if (nextStatus && canEdit) {
      onStatusChange(lead.id, nextStatus);
    }
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedName(lead.name);
    setIsEditingName(true);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(false);
    setEditedName(lead.name);
  };

  const handleSaveName = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editedName.trim() === "" || editedName === lead.name) {
      setIsEditingName(false);
      setEditedName(lead.name);
      return;
    }

    setIsSaving(true);
    try {
      await onNameUpdate(lead.id, editedName.trim());
      setIsEditingName(false);
    } catch {
      setEditedName(lead.name);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      handleSaveName(e as unknown as React.MouseEvent);
    } else if (e.key === "Escape") {
      setIsEditingName(false);
      setEditedName(lead.name);
    }
  };

  return (
    <div
      draggable={canEdit && !isEditingName}
      onDragStart={handleDragStart}
      onClick={() => !isEditingName && onLeadClick(lead)}
      className={`
        bg-card rounded-lg border border-border p-3 
        cursor-pointer hover:border-primary/50 transition-colors
        ${canEdit && !isEditingName ? "cursor-grab active:cursor-grabbing" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {canEdit && !isEditingName && (
              <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            )}
            
            {isEditingName ? (
              <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  ref={inputRef}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-7 text-sm py-0 px-2"
                  disabled={isSaving}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-primary hover:text-primary/80"
                  onClick={handleSaveName}
                  disabled={isSaving}
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive/80"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{lead.name}</p>
                {canEditName && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={handleStartEdit}
                    title="Editar nome"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
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

          {responsavelName && (
            <div className="mt-2 flex items-center gap-1">
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">
                {responsavelName}
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

      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {format(new Date(lead.created_at), "dd/MM/yyyy", {
            locale: ptBR,
          })}
        </p>
        
        {canEdit && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleMoveLeft}
              disabled={!hasPrev}
              title={hasPrev ? `Mover para ${LEAD_STATUS_LABELS[getPreviousStatus(lead.status)!]}` : undefined}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleMoveRight}
              disabled={!hasNext}
              title={hasNext ? `Mover para ${LEAD_STATUS_LABELS[getNextStatus(lead.status)!]}` : undefined}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
