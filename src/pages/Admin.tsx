import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { Lead, LeadStatus, UserWithRole, Profile } from "@/types/crm";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { LeadsFilters } from "@/components/admin/LeadsFilters";
import { LeadsKanban } from "@/components/admin/LeadsKanban";
import { LeadDetailSheet } from "@/components/admin/LeadDetailSheet";
import { exportLeadsToCSV } from "@/components/admin/exportLeads";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, ArrowLeft, RefreshCw, LayoutList, Columns, Shield } from "lucide-react";
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

export default function Admin() {
  const navigate = useNavigate();
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

  const { role, isLoading: isLoadingRole, isAdmin, canEdit, canManageUsers } = useUserRole(user?.id);

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
      if (!role) return;

      setIsLoadingLeads(true);

      let query = supabase
        .from("campaign_leads")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply filters
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
  }, [filters, refreshKey, role]);

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

  if (isLoading || isLoadingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !role) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Mobile: stacked layout, Desktop: side by side */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left side: Back + Logo + Title */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Voltar</span>
              </Button>
              <div className="flex items-center gap-2 sm:gap-3">
                <img 
                  src={logoCastelo} 
                  alt="Castelo da Diversão" 
                  className="h-8 sm:h-10 w-auto"
                />
                <div className="min-w-0">
                  <h1 className="font-display font-bold text-foreground text-sm sm:text-base truncate">
                    Gestão de Leads
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {currentUserProfile?.full_name || user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Right side: Action buttons */}
            <div className="flex items-center gap-1 sm:gap-2 justify-end">
              {canManageUsers && (
                <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm px-2 sm:px-3" onClick={() => navigate("/users")}>
                  <Shield className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Usuários</span>
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm px-2 sm:px-3" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs sm:text-sm px-2 sm:px-3" onClick={handleLogout}>
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <LeadsFilters
          filters={filters}
          onFiltersChange={setFilters}
          responsaveis={responsaveis}
          onExport={handleExport}
        />

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "kanban")} className="mb-4">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <LayoutList className="w-4 h-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <Columns className="w-4 h-4" />
              Kanban
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

                  // Add history entry
                  await supabase.from("lead_history").insert({
                    lead_id: leadId,
                    user_id: user.id,
                    user_name: currentUserProfile?.full_name || user.email,
                    action: "Alteração de status",
                    old_value: lead.status,
                    new_value: newStatus,
                  });

                  const { error } = await supabase
                    .from("campaign_leads")
                    .update({ status: newStatus })
                    .eq("id", leadId);

                  if (error) throw error;

                  handleStatusChange(leadId, newStatus);
                } catch (error) {
                  console.error("Error updating status:", error);
                  toast({
                    title: "Erro ao atualizar status",
                    description: "Tente novamente.",
                    variant: "destructive",
                  });
                }
              }}
              canEdit={canEdit}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Lead Detail Sheet */}
      <LeadDetailSheet
        lead={selectedLead}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdate={handleRefresh}
        responsaveis={responsaveis}
        currentUserId={user.id}
        currentUserName={currentUserProfile?.full_name || user.email || ""}
        canEdit={canEdit}
      />
    </div>
  );
}
