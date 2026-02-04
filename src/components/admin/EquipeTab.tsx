import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { 
  Phone, 
  MessageSquare, 
  Briefcase, 
  Calendar,
  Send
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FreelancerConversation {
  id: string;
  instance_id: string;
  contact_name: string | null;
  contact_phone: string;
  contact_picture: string | null;
  last_message_at: string | null;
  last_message_content: string | null;
  is_freelancer: boolean;
  unit: string | null;
}

interface WapiInstance {
  id: string;
  unit: string | null;
  instance_id: string;
  instance_token: string;
}

interface EquipeTabProps {
  allowedUnits: string[];
  canViewAll: boolean;
}

export function EquipeTab({ allowedUnits, canViewAll }: EquipeTabProps) {
  const [freelancerConversations, setFreelancerConversations] = useState<FreelancerConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [instances, setInstances] = useState<WapiInstance[]>([]);

  useEffect(() => {
    fetchData();
  }, [allowedUnits, canViewAll]);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch instances
    const { data: instancesData } = await supabase
      .from("wapi_instances")
      .select("id, unit, instance_id, instance_token");
    
    if (instancesData) {
      setInstances(instancesData);
    }

    // Build query for freelancer conversations
    let query = supabase
      .from("wapi_conversations")
      .select(`
        id,
        instance_id,
        contact_name,
        contact_phone,
        contact_picture,
        last_message_at,
        last_message_content,
        is_freelancer
      `)
      .eq("is_freelancer", true)
      .order("last_message_at", { ascending: false });

    const { data: convData, error } = await query;
    
    if (error) {
      console.error("Error fetching freelancer conversations:", error);
    } else if (convData && instancesData) {
      // Add unit info to conversations
      const enrichedConvs = convData.map(conv => {
        const instance = instancesData.find(i => i.id === conv.instance_id);
        return {
          ...conv,
          unit: instance?.unit || null
        };
      });
      setFreelancerConversations(enrichedConvs);
    }


    setIsLoading(false);

    setIsLoading(false);
  };

  const sendMessageToFreelancer = async (conversation: FreelancerConversation, message: string) => {
    const instance = instances.find(i => i.id === conversation.instance_id);
    if (!instance) {
      toast({
        title: "Erro",
        description: "Instância do WhatsApp não encontrada.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('wapi-send', {
        body: {
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
          phone: conversation.contact_phone,
          message: message,
          conversationId: conversation.id
        }
      });

      if (error) throw error;

      toast({
        title: "Mensagem enviada",
        description: `Mensagem enviada para ${conversation.contact_name || conversation.contact_phone}`,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Equipe / Freelancers</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (freelancerConversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
        <Briefcase className="w-12 h-12 mb-4 opacity-50" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Nenhum freelancer encontrado</h2>
        <p className="text-sm max-w-xs">
          Marque conversas como "Freelancer" no WhatsApp para que apareçam aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Equipe / Freelancers</h2>
          <Badge variant="secondary" className="ml-2">
            {freelancerConversations.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {freelancerConversations.map((conv) => (
            <Card key={conv.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    {conv.contact_picture && (
                      <AvatarImage src={conv.contact_picture} alt={conv.contact_name || conv.contact_phone} />
                    )}
                    <AvatarFallback className="bg-orange-500/20 text-orange-700">
                      {(conv.contact_name || conv.contact_phone).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium text-sm truncate">
                        {conv.contact_name || conv.contact_phone}
                      </h3>
                      {conv.unit && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {conv.unit}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Phone className="w-3 h-3" />
                      <span className="truncate">{conv.contact_phone}</span>
                    </div>
                    
                    {conv.last_message_at && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(conv.last_message_at)}</span>
                      </div>
                    )}
                    
                    {conv.last_message_content && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">
                        "{conv.last_message_content}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 flex-1"
                    onClick={() => sendMessageToFreelancer(conv, "Olá! Tudo bem? Temos uma festa disponível para você. Podemos conversar?")}
                  >
                    <Send className="w-3 h-3" />
                    Oferecer Festa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      window.open(`https://wa.me/${conv.contact_phone.replace(/\D/g, '')}`, '_blank');
                    }}
                  >
                    <MessageSquare className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
