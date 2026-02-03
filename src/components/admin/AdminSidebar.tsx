import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Users, LogOut, RefreshCw, Headset, Settings, MessageSquare, Pin, PinOff } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { motion } from "framer-motion";
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
  const { state, setOpen } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const allItems = canManageUsers 
    ? [...menuItems, { title: "Gerenciar Usuários", url: "/users", icon: Users }]
    : menuItems;

  // Expand on hover, collapse on mouse leave (only if not pinned)
  const handleMouseEnter = () => {
    if (collapsed && !isPinned) {
      setIsHovered(true);
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (isHovered && !isPinned) {
      setIsHovered(false);
      setOpen(false);
    }
  };

  const handlePinToggle = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    if (newPinned) {
      setOpen(true);
      setIsHovered(false);
    } else {
      setOpen(false);
    }
  };

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-border transition-all duration-200"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarHeader className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <motion.img 
              src={logoCastelo} 
              alt="Castelo da Diversão" 
              className="h-8 w-8 object-contain shrink-0"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            />
            <div className="min-w-0 overflow-hidden group-data-[collapsible=icon]:hidden">
              <p className="font-display font-bold text-sm text-foreground truncate">
                Castelo
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {currentUserName}
              </p>
            </div>
          </div>
          
          {/* Pin toggle button - hidden when collapsed */}
          <div className="group-data-[collapsible=icon]:hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={handlePinToggle}
                >
                  <motion.div
                    initial={false}
                    animate={{ rotate: isPinned ? 0 : 45 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {isPinned ? (
                      <Pin className="h-4 w-4 text-primary" />
                    ) : (
                      <PinOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                {isPinned ? "Desfixar sidebar" : "Fixar sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
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
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                          </motion.div>
                          <span>{item.title}</span>
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
          <SidebarGroupLabel>Ações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton onClick={onRefresh}>
                      <motion.div
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.3 }}
                      >
                        <RefreshCw className="h-5 w-5 shrink-0" />
                      </motion.div>
                      <span>Atualizar Dados</span>
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
                  <motion.div
                    whileHover={{ x: 3 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                  </motion.div>
                  <span>Sair da Conta</span>
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
