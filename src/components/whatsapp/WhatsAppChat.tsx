import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  Send, Search, MessageSquare, Check, CheckCheck, Clock, WifiOff, 
  ArrowLeft, Building2, Star, StarOff, Link2, FileText, Smile, ExternalLink,
  Image as ImageIcon, Mic, Paperclip, Loader2, Square, X, Pause, Play, Bell, BellOff
} from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useNotifications } from "@/hooks/useNotifications";
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
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

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
  contact_picture: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_favorite: boolean;
  last_message_content: string | null;
  last_message_from_me: boolean;
}

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  unit: string | null;
  status: string;
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
  const [showLinkLeadModal, setShowLinkLeadModal] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [searchedLeads, setSearchedLeads] = useState<Lead[]>([]);
  const [isSearchingLeads, setIsSearchingLeads] = useState(false);
  const [linkedLead, setLinkedLead] = useState<Lead | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording hook
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    error: recordingError,
  } = useAudioRecorder({ maxDuration: 120 });

  // Notifications hook
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('whatsapp-notifications-enabled');
    return saved !== null ? saved === 'true' : true;
  });
  
  const { notify, requestPermission, hasPermission } = useNotifications({
    soundEnabled: notificationsEnabled,
    browserNotificationsEnabled: notificationsEnabled,
  });

  // Request notification permission on mount if enabled
  useEffect(() => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      requestPermission();
    }
  }, [notificationsEnabled, requestPermission]);

  // Save notification preference to localStorage
  const toggleNotifications = useCallback(async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem('whatsapp-notifications-enabled', String(newValue));
    
    if (newValue && 'Notification' in window && Notification.permission === 'default') {
      await requestPermission();
    }
    
    toast({
      title: newValue ? "Notificações ativadas" : "Notificações desativadas",
      description: newValue 
        ? "Você receberá alertas sonoros e visuais para novas mensagens."
        : "Você não receberá mais alertas de novas mensagens.",
    });
  }, [notificationsEnabled, requestPermission]);

  // Format recording time as MM:SS
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

      // Subscribe to realtime updates for conversations - with notifications
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
          (payload) => {
            // Check if this is a new message (unread_count increased or last_message changed)
            if (payload.eventType === 'UPDATE') {
              const newData = payload.new as Conversation;
              const oldData = payload.old as Partial<Conversation>;
              
              // If unread count increased and message is not from me, trigger notification
              if (
                newData.unread_count > (oldData.unread_count || 0) && 
                !newData.last_message_from_me &&
                newData.id !== selectedConversation?.id // Don't notify for current conversation
              ) {
                notify({
                  title: newData.contact_name || newData.contact_phone,
                  body: newData.last_message_content || 'Nova mensagem',
                  tag: `whatsapp-${newData.id}`,
                });
              }
            }
            fetchConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(conversationsChannel);
      };
    }
  }, [selectedInstance, selectedConversation?.id, notify]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      fetchLinkedLead(selectedConversation.lead_id, selectedConversation);

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

      // Mark as read immediately - update local state first for instant feedback
      if (selectedConversation.unread_count > 0) {
        setConversations(prev => 
          prev.map(c => c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c)
        );
        setSelectedConversation(prev => prev ? { ...prev, unread_count: 0 } : null);
        
        // Then update the database
        supabase
          .from('wapi_conversations')
          .update({ unread_count: 0 })
          .eq('id', selectedConversation.id)
          .then(() => {});
      }

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    } else {
      setLinkedLead(null);
    }
  }, [selectedConversation?.id]);

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

  const fetchLinkedLead = async (leadId: string | null, conversation?: Conversation | null) => {
    if (leadId) {
      // Lead already linked, just fetch it
      const { data } = await supabase
        .from("campaign_leads")
        .select("id, name, whatsapp, unit, status")
        .eq("id", leadId)
        .single();

      if (data) {
        setLinkedLead(data as Lead);
      } else {
        setLinkedLead(null);
      }
      return;
    }

    // No lead linked - try to auto-link by phone number
    if (conversation && selectedInstance) {
      const contactPhone = conversation.contact_phone.replace(/\D/g, '');
      const phoneVariants = [
        contactPhone,
        contactPhone.replace(/^55/, ''), // Remove Brazil country code
        `55${contactPhone}`, // Add Brazil country code
      ];

      // Search for a lead matching this phone number in the same unit
      const { data: matchingLead } = await supabase
        .from("campaign_leads")
        .select("id, name, whatsapp, unit, status")
        .or(phoneVariants.map(p => `whatsapp.ilike.%${p}%`).join(','))
        .eq("unit", selectedInstance.unit)
        .limit(1)
        .single();

      if (matchingLead) {
        // Auto-link the conversation to the lead
        const { error } = await supabase
          .from('wapi_conversations')
          .update({ lead_id: matchingLead.id })
          .eq('id', conversation.id);

        if (!error) {
          setLinkedLead(matchingLead as Lead);
          // Update local state
          setConversations(prev => 
            prev.map(c => c.id === conversation.id ? { ...c, lead_id: matchingLead.id } : c)
          );
          setSelectedConversation({ ...conversation, lead_id: matchingLead.id });
          
          toast({
            title: "Lead vinculado automaticamente",
            description: `Conversa vinculada a ${matchingLead.name}`,
          });
        }
        return;
      }
    }

    setLinkedLead(null);
  };

  const searchLeads = async (query: string) => {
    if (!query.trim() || !selectedInstance) {
      setSearchedLeads([]);
      return;
    }

    setIsSearchingLeads(true);

    const { data } = await supabase
      .from("campaign_leads")
      .select("id, name, whatsapp, unit, status")
      .or(`name.ilike.%${query}%,whatsapp.ilike.%${query}%`)
      .eq("unit", selectedInstance.unit)
      .limit(10);

    if (data) {
      setSearchedLeads(data as Lead[]);
    }

    setIsSearchingLeads(false);
  };

  const linkLeadToConversation = async (lead: Lead) => {
    if (!selectedConversation) return;

    const { error } = await supabase
      .from('wapi_conversations')
      .update({ lead_id: lead.id })
      .eq('id', selectedConversation.id);

    if (error) {
      toast({
        title: "Erro ao vincular",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Update local state
    setSelectedConversation({ ...selectedConversation, lead_id: lead.id });
    setConversations(prev => 
      prev.map(c => c.id === selectedConversation.id ? { ...c, lead_id: lead.id } : c)
    );
    setLinkedLead(lead);
    setShowLinkLeadModal(false);
    setLeadSearchQuery("");
    setSearchedLeads([]);

    toast({
      title: "Lead vinculado",
      description: `Conversa vinculada a ${lead.name}`,
    });
  };

  const unlinkLead = async () => {
    if (!selectedConversation) return;

    const { error } = await supabase
      .from('wapi_conversations')
      .update({ lead_id: null })
      .eq('id', selectedConversation.id);

    if (error) {
      toast({
        title: "Erro ao desvincular",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Update local state
    setSelectedConversation({ ...selectedConversation, lead_id: null });
    setConversations(prev => 
      prev.map(c => c.id === selectedConversation.id ? { ...c, lead_id: null } : c)
    );
    setLinkedLead(null);

    toast({
      title: "Lead desvinculado",
      description: "A conversa não está mais vinculada a nenhum lead.",
    });
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
      
      // Note: The Edge Function already saves the message to the database,
      // and the realtime subscription will add it to the UI automatically.
      // No need for optimistic update here to avoid duplicate messages.
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

  // Send recorded audio
  const sendRecordedAudio = async () => {
    if (!audioBlob || !selectedConversation || !selectedInstance || isUploading) return;

    setIsUploading(true);

    try {
      // Create file from blob
      const fileName = `${selectedConversation.id}/${Date.now()}.webm`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(fileName, audioBlob, {
          contentType: audioBlob.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(fileName);

      const mediaUrl = urlData.publicUrl;

      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: 'send-audio',
          phone: selectedConversation.contact_phone,
          conversationId: selectedConversation.id,
          instanceId: selectedInstance.instance_id,
          instanceToken: selectedInstance.instance_token,
          mediaUrl,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Note: The Edge Function already saves the message to the database,
      // and the realtime subscription will add it to the UI automatically.
      // No need for optimistic update here to avoid duplicate messages.

      // Clear the recorded audio
      cancelRecording();

      toast({
        title: "Áudio enviado",
        description: "Mensagem de voz enviada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar áudio",
        description: error.message || "Não foi possível enviar o áudio.",
        variant: "destructive",
      });
    }

    setIsUploading(false);
  };

  // Effect to show error from recording
  useEffect(() => {
    if (recordingError) {
      toast({
        title: "Erro na gravação",
        description: recordingError,
        variant: "destructive",
      });
    }
  }, [recordingError]);

  // Helper function to convert file to base64 with optional compression for images
  const fileToBase64 = async (file: File, compress: boolean = false): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (compress && file.type.startsWith('image/')) {
        // Compress image using canvas
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions (max 1200px on longest side)
            const maxSize = 1200;
            let { width, height } = img;
            
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height / width) * maxSize;
                width = maxSize;
              } else {
                width = (width / height) * maxSize;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Convert to base64 with quality compression
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataUrl);
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        // Just convert to base64 without compression
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    });
  };

  const sendMedia = async () => {
    if (!mediaPreview || !selectedConversation || !selectedInstance || isUploading) return;

    setIsUploading(true);

    try {
      const { type, file } = mediaPreview;
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedConversation.id}/${Date.now()}.${fileExt}`;

      // For images: convert to base64 directly (faster - avoids double transfer)
      // For documents: upload to storage first (W-API requires URL)
      // For audio: upload to storage
      
      if (type === 'image') {
        // Convert image to base64 and upload to storage in parallel for speed
        const storageFileName = `${selectedConversation.id}/${Date.now()}.jpg`;
        
        const [base64Data, uploadResult] = await Promise.all([
          fileToBase64(file, true),
          supabase.storage.from('whatsapp-media').upload(storageFileName, file)
        ]);
        
        let mediaUrl: string | null = null;
        if (!uploadResult.error && uploadResult.data) {
          const { data: urlData } = supabase.storage
            .from('whatsapp-media')
            .getPublicUrl(storageFileName);
          mediaUrl = urlData.publicUrl;
        }

        // Send to W-API with base64 (fast) and include mediaUrl for display in chat
        const response = await supabase.functions.invoke("wapi-send", {
          body: {
            action: 'send-image',
            phone: selectedConversation.contact_phone,
            conversationId: selectedConversation.id,
            instanceId: selectedInstance.instance_id,
            instanceToken: selectedInstance.instance_token,
            base64: base64Data,
            caption: mediaCaption,
            mediaUrl: mediaUrl,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }
      } else if (type === 'document') {
        // For documents: upload to storage first (W-API needs URL)
        const { error: uploadError } = await supabase.storage
          .from('whatsapp-media')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from('whatsapp-media')
          .getPublicUrl(fileName);

        const mediaUrl = urlData.publicUrl;

        const response = await supabase.functions.invoke("wapi-send", {
          body: {
            action: 'send-document',
            phone: selectedConversation.contact_phone,
            conversationId: selectedConversation.id,
            instanceId: selectedInstance.instance_id,
            instanceToken: selectedInstance.instance_token,
            mediaUrl,
            fileName: file.name,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }
      }

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
      {/* Header with Unit Tabs and Notifications Toggle */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {/* Unit Tabs - only show if multiple instances */}
        {instances.length > 1 ? (
          <Tabs 
            value={selectedInstance?.id || ""} 
            onValueChange={handleInstanceChange}
            className="flex-1"
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
        ) : (
          <div className="flex-1" />
        )}
        
        {/* Notifications Toggle */}
        <Button
          variant={notificationsEnabled ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleNotifications}
          className="shrink-0"
          title={notificationsEnabled ? "Notificações ativadas" : "Notificações desativadas"}
        >
          {notificationsEnabled ? (
            <Bell className="w-4 h-4" />
          ) : (
            <BellOff className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="hidden sm:inline ml-1">
            {notificationsEnabled ? "Notificações" : "Silenciado"}
          </span>
        </Button>
      </div>

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
          {/* Mobile: Show full width list or chat */}
          <div className={cn(
            "w-full flex flex-col min-h-0 md:hidden",
            selectedConversation && "hidden"
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
                        {conv.contact_picture && (
                          <AvatarImage 
                            src={conv.contact_picture} 
                            alt={conv.contact_name || conv.contact_phone}
                          />
                        )}
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
                        <p className={cn(
                          "truncate flex-1",
                          conv.unread_count > 0 ? "font-bold" : "font-medium"
                        )}>
                          {conv.contact_name || conv.contact_phone}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {formatConversationDate(conv.last_message_at)}
                        </span>
                      </div>
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

          {/* Desktop: Resizable Panels */}
          <ResizablePanelGroup direction="horizontal" className="hidden md:flex flex-1">
            {/* Conversations Panel - Resizable */}
            <ResizablePanel 
              defaultSize={35} 
              minSize={20} 
              maxSize={50}
              className="flex flex-col min-h-0"
            >
              <div className="flex flex-col h-full border-r">
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
                            {conv.contact_picture && (
                              <AvatarImage 
                                src={conv.contact_picture} 
                                alt={conv.contact_name || conv.contact_phone}
                              />
                            )}
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
                            <div className="flex items-center gap-1 min-w-0 flex-1">
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
            </ResizablePanel>

            {/* Resize Handle */}
            <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />

            {/* Messages Panel */}
            <ResizablePanel defaultSize={65} minSize={40} className="flex flex-col min-h-0 min-w-0">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b flex items-center gap-2 sm:gap-3 shrink-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      {selectedConversation.contact_picture && (
                        <AvatarImage 
                          src={selectedConversation.contact_picture} 
                          alt={selectedConversation.contact_name || selectedConversation.contact_phone}
                        />
                      )}
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
                        {linkedLead && (
                          <div className="flex items-center gap-1">
                            <Badge 
                              variant="secondary" 
                              className="text-[10px] h-4 px-1 cursor-pointer hover:bg-secondary/80"
                              onClick={() => setShowLinkLeadModal(true)}
                            >
                              <Link2 className="w-2.5 h-2.5 mr-0.5" />
                              {linkedLead.name.split(' ')[0]}
                            </Badge>
                            <Badge 
                              className={cn(
                                "text-[10px] h-4 px-1.5 cursor-pointer",
                                linkedLead.status === 'novo' && "bg-blue-500 hover:bg-blue-600",
                                linkedLead.status === 'em_contato' && "bg-yellow-500 hover:bg-yellow-600 text-yellow-950",
                                linkedLead.status === 'orcamento_enviado' && "bg-purple-500 hover:bg-purple-600",
                                linkedLead.status === 'aguardando_resposta' && "bg-orange-500 hover:bg-orange-600",
                                linkedLead.status === 'fechado' && "bg-green-500 hover:bg-green-600",
                                linkedLead.status === 'perdido' && "bg-red-500 hover:bg-red-600"
                              )}
                              onClick={() => setShowLinkLeadModal(true)}
                            >
                              {linkedLead.status === 'novo' && 'Novo'}
                              {linkedLead.status === 'em_contato' && 'Contato'}
                              {linkedLead.status === 'orcamento_enviado' && 'Orçamento'}
                              {linkedLead.status === 'aguardando_resposta' && 'Aguardando'}
                              {linkedLead.status === 'fechado' && 'Fechado'}
                              {linkedLead.status === 'perdido' && 'Perdido'}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedConversation.contact_phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowLinkLeadModal(true)}
                        title={linkedLead ? "Gerenciar vínculo com lead" : "Vincular a um lead"}
                      >
                        <Link2 className={cn(
                          "w-4 h-4",
                          linkedLead ? "text-primary" : "text-muted-foreground"
                        )} />
                      </Button>
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
                                    <span className="truncate">{msg.content}</span>
                                  </a>
                                </div>
                              )}
                              {msg.message_type === 'text' && (
                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                              )}
                              {msg.message_type !== 'text' && msg.content && msg.content !== '[Imagem]' && msg.content !== '[Áudio]' && (
                                <p className="whitespace-pre-wrap break-words mt-1">{msg.content}</p>
                              )}
                              <div className={cn(
                                "flex items-center gap-1 mt-1",
                                msg.from_me ? "justify-end" : "justify-start"
                              )}>
                                <span className={cn(
                                  "text-[10px]",
                                  msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground"
                                )}>
                                  {formatMessageTime(msg.timestamp)}
                                </span>
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
                  <div className="p-3 border-t shrink-0">
                    {isRecording || audioBlob ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-3 bg-muted rounded-lg px-4 py-2">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            isRecording && !isPaused ? "bg-destructive animate-pulse" : "bg-muted-foreground"
                          )} />
                          <span className="font-mono text-lg">
                            {formatRecordingTime(recordingTime)}
                          </span>
                          {audioBlob && (
                            <span className="text-sm text-muted-foreground">
                              Gravação pronta
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={cancelRecording}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        {isRecording && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={isPaused ? resumeRecording : pauseRecording}
                          >
                            {isPaused ? (
                              <Play className="w-4 h-4" />
                            ) : (
                              <Pause className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        {isRecording ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="shrink-0"
                            onClick={stopRecording}
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        ) : audioBlob ? (
                          <Button
                            type="button"
                            size="icon"
                            className="shrink-0"
                            onClick={sendRecordedAudio}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendMessage();
                        }}
                        className="flex gap-2 items-end"
                      >
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
                              Arquivo de Áudio
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                              <FileText className="w-4 h-4 mr-2" />
                              Arquivo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Textarea
                          placeholder="Digite uma mensagem..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          disabled={isSending}
                          className="text-base sm:text-sm flex-1 min-h-[40px] max-h-32 resize-y py-2"
                          rows={1}
                        />
                        {newMessage.trim() ? (
                          <Button 
                            type="submit" 
                            size="icon" 
                            disabled={isSending}
                            className="shrink-0"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="shrink-0"
                            onClick={startRecording}
                          >
                            <Mic className="w-4 h-4" />
                          </Button>
                        )}
                      </form>
                    )}
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
            </ResizablePanel>
          </ResizablePanelGroup>

          {/* Mobile: Show chat when conversation is selected */}
          <div className={cn(
            "w-full flex flex-col min-h-0 md:hidden",
            !selectedConversation && "hidden"
          )}>
            {selectedConversation && (
              <>
                <div className="p-3 border-b flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="h-9 w-9 shrink-0">
                    {selectedConversation.contact_picture && (
                      <AvatarImage 
                        src={selectedConversation.contact_picture} 
                        alt={selectedConversation.contact_name || selectedConversation.contact_phone}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {(selectedConversation.contact_name || selectedConversation.contact_phone)
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">
                      {selectedConversation.contact_name || selectedConversation.contact_phone}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedConversation.contact_phone}
                    </p>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-3 bg-muted/30">
                  <div className="space-y-2">
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
                            "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm",
                            msg.from_me
                              ? "bg-primary text-primary-foreground"
                              : "bg-card border"
                          )}
                        >
                          {msg.message_type === 'image' && msg.media_url && (
                            <div className="mb-2">
                              <img 
                                src={msg.media_url} 
                                alt="Imagem" 
                                className="rounded max-w-full max-h-48 object-contain"
                              />
                            </div>
                          )}
                          {msg.message_type === 'audio' && msg.media_url && (
                            <audio controls className="max-w-full">
                              <source src={msg.media_url} />
                            </audio>
                          )}
                          {msg.message_type === 'text' && (
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          )}
                          <div className={cn(
                            "flex items-center gap-1 mt-1",
                            msg.from_me ? "justify-end" : "justify-start"
                          )}>
                            <span className={cn(
                              "text-[10px]",
                              msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {formatMessageTime(msg.timestamp)}
                            </span>
                            {msg.from_me && getStatusIcon(msg.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-3 border-t shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-2 items-end"
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9">
                          <Paperclip className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Imagem
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                          <FileText className="w-4 h-4 mr-2" />
                          Arquivo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Textarea
                      placeholder="Digite uma mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={isSending}
                      className="text-base flex-1 min-h-[40px] max-h-32 resize-y py-2"
                      rows={1}
                    />
                    {newMessage.trim() ? (
                      <Button type="submit" size="icon" disabled={isSending} className="shrink-0">
                        <Send className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="shrink-0"
                        onClick={startRecording}
                      >
                        <Mic className="w-4 h-4" />
                      </Button>
                    )}
                  </form>
                </div>
              </>
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

      {/* Link Lead Modal */}
      <Dialog open={showLinkLeadModal} onOpenChange={(open) => {
        setShowLinkLeadModal(open);
        if (!open) {
          setLeadSearchQuery("");
          setSearchedLeads([]);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {linkedLead ? "Lead vinculado" : "Vincular a um lead"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Show linked lead if exists */}
            {linkedLead && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {linkedLead.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{linkedLead.name}</p>
                      <p className="text-xs text-muted-foreground">{linkedLead.whatsapp}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`/admin?lead=${linkedLead.id}`, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Ver no CRM
                    </Button>
                    <Button variant="destructive" size="sm" onClick={unlinkLead}>
                      Desvincular
                    </Button>
                  </div>
                </div>

                {/* Lead Status Classification */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Classificar lead:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
                      { value: 'em_contato', label: 'Em Contato', color: 'bg-yellow-500' },
                      { value: 'orcamento_enviado', label: 'Orçamento Enviado', color: 'bg-purple-500' },
                      { value: 'aguardando_resposta', label: 'Aguardando', color: 'bg-orange-500' },
                      { value: 'fechado', label: 'Fechado', color: 'bg-green-500' },
                      { value: 'perdido', label: 'Perdido', color: 'bg-red-500' },
                    ].map((statusOption) => (
                      <Button
                        key={statusOption.value}
                        variant={linkedLead.status === statusOption.value ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "justify-start gap-2",
                          linkedLead.status === statusOption.value && "ring-2 ring-offset-2"
                        )}
                        onClick={async () => {
                          const oldStatus = linkedLead.status;
                          const newStatus = statusOption.value as "novo" | "em_contato" | "orcamento_enviado" | "aguardando_resposta" | "fechado" | "perdido";
                          
                          // Skip if same status
                          if (oldStatus === newStatus) return;
                          
                          const { error } = await supabase
                            .from('campaign_leads')
                            .update({ status: newStatus })
                            .eq('id', linkedLead.id);
                          
                          if (error) {
                            toast({
                              title: "Erro ao atualizar",
                              description: error.message,
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Register in lead history
                          const statusLabels: Record<string, string> = {
                            novo: 'Novo',
                            em_contato: 'Em Contato',
                            orcamento_enviado: 'Orçamento Enviado',
                            aguardando_resposta: 'Aguardando Resposta',
                            fechado: 'Fechado',
                            perdido: 'Perdido',
                          };
                          
                          await supabase.from('lead_history').insert({
                            lead_id: linkedLead.id,
                            action: 'status_change',
                            old_value: statusLabels[oldStatus] || oldStatus,
                            new_value: statusLabels[newStatus] || newStatus,
                            user_id: userId,
                          });
                          
                          setLinkedLead({ ...linkedLead, status: statusOption.value });
                          toast({
                            title: "Status atualizado",
                            description: `Lead classificado como "${statusOption.label}"`,
                          });
                        }}
                      >
                        <div className={cn("w-2 h-2 rounded-full", statusOption.color)} />
                        {statusOption.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Search leads */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {linkedLead ? "Ou vincular a outro lead:" : "Buscar lead por nome ou telefone:"}
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Digite para buscar..."
                  value={leadSearchQuery}
                  onChange={(e) => {
                    setLeadSearchQuery(e.target.value);
                    searchLeads(e.target.value);
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Search results */}
            {isSearchingLeads && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isSearchingLeads && searchedLeads.length > 0 && (
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {searchedLeads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => linkLeadToConversation(lead)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-accent rounded-lg transition-colors text-left"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {lead.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.whatsapp}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {lead.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            {!isSearchingLeads && leadSearchQuery && searchedLeads.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum lead encontrado para "{leadSearchQuery}"
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
