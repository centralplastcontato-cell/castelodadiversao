import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WAPI_BASE_URL = 'https://api.w-api.app/v1';

// Bot configuration - Mensagens personalizadas Castelo da Diversão
const BOT_QUESTIONS = {
  nome: {
    message: 'Para começar, me conta: qual é o seu nome? 👑',
    next: 'mes',
  },
  mes: {
    message: 'Que legal! 🎉 E pra qual mês você tá pensando em fazer essa festa incrível?\n\n📅 Ex: Fevereiro, Março, Abril...',
    next: 'dia',
  },
  dia: {
    message: 'Maravilha! Tem preferência de dia da semana? 🗓️\n\n• Segunda a Quinta\n• Sexta\n• Sábado\n• Domingo',
    next: 'convidados',
  },
  convidados: {
    message: 'E quantos convidados você pretende chamar pra essa festa mágica? 🎈\n\n👥 Ex: 50, 70, 100 pessoas...',
    next: 'complete',
  },
};

// Helper function to normalize phone numbers for comparison
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Helper function to check if a phone number is in the VIP list
async function isVipNumber(
  supabase: SupabaseClient,
  instanceId: string,
  phone: string
): Promise<boolean> {
  const normalizedPhone = normalizePhoneNumber(phone);
  
  const { data } = await supabase
    .from('wapi_vip_numbers')
    .select('id')
    .eq('instance_id', instanceId)
    .or(`phone.ilike.%${normalizedPhone}%,phone.ilike.%${normalizedPhone.replace(/^55/, '')}%`)
    .limit(1);
  
  return Boolean(data && data.length > 0);
}

// Helper function to get bot settings for an instance
async function getBotSettings(
  supabase: SupabaseClient,
  instanceId: string
): Promise<{
  bot_enabled: boolean;
  test_mode_enabled: boolean;
  test_mode_number: string | null;
  welcome_message: string;
} | null> {
  const { data } = await supabase
    .from('wapi_bot_settings')
    .select('*')
    .eq('instance_id', instanceId)
    .single();
  
  return data;
}

