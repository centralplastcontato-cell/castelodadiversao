 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { 
 Collapsible, 
 CollapsibleContent, 
 CollapsibleTrigger 
 } from "@/components/ui/collapsible";
 import { 
 X, Star, CheckCircle, CalendarCheck, Briefcase, Users, FileCheck, ChevronDown, Filter
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface Conversation {
 id: string;
 unread_count: number;
 is_favorite: boolean;
 is_closed: boolean;
 has_scheduled_visit: boolean;
 is_freelancer: boolean;
 is_equipe: boolean;
 }
 
 interface ConversationFiltersProps {
 filter: 'all' | 'unread' | 'closed' | 'fechados' | 'visitas' | 'freelancer' | 'equipe' | 'oe' | 'favorites';
 onFilterChange: (filter: 'all' | 'unread' | 'closed' | 'fechados' | 'visitas' | 'freelancer' | 'equipe' | 'oe' | 'favorites') => void;
 conversations: Conversation[];
 closedLeadCount: number;
 orcamentoEnviadoCount: number;
 collapsible?: boolean;
 defaultOpen?: boolean;
 }
 
 const FILTER_LABELS: Record<string, string> = {
 all: 'Tudo',
 unread: 'Não lidas',
 closed: 'Encerradas',
 fechados: 'Fechados',
 oe: 'O.E',
 visitas: 'Visitas',
 freelancer: 'Freelancer',
 equipe: 'Equipe',
 favorites: 'Favoritos',
 };
 
 export function ConversationFilters({
 filter,
 onFilterChange,
 conversations,
 closedLeadCount,
 orcamentoEnviadoCount,
 collapsible = false,
 defaultOpen = false,
 }: ConversationFiltersProps) {
 const [isOpen, setIsOpen] = useState(defaultOpen);
 
 const unreadCount = conversations.filter(c => c.unread_count > 0).length;
 const closedCount = conversations.filter(c => c.is_closed).length;
 const visitasCount = conversations.filter(c => c.has_scheduled_visit).length;
 const freelancerCount = conversations.filter(c => c.is_freelancer).length;
 const equipeCount = conversations.filter(c => c.is_equipe).length;
 
 // Count active filters (non-default)
 const hasActiveFilter = filter !== 'all';
 
  const filterButtons = (
    <div className="flex gap-1.5 flex-wrap">
      <Button 
        variant={filter === 'all' ? 'secondary' : 'ghost'} 
        size="sm" 
        className={cn(
          "h-8 text-xs font-medium rounded-lg transition-all duration-200",
          filter === 'all' 
            ? "bg-primary/15 text-primary border border-primary/30 shadow-sm hover:bg-primary/20" 
            : "hover:bg-muted/80 border border-transparent hover:border-border/50"
        )}
        onClick={() => onFilterChange('all')}
      >
        Tudo
      </Button>
      <Button 
        variant={filter === 'unread' ? 'secondary' : 'ghost'} 
        size="sm" 
        className={cn(
          "h-8 text-xs font-medium rounded-lg transition-all duration-200",
          filter === 'unread' 
            ? "bg-destructive/15 text-destructive border border-destructive/30 shadow-sm hover:bg-destructive/20" 
            : "hover:bg-muted/80 border border-transparent hover:border-border/50"
        )}
        onClick={() => onFilterChange('unread')}
      >
        Não lidas
        {unreadCount > 0 && (
          <Badge className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold flex items-center justify-center bg-destructive text-destructive-foreground shadow-sm">
            {unreadCount}
          </Badge>
        )}
      </Button>
      <Button 
        variant={filter === 'closed' ? 'secondary' : 'ghost'} 
        size="sm" 
        className={cn(
          "h-8 text-xs font-medium rounded-lg transition-all duration-200",
          filter === 'closed' 
            ? "bg-muted text-muted-foreground border border-border shadow-sm hover:bg-muted/80" 
            : "hover:bg-muted/80 border border-transparent hover:border-border/50"
        )}
        onClick={() => onFilterChange('closed')}
      >
        <X className="w-3.5 h-3.5 mr-1 opacity-70" />
        Encerradas
        {closedCount > 0 && (
          <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-semibold flex items-center justify-center bg-muted-foreground/20">
            {closedCount}
          </Badge>
        )}
      </Button>
      <Button 
        variant={filter === 'fechados' ? 'secondary' : 'ghost'} 
        size="sm" 
        className={cn(
          "h-8 text-xs font-medium rounded-lg transition-all duration-200",
          filter === 'fechados' 
            ? "bg-green-500/15 text-green-700 border border-green-500/30 shadow-sm hover:bg-green-500/20 dark:text-green-400" 
            : "hover:bg-muted/80 border border-transparent hover:border-border/50"
        )}
        onClick={() => onFilterChange('fechados')}
      >
        <CheckCircle className="w-3.5 h-3.5 mr-1 opacity-80" />
        Fechados
        {closedLeadCount > 0 && (
          <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold flex items-center justify-center bg-green-500/25 text-green-700 dark:text-green-400 shadow-sm">
            {closedLeadCount}
          </Badge>
        )}
      </Button>
      <Button 
        variant={filter === 'oe' ? 'secondary' : 'ghost'} 
        size="sm" 
        className={cn(
          "h-8 text-xs font-medium rounded-lg transition-all duration-200",
          filter === 'oe' 
            ? "bg-purple-500/15 text-purple-700 border border-purple-500/30 shadow-sm hover:bg-purple-500/20 dark:text-purple-400" 
            : "hover:bg-muted/80 border border-transparent hover:border-border/50"
        )}
        onClick={() => onFilterChange('oe')}
      >
        <FileCheck className="w-3.5 h-3.5 mr-1 opacity-80" />
        O.E
        {orcamentoEnviadoCount > 0 && (
          <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold flex items-center justify-center bg-purple-500/25 text-purple-700 dark:text-purple-400 shadow-sm">
            {orcamentoEnviadoCount}
          </Badge>
        )}
      </Button>
      <Button
        variant={filter === 'visitas' ? 'secondary' : 'ghost'} 
        size="sm" 
        className={cn(
          "h-8 text-xs font-medium rounded-lg transition-all duration-200",
          filter === 'visitas' 
            ? "bg-blue-500/15 text-blue-700 border border-blue-500/30 shadow-sm hover:bg-blue-500/20 dark:text-blue-400" 
            : "hover:bg-muted/80 border border-transparent hover:border-border/50"
        )}
        onClick={() => onFilterChange('visitas')}
      >
        <CalendarCheck className="w-3.5 h-3.5 mr-1 opacity-80" />
        Visitas
        {visitasCount > 0 && (
          <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold flex items-center justify-center bg-blue-500/25 text-blue-700 dark:text-blue-400 shadow-sm">
            {visitasCount}
          </Badge>
        )}
      </Button>
      <Button 
        variant={filter === 'freelancer' ? 'secondary' : 'ghost'} 
        size="sm" 
        className={cn(
          "h-8 text-xs font-medium rounded-lg transition-all duration-200",
          filter === 'freelancer' 
            ? "bg-orange-500/15 text-orange-700 border border-orange-500/30 shadow-sm hover:bg-orange-500/20 dark:text-orange-400" 
            : "hover:bg-muted/80 border border-transparent hover:border-border/50"
        )}
        onClick={() => onFilterChange('freelancer')}
      >
        <Briefcase className="w-3.5 h-3.5 mr-1 opacity-80" />
        Freelancer
        {freelancerCount > 0 && (
          <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold flex items-center justify-center bg-orange-500/25 text-orange-700 dark:text-orange-400 shadow-sm">
            {freelancerCount}
          </Badge>
        )}
      </Button>
      <Button 
        variant={filter === 'equipe' ? 'secondary' : 'ghost'} 
        size="sm" 
        className={cn(
          "h-8 text-xs font-medium rounded-lg transition-all duration-200",
          filter === 'equipe' 
            ? "bg-cyan-500/15 text-cyan-700 border border-cyan-500/30 shadow-sm hover:bg-cyan-500/20 dark:text-cyan-400" 
            : "hover:bg-muted/80 border border-transparent hover:border-border/50"
        )}
        onClick={() => onFilterChange('equipe')}
      >
        <Users className="w-3.5 h-3.5 mr-1 opacity-80" />
        Equipe
        {equipeCount > 0 && (
          <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold flex items-center justify-center bg-cyan-500/25 text-cyan-700 dark:text-cyan-400 shadow-sm">
            {equipeCount}
          </Badge>
        )}
      </Button>
      <Button
        variant={filter === 'favorites' ? 'secondary' : 'ghost'} 
        size="sm" 
        className={cn(
          "h-8 text-xs font-medium rounded-lg transition-all duration-200",
          filter === 'favorites' 
            ? "bg-amber-500/15 text-amber-700 border border-amber-500/30 shadow-sm hover:bg-amber-500/20 dark:text-amber-400" 
            : "hover:bg-muted/80 border border-transparent hover:border-border/50"
        )}
        onClick={() => onFilterChange('favorites')}
      >
        <Star className="w-3.5 h-3.5 mr-1 opacity-80" />
        Favoritos
      </Button>
    </div>
  );
 
 if (!collapsible) {
   return filterButtons;
 }
 
 return (
   <Collapsible open={isOpen} onOpenChange={setIsOpen}>
     <CollapsibleTrigger asChild>
       <Button 
         variant="outline" 
         size="sm" 
         className={cn(
           "w-full justify-between h-8 text-xs",
           hasActiveFilter && "border-primary/50 bg-primary/5"
         )}
       >
         <span className="flex items-center gap-1.5">
           <Filter className="w-3.5 h-3.5" />
           Filtros
           {hasActiveFilter && (
             <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/20 text-primary">
               {FILTER_LABELS[filter]}
             </Badge>
           )}
         </span>
         <ChevronDown className={cn(
           "w-4 h-4 text-muted-foreground transition-transform",
           isOpen && "rotate-180"
         )} />
       </Button>
     </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
       {filterButtons}
     </CollapsibleContent>
   </Collapsible>
 );
 }