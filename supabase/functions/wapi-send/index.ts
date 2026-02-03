import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WAPI_BASE_URL = 'https://api.w-api.app/v1';

// Helper to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, phone, message, conversationId, instanceId, instanceToken } = body;

    // Use provided instanceId/token or fallback to fetching from database
    let instance_id = instanceId;
    let instance_token = instanceToken;
    let db_instance_id: string | null = null;

    // If no instance credentials provided, try to get from database (legacy behavior)
    if (!instance_id || !instance_token) {
      const { data: instance } = await supabase
        .from('wapi_instances')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (!instance) {
        return new Response(JSON.stringify({ error: 'No W-API instance configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      instance_id = instance.instance_id;
      instance_token = instance.instance_token;
      db_instance_id = instance.id;
    }

    switch (action) {
      case 'send-text': {
        // Send text message via W-API
        const response = await fetch(
          `${WAPI_BASE_URL}/message/send-text?instanceId=${instance_id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${instance_token}`,
            },
            body: JSON.stringify({
              phone: phone,
              message: message,
            }),
          }
        );

        const result = await response.json();
        console.log('W-API send-text response:', result);

        if (!response.ok || result.error) {
          return new Response(JSON.stringify({ error: result.message || 'Failed to send message' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Save message to database
        if (conversationId) {
          await supabase
            .from('wapi_messages')
            .insert({
              conversation_id: conversationId,
              message_id: result.messageId,
              from_me: true,
              message_type: 'text',
              content: message,
              status: 'sent',
              timestamp: new Date().toISOString(),
            });

          // Update conversation last message
          await supabase
            .from('wapi_conversations')
            .update({ 
              last_message_at: new Date().toISOString(),
              last_message_content: message.substring(0, 100),
              last_message_from_me: true,
            })
            .eq('id', conversationId);
        }

        return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-image': {
        const { base64, caption, fileName, mediaUrl } = body;
        
        let imageBase64 = base64;
        
        // If we received a mediaUrl (from storage), fetch and convert to base64
        if (mediaUrl && !base64) {
          try {
            const imageResponse = await fetch(mediaUrl);
            const arrayBuffer = await imageResponse.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            imageBase64 = btoa(binary);
          } catch (err) {
            console.error('Error fetching image from URL:', err);
            return new Response(JSON.stringify({ error: 'Failed to fetch image' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        const response = await fetch(
          `${WAPI_BASE_URL}/message/send-image?instanceId=${instance_id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${instance_token}`,
            },
            body: JSON.stringify({
              phone: phone,
              base64: imageBase64,
              caption: caption || '',
            }),
          }
        );

        const result = await response.json();
        console.log('W-API send-image response:', result);

        if (!response.ok || result.error) {
          return new Response(JSON.stringify({ error: result.message || 'Failed to send image' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Save message to database
        if (conversationId) {
          await supabase
            .from('wapi_messages')
            .insert({
              conversation_id: conversationId,
              message_id: result.messageId,
              from_me: true,
              message_type: 'image',
              content: caption || '[Imagem]',
              media_url: mediaUrl || null,
              status: 'sent',
              timestamp: new Date().toISOString(),
            });

          await supabase
            .from('wapi_conversations')
            .update({ 
              last_message_at: new Date().toISOString(),
              last_message_content: caption ? `📷 ${caption.substring(0, 90)}` : '📷 Imagem',
              last_message_from_me: true,
            })
            .eq('id', conversationId);
        }

        return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-audio': {
        const { base64: audioBase64, mediaUrl: audioMediaUrl } = body;
        
        let finalAudioBase64 = audioBase64;
        
        // If we received a mediaUrl (from storage), fetch and convert to base64
        if (audioMediaUrl && !audioBase64) {
          try {
            const audioResponse = await fetch(audioMediaUrl);
            const arrayBuffer = await audioResponse.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            finalAudioBase64 = btoa(binary);
          } catch (err) {
            console.error('Error fetching audio from URL:', err);
            return new Response(JSON.stringify({ error: 'Failed to fetch audio' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        const response = await fetch(
          `${WAPI_BASE_URL}/message/send-audio?instanceId=${instance_id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${instance_token}`,
            },
            body: JSON.stringify({
              phone: phone,
              base64: finalAudioBase64,
            }),
          }
        );

        const result = await response.json();
        console.log('W-API send-audio response:', result);

        if (!response.ok || result.error) {
          return new Response(JSON.stringify({ error: result.message || 'Failed to send audio' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Save message to database
        if (conversationId) {
          await supabase
            .from('wapi_messages')
            .insert({
              conversation_id: conversationId,
              message_id: result.messageId,
              from_me: true,
              message_type: 'audio',
              content: '[Áudio]',
              media_url: audioMediaUrl || null,
              status: 'sent',
              timestamp: new Date().toISOString(),
            });

          await supabase
            .from('wapi_conversations')
            .update({ 
              last_message_at: new Date().toISOString(),
              last_message_content: '🎤 Áudio',
              last_message_from_me: true,
            })
            .eq('id', conversationId);
        }

        return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-document': {
        const { base64: docBase64, fileName: docFileName, mediaUrl: docMediaUrl } = body;
        
        let finalDocBase64 = docBase64;
        
        // If we received a mediaUrl (from storage), fetch and convert to base64
        if (docMediaUrl && !docBase64) {
          try {
            const docResponse = await fetch(docMediaUrl);
            const arrayBuffer = await docResponse.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            finalDocBase64 = btoa(binary);
          } catch (err) {
            console.error('Error fetching document from URL:', err);
            return new Response(JSON.stringify({ error: 'Failed to fetch document' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        const response = await fetch(
          `${WAPI_BASE_URL}/message/send-document?instanceId=${instance_id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${instance_token}`,
            },
            body: JSON.stringify({
              phone: phone,
              base64: finalDocBase64,
              fileName: docFileName || 'document',
            }),
          }
        );

        const result = await response.json();
        console.log('W-API send-document response:', result);

        if (!response.ok || result.error) {
          return new Response(JSON.stringify({ error: result.message || 'Failed to send document' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Save message to database
        if (conversationId) {
          await supabase
            .from('wapi_messages')
            .insert({
              conversation_id: conversationId,
              message_id: result.messageId,
              from_me: true,
              message_type: 'document',
              content: docFileName || '[Documento]',
              media_url: docMediaUrl || null,
              status: 'sent',
              timestamp: new Date().toISOString(),
            });

          await supabase
            .from('wapi_conversations')
            .update({ 
              last_message_at: new Date().toISOString(),
              last_message_content: `📄 ${docFileName || 'Documento'}`,
              last_message_from_me: true,
            })
            .eq('id', conversationId);
        }

        return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-status': {
        // Get instance status from W-API
        const response = await fetch(
          `${WAPI_BASE_URL}/instance/info?instanceId=${instance_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${instance_token}`,
            },
          }
        );

        const result = await response.json();
        console.log('W-API instance info:', result);

        // Return the result with parsed status
        const status = result.connected ? 'connected' : 'disconnected';
        
        return new Response(JSON.stringify({ 
          ...result, 
          status,
          phoneNumber: result.phone || null,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-qr': {
        // W-API documented endpoint for QR Code
        const qrEndpoint = `${WAPI_BASE_URL}/instance/qr-code?instanceId=${instance_id}&image=enable`;
        
        console.log(`Fetching QR code from: ${qrEndpoint}`);
        
        try {
          const response = await fetch(qrEndpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${instance_token}`,
            },
          });

          const contentType = response.headers.get('content-type');
          console.log(`Response content-type: ${contentType}, status: ${response.status}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.log(`QR endpoint failed: ${response.status} - ${errorText}`);
            return new Response(JSON.stringify({ 
              error: `W-API retornou erro: ${response.status}`,
              details: errorText
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (contentType?.includes('application/json')) {
            const result = await response.json();
            console.log('W-API QR response:', JSON.stringify(result));
            
            if (result.error) {
              return new Response(JSON.stringify({ 
                error: result.message || 'Erro ao obter QR Code',
                details: result
              }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            
            // The qrcode field contains the data:image/png;base64,... string
            const qrCode = result.qrcode || result.qrCode || result.qr || result.base64;
            
            if (qrCode) {
              return new Response(JSON.stringify({ 
                qrCode: qrCode,
                success: true
              }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            
            return new Response(JSON.stringify({ 
              error: 'QR Code não disponível. A instância pode já estar conectada.',
              details: result
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else if (contentType?.includes('image')) {
            // Response is an image, convert to base64
            const arrayBuffer = await response.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            const mimeType = contentType || 'image/png';
            const qrCode = `data:${mimeType};base64,${base64}`;
            
            return new Response(JSON.stringify({ 
              qrCode: qrCode,
              success: true
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const text = await response.text();
          console.log('Unexpected response format:', text.substring(0, 200));
          
          return new Response(JSON.stringify({ 
            error: 'Formato de resposta inesperado da W-API',
            details: text.substring(0, 200)
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
          
        } catch (err) {
          console.error('Error fetching QR code:', err);
          return new Response(JSON.stringify({ 
            error: 'Erro ao comunicar com W-API',
            details: err instanceof Error ? err.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'configure-webhooks': {
        const webhookUrl = body.webhookUrl;
        
        // Configure webhooks on W-API
        const webhookConfig = {
          onConnect: webhookUrl,
          onDisconnect: webhookUrl,
          onMessageSent: webhookUrl,
          onMessageReceived: webhookUrl,
          onMessageStatus: webhookUrl,
        };

        const response = await fetch(
          `${WAPI_BASE_URL}/instance/webhooks?instanceId=${instance_id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${instance_token}`,
            },
            body: JSON.stringify(webhookConfig),
          }
        );

        const result = await response.json();
        console.log('W-API webhooks config response:', result);

        return new Response(JSON.stringify({ success: !result.error, result }), {
          status: response.ok ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error: unknown) {
    console.error('W-API send error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
