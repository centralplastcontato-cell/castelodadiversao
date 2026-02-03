import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { useUnitPermissions } from "@/hooks/useUnitPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { Lead, LeadStatus, UserWithRole, Profile } from "@/types/crm";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { LeadsFilters } from "@/components/admin/LeadsFilters";
import { LeadsKanban } from "@/components/admin/LeadsKanban";
import { LeadDetailSheet } from "@/components/admin/LeadDetailSheet";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { exportLeadsToCSV } from "@/components/admin/exportLeads";
import { MetricsCards } from "@/components/admin/MetricsCards";
import { WhatsAppChat } from "@/components/whatsapp/WhatsAppChat";
import { WhatsAppConfig } from "@/components/whatsapp/WhatsAppConfig";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AnimatedBadge } from "@/components/ui/animated-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { LogOut, RefreshCw, LayoutList, Columns, Menu, Users as UsersIcon, MessageSquare, Settings, Headset } from "lucide-react";
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
  const [session, setSession] = useState<Session | null>(null);
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
  const [activeTab, setActiveTab] = useState<"chat" | "leads" | "config">("chat");
  const [unreadCount, setUnreadCount] = useState(0);

  const { role, isLoading: isLoadingRole, isAdmin, canEdit, canManageUsers } = useUserRole(user?.id);
  const { allowedUnits, canViewAll, isLoading: isLoadingUnitPerms } = useUnitPermissions(user?.id);
  const { hasPermission } = usePermissions(user?.id);
  const canEditName = isAdmin || hasPermission('leads.edit.name');
  const canEditDescription = isAdmin || hasPermission('leads.edit.description');

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
      <div className="min-h-screen bg-background flex flex-col">
        {/* Mobile Header */}
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0">
                    <SheetHeader className="p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          className="h-12 w-12 border-2 border-primary/20 cursor-pointer hover:border-primary/40 transition-colors shrink-0" 
                          onClick={() => { navigate("/configuracoes"); setIsMobileMenuOpen(false); }}
                        >
                          <AvatarImage src={currentUserProfile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(currentUserProfile?.full_name || user.email || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <SheetTitle className="text-left text-base truncate">
                            {currentUserProfile?.full_name || "Usuário"}
                          </SheetTitle>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </SheetHeader>
                    
                    <nav className="flex flex-col p-2">
                      <Button variant="secondary" className="justify-start h-11 px-3" onClick={() => setIsMobileMenuOpen(false)}>
                        <Headset className="w-5 h-5 mr-3" />
                        Central de Atendimento
                      </Button>
                      
                      <Button variant="ghost" className="justify-start h-11 px-3" onClick={() => { navigate("/configuracoes"); setIsMobileMenuOpen(false); }}>
                        <Settings className="w-5 h-5 mr-3" />
                        Configurações
                      </Button>
                      
                      {canManageUsers && (
                        <Button variant="ghost" className="justify-start h-11 px-3" onClick={() => { navigate("/users"); setIsMobileMenuOpen(false); }}>
                          <UsersIcon className="w-5 h-5 mr-3" />
                          Gerenciar Usuários
                        </Button>
                      )}
                      
                      <Separator className="my-2" />
                      
                      <Button variant="ghost" className="justify-start h-11 px-3" onClick={() => { handleRefresh(); setIsMobileMenuOpen(false); }}>
                        <RefreshCw className="w-5 h-5 mr-3" />
                        Atualizar Dados
                      </Button>
                      
                      <Button variant="ghost" className="justify-start h-11 px-3 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                        <LogOut className="w-5 h-5 mr-3" />
                        Sair da Conta
                      </Button>
                    </nav>
                  </SheetContent>
                </Sheet>

                <div className="flex items-center gap-2 min-w-0">
                  <img src={logoCastelo} alt="Castelo da Diversão" className="h-8 w-auto shrink-0" />
                  <h1 className="font-display font-bold text-foreground text-sm truncate">Central de Atendimento</h1>
                </div>
              </div>
              
              {/* User Avatar Mobile */}
              <Avatar className="h-9 w-9 border-2 border-primary/20" onClick={() => navigate("/configuracoes")}>
                <AvatarImage src={currentUserProfile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {getInitials(currentUserProfile?.full_name || user.email || "U")}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "leads" | "config")} className="flex-1 flex flex-col">
            <TabsList className="mx-3 mt-3 grid grid-cols-3">
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
              <TabsTrigger value="leads" className="flex items-center gap-1.5 text-xs">
                <LayoutList className="w-4 h-4" />
                Leads
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-1.5 text-xs">
                <Settings className="w-4 h-4" />
                Config
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 mt-0 p-0">
              <WhatsAppChat userId={user.id} allowedUnits={canViewAll ? ['all'] : allowedUnits} />
            </TabsContent>

            <TabsContent value="leads" className="flex-1 mt-0 px-3 py-4">
              <MetricsCards leads={leads} isLoading={isLoadingLeads} />
              <LeadsFilters filters={filters} onFiltersChange={setFilters} responsaveis={responsaveis} onExport={handleExport} />

              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "kanban")} className="mb-4">
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

                <TabsContent value="list" className="mt-4">
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

                <TabsContent value="kanban" className="mt-4">
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
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="config" className="flex-1 p-3">
              <WhatsAppConfig userId={user.id} isAdmin={isAdmin} />
            </TabsContent>
          </Tabs>
        </main>

        <LeadDetailSheet lead={selectedLead} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onUpdate={handleRefresh} responsaveis={responsaveis} currentUserId={user.id} currentUserName={currentUserProfile?.full_name || user.email || ""} canEdit={canEdit} />
      </div>
    );
  }

  // Desktop layout with Sidebar
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar 
          canManageUsers={canManageUsers} 
          currentUserName={currentUserProfile?.full_name || user.email || ""} 
          onRefresh={handleRefresh} 
          onLogout={handleLogout} 
        />
        
        <SidebarInset className="flex-1 flex flex-col">
          {/* Desktop Header */}
          <header className="bg-card border-b border-border sticky top-0 z-10">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="font-display font-bold text-foreground text-lg">Central de Atendimento</h1>
                  <p className="text-sm text-muted-foreground">{currentUserProfile?.full_name || user.email}</p>
                </div>
              </div>
              
              {/* User Avatar Desktop */}
              <Avatar 
                className="h-10 w-10 border-2 border-primary/20 cursor-pointer hover:border-primary/40 transition-colors" 
                onClick={() => navigate("/configuracoes")}
              >
                <AvatarImage src={currentUserProfile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials(currentUserProfile?.full_name || user.email || "U")}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 flex flex-col p-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "leads" | "config")} className="flex-1 flex flex-col">
              <TabsList className="w-fit">
                <TabsTrigger value="chat" className="flex items-center gap-2 relative">
                  <MessageSquare className="w-4 h-4" />
                  Chat
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px] flex items-center justify-center"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="leads" className="flex items-center gap-2">
                  <LayoutList className="w-4 h-4" />
                  Leads
                </TabsTrigger>
                <TabsTrigger value="config" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configurações
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 mt-4">
                <WhatsAppChat userId={user.id} allowedUnits={canViewAll ? ['all'] : allowedUnits} />
              </TabsContent>

              <TabsContent value="leads" className="flex-1 mt-4">
                <MetricsCards leads={leads} isLoading={isLoadingLeads} />
                <LeadsFilters filters={filters} onFiltersChange={setFilters} responsaveis={responsaveis} onExport={handleExport} />

                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "kanban")} className="mb-4">
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

                  <TabsContent value="list" className="mt-4">
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

                  <TabsContent value="kanban" className="mt-4">
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
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="config" className="flex-1 mt-4">
                <WhatsAppConfig userId={user.id} isAdmin={isAdmin} />
              </TabsContent>
            </Tabs>
          </main>

          <LeadDetailSheet lead={selectedLead} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onUpdate={handleRefresh} responsaveis={responsaveis} currentUserId={user.id} currentUserName={currentUserProfile?.full_name || user.email || ""} canEdit={canEdit} />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
