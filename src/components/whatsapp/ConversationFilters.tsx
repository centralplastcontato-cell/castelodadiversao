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
    <div className="flex gap-2 flex-wrap">
      <Button 
        variant="ghost"
        size="sm" 
        className={cn(
          "h-8 px-3 text-xs font-semibold rounded-xl transition-all duration-200",
          filter === 'all' 
            ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" 
            : "bg-card hover:bg-muted border border-border/60 hover:border-primary/40"
        )}
        onClick={() => onFilterChange('all')}
      >
        Tudo
      </Button>
      <Button 
        variant="ghost"
        size="sm" 
        className={cn(
          "h-8 px-3 text-xs font-semibold rounded-xl transition-all duration-200",
          filter === 'unread' 
            ? "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90" 
            : "bg-card hover:bg-muted border border-border/60 hover:border-destructive/40"
        )}
        onClick={() => onFilterChange('unread')}
      >
        Não lidas
        {unreadCount > 0 && (
          <Badge className={cn(
            "ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold",
            filter === 'unread' 
              ? "bg-white/20 text-white" 
              : "bg-destructive text-destructive-foreground"
          )}>
            {unreadCount}
          </Badge>
        )}
      </Button>
      <Button 
        variant="ghost"
        size="sm" 
        className={cn(
          "h-8 px-3 text-xs font-semibold rounded-xl transition-all duration-200",
          filter === 'closed' 
            ? "bg-muted-foreground text-white shadow-md hover:bg-muted-foreground/90" 
            : "bg-card hover:bg-muted border border-border/60 hover:border-muted-foreground/40"
        )}
        onClick={() => onFilterChange('closed')}
      >
        <X className="w-3.5 h-3.5 mr-1" />
        Encerradas
        {closedCount > 0 && (
          <Badge variant="secondary" className={cn(
            "ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold",
            filter === 'closed' 
              ? "bg-white/20 text-white" 
              : "bg-muted-foreground/20 text-muted-foreground"
          )}>
            {closedCount}
          </Badge>
        )}
      </Button>
      <Button 
        variant="ghost"
        size="sm" 
        className={cn(
          "h-8 px-3 text-xs font-semibold rounded-xl transition-all duration-200",
          filter === 'fechados' 
            ? "bg-green-600 text-white shadow-md hover:bg-green-600/90" 
            : "bg-card hover:bg-muted border border-border/60 hover:border-green-500/40"
        )}
        onClick={() => onFilterChange('fechados')}
      >
        <CheckCircle className="w-3.5 h-3.5 mr-1" />
        Fechados
        {closedLeadCount > 0 && (
          <Badge className={cn(
            "ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold",
            filter === 'fechados' 
              ? "bg-white/20 text-white" 
              : "bg-green-500/20 text-green-700 dark:text-green-400"
          )}>
            {closedLeadCount}
          </Badge>
        )}
      </Button>
      <Button 
        variant="ghost"
        size="sm" 
        className={cn(
          "h-8 px-3 text-xs font-semibold rounded-xl transition-all duration-200",
          filter === 'oe' 
            ? "bg-purple-600 text-white shadow-md hover:bg-purple-600/90" 
            : "bg-card hover:bg-muted border border-border/60 hover:border-purple-500/40"
        )}
        onClick={() => onFilterChange('oe')}
      >
        <FileCheck className="w-3.5 h-3.5 mr-1" />
        O.E
        {orcamentoEnviadoCount > 0 && (
          <Badge className={cn(
            "ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold",
            filter === 'oe' 
              ? "bg-white/20 text-white" 
              : "bg-purple-500/20 text-purple-700 dark:text-purple-400"
          )}>
            {orcamentoEnviadoCount}
          </Badge>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm" 
        className={cn(
          "h-8 px-3 text-xs font-semibold rounded-xl transition-all duration-200",
          filter === 'visitas' 
            ? "bg-blue-600 text-white shadow-md hover:bg-blue-600/90" 
            : "bg-card hover:bg-muted border border-border/60 hover:border-blue-500/40"
        )}
        onClick={() => onFilterChange('visitas')}
      >
        <CalendarCheck className="w-3.5 h-3.5 mr-1" />
        Visitas
        {visitasCount > 0 && (
          <Badge className={cn(
            "ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold",
            filter === 'visitas' 
              ? "bg-white/20 text-white" 
              : "bg-blue-500/20 text-blue-700 dark:text-blue-400"
          )}>
            {visitasCount}
          </Badge>
        )}
      </Button>
      <Button 
        variant="ghost"
        size="sm" 
        className={cn(
          "h-8 px-3 text-xs font-semibold rounded-xl transition-all duration-200",
          filter === 'freelancer' 
            ? "bg-orange-600 text-white shadow-md hover:bg-orange-600/90" 
            : "bg-card hover:bg-muted border border-border/60 hover:border-orange-500/40"
        )}
        onClick={() => onFilterChange('freelancer')}
      >
        <Briefcase className="w-3.5 h-3.5 mr-1" />
        Freelancer
        {freelancerCount > 0 && (
          <Badge className={cn(
            "ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold",
            filter === 'freelancer' 
              ? "bg-white/20 text-white" 
              : "bg-orange-500/20 text-orange-700 dark:text-orange-400"
          )}>
            {freelancerCount}
          </Badge>
        )}
      </Button>
      <Button 
        variant="ghost"
        size="sm" 
        className={cn(
          "h-8 px-3 text-xs font-semibold rounded-xl transition-all duration-200",
          filter === 'equipe' 
            ? "bg-cyan-600 text-white shadow-md hover:bg-cyan-600/90" 
            : "bg-card hover:bg-muted border border-border/60 hover:border-cyan-500/40"
        )}
        onClick={() => onFilterChange('equipe')}
      >
        <Users className="w-3.5 h-3.5 mr-1" />
        Equipe
        {equipeCount > 0 && (
          <Badge className={cn(
            "ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold",
            filter === 'equipe' 
              ? "bg-white/20 text-white" 
              : "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400"
          )}>
            {equipeCount}
          </Badge>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm" 
        className={cn(
          "h-8 px-3 text-xs font-semibold rounded-xl transition-all duration-200",
          filter === 'favorites' 
            ? "bg-amber-500 text-white shadow-md hover:bg-amber-500/90" 
            : "bg-card hover:bg-muted border border-border/60 hover:border-amber-500/40"
        )}
        onClick={() => onFilterChange('favorites')}
      >
        <Star className="w-3.5 h-3.5 mr-1" />
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