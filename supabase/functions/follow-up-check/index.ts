import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Follow-up delay in hours (default 24h, can be configured)
const FOLLOW_UP_DELAY_HOURS = 24;

interface LeadForFollowUp {
  lead_id: string;
  lead_name: string;
  lead_whatsapp: string;
  lead_unit: string | null;
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

    // Find leads who chose "Analisar com calma" (option 3) and need follow-up
    // They should have:
    // 1. History entry with action "Próximo passo escolhido" and new_value containing "Analisar" or "3"
    // 2. No follow-up sent yet (no history with action "Follow-up automático enviado")
    // 3. Choice was made between 24-72 hours ago (window to catch them)
    
    const now = new Date();
    const minTime = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago
    const maxTime = new Date(now.getTime() - FOLLOW_UP_DELAY_HOURS * 60 * 60 * 1000); // 24 hours ago

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
      throw choicesError;
    }

    if (!analysisChoices || analysisChoices.length === 0) {
      console.log("[follow-up-check] No leads need follow-up at this time");
      return new Response(
        JSON.stringify({ success: true, message: "No leads need follow-up", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      throw followUpError;
    }

    const alreadyFollowedUp = new Set((existingFollowUps || []).map(f => f.lead_id));
    const leadsNeedingFollowUp = leadIds.filter(id => !alreadyFollowedUp.has(id));

    if (leadsNeedingFollowUp.length === 0) {
      console.log("[follow-up-check] All potential leads already received follow-up");
      return new Response(
        JSON.stringify({ success: true, message: "All leads already followed up", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[follow-up-check] ${leadsNeedingFollowUp.length} leads need follow-up`);

    // Get lead details and conversation info
    const { data: leads, error: leadsError } = await supabase
      .from("campaign_leads")
      .select("id, name, whatsapp, unit")
      .in("id", leadsNeedingFollowUp)
      .eq("status", "aguardando_resposta"); // Only follow up if still in this status

    if (leadsError) {
      console.error("[follow-up-check] Error fetching leads:", leadsError);
      throw leadsError;
    }

    if (!leads || leads.length === 0) {
      console.log("[follow-up-check] No leads in aguardando_resposta status need follow-up");
      return new Response(
        JSON.stringify({ success: true, message: "No eligible leads", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      try {
        console.log(`[follow-up-check] Processing lead: ${lead.name} (${lead.id})`);

        // Find the conversation for this lead
        const { data: conversation } = await supabase
          .from("wapi_conversations")
          .select("id, instance_id, remote_jid")
          .eq("lead_id", lead.id)
          .single();

        if (!conversation) {
          console.log(`[follow-up-check] No conversation found for lead ${lead.id}`);
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

        // Compose follow-up message
        const firstName = lead.name.split(" ")[0];
        const followUpMessage = `Olá, ${firstName}! 👋

Passando para saber se teve a chance de analisar as informações que enviamos sobre o Castelo da Diversão! 🏰

Estamos à disposição para esclarecer qualquer dúvida ou agendar uma visita para conhecer pessoalmente nossos espaços. 

Podemos te ajudar? 😊`;

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
              message: followUpMessage,
            }),
          }
        );

        if (!wapiResponse.ok) {
          const errorText = await wapiResponse.text();
          console.error(`[follow-up-check] Failed to send message to ${lead.name}:`, errorText);
          errors.push(`Failed to send to ${lead.name}: ${errorText}`);
          continue;
        }

        console.log(`[follow-up-check] Message sent successfully to ${lead.name}`);

        // Save the message to the database
        await supabase.from("wapi_messages").insert({
          conversation_id: conversation.id,
          content: followUpMessage,
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
            last_message_content: followUpMessage.substring(0, 100),
            last_message_from_me: true,
          })
          .eq("id", conversation.id);

        // Record follow-up in history
        await supabase.from("lead_history").insert({
          lead_id: lead.id,
          action: "Follow-up automático enviado",
          new_value: "Mensagem de acompanhamento após 24h",
        });

        // Create notification for the team
        const { data: usersToNotify } = await supabase
          .from("user_permissions")
          .select("user_id")
          .or(`permission.eq.leads.unit.all,permission.eq.leads.unit.${lead.unit || "all"}`)
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

        successCount++;
      } catch (leadError) {
        console.error(`[follow-up-check] Error processing lead ${lead.id}:`, leadError);
        errors.push(`Error with ${lead.name}: ${String(leadError)}`);
      }
    }

    console.log(`[follow-up-check] Completed. Sent ${successCount} follow-ups, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} follow-up messages`,
        count: successCount,
        errors: errors.length > 0 ? errors : undefined,
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
