import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WAPI_BASE_URL = 'https://api.w-api.app/v1';

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
    }

    switch (action) {
      case 'send-text': {
        const textEncoder = new TextEncoder();
        const encodedMessage = textEncoder.encode(message);
        const decodedMessage = new TextDecoder('utf-8').decode(encodedMessage);
        
        const response = await fetch(
          `${WAPI_BASE_URL}/message/send-text?instanceId=${instance_id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Authorization': `Bearer ${instance_token}`,
            },
            body: JSON.stringify({
              phone: phone,
              message: decodedMessage,
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
        const { base64, caption, mediaUrl } = body;
        
        let imageBase64 = base64;
        
        // Validate that we have image data
        if (!base64 && !mediaUrl) {
          console.error('send-image: No base64 or mediaUrl provided');
          return new Response(JSON.stringify({ error: 'Imagem é obrigatória. Forneça base64 ou mediaUrl.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // If base64 is provided directly (fast path - frontend already converted)
        if (base64) {
          imageBase64 = base64;
          // Ensure it has data URI prefix
          if (!imageBase64.startsWith('data:')) {
            imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
          }
          console.log('Using provided base64, length:', imageBase64.length);
        } else if (mediaUrl) {
          // Fallback: fetch from URL (slower path)
          try {
            console.log('Fetching image from URL:', mediaUrl);
            const imageResponse = await fetch(mediaUrl);
            
            if (!imageResponse.ok) {
              console.error('Failed to fetch image, status:', imageResponse.status);
              return new Response(JSON.stringify({ error: 'Falha ao baixar imagem da URL' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
            const arrayBuffer = await imageResponse.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            
            if (bytes.length === 0) {
              console.error('Image fetch returned empty data');
              return new Response(JSON.stringify({ error: 'Imagem vazia ou inválida' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const rawBase64 = btoa(binary);
            imageBase64 = `data:${contentType};base64,${rawBase64}`;
            console.log('Image converted to data URI, total length:', imageBase64.length);
          } catch (err) {
            console.error('Error fetching image from URL:', err);
            return new Response(JSON.stringify({ error: 'Falha ao processar imagem: ' + (err instanceof Error ? err.message : String(err)) }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
        
        // Final validation
        if (!imageBase64) {
          console.error('send-image: imageBase64 is empty after processing');
          return new Response(JSON.stringify({ error: 'Dados da imagem não puderam ser processados' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Sending image to W-API, phone:', phone, 'data URI length:', imageBase64.length);
        
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
              image: imageBase64,
              caption: caption || '',
            }),
          }
        );

        // Handle non-JSON responses (HTML error pages)
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('text/html')) {
          const htmlText = await response.text();
          console.error('W-API send-image returned HTML:', htmlText.substring(0, 200));
          return new Response(JSON.stringify({ 
            error: 'Instância W-API indisponível. Verifique se a instância está ativa e os créditos disponíveis.' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let result;
        try {
          result = await response.json();
        } catch (parseErr) {
          console.error('Failed to parse W-API response:', parseErr);
          return new Response(JSON.stringify({ error: 'Resposta inválida da W-API' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        console.log('W-API send-image response:', result);

        if (!response.ok || result.error) {
          console.error('W-API send-image failed:', result);
          return new Response(JSON.stringify({ error: result.message || 'Falha ao enviar imagem' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

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

        // Handle non-JSON responses (HTML error pages)
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('text/html')) {
          const htmlText = await response.text();
          console.error('W-API send-audio returned HTML:', htmlText.substring(0, 200));
          return new Response(JSON.stringify({ 
            error: 'Instância W-API indisponível. Verifique se a instância está ativa e os créditos disponíveis.' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let result;
        try {
          result = await response.json();
        } catch (parseErr) {
          console.error('Failed to parse W-API send-audio response:', parseErr);
          return new Response(JSON.stringify({ error: 'Resposta inválida da W-API' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        console.log('W-API send-audio response:', result);

        if (!response.ok || result.error) {
          return new Response(JSON.stringify({ error: result.message || 'Failed to send audio' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

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
        const { fileName: docFileName, mediaUrl: docMediaUrl } = body;
        
        // W-API requires a URL for documents, not base64
        if (!docMediaUrl) {
          console.error('send-document: No mediaUrl provided');
          return new Response(JSON.stringify({ error: 'URL do documento é obrigatória.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Extract file extension from fileName or URL
        let fileExtension = '';
        if (docFileName) {
          const parts = docFileName.split('.');
          if (parts.length > 1) {
            fileExtension = parts[parts.length - 1].toLowerCase();
          }
        }
        
        // Fallback: try to extract from URL if no extension found
        if (!fileExtension && docMediaUrl) {
          const urlParts = docMediaUrl.split('.');
          if (urlParts.length > 1) {
            const lastPart = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
            if (lastPart.length <= 5) { // Reasonable extension length
              fileExtension = lastPart.toLowerCase();
            }
          }
        }

        console.log('Sending document to W-API, phone:', phone, 'url:', docMediaUrl, 'fileName:', docFileName, 'extension:', fileExtension);

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
              document: docMediaUrl,
              fileName: docFileName || 'document',
              extension: fileExtension || 'pdf', // W-API requires extension field
            }),
          }
        );

        // Handle non-JSON responses (HTML error pages)
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('text/html')) {
          const htmlText = await response.text();
          console.error('W-API send-document returned HTML:', htmlText.substring(0, 200));
          return new Response(JSON.stringify({ 
            error: 'Instância W-API indisponível. Verifique se a instância está ativa e os créditos disponíveis.' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let result;
        try {
          result = await response.json();
        } catch (parseErr) {
          console.error('Failed to parse W-API response:', parseErr);
          return new Response(JSON.stringify({ error: 'Resposta inválida da W-API' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        console.log('W-API send-document response:', result);

        if (!response.ok || result.error) {
          return new Response(JSON.stringify({ error: result.message || 'Failed to send document' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (conversationId) {
          await supabase
            .from('wapi_messages')
            .insert({
              conversation_id: conversationId,
              message_id: result.messageId,
              from_me: true,
              message_type: 'document',
              content: docFileName || '[Documento]',
              media_url: docMediaUrl,
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
        try {
          // W-API uses the qr-code endpoint to check connection status
          // When connected, it returns { connected: true, phone: "..." }
          // When disconnected, it returns QR code data
          console.log(`Checking status for instance: ${instance_id}`);
          
          const response = await fetch(
            `${WAPI_BASE_URL}/instance/qr-code?instanceId=${instance_id}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${instance_token}`,
              },
            }
          );

          const contentType = response.headers.get('content-type');
          console.log(`Get-status qr-code response: status=${response.status}, content-type=${contentType}`);

          if (contentType?.includes('text/html')) {
            const htmlText = await response.text();
            console.error('W-API returned HTML instead of JSON:', htmlText.substring(0, 200));
            
            return new Response(JSON.stringify({ 
              error: 'Instância W-API indisponível. Verifique se a instância está ativa e os créditos disponíveis no painel w-api.app',
              status: 'disconnected',
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error('W-API get-status failed:', response.status, errorText);
            
            // Return disconnected status instead of error
            return new Response(JSON.stringify({ 
              status: 'disconnected',
              error: `W-API retornou erro: ${response.status}`,
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const result = await response.json();
          console.log('W-API qr-code response for status:', JSON.stringify(result));

          // W-API qr-code endpoint returns:
          // - { connected: true, phone: "5511999999999" } when connected
          // - { qrcode: "...", base64: "..." } when disconnected and waiting for scan
          let status = 'disconnected';
          let phoneNumber = null;
          
          if (result.connected === true) {
            status = 'connected';
            phoneNumber = result.phone || result.phoneNumber || null;
          } else if (result.qrcode || result.base64 || result.qr) {
            // Has QR code means waiting for connection
            status = 'disconnected';
          }
          
          return new Response(JSON.stringify({ 
            status,
            phoneNumber,
            connected: result.connected === true,
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (err) {
          console.error('Error getting status:', err);
          return new Response(JSON.stringify({ 
            error: 'Erro ao comunicar com W-API.',
            status: 'disconnected',
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'get-qr': {
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
            
            // Check if instance is already connected
            if (result.connected === true) {
              return new Response(JSON.stringify({ 
                connected: true,
                message: 'Instância já está conectada',
                success: true
              }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            
            if (result.error) {
              return new Response(JSON.stringify({ 
                error: result.message || 'Erro ao obter QR Code',
                details: result
              }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            
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

      case 'request-pairing-code': {
        const { phoneNumber } = body;
        
        if (!phoneNumber) {
          return new Response(JSON.stringify({ 
            error: 'Número de telefone é obrigatório',
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Clean phone - must include country code (55 for Brazil)
        let cleanPhone = phoneNumber.replace(/\D/g, '');
        
        // Add Brazil country code if not present
        if (!cleanPhone.startsWith('55')) {
          cleanPhone = '55' + cleanPhone;
        }
        
        console.log(`Requesting pairing code for phone: ${cleanPhone}, instance: ${instance_id}`);
        
        try {
          // W-API expects phoneNumber as query parameter
          const response = await fetch(
            `${WAPI_BASE_URL}/instance/pairing-code?instanceId=${instance_id}&phoneNumber=${cleanPhone}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${instance_token}`,
              },
            }
          );

          const contentType = response.headers.get('content-type');
          console.log(`Pairing code response: status=${response.status}, content-type=${contentType}`);

          if (contentType?.includes('text/html')) {
            const htmlText = await response.text();
            console.error('W-API returned HTML instead of JSON:', htmlText.substring(0, 200));
            return new Response(JSON.stringify({ 
              error: 'Serviço W-API indisponível. Tente novamente em alguns minutos.',
            }), {
              status: 503,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error('W-API pairing-code failed:', response.status, errorText);
            
            try {
              const errorJson = JSON.parse(errorText);
              return new Response(JSON.stringify({ 
                error: errorJson.message || `Erro ao solicitar código: ${response.status}`,
                details: errorJson
              }), {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            } catch {
              return new Response(JSON.stringify({ 
                error: `Erro ao solicitar código de pareamento: ${response.status}`,
                details: errorText
              }), {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }

          const result = await response.json();
          console.log('W-API pairing code response:', JSON.stringify(result));

          const pairingCode = result.pairingCode || result.code || result.pairing_code;
          
          if (pairingCode) {
            return new Response(JSON.stringify({ 
              success: true,
              pairingCode: pairingCode,
              message: 'Código de pareamento gerado.',
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          if (result.connected) {
            return new Response(JSON.stringify({ 
              error: 'Esta instância já está conectada.',
              connected: true
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({ 
            error: 'Não foi possível gerar o código de pareamento.',
            details: result
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
          
        } catch (err) {
          console.error('Error requesting pairing code:', err);
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

      case 'download-media': {
        const { messageId: downloadMsgId } = body;
        
        if (!downloadMsgId) {
          return new Response(JSON.stringify({ error: 'messageId é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Downloading media for message: ${downloadMsgId}`);
        
        try {
          // First, get media_key, media_direct_path and message_type from database
          const { data: msgData } = await supabase
            .from('wapi_messages')
            .select('media_key, media_direct_path, media_url, message_type')
            .eq('message_id', downloadMsgId)
            .single();
          
          const mediaKey = msgData?.media_key;
          const directPath = msgData?.media_direct_path;
          const originalUrl = msgData?.media_url;
          const messageType = msgData?.message_type || 'image';
          
          console.log(`Message lookup - hasMediaKey: ${!!mediaKey}, hasDirectPath: ${!!directPath}, type: ${messageType}`);
          
          // Build request body - W-API requires type, mediaKey AND directPath for download
          const requestBody: Record<string, unknown> = {
            messageId: downloadMsgId,
            type: messageType, // Required by W-API: image, audio, video, document
          };
          
          // W-API download-media requires type, mediaKey, and directPath
          if (mediaKey && directPath) {
            requestBody.mediaKey = mediaKey;
            requestBody.directPath = directPath;
            if (originalUrl && !originalUrl.includes('supabase.co')) {
              requestBody.url = originalUrl;
            }
          } else if (mediaKey) {
            // Try with just messageId, type and mediaKey (may fail if W-API requires directPath)
            requestBody.mediaKey = mediaKey;
          }
          // If neither mediaKey nor directPath, just use messageId and type (W-API may find it in recent cache)
          
          console.log('W-API download request:', JSON.stringify(requestBody));
          
          const downloadResponse = await fetch(
            `${WAPI_BASE_URL}/message/download-media?instanceId=${instance_id}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instance_token}`,
              },
              body: JSON.stringify(requestBody),
            }
          );

          if (!downloadResponse.ok) {
            const errorText = await downloadResponse.text();
            console.error(`W-API download failed: ${downloadResponse.status} - ${errorText}`);
            return new Response(JSON.stringify({ 
              error: 'Falha ao baixar mídia da W-API',
              details: errorText.substring(0, 200),
              hint: mediaKey ? 'Tente novamente mais tarde' : 'MediaKey não disponível - mídia pode ter expirado',
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const result = await downloadResponse.json();
          const base64Data = result.base64 || result.data || result.media;
          const mimeType = result.mimetype || result.mimeType || 'application/octet-stream';
          
          if (!base64Data) {
            return new Response(JSON.stringify({ 
              error: 'Nenhum dado de mídia recebido',
              responseKeys: Object.keys(result),
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // Generate filename and store
          const extensionMap: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'audio/ogg': 'ogg',
            'audio/mpeg': 'mp3',
            'video/mp4': 'mp4',
            'application/pdf': 'pdf',
          };
          const extension = extensionMap[mimeType] || 'bin';
          const storagePath = `received/downloads/${downloadMsgId}.${extension}`;
          
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
            return new Response(JSON.stringify({ 
              error: 'Falha ao salvar mídia no storage',
              details: uploadError.message,
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // Get public URL
          const { data: publicUrl } = supabase.storage
            .from('whatsapp-media')
            .getPublicUrl(storagePath);
          
          // Clear media_key and media_direct_path from database since we successfully downloaded
          await supabase
            .from('wapi_messages')
            .update({ 
              media_key: null, 
              media_direct_path: null,
              media_url: publicUrl.publicUrl 
            })
            .eq('message_id', downloadMsgId);
          
          return new Response(JSON.stringify({ 
            success: true,
            url: publicUrl.publicUrl,
            mimeType,
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (err) {
          console.error('Error downloading media:', err);
          return new Response(JSON.stringify({ 
            error: 'Erro ao baixar mídia',
            details: err instanceof Error ? err.message : String(err),
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
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
