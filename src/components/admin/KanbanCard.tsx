import { useState, useRef, useEffect } from "react";
import { Lead, LEAD_STATUS_LABELS, LeadStatus } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreVertical,
  Phone,
  AlertCircle,
  ArrowRightLeft,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KanbanCardProps {
  lead: Lead;
  responsavelName: string | null;
  canEdit: boolean;
  canEditName: boolean;
  canEditDescription: boolean;
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onNameUpdate: (leadId: string, newName: string) => Promise<void>;
  onDescriptionUpdate: (leadId: string, newDescription: string) => Promise<void>;
  onTransfer?: (lead: Lead) => void;
  getPreviousStatus: (status: LeadStatus) => LeadStatus | null;
  getNextStatus: (status: LeadStatus) => LeadStatus | null;
}

export function KanbanCard({
  lead,
  responsavelName,
  canEdit,
  canEditName,
  canEditDescription,
  onLeadClick,
  onStatusChange,
  onNameUpdate,
  onDescriptionUpdate,
  onTransfer,
  getPreviousStatus,
  getNextStatus,
}: KanbanCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(lead.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(lead.observacoes || "");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasPrev = getPreviousStatus(lead.status) !== null;
  const hasNext = getNextStatus(lead.status) !== null;
  
  // Check for incomplete lead data
  const missingFields: string[] = [];
  if (!lead.unit) missingFields.push("Unidade");
  if (!lead.month) missingFields.push("Data");
  if (!lead.guests) missingFields.push("Convidados");
  const isIncomplete = missingFields.length > 0;

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingDescription && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditingDescription]);

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

  // Name editing handlers
  const handleStartEditName = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedName(lead.name);
    setIsEditingName(true);
  };

  const handleCancelEditName = (e: React.MouseEvent) => {
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

  const handleKeyDownName = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      handleSaveName(e as unknown as React.MouseEvent);
    } else if (e.key === "Escape") {
      setIsEditingName(false);
      setEditedName(lead.name);
    }
  };

  // Description editing handlers
  const handleStartEditDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedDescription(lead.observacoes || "");
    setIsEditingDescription(true);
  };

  const handleCancelEditDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingDescription(false);
    setEditedDescription(lead.observacoes || "");
  };

  const handleSaveDescription = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editedDescription === (lead.observacoes || "")) {
      setIsEditingDescription(false);
      return;
    }

    setIsSaving(true);
    try {
      await onDescriptionUpdate(lead.id, editedDescription.trim());
      setIsEditingDescription(false);
    } catch {
      setEditedDescription(lead.observacoes || "");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDownDescription = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      setIsEditingDescription(false);
      setEditedDescription(lead.observacoes || "");
    }
  };

  const isEditing = isEditingName || isEditingDescription;

  return (
    <div
      draggable={canEdit && !isEditing}
      onDragStart={handleDragStart}
      onClick={() => !isEditing && onLeadClick(lead)}
      className={`
        bg-card rounded-lg border border-border p-3 
        cursor-pointer hover:border-primary/50 transition-colors
        ${canEdit && !isEditing ? "cursor-grab active:cursor-grabbing" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            )}
            
            {isEditingName ? (
              <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  ref={inputRef}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={handleKeyDownName}
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
                  onClick={handleCancelEditName}
                  disabled={isSaving}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{lead.name}</p>
                {isIncomplete && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>Faltando: {missingFields.join(", ")}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {canEditName && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={handleStartEditName}
                    title="Editar nome"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {(lead.unit || lead.month || lead.guests) && (
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
          )}

          {responsavelName && (
            <div className="mt-2 flex items-center gap-1">
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">
                {responsavelName}
              </span>
            </div>
          )}

          {/* Description / Observações section */}
          {isEditingDescription ? (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <Textarea
                ref={textareaRef}
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onKeyDown={handleKeyDownDescription}
                className="text-xs min-h-[60px] resize-none"
                placeholder="Observações..."
                disabled={isSaving}
              />
              <div className="flex items-center gap-1 mt-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-primary hover:text-primary/80"
                  onClick={handleSaveDescription}
                  disabled={isSaving}
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive/80"
                  onClick={handleCancelEditDescription}
                  disabled={isSaving}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-start gap-1">
              {lead.observacoes ? (
                <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                  💬 {lead.observacoes}
                </p>
              ) : (
                canEditDescription && (
                  <p className="text-xs text-muted-foreground/50 flex-1">
                    Sem observações
                  </p>
                )
              )}
              {canEditDescription && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                  onClick={handleStartEditDescription}
                  title="Editar descrição"
                >
                  <MessageSquare className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                window.open(formatWhatsAppLink(lead.whatsapp), "_blank");
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir WhatsApp
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(lead.whatsapp);
              }}
            >
              <Phone className="w-4 h-4 mr-2" />
              Copiar telefone
            </DropdownMenuItem>
            
            {canEditName && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleStartEditName}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar nome
                </DropdownMenuItem>
              </>
            )}
            
            {canEditDescription && (
              <DropdownMenuItem
                onClick={handleStartEditDescription}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Editar observações
              </DropdownMenuItem>
            )}
            
            {canEdit && onTransfer && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onTransfer(lead);
                  }}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Transferir lead
                </DropdownMenuItem>
              </>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onLeadClick(lead);
              }}
            >
              <User className="w-4 h-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {format(new Date(lead.created_at), "dd/MM/yy 'às' HH:mm", {
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
