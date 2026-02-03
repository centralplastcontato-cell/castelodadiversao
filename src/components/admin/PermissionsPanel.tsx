import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions, PermissionDefinition } from "@/hooks/usePermissions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ClipboardList, Users, Shield, Loader2 } from "lucide-react";

interface PermissionsPanelProps {
  targetUserId: string;
  targetUserName: string;
  currentUserId: string;
  onClose?: () => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  Leads: ClipboardList,
  Usuários: Users,
  Sistema: Shield,
};

export function PermissionsPanel({
  targetUserId,
  targetUserName,
  currentUserId,
  onClose,
}: PermissionsPanelProps) {
  const { definitions, isLoading: isLoadingDefs, getPermissionsByCategory } = usePermissions(currentUserId);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [isLoadingPerms, setIsLoadingPerms] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // Fetch target user's permissions
  useEffect(() => {
    const fetchUserPermissions = async () => {
      setIsLoadingPerms(true);
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission, granted')
        .eq('user_id', targetUserId);

      if (error) {
        console.error('Error fetching user permissions:', error);
        toast({
          title: "Erro ao carregar permissões",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const permsMap: Record<string, boolean> = {};
        data?.forEach((p) => {
          permsMap[p.permission] = p.granted;
        });
        setUserPermissions(permsMap);
      }
      
      setIsLoadingPerms(false);
    };

    if (targetUserId) {
      fetchUserPermissions();
    }
  }, [targetUserId]);

  const handleTogglePermission = async (permissionCode: string, granted: boolean) => {
    setIsSaving(permissionCode);

    try {
      // Check if permission exists for this user
      const { data: existing } = await supabase
        .from('user_permissions')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('permission', permissionCode)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_permissions')
          .update({ 
            granted, 
            granted_by: currentUserId,
            updated_at: new Date().toISOString() 
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: targetUserId,
            permission: permissionCode,
            granted,
            granted_by: currentUserId,
          });

        if (error) throw error;
      }

      // Update local state
      setUserPermissions((prev) => ({
        ...prev,
        [permissionCode]: granted,
      }));

      toast({
        title: granted ? "Permissão concedida" : "Permissão revogada",
        description: `A permissão foi ${granted ? 'ativada' : 'desativada'} para ${targetUserName}.`,
      });
    } catch (error: any) {
      console.error('Error updating permission:', error);
      toast({
        title: "Erro ao atualizar permissão",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(null);
    }
  };

  const permissionsByCategory = getPermissionsByCategory();
  const isLoading = isLoadingDefs || isLoadingPerms;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Permissões de {targetUserName}</h3>
        <p className="text-sm text-muted-foreground">
          Ative ou desative as permissões específicas para este usuário.
        </p>
      </div>

      {Object.entries(permissionsByCategory).map(([category, perms]) => {
        const Icon = categoryIcons[category] || Shield;
        
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-5 w-5 text-primary" />
                {category}
              </CardTitle>
              <CardDescription>
                Permissões relacionadas a {category.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {perms.map((perm) => {
                const isGranted = userPermissions[perm.code] ?? false;
                const isSavingThis = isSaving === perm.code;
                
                return (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={`perm-${perm.code}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {perm.name}
                      </Label>
                      {perm.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {perm.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {isSavingThis && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        id={`perm-${perm.code}`}
                        checked={isGranted}
                        onCheckedChange={(checked) => handleTogglePermission(perm.code, checked)}
                        disabled={isSavingThis}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {Object.keys(permissionsByCategory).length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma permissão disponível.</p>
        </div>
      )}
    </div>
  );
}