// Helper function to send a WhatsApp message via W-API
async function sendBotMessage(
  instanceId: string,
  instanceToken: string,
  remoteJid: string,
  message: string
): Promise<string | null> {
  try {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    
    const response = await fetch(`${WAPI_BASE_URL}/message/send-text?instanceId=${instanceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instanceToken}`,
      },
      body: JSON.stringify({
        phone: phone,
        message: message,
        delayTyping: 1,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send bot message:', await response.text());
      return null;
    }

    const result = await response.json();
    return result.messageId || result.id || null;
  } catch (error) {
    console.error('Error sending bot message:', error);
    return null;
  }
}

// Process bot qualification flow
async function processBotQualification(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null },
  conversation: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: Record<string, unknown> | null; lead_id: string | null },
  messageContent: string,
  contactPhone: string,
  contactName: string | null
): Promise<void> {
  // Get bot settings
  const settings = await getBotSettings(supabase, instance.id);
  
  if (!settings) {
    console.log('No bot settings found for instance:', instance.id);
    return;
  }

  const normalizedPhone = normalizePhoneNumber(contactPhone);
  const testModeNormalized = settings.test_mode_number ? normalizePhoneNumber(settings.test_mode_number) : null;
  
  // Check if bot should run for this conversation:
  // 1. Conversation bot_enabled must be true (individual toggle)
  // 2. Either global bot is enabled OR test mode is enabled AND this is the test number
  const isTestNumber = testModeNormalized && normalizedPhone.includes(testModeNormalized.replace(/^55/, ''));
  const shouldRunBot = (
    conversation.bot_enabled !== false && // Individual toggle (default true)
    (
      settings.bot_enabled || // Global toggle
      (settings.test_mode_enabled && isTestNumber) // Test mode for specific number
    )
  );

  if (!shouldRunBot) {
    console.log('Bot not active for this conversation. Global:', settings.bot_enabled, 'TestMode:', settings.test_mode_enabled, 'IsTestNumber:', isTestNumber, 'ConvBot:', conversation.bot_enabled);
    return;
  }

  // Check if number is in VIP list
  if (await isVipNumber(supabase, instance.id, contactPhone)) {
    console.log('Phone is in VIP list, skipping bot:', contactPhone);
    return;
  }

  // Skip if lead is already linked (already qualified)
  if (conversation.lead_id) {
    console.log('Conversation already has a lead linked, skipping bot');
    return;
  }

  const currentStep = conversation.bot_step || 'welcome';
  const botData = (conversation.bot_data || {}) as Record<string, string>;

  console.log('Processing bot step:', currentStep, 'for conversation:', conversation.id);

  let nextStep: string;
  let messageToSend: string;
  const updatedBotData = { ...botData };

  if (currentStep === 'welcome') {
    // First contact - send welcome message and ask for name
    messageToSend = settings.welcome_message + '\n\n' + BOT_QUESTIONS.nome.message;
    nextStep = 'nome';
  } else if (currentStep === 'nome') {
    // Save name and ask for month
    updatedBotData.nome = messageContent.trim();
    messageToSend = `Muito prazer, ${updatedBotData.nome}! 👑✨\n\n${BOT_QUESTIONS.mes.message}`;
    nextStep = 'mes';
  } else if (currentStep === 'mes') {
    // Save month and ask for day preference
    updatedBotData.mes = messageContent.trim();
    messageToSend = `${updatedBotData.mes}, ótima escolha! 🎊\n\n${BOT_QUESTIONS.dia.message}`;
    nextStep = 'dia';
  } else if (currentStep === 'dia') {
    // Save day preference and ask for guests
    updatedBotData.dia = messageContent.trim();
    messageToSend = `Anotado! ${BOT_QUESTIONS.convidados.message}`;
    nextStep = 'convidados';
  } else if (currentStep === 'convidados') {
    // Save guests and complete qualification
    updatedBotData.convidados = messageContent.trim();
    nextStep = 'complete';
    
    // Create the lead
    const leadName = updatedBotData.nome || contactName || contactPhone;
    
    const { data: newLead, error: leadError } = await supabase
      .from('campaign_leads')
      .insert({
        name: leadName,
        whatsapp: normalizedPhone,
        unit: instance.unit,
        campaign_id: 'whatsapp-bot',
        campaign_name: 'WhatsApp Bot',
        status: 'novo',
        month: updatedBotData.mes || null,
        day_preference: updatedBotData.dia || null,
        guests: updatedBotData.convidados || null,
      })
      .select('id')
      .single();

    if (leadError) {
      console.error('Error creating lead from bot:', leadError);
      messageToSend = 'Muito obrigado pelas informações! 🏰\n\nEm breve nossa equipe vai entrar em contato pra fazer dessa festa um conto de fadas! ✨';
    } else {
      console.log('Lead created from bot:', newLead.id);
      
      // Link conversation to lead
      await supabase
        .from('wapi_conversations')
        .update({ lead_id: newLead.id })
        .eq('id', conversation.id);
      
      messageToSend = `Perfeito, ${updatedBotData.nome}! 🏰✨\n\nAnotei tudo aqui:\n\n📅 Mês: ${updatedBotData.mes}\n🗓️ Dia: ${updatedBotData.dia}\n👥 Convidados: ${updatedBotData.convidados}\n\nAgora é só aguardar! Nossa equipe vai entrar em contato em breve pra transformar essa festa num verdadeiro conto de fadas! 👑🎉`;
    }
  } else {
    // Already completed or unknown step
    console.log('Bot already completed or unknown step:', currentStep);
    return;
  }

  // Send the bot message
  const messageId = await sendBotMessage(
    instance.instance_id,
    instance.instance_token,
    conversation.remote_jid,
    messageToSend
  );

  if (messageId) {
    console.log('Bot message sent:', messageId);
    
    // Save bot message to database
    await supabase
      .from('wapi_messages')
      .insert({
        conversation_id: conversation.id,
        message_id: messageId,
        from_me: true,
        message_type: 'text',
        content: messageToSend,
        status: 'sent',
        timestamp: new Date().toISOString(),
      });
  }

  // Update conversation with new step and data
  await supabase
    .from('wapi_conversations')
    .update({
      bot_step: nextStep,
      bot_data: updatedBotData,
      last_message_at: new Date().toISOString(),
      last_message_content: messageToSend.substring(0, 100),
      last_message_from_me: true,
    })
    .eq('id', conversation.id);
}

