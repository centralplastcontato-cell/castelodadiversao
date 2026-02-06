import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { useUnitPermissions } from "@/hooks/useUnitPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useLeadNotifications } from "@/hooks/useLeadNotifications";
import { useChatNotificationToggle } from "@/hooks/useChatNotificationToggle";
import { Lead, LeadStatus, UserWithRole, Profile } from "@/types/crm";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { LeadsFilters } from "@/components/admin/LeadsFilters";
import { LeadsKanban } from "@/components/admin/LeadsKanban";
import { LeadDetailSheet } from "@/components/admin/LeadDetailSheet";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { exportLeadsToCSV } from "@/components/admin/exportLeads";
import { MetricsCards } from "@/components/admin/MetricsCards";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { TransferAlertBanner } from "@/components/admin/TransferAlertBanner";
import { WhatsAppChat } from "@/components/whatsapp/WhatsAppChat";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AnimatedBadge } from "@/components/ui/animated-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { LayoutList, Columns, Menu, Bell, BellOff, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logoCastelo from "@/assets/logo-castelo.png";

export interface LeadFilters {
  campaign: string;
  unit: string;
  status: string;
  responsavel: string;
  month: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  search: string;
}

export default function CentralAtendimento() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [_session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<LeadFilters>({
    campaign: "all",
    unit: "all",
    status: "all",
    responsavel: "all",
    month: "all",
    startDate: undefined,
    endDate: undefined,
    search: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [responsaveis, setResponsaveis] = useState<UserWithRole[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "leads">("chat");
  const [unreadCount, setUnreadCount] = useState(0);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [initialPhone, setInitialPhone] = useState<string | null>(null);

  // Handle URL params for phone navigation
  useEffect(() => {
    const phoneParam = searchParams.get("phone");
    if (phoneParam) {
      setInitialPhone(phoneParam);
      setActiveTab("chat");
    }
  }, [searchParams]);

  const handlePhoneHandled = () => {
    // Clear the phone param from URL after it's been processed
    if (searchParams.has("phone")) {
      searchParams.delete("phone");
      setSearchParams(searchParams, { replace: true });
    }
    setInitialPhone(null);
  };

  const { role, isLoading: isLoadingRole, isAdmin, canEdit, canManageUsers } = useUserRole(user?.id);
  const { allowedUnits, canViewAll, isLoading: isLoadingUnitPerms } = useUnitPermissions(user?.id);
  const { hasPermission } = usePermissions(user?.id);
  const canEditName = isAdmin || hasPermission('leads.edit.name');
  const canEditDescription = isAdmin || hasPermission('leads.edit.description');
  const canAccessB2B = isAdmin || hasPermission('b2b.view');
  
  // Sound notification for new leads
  useLeadNotifications();
  
  // Chat notifications toggle
  const { notificationsEnabled, toggleNotifications } = useChatNotificationToggle();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [isLoading, user, navigate]);

  // Fetch current user profile
  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setCurrentUserProfile(data as Profile);
          }
        });
    }
  }, [user]);

  // Fetch responsaveis (users who can be assigned)
  useEffect(() => {
    const fetchResponsaveis = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true);

      const { data: roles } = await supabase.from("user_roles").select("*");

      if (profiles) {
        const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
          const userRole = roles?.find((r) => r.user_id === profile.user_id);
          return {
            ...profile,
            role: userRole?.role,
          };
        });
        setResponsaveis(usersWithRoles);
      }
    };

    if (role) {
      fetchResponsaveis();
    }
  }, [role]);

  // Fetch leads
  useEffect(() => {
    const fetchLeads = async () => {
      if (!role || isLoadingUnitPerms) return;

      setIsLoadingLeads(true);

      let query = supabase
        .from("campaign_leads")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply unit permission filter (before user-selected filters)
      if (!canViewAll && allowedUnits.length > 0 && !allowedUnits.includes('all')) {
        query = query.in("unit", allowedUnits);
      } else if (!canViewAll && allowedUnits.length === 0) {
        // No unit permission granted - return empty
        setLeads([]);
        setTotalCount(0);
        setIsLoadingLeads(false);
        return;
      }

      // Apply user-selected filters
      if (filters.unit && filters.unit !== "all") {
        query = query.eq("unit", filters.unit);
      }

      if (filters.campaign && filters.campaign !== "all") {
        query = query.eq("campaign_id", filters.campaign);
      }

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status as LeadStatus);
      }

      if (filters.responsavel && filters.responsavel !== "all") {
        if (filters.responsavel === "unassigned") {
          query = query.is("responsavel_id", null);
        } else {
          query = query.eq("responsavel_id", filters.responsavel);
        }
      }

      if (filters.month && filters.month !== "all") {
        query = query.eq("month", filters.month);
      }

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }

      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%`
        );
      }

      const { data, count, error } = await query;

      if (error) {
        console.error("Erro ao buscar leads:", error);
      } else {
        setLeads((data || []) as Lead[]);
        setTotalCount(count || 0);
      }

      setIsLoadingLeads(false);
    };

    fetchLeads();
  }, [filters, refreshKey, role, canViewAll, allowedUnits, isLoadingUnitPerms]);

  // Handle lead ID from URL parameters (deep linking from WhatsApp)
  useEffect(() => {
    const leadId = searchParams.get('lead');
    if (leadId && leads.length > 0 && !isLoadingLeads) {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        setSelectedLead(lead);
        setIsDetailOpen(true);
        setActiveTab("leads");
        // Clear the URL parameter after opening
        searchParams.delete('lead');
        setSearchParams(searchParams, { replace: true });
      } else {
        // Lead not in current view - fetch it directly
        supabase
          .from('campaign_leads')
          .select('*')
          .eq('id', leadId)
          .single()
          .then(({ data }) => {
            if (data) {
              setSelectedLead(data as Lead);
              setIsDetailOpen(true);
              setActiveTab("leads");
            }
            // Clear the URL parameter
            searchParams.delete('lead');
            setSearchParams(searchParams, { replace: true });
          });
      }
    }
  }, [leads, isLoadingLeads, searchParams, setSearchParams]);

  // Fetch unread messages count with realtime updates
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { data } = await supabase
        .from("wapi_conversations")
        .select("unread_count");
      
      if (data) {
        const total = data.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
        setUnreadCount(total);
      }
    };

    fetchUnreadCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('unread-count-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wapi_conversations',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch new leads count with realtime updates AND refresh leads list on new lead
  useEffect(() => {
    const fetchNewLeadsCount = async () => {
      const { count } = await supabase
        .from("campaign_leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "novo");
      
      setNewLeadsCount(count || 0);
    };

    fetchNewLeadsCount();

    // Subscribe to realtime changes - also refresh leads list when new leads arrive
    const leadsChannel = supabase
      .channel('new-leads-count-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_leads',
        },
        (payload) => {
          console.log('Novo lead recebido em tempo real:', payload.new);
          fetchNewLeadsCount();
          // Add the new lead to the list immediately (at the beginning since ordered by created_at desc)
          setLeads((prev) => {
            const newLead = payload.new as Lead;
            // Check if lead already exists to avoid duplicates
            if (prev.some(l => l.id === newLead.id)) {
              return prev;
            }
            return [newLead, ...prev];
          });
          setTotalCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaign_leads',
        },
        (payload) => {
          fetchNewLeadsCount();
          // Update the lead in the list
          setLeads((prev) =>
            prev.map((lead) =>
              lead.id === payload.new.id ? (payload.new as Lead) : lead
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'campaign_leads',
        },
        (payload) => {
          fetchNewLeadsCount();
          // Remove the lead from the list
          setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id));
          setTotalCount((prev) => Math.max(0, prev - 1));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta.",
    });
    navigate("/auth");
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );
  };

  const handleExport = () => {
    exportLeadsToCSV({ leads, responsaveis });
    toast({
      title: "Exportação concluída",
      description: `${leads.length} leads exportados para CSV.`,
    });
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      // First delete related history records
      await supabase.from("lead_history").delete().eq("lead_id", leadId);
      
      // Then delete the lead
      const { error } = await supabase.from("campaign_leads").delete().eq("id", leadId);
      if (error) throw error;
      
      // Update local state
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      
      toast({
        title: "Lead excluído",
        description: "O lead foi removido permanentemente.",
      });
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({
        title: "Erro ao excluir lead",
        description: "Não foi possível excluir o lead. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || isLoadingRole || isLoadingUnitPerms) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !role) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Mobile layout with Sheet
  if (isMobile) {
    return (
      <div className="h-dvh flex flex-col overflow-hidden bg-background">
        {/* Mobile Header */}
        <header className="bg-card border-b border-border shrink-0 z-10">
          <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MobileMenu
                  isOpen={isMobileMenuOpen}
                  onOpenChange={setIsMobileMenuOpen}
                  trigger={
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Menu className="w-5 h-5" />
                    </Button>
                  }
                  currentPage="atendimento"
                  userName={currentUserProfile?.full_name || ""}
                  userEmail={user.email || ""}
                  userAvatar={currentUserProfile?.avatar_url}
                  canManageUsers={canManageUsers}
                  canAccessB2B={canAccessB2B}
                  onRefresh={handleRefresh}
                  onLogout={handleLogout}
                />

                <div className="flex items-center gap-2 min-w-0">
                  <img src={logoCastelo} alt="Castelo da Diversão" className="h-8 w-auto shrink-0" />
                  <h1 className="font-display font-bold text-foreground text-sm truncate">Central de Atendimento</h1>
                </div>
              </div>
              
              {/* Mobile notification controls */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleNotifications}
                  className={`h-9 w-9 transition-all duration-200 ${
                    notificationsEnabled 
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={notificationsEnabled ? "Desativar notificações" : "Ativar notificações"}
                >
                  {notificationsEnabled ? (
                    <Bell className="w-5 h-5" />
                  ) : (
                    <BellOff className="w-5 h-5" />
                  )}
                </Button>
                <NotificationBell />
              </div>
            </div>
          </div>
        </header>

        {/* Transfer Alert Banner - Mobile */}
        <TransferAlertBanner 
          userId={user.id} 
          onViewLead={(leadId) => {
            const lead = leads.find(l => l.id === leadId);
            if (lead) {
              setSelectedLead(lead);
              setIsDetailOpen(true);
              setActiveTab("leads");
            } else {
              // Fetch the lead if not in current list
              supabase.from('campaign_leads').select('*').eq('id', leadId).single().then(({ data }) => {
                if (data) {
                  setSelectedLead(data as Lead);
                  setIsDetailOpen(true);
                  setActiveTab("leads");
                }
              });
            }
          }}
        />

        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "leads")} className="flex-1 flex flex-col overflow-hidden min-h-0">
            <TabsList className="mx-3 mt-3 grid grid-cols-2">
              <TabsTrigger value="chat" className="flex items-center gap-1.5 text-xs relative">
                <MessageSquare className="w-4 h-4" />
                Chat
                {unreadCount > 0 && (
                  <AnimatedBadge 
                    value={unreadCount > 99 ? "99+" : unreadCount}
                    variant="destructive" 
                    className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center rounded-full"
                  />
                )}
              </TabsTrigger>
              <TabsTrigger value="leads" className="flex items-center gap-1.5 text-xs relative">
                <LayoutList className="w-4 h-4" />
                Leads
                {newLeadsCount > 0 && (
                  <AnimatedBadge 
                    value={newLeadsCount > 99 ? "99+" : newLeadsCount}
                    className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center rounded-full bg-blue-500 text-white"
                  />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 overflow-hidden min-h-0 mt-0 p-0">
              <WhatsAppChat 
                userId={user.id} 
                allowedUnits={canViewAll ? ['all'] : allowedUnits} 
                initialPhone={initialPhone}
                onPhoneHandled={handlePhoneHandled}
              />
            </TabsContent>

            <TabsContent value="leads" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <PullToRefresh 
                onRefresh={handleRefresh} 
                className="flex-1 px-3 py-4"
              >
                {/* View Mode Toggle - at top like unit tabs in Chat */}
                <div className="flex items-center gap-2 mb-4">
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "kanban")} className="flex-1">
                    <TabsList>
                      <TabsTrigger value="list" className="flex items-center gap-2">
                        <LayoutList className="w-4 h-4" />
                        Lista
                      </TabsTrigger>
                      <TabsTrigger value="kanban" className="flex items-center gap-2">
                        <Columns className="w-4 h-4" />
                        CRM
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <MetricsCards leads={leads} isLoading={isLoadingLeads} />
                <LeadsFilters filters={filters} onFiltersChange={setFilters} responsaveis={responsaveis} onExport={handleExport} />

                {viewMode === "list" ? (
                  <LeadsTable
                    leads={leads}
                    isLoading={isLoadingLeads}
                    totalCount={totalCount}
                    responsaveis={responsaveis}
                    onLeadClick={handleLeadClick}
                    onStatusChange={handleStatusChange}
                    onRefresh={handleRefresh}
                    canEdit={canEdit}
                    isAdmin={isAdmin}
                    currentUserId={user.id}
                    currentUserName={currentUserProfile?.full_name || user.email || ""}
                  />
                ) : (
                  <LeadsKanban
                    leads={leads}
                    responsaveis={responsaveis}
                    onLeadClick={handleLeadClick}
                    onStatusChange={async (leadId, newStatus) => {
                      try {
                        const lead = leads.find((l) => l.id === leadId);
                        if (!lead) return;
                        await supabase.from("lead_history").insert({ lead_id: leadId, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de status", old_value: lead.status, new_value: newStatus });
                        const { error } = await supabase.from("campaign_leads").update({ status: newStatus }).eq("id", leadId);
                        if (error) throw error;
                        handleStatusChange(leadId, newStatus);
                      } catch (error) {
                        console.error("Error updating status:", error);
                        toast({ title: "Erro ao atualizar status", description: "Tente novamente.", variant: "destructive" });
                      }
                    }}
                    onNameUpdate={async (leadId, newName) => {
                      const lead = leads.find((l) => l.id === leadId);
                      if (!lead) return;
                      await supabase.from("lead_history").insert({ lead_id: leadId, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de nome", old_value: lead.name, new_value: newName });
                      const { error } = await supabase.from("campaign_leads").update({ name: newName }).eq("id", leadId);
                      if (error) throw error;
                      // Also update contact_name in linked conversations
                      await supabase.from("wapi_conversations").update({ contact_name: newName }).eq("lead_id", leadId);
                      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, name: newName } : l));
                      toast({ title: "Nome atualizado", description: `O nome foi alterado para "${newName}".` });
                    }}
                    onDescriptionUpdate={async (leadId, newDescription) => {
                      const lead = leads.find((l) => l.id === leadId);
                      if (!lead) return;
                      await supabase.from("lead_history").insert({ lead_id: leadId, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de observações", old_value: lead.observacoes || "", new_value: newDescription });
                      const { error } = await supabase.from("campaign_leads").update({ observacoes: newDescription }).eq("id", leadId);
                      if (error) throw error;
                      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, observacoes: newDescription } : l));
                      toast({ title: "Observação atualizada", description: "A observação foi salva com sucesso." });
                    }}
                    canEdit={canEdit}
                    canEditName={canEditName}
                    canEditDescription={canEditDescription}
                    canDelete={isAdmin}
                    onDelete={handleDeleteLead}
                  />
                )}
              </PullToRefresh>
            </TabsContent>

          </Tabs>
        </main>

        <LeadDetailSheet lead={selectedLead} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onUpdate={handleRefresh} responsaveis={responsaveis} currentUserId={user.id} currentUserName={currentUserProfile?.full_name || user.email || ""} canEdit={canEdit} canDelete={isAdmin} onDelete={handleDeleteLead} />
      </div>
    );
  }

  // Desktop layout with Sidebar
  return (
    <SidebarProvider>
      <div className="h-dvh flex w-full overflow-hidden">
        <AdminSidebar 
          canManageUsers={canManageUsers}
          canAccessB2B={canAccessB2B}
          currentUserName={currentUserProfile?.full_name || user.email || ""} 
          onRefresh={handleRefresh} 
          onLogout={handleLogout} 
        />
        
        <SidebarInset className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Desktop Header - Compact */}
          <header className="bg-card border-b border-border shrink-0 z-10">
            <div className="px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <h1 className="font-display font-bold text-foreground">Central de Atendimento</h1>
                
                {/* Quick Tab Buttons */}
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant={activeTab === "chat" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("chat")}
                    className="relative h-8 px-3"
                  >
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    Chat
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-1.5 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    variant={activeTab === "leads" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("leads")}
                    className="relative h-8 px-3"
                  >
                    <LayoutList className="w-4 h-4 mr-1.5" />
                    Leads
                    {newLeadsCount > 0 && (
                      <Badge 
                        className="ml-1.5 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center bg-blue-500 text-white"
                      >
                        {newLeadsCount > 99 ? "99+" : newLeadsCount}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleNotifications}
                    className={`relative h-8 px-3 transition-all duration-200 ${
                      notificationsEnabled 
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={notificationsEnabled ? "Notificações ativadas" : "Notificações desativadas"}
                  >
                    {notificationsEnabled ? (
                      <Bell className="w-4 h-4 mr-1.5" />
                    ) : (
                      <BellOff className="w-4 h-4 mr-1.5" />
                    )}
                    <span className="hidden lg:inline">
                      {notificationsEnabled ? "Som" : "Mudo"}
                    </span>
                  </Button>
                </div>
              </div>
              
              {/* Notification Bell and User Avatar Desktop */}
              <div className="flex items-center gap-2">
                <NotificationBell />
                <span className="text-sm text-muted-foreground hidden lg:block">{currentUserProfile?.full_name || user.email}</span>
                <Avatar 
                  className="h-8 w-8 border-2 border-primary/20 cursor-pointer hover:border-primary/40 transition-colors" 
                  onClick={() => navigate("/configuracoes")}
                >
                  <AvatarImage src={currentUserProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getInitials(currentUserProfile?.full_name || user.email || "U")}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          {/* Transfer Alert Banner - Desktop */}
          <TransferAlertBanner 
            userId={user.id} 
            onViewLead={(leadId) => {
              const lead = leads.find(l => l.id === leadId);
              if (lead) {
                setSelectedLead(lead);
                setIsDetailOpen(true);
                setActiveTab("leads");
              } else {
                // Fetch the lead if not in current list
                supabase.from('campaign_leads').select('*').eq('id', leadId).single().then(({ data }) => {
                  if (data) {
                    setSelectedLead(data as Lead);
                    setIsDetailOpen(true);
                    setActiveTab("leads");
                  }
                });
              }
            }}
          />

          <main className="flex-1 flex flex-col overflow-hidden min-h-0 p-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "leads")} className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* TabsList removed - buttons are now in the header */}

              <TabsContent value="chat" className="flex-1 overflow-hidden min-h-0 mt-0">
                <WhatsAppChat 
                  userId={user.id} 
                  allowedUnits={canViewAll ? ['all'] : allowedUnits}
                  initialPhone={initialPhone}
                  onPhoneHandled={handlePhoneHandled}
                />
              </TabsContent>

              <TabsContent value="leads" className="flex-1 overflow-auto min-h-0 mt-0">
               {/* View mode toggle - positioned at top like mobile. Using flex layout to contain table scroll */}
               <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "kanban")} className="h-full flex flex-col">
                  <div className="mb-4">
                    <TabsList>
                      <TabsTrigger value="list" className="flex items-center gap-2">
                        <LayoutList className="w-4 h-4" />
                        Lista
                      </TabsTrigger>
                      <TabsTrigger value="kanban" className="flex items-center gap-2">
                        <Columns className="w-4 h-4" />
                        CRM
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <MetricsCards leads={leads} isLoading={isLoadingLeads} />
                 <LeadsFilters filters={filters} onFiltersChange={setFilters} responsaveis={responsaveis} onExport={handleExport} />

                 <TabsContent value="list" className="mt-4 flex-1 min-h-0 overflow-hidden">
                    <LeadsTable
                      leads={leads}
                      isLoading={isLoadingLeads}
                      totalCount={totalCount}
                      responsaveis={responsaveis}
                      onLeadClick={handleLeadClick}
                      onStatusChange={handleStatusChange}
                      onRefresh={handleRefresh}
                      canEdit={canEdit}
                      isAdmin={isAdmin}
                      currentUserId={user.id}
                      currentUserName={currentUserProfile?.full_name || user.email || ""}
                    />
                  </TabsContent>

                 <TabsContent value="kanban" className="mt-4 flex-1 min-h-0 overflow-hidden">
                    <LeadsKanban
                      leads={leads}
                      responsaveis={responsaveis}
                      onLeadClick={handleLeadClick}
                      onStatusChange={async (leadId, newStatus) => {
                        try {
                          const lead = leads.find((l) => l.id === leadId);
                          if (!lead) return;
                          await supabase.from("lead_history").insert({ lead_id: leadId, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de status", old_value: lead.status, new_value: newStatus });
                          const { error } = await supabase.from("campaign_leads").update({ status: newStatus }).eq("id", leadId);
                          if (error) throw error;
                          handleStatusChange(leadId, newStatus);
                        } catch (error) {
                          console.error("Error updating status:", error);
                          toast({ title: "Erro ao atualizar status", description: "Tente novamente.", variant: "destructive" });
                        }
                      }}
                      onNameUpdate={async (leadId, newName) => {
                        const lead = leads.find((l) => l.id === leadId);
                        if (!lead) return;
                        await supabase.from("lead_history").insert({ lead_id: leadId, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de nome", old_value: lead.name, new_value: newName });
                        const { error } = await supabase.from("campaign_leads").update({ name: newName }).eq("id", leadId);
                        if (error) throw error;
                        // Also update contact_name in linked conversations
                        await supabase.from("wapi_conversations").update({ contact_name: newName }).eq("lead_id", leadId);
                        setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, name: newName } : l));
                        toast({ title: "Nome atualizado", description: `O nome foi alterado para "${newName}".` });
                      }}
                      onDescriptionUpdate={async (leadId, newDescription) => {
                        const lead = leads.find((l) => l.id === leadId);
                        if (!lead) return;
                        await supabase.from("lead_history").insert({ lead_id: leadId, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de observações", old_value: lead.observacoes || "", new_value: newDescription });
                        const { error } = await supabase.from("campaign_leads").update({ observacoes: newDescription }).eq("id", leadId);
                        if (error) throw error;
                        setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, observacoes: newDescription } : l));
                        toast({ title: "Observação atualizada", description: "A observação foi salva com sucesso." });
                      }}
                      canEdit={canEdit}
                      canEditName={canEditName}
                      canEditDescription={canEditDescription}
                      canDelete={isAdmin}
                      onDelete={handleDeleteLead}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>

            </Tabs>
          </main>

          <LeadDetailSheet lead={selectedLead} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onUpdate={handleRefresh} responsaveis={responsaveis} currentUserId={user.id} currentUserName={currentUserProfile?.full_name || user.email || ""} canEdit={canEdit} canDelete={isAdmin} onDelete={handleDeleteLead} />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
