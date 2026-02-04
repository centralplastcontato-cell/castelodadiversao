import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { WhatsAppConfig } from "@/components/whatsapp/WhatsAppConfig";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Settings, Menu } from "lucide-react";
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

export default function Configuracoes() {
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
            setCurrentUserProfile(data as Profile);
          }
        });
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta.",
    });
    navigate("/auth");
  };

  const handleRefresh = () => {
    window.location.reload();
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Mobile layout
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
                        <img src={logoCastelo} alt="Castelo da Diversão" className="h-10 w-auto" />
                        <div>
                          <SheetTitle className="text-left text-base">Castelo da Diversão</SheetTitle>
                          <p className="text-xs text-muted-foreground">
                            {currentUserProfile?.full_name || user.email}
                          </p>
                        </div>
                      </div>
                    </SheetHeader>
                    
                    <nav className="flex flex-col p-2">
                      <Button variant="ghost" className="justify-start h-11 px-3" onClick={() => { navigate("/atendimento"); setIsMobileMenuOpen(false); }}>
                        Central de Atendimento
                      </Button>
                      
                      <Button variant="secondary" className="justify-start h-11 px-3" onClick={() => setIsMobileMenuOpen(false)}>
                        <Settings className="w-5 h-5 mr-3" />
                        Configurações
                      </Button>
                      
                      {canManageUsers && (
                        <Button variant="ghost" className="justify-start h-11 px-3" onClick={() => { navigate("/users"); setIsMobileMenuOpen(false); }}>
                          Gerenciar Usuários
                        </Button>
                      )}
                      
                      <Separator className="my-2" />
                      
                      <Button variant="ghost" className="justify-start h-11 px-3 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                        Sair da Conta
                      </Button>
                    </nav>
                  </SheetContent>
                </Sheet>

                <div className="flex items-center gap-2 min-w-0">
                  <img src={logoCastelo} alt="Castelo da Diversão" className="h-8 w-auto shrink-0" />
                  <h1 className="font-display font-bold text-foreground text-sm truncate">Configurações</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 overflow-auto">
          <WhatsAppConfig userId={user.id} isAdmin={isAdmin} />
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
                <h1 className="font-display font-bold text-foreground text-lg">Configurações</h1>
                <p className="text-sm text-muted-foreground">{currentUserProfile?.full_name || user.email}</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            <WhatsAppConfig userId={user.id} isAdmin={isAdmin} />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
