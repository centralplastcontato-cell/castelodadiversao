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
import { 
  Send, Search, MessageSquare, Phone, Check, CheckCheck, Clock, WifiOff, 
  ArrowLeft, Building2, Star, StarOff, Link2, FileText, Smile,
  Image as ImageIcon, Mic, Paperclip, X, Loader2
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  is_favorite: boolean;
  last_message_content: string | null;
  last_message_from_me: boolean;
}

interface MessageTemplate {
  id: string;
  name: string;
  template: string;
  is_active: boolean;
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
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{
    type: 'image' | 'audio' | 'document';
    file: File;
    preview?: string;
  } | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInstances();
    fetchTemplates();
  }, [userId, allowedUnits]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("message_templates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (data) {
      setTemplates(data as MessageTemplate[]);
    }
  };

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

  const toggleFavorite = async (conv: Conversation) => {
    const newValue = !conv.is_favorite;
    
    await supabase
      .from('wapi_conversations')
      .update({ is_favorite: newValue })
      .eq('id', conv.id);

    setConversations(prev => 
      prev.map(c => c.id === conv.id ? { ...c, is_favorite: newValue } : c)
    );

    toast({
      title: newValue ? "Adicionado aos favoritos" : "Removido dos favoritos",
      description: conv.contact_name || conv.contact_phone,
    });
  };

  const applyTemplate = (template: MessageTemplate) => {
    let message = template.template;
    
    // Replace placeholders with conversation data
    if (selectedConversation) {
      message = message
        .replace(/\{nome\}/gi, selectedConversation.contact_name || '')
        .replace(/\{telefone\}/gi, selectedConversation.contact_phone || '');
    }
    
    setNewMessage(message);
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Handle file selection for media
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio' | 'document') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Create preview for images
    let preview: string | undefined;
    if (type === 'image') {
      preview = URL.createObjectURL(file);
    }

    setMediaPreview({ type, file, preview });
    setMediaCaption("");
    
    // Reset input
    event.target.value = '';
  };

  const cancelMediaUpload = () => {
    if (mediaPreview?.preview) {
      URL.revokeObjectURL(mediaPreview.preview);
    }
    setMediaPreview(null);
    setMediaCaption("");
  };

  const sendMedia = async () => {
    if (!mediaPreview || !selectedConversation || !selectedInstance || isUploading) return;

    setIsUploading(true);

    try {
      const { type, file } = mediaPreview;
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedConversation.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(fileName);

      const mediaUrl = urlData.publicUrl;

      // Determine action based on type
      let action: string;
      let body: Record<string, any> = {
        phone: selectedConversation.contact_phone,
        conversationId: selectedConversation.id,
        instanceId: selectedInstance.instance_id,
        instanceToken: selectedInstance.instance_token,
        mediaUrl,
      };

      switch (type) {
        case 'image':
          action = 'send-image';
          body.caption = mediaCaption;
          break;
        case 'audio':
          action = 'send-audio';
          break;
        case 'document':
          action = 'send-document';
          body.fileName = file.name;
          break;
        default:
          throw new Error('Tipo de mídia não suportado');
      }

      const response = await supabase.functions.invoke("wapi-send", {
        body: { action, ...body },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Optimistically add message to UI
      const tempMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: selectedConversation.id,
        message_id: response.data?.messageId || null,
        from_me: true,
        message_type: type,
        content: type === 'image' ? (mediaCaption || '[Imagem]') : type === 'audio' ? '[Áudio]' : file.name,
        media_url: mediaUrl,
        status: "sent",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMessage]);

      // Clear preview
      cancelMediaUpload();

      toast({
        title: "Mídia enviada",
        description: `${type === 'image' ? 'Imagem' : type === 'audio' ? 'Áudio' : 'Arquivo'} enviado com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar mídia",
        description: error.message || "Não foi possível enviar a mídia.",
        variant: "destructive",
      });
    }

    setIsUploading(false);
  };

  // Common emojis for quick access
  const commonEmojis = ['😊', '👍', '❤️', '🎉', '👋', '🙏', '😄', '🎂', '🎈', '⭐', '✨', '🔥'];

  const filteredConversations = conversations
    .filter((conv) => {
      // Apply text search
      const matchesSearch = (conv.contact_name || conv.contact_phone)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      
      // Apply filter
      if (filter === 'unread') return matchesSearch && conv.unread_count > 0;
      if (filter === 'favorites') return matchesSearch && conv.is_favorite;
      return matchesSearch;
    })
    .sort((a, b) => {
      // Favorites first, then by last message
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return 0;
    });

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
    <div className="flex flex-col h-[calc(100vh-220px)] sm:h-[calc(100vh-200px)] min-h-[400px] max-h-[800px]">
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
        <div className="flex flex-1 border rounded-lg overflow-hidden bg-card min-h-0">
          {/* Conversations List */}
          <div className={cn(
            "w-full md:w-72 lg:w-80 border-r flex flex-col min-h-0",
            selectedConversation && "hidden md:flex"
          )}>
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Filter Tabs */}
              <div className="flex gap-1">
                <Button 
                  variant={filter === 'all' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setFilter('all')}
                >
                  Tudo
                </Button>
                <Button 
                  variant={filter === 'unread' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setFilter('unread')}
                >
                  Não lidas
                  {conversations.filter(c => c.unread_count > 0).length > 0 && (
                    <Badge className="ml-1 h-4 min-w-4 p-0 text-[10px]">
                      {conversations.filter(c => c.unread_count > 0).length}
                    </Badge>
                  )}
                </Button>
                <Button 
                  variant={filter === 'favorites' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setFilter('favorites')}
                >
                  <Star className="w-3 h-3 mr-1" />
                  Favoritos
                </Button>
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
                      "w-full p-3 flex items-start gap-3 hover:bg-accent transition-colors text-left border-b group",
                      selectedConversation?.id === conv.id && "bg-accent",
                      conv.unread_count > 0 && "bg-primary/5"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="shrink-0">
                        <AvatarFallback className={cn(
                          "text-primary",
                          conv.unread_count > 0 ? "bg-primary/20" : "bg-primary/10"
                        )}>
                          {(conv.contact_name || conv.contact_phone).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {conv.is_favorite && (
                        <Star className="absolute -top-1 -right-1 w-3 h-3 text-secondary fill-secondary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0">
                          <p className={cn(
                            "truncate",
                            conv.unread_count > 0 ? "font-bold" : "font-medium"
                          )}>
                            {conv.contact_name || conv.contact_phone}
                          </p>
                          {conv.lead_id && (
                            <Link2 className="w-3 h-3 text-primary shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(conv);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                          >
                            {conv.is_favorite ? (
                              <StarOff className="w-3 h-3 text-muted-foreground" />
                            ) : (
                              <Star className="w-3 h-3 text-muted-foreground" />
                            )}
                          </button>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatConversationDate(conv.last_message_at)}
                          </span>
                        </div>
                      </div>
                      {/* Last message preview */}
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={cn(
                          "text-xs truncate flex items-center gap-1",
                          conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {conv.last_message_from_me && (
                            <CheckCheck className="w-3 h-3 shrink-0 text-primary" />
                          )}
                          <span className="truncate">
                            {conv.last_message_content || conv.contact_phone}
                          </span>
                        </p>
                        {conv.unread_count > 0 && (
                          <Badge className="h-5 min-w-5 flex items-center justify-center p-0 text-xs shrink-0">
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
            "flex-1 flex flex-col min-h-0 min-w-0",
            !selectedConversation && "hidden md:flex"
          )}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-3 border-b flex items-center gap-2 sm:gap-3 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8 shrink-0"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {(selectedConversation.contact_name || selectedConversation.contact_phone)
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-medium truncate text-sm sm:text-base">
                        {selectedConversation.contact_name || selectedConversation.contact_phone}
                      </p>
                      {selectedConversation.lead_id && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          <Link2 className="w-2.5 h-2.5 mr-0.5" />
                          Lead
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedConversation.contact_phone}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Favorite toggle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleFavorite(selectedConversation)}
                    >
                      {selectedConversation.is_favorite ? (
                        <Star className="w-4 h-4 text-secondary fill-secondary" />
                      ) : (
                        <Star className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>

                    {selectedInstance && (
                      <Badge variant="outline" className="hidden sm:flex">
                        <Building2 className="w-3 h-3 mr-1" />
                        {selectedInstance.unit}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-3 sm:p-4 bg-muted/30">
                  <div className="space-y-2 sm:space-y-3">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Nenhuma mensagem ainda
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            msg.from_me ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm",
                              msg.from_me
                                ? "bg-primary text-primary-foreground"
                                : "bg-card border"
                            )}
                          >
                            {/* Render media based on type */}
                            {msg.message_type === 'image' && msg.media_url && (
                              <div className="mb-2">
                                <img 
                                  src={msg.media_url} 
                                  alt="Imagem" 
                                  className="rounded max-w-full max-h-64 object-contain cursor-pointer"
                                  onClick={() => window.open(msg.media_url!, '_blank')}
                                />
                              </div>
                            )}
                            {msg.message_type === 'audio' && msg.media_url && (
                              <div className="mb-2">
                                <audio controls className="max-w-full">
                                  <source src={msg.media_url} />
                                </audio>
                              </div>
                            )}
                            {msg.message_type === 'document' && msg.media_url && (
                              <div className="mb-2">
                                <a 
                                  href={msg.media_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded border",
                                    msg.from_me 
                                      ? "border-primary-foreground/30 hover:bg-primary-foreground/10" 
                                      : "border-border hover:bg-muted"
                                  )}
                                >
                                  <Paperclip className="w-4 h-4" />
                                  <span className="truncate text-xs">{msg.content || 'Documento'}</span>
                                </a>
                              </div>
                            )}
                            {/* Text content */}
                            {msg.content && msg.message_type === 'text' && (
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            )}
                            {msg.content && msg.message_type === 'image' && msg.content !== '[Imagem]' && (
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            )}
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
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-2 sm:p-3 border-t shrink-0 bg-card">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-2 items-end"
                  >
                    {/* Templates Button */}
                    {templates.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            className="shrink-0 h-9 w-9"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64">
                          <DropdownMenuLabel>Templates Rápidos</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {templates.map((template) => (
                            <DropdownMenuItem 
                              key={template.id}
                              onClick={() => applyTemplate(template)}
                            >
                              <span className="truncate">{template.name}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* Emoji Button */}
                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                      <PopoverTrigger asChild>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          className="shrink-0 h-9 w-9"
                        >
                          <Smile className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" align="start">
                        <div className="grid grid-cols-6 gap-1">
                          {commonEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => insertEmoji(emoji)}
                              className="text-xl p-1 hover:bg-muted rounded transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Media attachment dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          className="shrink-0 h-9 w-9"
                        >
                          <Paperclip className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Imagem
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => audioInputRef.current?.click()}>
                          <Mic className="w-4 h-4 mr-2" />
                          Áudio
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                          <FileText className="w-4 h-4 mr-2" />
                          Arquivo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Input
                      placeholder="Digite uma mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={isSending}
                      className="text-base sm:text-sm flex-1"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={isSending || !newMessage.trim()}
                      className="shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-muted/20">
                <div className="bg-muted/50 rounded-full p-4 mb-4">
                  <MessageSquare className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">Selecione uma conversa</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Escolha uma conversa na lista ao lado para começar a enviar mensagens.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'audio')}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'document')}
      />

      {/* Media Preview Dialog */}
      <Dialog open={!!mediaPreview} onOpenChange={(open) => !open && cancelMediaUpload()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mediaPreview?.type === 'image' && 'Enviar imagem'}
              {mediaPreview?.type === 'audio' && 'Enviar áudio'}
              {mediaPreview?.type === 'document' && 'Enviar arquivo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview */}
            {mediaPreview?.type === 'image' && mediaPreview.preview && (
              <div className="flex justify-center">
                <img 
                  src={mediaPreview.preview} 
                  alt="Preview" 
                  className="max-h-64 rounded-lg object-contain"
                />
              </div>
            )}
            {mediaPreview?.type === 'audio' && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Mic className="w-8 h-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{mediaPreview.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(mediaPreview.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}
            {mediaPreview?.type === 'document' && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Paperclip className="w-8 h-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{mediaPreview.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(mediaPreview.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}

            {/* Caption for images */}
            {mediaPreview?.type === 'image' && (
              <Input
                placeholder="Adicionar legenda (opcional)..."
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
              />
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelMediaUpload} disabled={isUploading}>
                Cancelar
              </Button>
              <Button onClick={sendMedia} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
