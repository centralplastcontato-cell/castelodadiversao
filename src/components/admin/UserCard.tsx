import { UserWithRole, AppRole, ROLE_LABELS } from "@/types/crm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Mail } from "lucide-react";

interface UserCardProps {
  user: UserWithRole;
  currentUserId: string;
  onToggleActive: (userId: string, currentStatus: boolean) => void;
  onUpdateRole: (userId: string, newRole: AppRole) => void;
}

export function UserCard({ 
  user, 
  currentUserId, 
  onToggleActive, 
  onUpdateRole 
}: UserCardProps) {
  const isCurrentUser = user.user_id === currentUserId;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header with name and status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">
                {user.full_name}
              </p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
            </div>
          </div>
          <Badge variant={user.is_active ? "default" : "secondary"}>
            {user.is_active ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        {/* Role selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Perfil
          </label>
          <Select
            value={user.role || "visualizacao"}
            onValueChange={(v) => onUpdateRole(user.user_id, v as AppRole)}
            disabled={isCurrentUser}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="visualizacao">Visualização</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">
            {isCurrentUser ? "Você não pode se desativar" : "Usuário ativo"}
          </span>
          <Switch
            checked={user.is_active}
            onCheckedChange={() => onToggleActive(user.user_id, user.is_active)}
            disabled={isCurrentUser}
          />
        </div>
      </CardContent>
    </Card>
  );
}
