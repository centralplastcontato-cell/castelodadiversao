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
    switch (event) {
      case 'connection': {
        // WhatsApp connection status changed
        const { connected, phone } = data || {};
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

      case 'disconnection': {
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
      case 'message-received': {
        // Message received
        const message = data?.message || data;
        if (!message) break;

        const remoteJid = message.key?.remoteJid || message.from || message.remoteJid;
        const fromMe = message.key?.fromMe || false;
        const messageId = message.key?.id || message.id || message.messageId;
        
        // Extract phone number from remoteJid (format: 5511999999999@s.whatsapp.net)
        const contactPhone = remoteJid?.replace('@s.whatsapp.net', '').replace('@c.us', '') || '';
        
        // Get or create conversation
        let conversation;
        const { data: existingConv } = await supabase
          .from('wapi_conversations')
          .select('*')
          .eq('instance_id', instance.id)
          .eq('remote_jid', remoteJid)
          .single();

        if (existingConv) {
          conversation = existingConv;
          // Update last message timestamp
          await supabase
            .from('wapi_conversations')
            .update({ 
              last_message_at: new Date().toISOString(),
              unread_count: fromMe ? existingConv.unread_count : (existingConv.unread_count || 0) + 1
            })
            .eq('id', existingConv.id);
        } else {
          // Create new conversation
          const { data: newConv, error: convError } = await supabase
            .from('wapi_conversations')
            .insert({
              instance_id: instance.id,
              remote_jid: remoteJid,
              contact_phone: contactPhone,
              contact_name: message.pushName || message.verifiedBizName || contactPhone,
              last_message_at: new Date().toISOString(),
              unread_count: fromMe ? 0 : 1,
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

        if (message.message?.conversation) {
          content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
          content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
          messageType = 'image';
          content = message.message.imageMessage.caption || '[Imagem]';
          mediaUrl = message.message.imageMessage.url;
        } else if (message.message?.videoMessage) {
          messageType = 'video';
          content = message.message.videoMessage.caption || '[Vídeo]';
        } else if (message.message?.audioMessage) {
          messageType = 'audio';
          content = '[Áudio]';
        } else if (message.message?.documentMessage) {
          messageType = 'document';
          content = message.message.documentMessage.fileName || '[Documento]';
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
              : new Date().toISOString(),
          });

        if (msgError) {
          console.error('Error inserting message:', msgError);
        } else {
          console.log('Message saved:', messageId);
        }
        break;
      }

      case 'message-status':
      case 'message_ack': {
        // Message status update (sent, delivered, read)
        const { messageId, status, ack } = data || {};
        const statusMap: Record<number, string> = {
          0: 'error',
          1: 'pending',
          2: 'sent',
          3: 'delivered',
          4: 'read',
        };
        
        const newStatus = status || statusMap[ack] || 'unknown';
        
        if (messageId) {
          await supabase
            .from('wapi_messages')
            .update({ status: newStatus })
            .eq('message_id', messageId);
          console.log('Message status updated:', messageId, newStatus);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event);
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
