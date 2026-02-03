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
    const { action, phone, message, conversationId } = body;

    // Get user's W-API instance
    const { data: instance, error: instanceError } = await supabase
      .from('wapi_instances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (instanceError || !instance) {
      return new Response(JSON.stringify({ error: 'No W-API instance configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'send-text': {
        // Send text message via W-API
        const response = await fetch(
          `${WAPI_BASE_URL}/message/send-text?instanceId=${instance.instance_id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${instance.instance_token}`,
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
            .update({ last_message_at: new Date().toISOString() })
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
          `${WAPI_BASE_URL}/instance/info?instanceId=${instance.instance_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${instance.instance_token}`,
            },
          }
        );

        const result = await response.json();
        console.log('W-API instance info:', result);

        // Update local status
        if (result.connected !== undefined) {
          await supabase
            .from('wapi_instances')
            .update({
              status: result.connected ? 'connected' : 'disconnected',
              phone_number: result.phone || instance.phone_number,
              messages_count: result.messagesThisMonth || instance.messages_count,
              credits_available: result.credits || instance.credits_available,
            })
            .eq('id', instance.id);
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
          `${WAPI_BASE_URL}/instance/webhooks?instanceId=${instance.instance_id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${instance.instance_token}`,
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
