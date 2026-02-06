import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FollowUpSettings {
  follow_up_enabled: boolean;
  follow_up_delay_hours: number;
  follow_up_message: string | null;
  instance_id: string;
}

interface LeadForFollowUp {
  lead_id: string;
  lead_name: string;
  lead_whatsapp: string;
  lead_unit: string | null;
  lead_month: string | null;
  lead_guests: string | null;
  choice_time: string;
  conversation_id: string | null;
  instance_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[follow-up-check] Starting follow-up check...");

    // Fetch all bot settings with follow-up enabled
    const { data: allSettings, error: settingsError } = await supabase
      .from("wapi_bot_settings")
      .select("instance_id, follow_up_enabled, follow_up_delay_hours, follow_up_message")
      .eq("follow_up_enabled", true);

    if (settingsError) {
      console.error("[follow-up-check] Error fetching settings:", settingsError);
      throw settingsError;
    }

    if (!allSettings || allSettings.length === 0) {
      console.log("[follow-up-check] Follow-up is disabled for all instances");
      return new Response(
        JSON.stringify({ success: true, message: "Follow-up disabled", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSuccessCount = 0;
    const allErrors: string[] = [];

    // Process each instance with follow-up enabled
    for (const settings of allSettings) {
      const followUpDelayHours = settings.follow_up_delay_hours || 24;
      const followUpMessage = settings.follow_up_message || getDefaultFollowUpMessage();

      const now = new Date();
      const minTime = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago (max window)
      const maxTime = new Date(now.getTime() - followUpDelayHours * 60 * 60 * 1000); // configured delay

      console.log(`[follow-up-check] Processing instance ${settings.instance_id} with ${followUpDelayHours}h delay`);

      // Get leads that chose "Analisar" within the time window
      const { data: analysisChoices, error: choicesError } = await supabase
        .from("lead_history")
        .select("lead_id, created_at")
        .eq("action", "Próximo passo escolhido")
        .or("new_value.ilike.%Analisar%,new_value.eq.3")
        .gte("created_at", minTime.toISOString())
        .lte("created_at", maxTime.toISOString());

      if (choicesError) {
        console.error("[follow-up-check] Error fetching analysis choices:", choicesError);
        continue;
      }

      if (!analysisChoices || analysisChoices.length === 0) {
        console.log(`[follow-up-check] No leads need follow-up for instance ${settings.instance_id}`);
        continue;
      }

      const leadIds = analysisChoices.map(c => c.lead_id);
      console.log(`[follow-up-check] Found ${leadIds.length} potential leads for follow-up`);

      // Check which leads already received follow-up
      const { data: existingFollowUps, error: followUpError } = await supabase
        .from("lead_history")
        .select("lead_id")
        .in("lead_id", leadIds)
        .eq("action", "Follow-up automático enviado");

      if (followUpError) {
        console.error("[follow-up-check] Error checking existing follow-ups:", followUpError);
        continue;
      }

      const alreadyFollowedUp = new Set((existingFollowUps || []).map(f => f.lead_id));
      const leadsNeedingFollowUp = leadIds.filter(id => !alreadyFollowedUp.has(id));

      if (leadsNeedingFollowUp.length === 0) {
        console.log("[follow-up-check] All potential leads already received follow-up");
        continue;
      }

      console.log(`[follow-up-check] ${leadsNeedingFollowUp.length} leads need follow-up`);

      // Get lead details and conversation info
      const { data: leads, error: leadsError } = await supabase
        .from("campaign_leads")
        .select("id, name, whatsapp, unit, month, guests")
        .in("id", leadsNeedingFollowUp)
        .eq("status", "aguardando_resposta");

      if (leadsError) {
        console.error("[follow-up-check] Error fetching leads:", leadsError);
        continue;
      }

      if (!leads || leads.length === 0) {
        console.log("[follow-up-check] No leads in aguardando_resposta status need follow-up");
        continue;
      }

      for (const lead of leads) {
        try {
          console.log(`[follow-up-check] Processing lead: ${lead.name} (${lead.id})`);

          // Find the conversation for this lead that belongs to this instance
          const { data: conversation } = await supabase
            .from("wapi_conversations")
            .select("id, instance_id, remote_jid")
            .eq("lead_id", lead.id)
            .eq("instance_id", settings.instance_id)
            .single();

          if (!conversation) {
            console.log(`[follow-up-check] No conversation found for lead ${lead.id} in instance ${settings.instance_id}`);
            continue;
          }

          // Get instance credentials
          const { data: instance } = await supabase
            .from("wapi_instances")
            .select("instance_id, instance_token")
            .eq("id", conversation.instance_id)
            .single();

          if (!instance) {
            console.log(`[follow-up-check] No instance found for conversation ${conversation.id}`);
            continue;
          }

          // Compose follow-up message with variable replacements
          const firstName = lead.name.split(" ")[0];
          const personalizedMessage = followUpMessage
            .replace(/\{nome\}/g, firstName)
            .replace(/\{unidade\}/g, lead.unit || "nossa unidade")
            .replace(/\{mes\}/g, lead.month || "")
            .replace(/\{convidados\}/g, lead.guests || "");

          // Send the message via W-API
          const wapiResponse = await fetch(
            `https://api.w-api.app/v1/message/send-text?instanceId=${instance.instance_id}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${instance.instance_token}`,
              },
              body: JSON.stringify({
                phone: conversation.remote_jid.replace("@s.whatsapp.net", ""),
                message: personalizedMessage,
              }),
            }
          );

          if (!wapiResponse.ok) {
            const errorText = await wapiResponse.text();
            console.error(`[follow-up-check] Failed to send message to ${lead.name}:`, errorText);
            allErrors.push(`Failed to send to ${lead.name}: ${errorText}`);
            continue;
          }

          console.log(`[follow-up-check] Message sent successfully to ${lead.name}`);

          // Save the message to the database
          await supabase.from("wapi_messages").insert({
            conversation_id: conversation.id,
            content: personalizedMessage,
            from_me: true,
            message_type: "text",
            status: "sent",
            timestamp: new Date().toISOString(),
          });

          // Update conversation last message
          await supabase
            .from("wapi_conversations")
            .update({
              last_message_at: new Date().toISOString(),
              last_message_content: personalizedMessage.substring(0, 100),
              last_message_from_me: true,
            })
            .eq("id", conversation.id);

          // Record follow-up in history
          await supabase.from("lead_history").insert({
            lead_id: lead.id,
            action: "Follow-up automático enviado",
            new_value: `Mensagem de acompanhamento após ${followUpDelayHours}h`,
          });

          // Create notification for the team
          const { data: usersToNotify } = await supabase
            .from("user_permissions")
            .select("user_id")
            .or(`permission.eq.leads.unit.all,permission.eq.leads.unit.${(lead.unit || "all").toLowerCase()}`)
            .eq("granted", true);

          if (usersToNotify && usersToNotify.length > 0) {
            const notifications = usersToNotify.map((u) => ({
              user_id: u.user_id,
              type: "follow_up_sent",
              title: `📬 Follow-up enviado: ${lead.name}`,
              message: `Mensagem de acompanhamento automático enviada para ${firstName}`,
              data: { lead_id: lead.id, lead_name: lead.name },
            }));

            await supabase.from("notifications").insert(notifications);
          }

          totalSuccessCount++;
        } catch (leadError) {
          console.error(`[follow-up-check] Error processing lead ${lead.id}:`, leadError);
          allErrors.push(`Error with ${lead.name}: ${String(leadError)}`);
        }
      }
    }

    console.log(`[follow-up-check] Completed. Sent ${totalSuccessCount} follow-ups, ${allErrors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${totalSuccessCount} follow-up messages`,
        count: totalSuccessCount,
        errors: allErrors.length > 0 ? allErrors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[follow-up-check] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function getDefaultFollowUpMessage(): string {
  return `Olá, {nome}! 👋

Passando para saber se teve a chance de analisar as informações que enviamos sobre o Castelo da Diversão! 🏰

Estamos à disposição para esclarecer qualquer dúvida ou agendar uma visita para conhecer pessoalmente nossos espaços. 

Podemos te ajudar? 😊`;
}
