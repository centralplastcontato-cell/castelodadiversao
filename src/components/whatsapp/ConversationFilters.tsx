 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { 
 Collapsible, 
 CollapsibleContent, 
 CollapsibleTrigger 
 } from "@/components/ui/collapsible";
import { 
X, Star, CheckCircle, CalendarCheck, Briefcase, Users, FileCheck, ChevronDown, Filter, UsersRound
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
remote_jid: string;
}
 
interface ConversationFiltersProps {
filter: 'all' | 'unread' | 'closed' | 'fechados' | 'visitas' | 'freelancer' | 'equipe' | 'oe' | 'favorites' | 'grupos';
onFilterChange: (filter: 'all' | 'unread' | 'closed' | 'fechados' | 'visitas' | 'freelancer' | 'equipe' | 'oe' | 'favorites' | 'grupos') => void;
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
grupos: 'Grupos',
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
const gruposCount = conversations.filter(c => c.remote_jid?.endsWith('@g.us')).length;
 
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
            : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
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
            : "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
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
            : "bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20 border border-muted-foreground/20"
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
            : "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border border-green-500/20"
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
              : "bg-green-500/25 text-green-700 dark:text-green-400"
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
            : "bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20"
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
              : "bg-purple-500/25 text-purple-700 dark:text-purple-400"
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
            : "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
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
              : "bg-blue-500/25 text-blue-700 dark:text-blue-400"
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
            : "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20 border border-orange-500/20"
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
              : "bg-orange-500/25 text-orange-700 dark:text-orange-400"
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
            : "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20"
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
              : "bg-cyan-500/25 text-cyan-700 dark:text-cyan-400"
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
            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
        )}
        onClick={() => onFilterChange('favorites')}
      >
        <Star className="w-3.5 h-3.5 mr-1" />
        Favoritos
      </Button>
      <Button
        variant="ghost"
        size="sm" 
        className={cn(
          "h-8 px-3 text-xs font-semibold rounded-xl transition-all duration-200",
          filter === 'grupos' 
            ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-600/90" 
            : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20"
        )}
        onClick={() => onFilterChange('grupos')}
      >
        <UsersRound className="w-3.5 h-3.5 mr-1" />
        Grupos
        {gruposCount > 0 && (
          <Badge className={cn(
            "ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold",
            filter === 'grupos' 
              ? "bg-white/20 text-white" 
              : "bg-indigo-500/25 text-indigo-700 dark:text-indigo-400"
          )}>
            {gruposCount}
          </Badge>
        )}
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