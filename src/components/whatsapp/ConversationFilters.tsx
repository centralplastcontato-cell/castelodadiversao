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
   <div className="flex gap-1 flex-wrap">
     <Button 
       variant={filter === 'all' ? 'secondary' : 'ghost'} 
       size="sm" 
       className="h-7 text-xs"
       onClick={() => onFilterChange('all')}
     >
       Tudo
     </Button>
     <Button 
       variant={filter === 'unread' ? 'secondary' : 'ghost'} 
       size="sm" 
       className="h-7 text-xs"
       onClick={() => onFilterChange('unread')}
     >
       Não lidas
       {unreadCount > 0 && (
         <Badge className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-semibold flex items-center justify-center">
           {unreadCount}
         </Badge>
       )}
     </Button>
     <Button 
       variant={filter === 'closed' ? 'secondary' : 'ghost'} 
       size="sm" 
       className="h-7 text-xs"
       onClick={() => onFilterChange('closed')}
     >
       <X className="w-3 h-3 mr-1" />
       Encerradas
       {closedCount > 0 && (
         <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-semibold flex items-center justify-center">
           {closedCount}
         </Badge>
       )}
     </Button>
     <Button 
       variant={filter === 'fechados' ? 'secondary' : 'ghost'} 
       size="sm" 
       className="h-7 text-xs"
       onClick={() => onFilterChange('fechados')}
     >
       <CheckCircle className="w-3 h-3 mr-1" />
       Fechados
       {closedLeadCount > 0 && (
         <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-semibold flex items-center justify-center bg-green-500/20 text-green-700">
           {closedLeadCount}
         </Badge>
       )}
     </Button>
     <Button 
       variant={filter === 'oe' ? 'secondary' : 'ghost'} 
       size="sm" 
       className="h-7 text-xs"
       onClick={() => onFilterChange('oe')}
     >
       <FileCheck className="w-3 h-3 mr-1" />
       O.E
       {orcamentoEnviadoCount > 0 && (
         <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-semibold flex items-center justify-center bg-purple-500/20 text-purple-700">
           {orcamentoEnviadoCount}
         </Badge>
       )}
     </Button>
     <Button
       variant={filter === 'visitas' ? 'secondary' : 'ghost'} 
       size="sm" 
       className="h-7 text-xs"
       onClick={() => onFilterChange('visitas')}
     >
       <CalendarCheck className="w-3 h-3 mr-1" />
       Visitas
       {visitasCount > 0 && (
         <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-semibold flex items-center justify-center bg-blue-500/20 text-blue-700">
           {visitasCount}
         </Badge>
       )}
     </Button>
     <Button 
       variant={filter === 'freelancer' ? 'secondary' : 'ghost'} 
       size="sm" 
       className="h-7 text-xs"
       onClick={() => onFilterChange('freelancer')}
     >
       <Briefcase className="w-3 h-3 mr-1" />
       Freelancer
       {freelancerCount > 0 && (
         <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-semibold flex items-center justify-center bg-orange-500/20 text-orange-700">
           {freelancerCount}
         </Badge>
       )}
     </Button>
     <Button 
       variant={filter === 'equipe' ? 'secondary' : 'ghost'} 
       size="sm" 
       className="h-7 text-xs"
       onClick={() => onFilterChange('equipe')}
     >
       <Users className="w-3 h-3 mr-1" />
       Equipe
       {equipeCount > 0 && (
         <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-semibold flex items-center justify-center bg-cyan-500/20 text-cyan-700">
           {equipeCount}
         </Badge>
       )}
     </Button>
     <Button
       variant={filter === 'favorites' ? 'secondary' : 'ghost'} 
       size="sm" 
       className="h-7 text-xs"
       onClick={() => onFilterChange('favorites')}
     >
       <Star className="w-3 h-3 mr-1" />
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