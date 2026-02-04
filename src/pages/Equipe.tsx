import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { UsersRound, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import logoCastelo from "@/assets/logo-castelo.png";
import { toast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
}

export default function Equipe() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [_session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { role, isLoading: isLoadingRole, canManageUsers, isAdmin } = useUserRole(user?.id);
  const { hasPermission } = usePermissions(user?.id);
  const canViewTeam = isAdmin || hasPermission('equipe.view');

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

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setCurrentUserProfile(data);
          }
        });
    }
  }, [user]);

  // Check permission after role is loaded
  useEffect(() => {
    if (!isLoadingRole && user && !canViewTeam) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/atendimento");
    }
  }, [isLoadingRole, user, canViewTeam, navigate]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (isLoading || isLoadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <img src={logoCastelo} alt="Castelo da Diversão" className="h-16 w-16 mx-auto animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !canViewTeam) {
    return null;
  }

  const isMobile = window.innerWidth < 768;

  // Mobile layout
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Mobile Header */}
        <header className="bg-card border-b border-border sticky top-0 z-20 shrink-0">
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="flex items-center gap-2">
                      <img src={logoCastelo} alt="Castelo" className="h-6 w-6" />
                      <span>Castelo da Diversão</span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="p-4 space-y-2">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/atendimento"); setIsMobileMenuOpen(false); }}>
                      Central de Atendimento
                    </Button>
                    <Button variant="secondary" className="w-full justify-start">
                      <UsersRound className="w-4 h-4 mr-2" />
                      Equipe
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/configuracoes"); setIsMobileMenuOpen(false); }}>
                      Configurações
                    </Button>
                    {canManageUsers && (
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/users"); setIsMobileMenuOpen(false); }}>
                        Gerenciar Usuários
                      </Button>
                    )}
                    <Separator className="my-2" />
                    <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleLogout}>
                      Sair da Conta
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <div>
                <h1 className="font-display font-bold text-foreground text-sm">Equipe</h1>
                <p className="text-xs text-muted-foreground">{currentUserProfile?.full_name || user.email}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <UsersRound className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="font-semibold text-xl mb-2">Equipe</h2>
            <p className="text-muted-foreground max-w-md">
              Gerencie sua equipe e acompanhe a performance dos colaboradores.
              <br />
              <span className="text-sm italic">Em breve: métricas de atendimento, leads por colaborador e mais.</span>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Desktop layout
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar 
          canManageUsers={canManageUsers}
          canViewTeam={canViewTeam}
          currentUserName={currentUserProfile?.full_name || user.email || ""} 
          onRefresh={handleRefresh} 
          onLogout={handleLogout} 
        />
        
        <SidebarInset className="flex-1 flex flex-col">
          {/* Desktop Header */}
          <header className="bg-card border-b border-border sticky top-0 z-10">
            <div className="px-4 py-3 flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
                  <UsersRound className="w-5 h-5" />
                  Equipe
                </h1>
                <p className="text-sm text-muted-foreground">{currentUserProfile?.full_name || user.email}</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <UsersRound className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="font-semibold text-xl mb-2">Equipe</h2>
              <p className="text-muted-foreground max-w-md">
                Gerencie sua equipe e acompanhe a performance dos colaboradores.
                <br />
                <span className="text-sm italic">Em breve: métricas de atendimento, leads por colaborador e mais.</span>
              </p>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
