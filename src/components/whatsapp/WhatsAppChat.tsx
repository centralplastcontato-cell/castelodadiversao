import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Send, Search, MessageSquare, Phone, Check, CheckCheck, Clock, WifiOff, ArrowLeft, Building2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface WapiInstance {
  id: string;
  instance_id: string;
  instance_token: string;
  status: string;
  unit: string | null;
}

interface Conversation {
  id: string;
  instance_id: string;
  lead_id: string | null;
  remote_jid: string;
  contact_name: string | null;
  contact_phone: string;
  last_message_at: string | null;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  message_id: string | null;
  from_me: boolean;
  message_type: string;
  content: string | null;
  media_url: string | null;
  status: string;
  timestamp: string;
}

interface WhatsAppChatProps {
  userId: string;
  allowedUnits: string[];
}

export function WhatsAppChat({ userId, allowedUnits }: WhatsAppChatProps) {
  const [instances, setInstances] = useState<WapiInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<WapiInstance | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInstances();
  }, [userId, allowedUnits]);

  useEffect(() => {
    if (selectedInstance) {
      fetchConversations();

      // Subscribe to realtime updates for conversations
      const conversationsChannel = supabase
        .channel('wapi_conversations_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wapi_conversations',
            filter: `instance_id=eq.${selectedInstance.id}`,
          },
          () => {
            fetchConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(conversationsChannel);
      };
    }
  }, [selectedInstance]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);

      // Subscribe to realtime updates for messages
      const messagesChannel = supabase
        .channel('wapi_messages_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'wapi_messages',
            filter: `conversation_id=eq.${selectedConversation.id}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      // Mark as read
      supabase
        .from('wapi_conversations')
        .update({ unread_count: 0 })
        .eq('id', selectedConversation.id);

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchInstances = async () => {
    setIsLoading(true);
    
    // Build query based on allowed units
    let query = supabase
      .from("wapi_instances")
      .select("id, instance_id, instance_token, status, unit");

    // Filter by allowed units if not "all"
    if (!allowedUnits.includes('all') && allowedUnits.length > 0) {
      query = query.in("unit", allowedUnits);
    }

    const { data } = await query.order("unit", { ascending: true });

    if (data && data.length > 0) {
      setInstances(data as WapiInstance[]);
      // Auto-select first instance
      setSelectedInstance(data[0] as WapiInstance);
    }
    setIsLoading(false);
  };

  const fetchConversations = async () => {
    if (!selectedInstance) return;

    const { data } = await supabase
      .from("wapi_conversations")
      .select("*")
      .eq("instance_id", selectedInstance.id)
      .order("last_message_at", { ascending: false });

    if (data) {
      setConversations(data as Conversation[]);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("wapi_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("timestamp", { ascending: true });

    if (data) {
      setMessages(data as Message[]);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !selectedInstance || isSending) return;

    setIsSending(true);

    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "send-text",
          phone: selectedConversation.contact_phone,
          message: newMessage,
          conversationId: selectedConversation.id,
          instanceId: selectedInstance.instance_id,
          instanceToken: selectedInstance.instance_token,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setNewMessage("");
      
      // Optimistically add message to UI
      const tempMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: selectedConversation.id,
        message_id: response.data?.messageId || null,
        from_me: true,
        message_type: "text",
        content: newMessage,
        media_url: null,
        status: "sent",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMessage]);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    }

    setIsSending(false);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, "HH:mm");
  };

  const formatConversationDate = (timestamp: string | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM", { locale: ptBR });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-primary" />;
      default:
        return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    (conv.contact_name || conv.contact_phone)
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const handleInstanceChange = (instanceId: string) => {
    const instance = instances.find(i => i.id === instanceId);
    if (instance) {
      setSelectedInstance(instance);
      setSelectedConversation(null);
      setMessages([]);
      setConversations([]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <Card className="h-96">
        <CardContent className="flex flex-col items-center justify-center h-full text-center">
          <WifiOff className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhuma instância disponível</h3>
          <p className="text-sm text-muted-foreground">
            {allowedUnits.length === 0 
              ? "Você não tem permissão para acessar nenhuma unidade."
              : "O administrador ainda não configurou as instâncias para suas unidades."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const connectedInstances = instances.filter(i => i.status === 'connected');
  const hasDisconnectedInstances = instances.some(i => i.status !== 'connected');

  if (connectedInstances.length === 0) {
    return (
      <Card className="h-96">
        <CardContent className="flex flex-col items-center justify-center h-full text-center">
          <WifiOff className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">WhatsApp desconectado</h3>
          <p className="text-sm text-muted-foreground">
            As instâncias configuradas estão desconectadas. Aguarde o administrador conectar.
          </p>
          <div className="mt-4 space-y-2">
            {instances.map(instance => (
              <Badge key={instance.id} variant="secondary">
                <Building2 className="w-3 h-3 mr-1" />
                {instance.unit}: {instance.status}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px]">
      {/* Unit Tabs - only show if multiple instances */}
      {instances.length > 1 && (
        <Tabs 
          value={selectedInstance?.id || ""} 
          onValueChange={handleInstanceChange}
          className="mb-2"
        >
          <TabsList>
            {instances.map((instance) => (
              <TabsTrigger 
                key={instance.id} 
                value={instance.id}
                disabled={instance.status !== 'connected'}
                className="flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                {instance.unit}
                {instance.status !== 'connected' && (
                  <WifiOff className="w-3 h-3 text-destructive" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Disconnected warning */}
      {hasDisconnectedInstances && selectedInstance?.status !== 'connected' && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-2 text-sm text-center">
          <WifiOff className="w-4 h-4 inline mr-2" />
          Esta unidade está desconectada. Selecione outra ou aguarde o administrador.
        </div>
      )}

      {/* Chat Area */}
      {selectedInstance?.status === 'connected' && (
        <div className="flex flex-1 border rounded-lg overflow-hidden bg-card">
          {/* Conversations List */}
          <div className={cn(
            "w-full md:w-80 border-r flex flex-col",
            selectedConversation && "hidden md:flex"
          )}>
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      "w-full p-3 flex items-start gap-3 hover:bg-accent transition-colors text-left border-b",
                      selectedConversation?.id === conv.id && "bg-accent"
                    )}
                  >
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(conv.contact_name || conv.contact_phone).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">
                          {conv.contact_name || conv.contact_phone}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatConversationDate(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {conv.contact_phone}
                        </p>
                        {conv.unread_count > 0 && (
                          <Badge className="h-5 min-w-5 flex items-center justify-center p-0 text-xs">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Messages Area */}
          <div className={cn(
            "flex-1 flex flex-col",
            !selectedConversation && "hidden md:flex"
          )}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-3 border-b flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(selectedConversation.contact_name || selectedConversation.contact_phone)
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {selectedConversation.contact_name || selectedConversation.contact_phone}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.contact_phone}
                    </p>
                  </div>
                  {selectedInstance && (
                    <Badge variant="outline">
                      <Building2 className="w-3 h-3 mr-1" />
                      {selectedInstance.unit}
                    </Badge>
                  )}
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4 bg-muted/30">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.from_me ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                            msg.from_me
                              ? "bg-primary text-primary-foreground"
                              : "bg-card border"
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <div
                            className={cn(
                              "flex items-center justify-end gap-1 mt-1",
                              msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}
                          >
                            <span className="text-xs">{formatMessageTime(msg.timestamp)}</span>
                            {msg.from_me && getStatusIcon(msg.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-3 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Digite uma mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={isSending}
                    />
                    <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Selecione uma conversa</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha uma conversa para começar a enviar mensagens.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
