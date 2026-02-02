import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/crm';

export function useUserRole(userId: string | undefined) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const fetchAttemptRef = useRef(0);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setIsLoading(false);
      setHasFetched(true);
      return;
    }

    const currentAttempt = ++fetchAttemptRef.current;

    const fetchRole = async () => {
      setIsLoading(true);
      setHasFetched(false);
      
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        // Ignore stale requests
        if (currentAttempt !== fetchAttemptRef.current) return;

        if (error) {
          console.error('Error fetching user role:', error);
          // Retry once after a short delay if we get a permission error
          if (error.code === 'PGRST116' || error.message.includes('permission')) {
            console.log('Retrying role fetch after permission error...');
            setTimeout(async () => {
              const { data: retryData, error: retryError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single();
              
              if (currentAttempt !== fetchAttemptRef.current) return;
              
              if (retryError) {
                console.error('Retry failed:', retryError);
                setRole(null);
              } else {
                setRole(retryData?.role as AppRole || null);
              }
              setIsLoading(false);
              setHasFetched(true);
            }, 500);
            return;
          }
          setRole(null);
        } else {
          setRole(data?.role as AppRole || null);
        }
      } catch (err) {
        console.error('Unexpected error fetching role:', err);
        if (currentAttempt !== fetchAttemptRef.current) return;
        setRole(null);
      }
      
      setIsLoading(false);
      setHasFetched(true);
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
    hasFetched,
    isAdmin,
    isComercial,
    isVisualizacao,
    canEdit,
    canManageUsers,
  };
}
