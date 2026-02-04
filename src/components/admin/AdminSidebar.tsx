import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Users, LogOut, RefreshCw, Headset, Settings, MessageSquare, Pin, PinOff } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import logoCastelo from "@/assets/logo-castelo.png";

interface AdminSidebarProps {
  canManageUsers: boolean;
  currentUserName: string;
  onRefresh: () => void;
  onLogout: () => void;
}

const menuItems = [
  { title: "Central de Atendimento", url: "/atendimento", icon: Headset },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageSquare },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AdminSidebar({ 
  canManageUsers, 
  currentUserName, 
  onRefresh, 
  onLogout 
}: AdminSidebarProps) {
  const { state, setOpen, open } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [isPinned, setIsPinned] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const allItems = canManageUsers 
    ? [...menuItems, { title: "Gerenciar Usuários", url: "/users", icon: Users }]
    : menuItems;

  // Handle hover expand/collapse only when not pinned
  const handleMouseEnter = () => {
    if (!isPinned) {
      setIsHovering(true);
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned && isHovering) {
      setIsHovering(false);
      setOpen(false);
    }
  };

  const handlePinToggle = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    setIsHovering(false);
    if (newPinned) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  // Ensure sidebar collapses when navigating (unless pinned)
  useEffect(() => {
    if (!isPinned) {
      setOpen(false);
      setIsHovering(false);
    }
  }, [location.pathname, isPinned, setOpen]);

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-border transition-all duration-200"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-3">
          <img 
            src={logoCastelo} 
            alt="Castelo da Diversão" 
            className="h-8 w-8 object-contain shrink-0"
          />
          {!collapsed && (
            <>
              <div className="min-w-0 overflow-hidden flex-1">
                <p className="font-display font-bold text-sm text-foreground truncate">
                  Castelo
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentUserName}
                </p>
              </div>
              
              {/* Pin toggle button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={handlePinToggle}
                  >
                    {isPinned ? (
                      <Pin className="h-4 w-4 text-primary" />
                    ) : (
                      <PinOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {isPinned ? "Desfixar sidebar" : "Fixar sidebar"}
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navegação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === item.url}
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
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right" sideOffset={10}>
                        {item.title}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Ações</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton onClick={onRefresh}>
                      <RefreshCw className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Atualizar Dados</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" sideOffset={10}>
                      Atualizar Dados
                    </TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Separator className="mb-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton 
                  onClick={onLogout}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>Sair da Conta</span>}
                </SidebarMenuButton>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" sideOffset={10}>
                  Sair da Conta
                </TooltipContent>
              )}
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