// Helper function to download media from W-API and upload to storage
async function downloadAndStoreMedia(
  supabase: SupabaseClient,
  instanceId: string,
  instanceToken: string,
  messageId: string,
  mediaType: 'image' | 'audio' | 'video' | 'document',
  fileName?: string,
  mediaKey?: string | null,
  directPath?: string | null,
  mediaUrl?: string | null
): Promise<string | null> {
  try {
    console.log(`Downloading media for message ${messageId}, type: ${mediaType}, hasMediaKey: ${!!mediaKey}, hasDirectPath: ${!!directPath}`);
    
    // Map media type to mimetype
    const getMimetypeFromType = (type: string): string => {
      switch (type) {
        case 'image': return 'image/jpeg';
        case 'video': return 'video/mp4';
        case 'audio': return 'audio/ogg';
        case 'document': return 'application/pdf';
        default: return 'application/octet-stream';
      }
    };
    
    // Build request body - W-API requires type, mimetype, mediaKey AND directPath for download
    const requestBody: Record<string, unknown> = {
      messageId: messageId,
      type: mediaType, // Required by W-API: image, audio, video, document
      mimetype: getMimetypeFromType(mediaType), // Required by W-API
    };
    
    // W-API download-media requires type, mediaKey, and directPath
    if (mediaKey && directPath) {
      requestBody.mediaKey = mediaKey;
      requestBody.directPath = directPath;
      if (mediaUrl) {
        requestBody.url = mediaUrl;
      }
    } else if (mediaKey) {
      // Try with type, messageId and mediaKey (may fail if W-API requires directPath)
      requestBody.mediaKey = mediaKey;
    }
    // If neither mediaKey nor directPath, just use messageId and type (W-API may find it in recent cache)
    
    console.log('W-API download request body:', JSON.stringify(requestBody));
    
    // Call W-API download media endpoint
    const downloadResponse = await fetch(
      `${WAPI_BASE_URL}/message/download-media?instanceId=${instanceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${instanceToken}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text();
      console.error(`W-API download failed: ${downloadResponse.status} - ${errorText}`);
      return null;
    }

    const result = await downloadResponse.json();
    console.log('W-API download response keys:', Object.keys(result));
    
    // W-API returns base64 data
    const base64Data = result.base64 || result.data || result.media;
    const mimeType = result.mimetype || result.mimeType || getMimeType(mediaType);
    
    if (!base64Data) {
      console.error('No base64 data in W-API response');
      return null;
    }
    
    // Generate unique filename
    const extension = getExtension(mimeType, fileName);
    const uniqueFileName = `${messageId}.${extension}`;
    const storagePath = `received/${mediaType}s/${uniqueFileName}`;
    
    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(storagePath, bytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return null;
    }
    
    // Create signed URL (1 week expiry for stored media)
    // The bucket is now private, so we use signed URLs
    const { data: signedUrl, error: signError } = await supabase.storage
      .from('whatsapp-media')
      .createSignedUrl(storagePath, 604800); // 7 days in seconds
    
    if (signError) {
      console.error('Failed to create signed URL:', signError);
      // Fallback: return the storage path for later URL generation
      return `storage://whatsapp-media/${storagePath}`;
    }
    
    console.log(`Media stored successfully with signed URL`);
    return signedUrl.signedUrl;
  } catch (err) {
    console.error('Error downloading/storing media:', err);
    return null;
  }
}

function getMimeType(mediaType: string): string {
  switch (mediaType) {
    case 'image': return 'image/jpeg';
    case 'audio': return 'audio/ogg';
    case 'video': return 'video/mp4';
    case 'document': return 'application/octet-stream';
    default: return 'application/octet-stream';
  }
}

