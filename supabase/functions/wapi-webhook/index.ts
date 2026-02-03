import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        const remoteJid = message.key?.remoteJid || 
                          message.from || 
                          message.remoteJid || 
                          (message.chat?.id ? `${message.chat.id}@s.whatsapp.net` : null) ||
                          (message.sender?.id ? `${message.sender.id}@s.whatsapp.net` : null);
        
        if (!remoteJid) {
          console.log('No remoteJid found, skipping message');
          break;
        }

        const fromMe = message.key?.fromMe || message.fromMe || false;
        const messageId = message.key?.id || message.id || message.messageId;
        
        // Extract phone number from remoteJid (format: 5511999999999@s.whatsapp.net or 5511999999999)
        const contactPhone = remoteJid?.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '') || '';
        
        // Get contact name from various sources
        const contactName = message.pushName || 
                           message.verifiedBizName || 
                           message.sender?.pushName || 
                           message.sender?.verifiedBizName || 
                           contactPhone;

        // Get contact profile picture from various sources
        const contactPicture = message.chat?.profilePicture || 
                              message.sender?.profilePicture || 
                              null;

        // Get or create conversation
        let conversation;
        const { data: existingConv } = await supabase
          .from('wapi_conversations')
          .select('*')
          .eq('instance_id', instance.id)
          .eq('remote_jid', remoteJid)
          .single();

        // Extract message content for preview - handle both old and new formats
        let previewContent = '';
        const msgContent = message.message || message.msgContent || {};
        
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
        } else if (message.body || message.text) {
          previewContent = message.body || message.text;
        }

        if (existingConv) {
          conversation = existingConv;
          // Update last message timestamp, preview, and profile picture
          const updateData: Record<string, unknown> = { 
            last_message_at: new Date().toISOString(),
            unread_count: fromMe ? existingConv.unread_count : (existingConv.unread_count || 0) + 1,
            last_message_content: previewContent.substring(0, 100),
            last_message_from_me: fromMe,
            contact_name: contactName || existingConv.contact_name,
          };
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
          
          // Create new conversation with optional lead link
          const { data: newConv, error: convError } = await supabase
            .from('wapi_conversations')
            .insert({
              instance_id: instance.id,
              remote_jid: remoteJid,
              contact_phone: contactPhone,
              contact_name: contactName,
              contact_picture: contactPicture,
              last_message_at: new Date().toISOString(),
              unread_count: fromMe ? 0 : 1,
              last_message_content: previewContent.substring(0, 100),
              last_message_from_me: fromMe,
              lead_id: matchedLeadId,
            })
            .select()
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
        } else if (message.body || message.text) {
          content = message.body || message.text;
        }

        // Insert message
        const { error: msgError } = await supabase
          .from('wapi_messages')
          .insert({
            conversation_id: conversation.id,
            message_id: messageId,
            from_me: fromMe,
            message_type: messageType,
            content: content,
            media_url: mediaUrl,
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
          console.log('Message saved:', messageId, 'content:', content.substring(0, 50));
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
                  await supabase
                    .from('wapi_conversations')
                    .update({ 
                      last_message_at: new Date().toISOString(),
                      last_message_content: previewContent.substring(0, 100),
                      last_message_from_me: true,
                    })
                    .eq('id', existingConv.id);
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
