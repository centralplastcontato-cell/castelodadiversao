import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/crm';

export function useUserRole(userId: string | undefined) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    const fetchRole = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } else {
        setRole(data?.role as AppRole || null);
      }
      setIsLoading(false);
    };

    fetchRole();
  }, [userId]);

  const isAdmin = role === 'admin';
  const isComercial = role === 'comercial';
  const isVisualizacao = role === 'visualizacao';
  const canEdit = isAdmin || isComercial;
  const canManageUsers = isAdmin;

  return {
    role,
    isLoading,
    isAdmin,
    isComercial,
    isVisualizacao,
    canEdit,
    canManageUsers,
  };
}