function getExtension(mimeType: string, fileName?: string): string {
  // Try to get extension from filename first
  if (fileName) {
    const parts = fileName.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase();
    }
  }
  
  // Fallback to mime type
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'video/mp4': 'mp4',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
  
  return mimeMap[mimeType] || 'bin';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    const { event, instanceId, data } = body;

    // Find the instance by W-API instance_id
    const { data: instance, error: instanceError } = await supabase
      .from('wapi_instances')
      .select('*')
      .eq('instance_id', instanceId)
      .single();

    if (instanceError || !instance) {
      console.log('Instance not found for instanceId:', instanceId);
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle different webhook events
    // W-API sends events in different formats, normalize them
    const eventType = event || body.event;
    console.log('Processing event type:', eventType);

    switch (eventType) {
      case 'connection':
      case 'webhookConnected': {
        // WhatsApp connection status changed
        const connected = data?.connected ?? body.connected ?? false;
        const phone = data?.phone || body.connectedPhone || null;
        await supabase
          .from('wapi_instances')
          .update({
            status: connected ? 'connected' : 'disconnected',
            phone_number: phone || null,
            connected_at: connected ? new Date().toISOString() : null,
          })
          .eq('id', instance.id);
        console.log('Connection status updated:', connected ? 'connected' : 'disconnected');
        break;
      }

      case 'disconnection':
      case 'webhookDisconnected': {
        await supabase
          .from('wapi_instances')
          .update({
            status: 'disconnected',
            connected_at: null,
          })
          .eq('id', instance.id);
        console.log('Instance disconnected');
        break;
      }

      case 'call':
      case 'webhookCall':
      case 'call_offer':
      case 'call_reject':
      case 'call_timeout': {
        // Voice/Video call events - just log and ignore
        console.log('Call event received, ignoring. Event:', eventType, 'callId:', body.call?.id || body.callId);
        break;
      }

      case 'message':
      case 'message-received':
      case 'webhookReceived': {
        // Message received - handle both old and new W-API formats
        const message = data?.message || data || body;
        if (!message) {
          console.log('No message data found');
          break;
        }

        // Skip protocol messages (internal WhatsApp messages)
        if (message.msgContent?.protocolMessage) {
          console.log('Skipping protocol message');
          break;
        }

        // Extract remote JID from different possible locations
        let rawRemoteJid = message.key?.remoteJid || 
                          message.from || 
                          message.remoteJid || 
                          (message.chat?.id ? `${message.chat.id}` : null) ||
                          (message.sender?.id ? `${message.sender.id}@s.whatsapp.net` : null);
        
        if (!rawRemoteJid) {
          console.log('No remoteJid found, skipping message');
          break;
        }
        
        // Normalize remote_jid to always include the proper suffix
        // This prevents duplicate conversations from being created
        const isGroup = rawRemoteJid.includes('@g.us');
        let remoteJid = rawRemoteJid;
        if (!isGroup && !rawRemoteJid.includes('@')) {
          // Individual chat without suffix - add @s.whatsapp.net
          remoteJid = `${rawRemoteJid}@s.whatsapp.net`;
        } else if (rawRemoteJid.includes('@c.us')) {
          // Convert @c.us to @s.whatsapp.net for consistency
          remoteJid = rawRemoteJid.replace('@c.us', '@s.whatsapp.net');
        }

        // isGroup already determined above from rawRemoteJid
        
        const fromMe = message.key?.fromMe || message.fromMe || false;
        const messageId = message.key?.id || message.id || message.messageId;
        
        // Extract phone number from remoteJid (format: 5511999999999@s.whatsapp.net or 5511999999999)
        // For groups, extract the group ID
        const contactPhone = remoteJid
          ?.replace('@s.whatsapp.net', '')
          .replace('@c.us', '')
          .replace('@g.us', '')
          .replace('@lid', '') || '';
        
        // Get contact/group name from various sources
        // For groups: ONLY use explicit group name fields, never use sender's pushName
        // For individuals: use pushName or sender info
        let contactName: string | null = null;
        let senderName: string | null = null;
        
        if (isGroup) {
          // For groups, ONLY use explicit group name sources - never pushName
          const groupName = message.chat?.name || 
                           message.groupName ||
                           message.subject ||
                           message.chat?.subject ||
                           null;
          
          // Store sender name separately for logging
          senderName = message.pushName || message.sender?.pushName || null;
          
          if (groupName) {
            contactName = groupName;
          }
          // If no group name, we'll use existing name from DB or fallback to generic
          console.log(`Group message - Group name: ${groupName || 'NOT PROVIDED'}, Sender: ${senderName || 'unknown'}`);
        } else {
          // For individual chats, use sender info
          contactName = message.pushName || 
                       message.verifiedBizName || 
                       message.sender?.pushName || 
                       message.sender?.verifiedBizName || 
                       contactPhone;
        }

        // Get contact/group profile picture from various sources
        const contactPicture = message.chat?.profilePicture || 
                              message.sender?.profilePicture || 
                              null;

        // Get or create conversation
        let conversation;
        const { data: existingConv } = await supabase
          .from('wapi_conversations')
          .select('*, bot_enabled, bot_step, bot_data')
          .eq('instance_id', instance.id)
          .eq('remote_jid', remoteJid)
          .single();

        // Extract message content for preview - handle both old and new formats
        let previewContent = '';
        const msgContent = message.message || message.msgContent || {};
        
        // Check for call events early - they often come with empty msgContent
        // and we should skip them entirely before creating/updating conversations
        if (Object.keys(msgContent).length === 0 && !message.body && !message.text) {
          console.log('Empty message content detected (likely a call event), skipping. MessageId:', messageId);
          break;
        }
        
        // Also check for specific call-related message types
        if (msgContent.call || msgContent.callLogMessage || 
            msgContent.bcallMessage || msgContent.missedCallMessage ||
            message.type === 'call' || message.type === 'call_log' ||
            message.callId) {
          console.log('Call event detected, skipping message save. Type:', message.type, 'callId:', message.callId);
          break;
        }
        
        if (msgContent.conversation) {
          previewContent = msgContent.conversation;
        } else if (msgContent.extendedTextMessage?.text) {
          previewContent = msgContent.extendedTextMessage.text;
        } else if (msgContent.imageMessage) {
          previewContent = '📷 Imagem';
        } else if (msgContent.videoMessage) {
          previewContent = '🎥 Vídeo';
        } else if (msgContent.audioMessage) {
          previewContent = '🎤 Áudio';
        } else if (msgContent.documentMessage) {
          previewContent = '📄 ' + (msgContent.documentMessage.fileName || 'Documento');
        } else if (msgContent.locationMessage) {
          previewContent = '📍 Localização';
        } else if (msgContent.contactMessage || msgContent.contactsArrayMessage) {
          previewContent = '👤 Contato';
        } else if (msgContent.stickerMessage) {
          previewContent = '🎭 Figurinha';
        } else if (message.body || message.text) {
          previewContent = message.body || message.text;
        } else {
          // No recognizable content for preview - likely an unsupported message type
          console.log('Unrecognized message content for preview, msgContent keys:', Object.keys(msgContent));
        }

        // Check if this is a human response (fromMe=true from web platform, not bot)
        // If it is, disable the bot for this conversation
        if (fromMe && existingConv && existingConv.bot_step && existingConv.bot_step !== 'complete') {
          console.log('Human response detected during bot flow, disabling bot for conversation:', existingConv.id);
          await supabase
            .from('wapi_conversations')
            .update({ bot_enabled: false })
            .eq('id', existingConv.id);
        }

        if (existingConv) {
          conversation = existingConv;
          // Update last message timestamp, preview, and profile picture
          const updateData: Record<string, unknown> = { 
            last_message_at: new Date().toISOString(),
            unread_count: fromMe ? existingConv.unread_count : (existingConv.unread_count || 0) + 1,
            last_message_content: previewContent.substring(0, 100),
            last_message_from_me: fromMe,
          };
          
          // If this is an incoming message (not from me) and the conversation is closed,
          // automatically reopen it so the user sees it in the main list
          if (!fromMe && existingConv.is_closed === true) {
            updateData.is_closed = false;
            console.log('Reopening closed conversation due to new incoming message:', existingConv.id);
          }
          
          // For groups: only update name if we have a valid group name (not sender name)
          // For individuals: update name if we have a new one
          if (isGroup) {
            // Only update group name if it's explicitly provided and different from generic
            const groupName = message.chat?.name || message.groupName || message.subject;
            if (groupName && groupName !== existingConv.contact_name) {
              updateData.contact_name = groupName;
            }
          } else {
            // For individual chats, update with sender name
            if (contactName && contactName !== existingConv.contact_name) {
              updateData.contact_name = contactName;
            }
          }
          
          // Only update picture if we have a new one
          if (contactPicture) {
            updateData.contact_picture = contactPicture;
          }
          await supabase
            .from('wapi_conversations')
            .update(updateData)
            .eq('id', existingConv.id);
        } else {
          // Try to find a matching lead by phone number
          let matchedLeadId = null;
          
          // Normalize phone number for comparison (remove common prefixes/formats)
          const normalizedPhone = contactPhone.replace(/\D/g, '');
          const phoneVariants = [
            normalizedPhone,
            normalizedPhone.replace(/^55/, ''), // Remove Brazil country code
            `55${normalizedPhone}`, // Add Brazil country code
          ];
          
          // Search for a lead matching this phone number in the same unit as the instance
          const { data: matchingLead } = await supabase
            .from('campaign_leads')
            .select('id, whatsapp, unit')
            .or(phoneVariants.map(p => `whatsapp.ilike.%${p}%`).join(','))
            .eq('unit', instance.unit)
            .limit(1)
            .single();
          
          if (matchingLead) {
            matchedLeadId = matchingLead.id;
            console.log('Auto-linked conversation to lead:', matchingLead.id);
          }
          // Note: We no longer auto-create leads here - the bot will do it after qualification
          // or if bot is disabled, no lead will be created automatically
          
          // Create new conversation with lead link (now always has a lead for individual chats)
          // For groups without a name, use a generic fallback
          const finalContactName = contactName || (isGroup ? `Grupo ${contactPhone}` : contactPhone);
          
          const { data: newConv, error: convError } = await supabase
            .from('wapi_conversations')
            .insert({
              instance_id: instance.id,
              remote_jid: remoteJid,
              contact_phone: contactPhone,
              contact_name: finalContactName,
              contact_picture: contactPicture,
              last_message_at: new Date().toISOString(),
              unread_count: fromMe ? 0 : 1,
              last_message_content: previewContent.substring(0, 100),
              last_message_from_me: fromMe,
              lead_id: matchedLeadId,
              bot_enabled: true, // Start with bot enabled by default
              bot_step: matchedLeadId ? null : 'welcome', // Only start bot if no lead linked
              bot_data: {},
            })
            .select('*, bot_enabled, bot_step, bot_data')
            .single();

          if (convError) {
            console.error('Error creating conversation:', convError);
            break;
          }
          conversation = newConv;
        }

        // Extract message content
        let content = '';
        let messageType = 'text';
        let mediaUrl: string | null = null;
        let mediaKey: string | null = null;
        let mediaDirectPath: string | null = null;
        let shouldDownloadMedia = false;
        let mediaFileName: string | undefined;

        // Check for call events (voice/video calls) - skip saving these
        if (msgContent.call || msgContent.callLogMessage || message.type === 'call' || message.type === 'call_log') {
          console.log('Call event detected, skipping message save');
          break;
        }

        // Check for location messages
        if (msgContent.locationMessage) {
          messageType = 'location';
          const lat = msgContent.locationMessage.degreesLatitude;
          const lng = msgContent.locationMessage.degreesLongitude;
          content = `📍 Localização: ${lat?.toFixed(6) || '?'}, ${lng?.toFixed(6) || '?'}`;
        } else if (msgContent.liveLocationMessage) {
          messageType = 'location';
          content = '📍 Localização ao vivo';
        // Check for contact/vcard messages
        } else if (msgContent.contactMessage || msgContent.contactsArrayMessage) {
          messageType = 'contact';
          const contactName = msgContent.contactMessage?.displayName || 'Contato';
          content = `👤 ${contactName}`;
        // Check for stickers
        } else if (msgContent.stickerMessage) {
          messageType = 'sticker';
          content = '🎭 Figurinha';
        // Check for reactions
        } else if (msgContent.reactionMessage) {
          console.log('Reaction message detected, skipping save');
          break;
        // Check for poll messages
        } else if (msgContent.pollCreationMessage || msgContent.pollUpdateMessage) {
          messageType = 'poll';
          content = '📊 Enquete';
        // Regular text/media messages
        } else if (msgContent.conversation) {
          content = msgContent.conversation;
        } else if (msgContent.extendedTextMessage?.text) {
          content = msgContent.extendedTextMessage.text;
        } else if (msgContent.imageMessage) {
          messageType = 'image';
          content = msgContent.imageMessage.caption || '[Imagem]';
          mediaUrl = msgContent.imageMessage.url || null;
          mediaKey = msgContent.imageMessage.mediaKey || null;
          mediaDirectPath = msgContent.imageMessage.directPath || null;
          shouldDownloadMedia = true;
        } else if (msgContent.videoMessage) {
          messageType = 'video';
          content = msgContent.videoMessage.caption || '[Vídeo]';
          mediaUrl = msgContent.videoMessage.url || null;
          mediaKey = msgContent.videoMessage.mediaKey || null;
          mediaDirectPath = msgContent.videoMessage.directPath || null;
          shouldDownloadMedia = true;
        } else if (msgContent.audioMessage) {
          messageType = 'audio';
          content = '[Áudio]';
          mediaUrl = msgContent.audioMessage.url || null;
          mediaKey = msgContent.audioMessage.mediaKey || null;
          mediaDirectPath = msgContent.audioMessage.directPath || null;
          shouldDownloadMedia = true;
        } else if (msgContent.documentMessage) {
          messageType = 'document';
          content = msgContent.documentMessage.fileName || '[Documento]';
          mediaFileName = msgContent.documentMessage.fileName;
          mediaUrl = msgContent.documentMessage.url || null;
          mediaKey = msgContent.documentMessage.mediaKey || null;
          mediaDirectPath = msgContent.documentMessage.directPath || null;
          shouldDownloadMedia = true;
        } else if (message.body || message.text) {
          content = message.body || message.text;
        } else {
          // No recognizable content - skip to avoid saving empty/null messages
          console.log('Unrecognized message type, msgContent keys:', Object.keys(msgContent));
          break;
        }
        
        // Log media key availability for debugging
        if (shouldDownloadMedia) {
          console.log(`Media message received - type: ${messageType}, hasMediaKey: ${!!mediaKey}, hasDirectPath: ${!!mediaDirectPath}, hasUrl: ${!!mediaUrl}`);
        }

        // For incoming messages with media, try to download and store in our storage
        // This ensures we have a permanent copy since WhatsApp URLs expire
        if (shouldDownloadMedia && !fromMe && messageId) {
          console.log(`Attempting to download and store media for message: ${messageId}, type: ${messageType}`);
          const storedUrl = await downloadAndStoreMedia(
            supabase,
            instance.instance_id,
            instance.instance_token,
            messageId,
            messageType as 'image' | 'audio' | 'video' | 'document',
            mediaFileName,
            mediaKey,
            mediaDirectPath,
            mediaUrl
          );
          
          if (storedUrl) {
            mediaUrl = storedUrl;
            // Clear media key and directPath since we successfully downloaded
            mediaKey = null;
            mediaDirectPath = null;
            console.log(`Media stored successfully, new URL: ${storedUrl}`);
          } else {
            console.log('Media download failed, keeping original URL (may expire) and mediaKey/directPath for later retry');
          }
        }

        // Insert message (include media_key and media_direct_path for later retry if initial download failed)
        const { error: msgError } = await supabase
          .from('wapi_messages')
          .insert({
            conversation_id: conversation.id,
            message_id: messageId,
            from_me: fromMe,
            message_type: messageType,
            content: content,
            media_url: mediaUrl,
            media_key: mediaKey,
            media_direct_path: mediaDirectPath,
            status: fromMe ? 'sent' : 'received',
            timestamp: message.messageTimestamp 
              ? new Date(message.messageTimestamp * 1000).toISOString() 
              : message.moment
              ? new Date(message.moment * 1000).toISOString()
              : new Date().toISOString(),
          });

        if (msgError) {
          console.error('Error inserting message:', msgError);
        } else {
          console.log('Message saved:', messageId, 'content:', content.substring(0, 50), 'mediaUrl:', mediaUrl ? 'yes' : 'no', 'mediaKey:', mediaKey ? 'yes' : 'no');
        }

        // Process bot qualification for incoming text messages only (not from groups)
        if (!fromMe && !isGroup && messageType === 'text' && content) {
          await processBotQualification(
            supabase,
            instance,
            conversation,
            content,
            contactPhone,
            contactName
          );
        }
        break;
      }

      case 'message-status':
      case 'message_ack':
      case 'webhookStatus':
      case 'webhookDelivery': {
        // Message status update (sent, delivered, read)
        // Also handle messages sent from other devices (fromMe=true with msgContent)
        const statusData = data || body;
        const messageId = statusData?.messageId || body?.messageId;
        const status = statusData?.status;
        const ack = statusData?.ack;
        const fromMeDelivery = body?.fromMe || statusData?.fromMe || false;
        const msgContentDelivery = body?.msgContent || statusData?.msgContent;
        
        // If this is a message sent from another device (has msgContent and fromMe=true)
        // we need to save it as a new message if it doesn't exist yet
        if (fromMeDelivery && msgContentDelivery && messageId) {
          // Check if message already exists
          const { data: existingMsg } = await supabase
            .from('wapi_messages')
            .select('id')
            .eq('message_id', messageId)
            .single();
            
          if (!existingMsg) {
            console.log('Processing outgoing message from other device:', messageId);
            
            // Get the chat info to find/create conversation
            const chatId = body?.chat?.id || statusData?.chat?.id;
            if (chatId) {
              const remoteJid = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
              const contactPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '');
              
              // Skip group messages for now (they have @g.us)
              if (!remoteJid.includes('@g.us')) {
                // Get or create conversation
                let conversation;
                const { data: existingConv } = await supabase
                  .from('wapi_conversations')
                  .select('*')
                  .eq('instance_id', instance.id)
                  .eq('remote_jid', remoteJid)
                  .single();
                  
                // Extract message content for preview
                let previewContent = '';
                const msgContent = msgContentDelivery;
                
                if (msgContent.conversation) {
                  previewContent = msgContent.conversation;
                } else if (msgContent.extendedTextMessage?.text) {
                  previewContent = msgContent.extendedTextMessage.text;
                } else if (msgContent.imageMessage) {
                  previewContent = '📷 Imagem';
                } else if (msgContent.videoMessage) {
                  previewContent = '🎥 Vídeo';
                } else if (msgContent.audioMessage) {
                  previewContent = '🎤 Áudio';
                } else if (msgContent.documentMessage) {
                  previewContent = '📄 ' + (msgContent.documentMessage.fileName || 'Documento');
                }
                
                if (existingConv) {
                  conversation = existingConv;
                  
                  // If human is sending message while bot is active, disable bot
                  if (existingConv.bot_step && existingConv.bot_step !== 'complete') {
                    console.log('Human response from other device detected during bot flow, disabling bot');
                    await supabase
                      .from('wapi_conversations')
                      .update({ 
                        bot_enabled: false,
                        last_message_at: new Date().toISOString(),
                        last_message_content: previewContent.substring(0, 100),
                        last_message_from_me: true,
                      })
                      .eq('id', existingConv.id);
                  } else {
                    await supabase
                      .from('wapi_conversations')
                      .update({ 
                        last_message_at: new Date().toISOString(),
                        last_message_content: previewContent.substring(0, 100),
                        last_message_from_me: true,
                      })
                      .eq('id', existingConv.id);
                  }
                } else {
                  // Create new conversation
                  const contactName = body?.chat?.name || body?.chat?.pushName || contactPhone;
                  const contactPicture = body?.chat?.profilePicture || null;
                  
                  const { data: newConv, error: convError } = await supabase
                    .from('wapi_conversations')
                    .insert({
                      instance_id: instance.id,
                      remote_jid: remoteJid,
                      contact_phone: contactPhone,
                      contact_name: contactName,
                      contact_picture: contactPicture,
                      last_message_at: new Date().toISOString(),
                      unread_count: 0,
                      last_message_content: previewContent.substring(0, 100),
                      last_message_from_me: true,
                      bot_enabled: false, // Human started conversation, no bot
                    })
                    .select()
                    .single();

                  if (convError) {
                    console.error('Error creating conversation for outgoing message:', convError);
                  } else {
                    conversation = newConv;
                  }
                }
                
                if (conversation) {
                  // Extract message content
                  let content = '';
                  let messageType = 'text';
                  let mediaUrl = null;

                  if (msgContent.conversation) {
                    content = msgContent.conversation;
                  } else if (msgContent.extendedTextMessage?.text) {
                    content = msgContent.extendedTextMessage.text;
                  } else if (msgContent.imageMessage) {
                    messageType = 'image';
                    content = msgContent.imageMessage.caption || '[Imagem]';
                    mediaUrl = msgContent.imageMessage.url || msgContent.imageMessage.directPath || null;
                  } else if (msgContent.videoMessage) {
                    messageType = 'video';
                    content = msgContent.videoMessage.caption || '[Vídeo]';
                    mediaUrl = msgContent.videoMessage.url || msgContent.videoMessage.directPath || null;
                  } else if (msgContent.audioMessage) {
                    messageType = 'audio';
                    content = '[Áudio]';
                    mediaUrl = msgContent.audioMessage.url || msgContent.audioMessage.directPath || null;
                  } else if (msgContent.documentMessage) {
                    messageType = 'document';
                    content = msgContent.documentMessage.fileName || '[Documento]';
                    mediaUrl = msgContent.documentMessage.url || msgContent.documentMessage.directPath || null;
                  }

                  // Insert message
                  const { error: msgError } = await supabase
                    .from('wapi_messages')
                    .insert({
                      conversation_id: conversation.id,
                      message_id: messageId,
                      from_me: true,
                      message_type: messageType,
                      content: content,
                      media_url: mediaUrl,
                      status: 'sent',
                      timestamp: body.moment 
                        ? new Date(body.moment * 1000).toISOString() 
                        : new Date().toISOString(),
                    });

                  if (msgError) {
                    console.error('Error inserting outgoing message:', msgError);
                  } else {
                    console.log('Outgoing message saved from other device:', messageId, 'content:', content.substring(0, 50));
                  }
                }
              }
            }
          }
        }
        
        // Also update status if message exists
        const statusMap: Record<string | number, string> = {
          0: 'error',
          1: 'pending',
          2: 'sent',
          3: 'delivered',
          4: 'read',
          'PENDING': 'pending',
          'SENT': 'sent',
          'DELIVERY': 'delivered',
          'READ': 'read',
          'PLAYED': 'read',
          'ERROR': 'error',
        };
        
        const newStatus = statusMap[status] || statusMap[ack] || 'unknown';
        
        if (messageId && newStatus !== 'unknown') {
          await supabase
            .from('wapi_messages')
            .update({ status: newStatus })
            .eq('message_id', messageId);
          console.log('Message status updated:', messageId, newStatus);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', eventType, 'body keys:', Object.keys(body));
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
