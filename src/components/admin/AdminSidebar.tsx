import { useLocation } from "react-router-dom";
import { Users, LogOut, RefreshCw, Headset } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import logoCastelo from "@/assets/logo-castelo.png";

interface AdminSidebarProps {
  canManageUsers: boolean;
  currentUserName: string;
  onRefresh: () => void;
  onLogout: () => void;
}

const menuItems = [
  { title: "Central de Atendimento", url: "/atendimento", icon: Headset },
];

export function AdminSidebar({ 
  canManageUsers, 
  currentUserName, 
  onRefresh, 
  onLogout 
}: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const allItems = canManageUsers 
    ? [...menuItems, { title: "Gerenciar Usuários", url: "/users", icon: Users }]
    : menuItems;

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img 
            src={logoCastelo} 
            alt="Castelo da Diversão" 
            className="h-10 w-10 object-contain shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-display font-bold text-sm text-foreground truncate">
                Castelo da Diversão
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {currentUserName}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <NavLink 
                      to={item.url} 
                      end 
                      className="flex items-center gap-3"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Ações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={onRefresh}
                  tooltip={collapsed ? "Atualizar" : undefined}
                >
                  <RefreshCw className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>Atualizar Dados</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Separator className="mb-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={onLogout}
              tooltip={collapsed ? "Sair" : undefined}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Sair da Conta</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
