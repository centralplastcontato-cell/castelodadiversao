import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// Helper to download JSON file
function downloadJSON(data: any, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export Leads to JSON
export async function exportLeadsToJSON(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { data: leads, error } = await supabase
      .from("campaign_leads")
      .select("name, whatsapp, unit, month, day_of_month, guests, status, campaign_id, campaign_name, observacoes, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!leads || leads.length === 0) {
      return { success: false, count: 0, error: "Nenhum lead encontrado" };
    }

    const filename = `leads-export-${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`;
    downloadJSON(leads, filename);

    return { success: true, count: leads.length };
  } catch (error: any) {
    console.error("Error exporting leads:", error);
    return { success: false, count: 0, error: error.message || "Erro ao exportar leads" };
  }
}

// Export WhatsApp Conversations to JSON
export async function exportConversationsToJSON(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { data: conversations, error: convError } = await supabase
      .from("wapi_conversations")
      .select(`
        id,
        instance_id,
        contact_phone,
        contact_name,
        last_message_at,
        last_message_content,
        last_message_from_me,
        unread_count,
        bot_enabled,
        bot_step,
        bot_data,
        is_closed,
        is_favorite,
        is_equipe,
        is_freelancer,
        has_scheduled_visit,
        created_at
      `)
      .order("last_message_at", { ascending: false });

    if (convError) throw convError;

    if (!conversations || conversations.length === 0) {
      return { success: false, count: 0, error: "Nenhuma conversa encontrada" };
    }

    // Get instances to map unit names
    const { data: instances } = await supabase
      .from("wapi_instances")
      .select("id, unit");

    const instanceMap = new Map<string, string>();
    instances?.forEach(inst => {
      instanceMap.set(inst.id, inst.unit || "Desconhecida");
    });

    // Transform data to include unit name instead of instance_id
    const exportData = conversations.map(conv => ({
      unit: instanceMap.get(conv.instance_id) || "Desconhecida",
      contact_phone: conv.contact_phone,
      contact_name: conv.contact_name,
      last_message_at: conv.last_message_at,
      last_message_content: conv.last_message_content,
      last_message_from_me: conv.last_message_from_me,
      unread_count: conv.unread_count,
      bot_enabled: conv.bot_enabled,
      bot_step: conv.bot_step,
      bot_data: conv.bot_data,
      is_closed: conv.is_closed,
      is_favorite: conv.is_favorite,
      is_equipe: conv.is_equipe,
      is_freelancer: conv.is_freelancer,
      has_scheduled_visit: conv.has_scheduled_visit,
      created_at: conv.created_at,
    }));

    const filename = `conversations-export-${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`;
    downloadJSON(exportData, filename);

    return { success: true, count: exportData.length };
  } catch (error: any) {
    console.error("Error exporting conversations:", error);
    return { success: false, count: 0, error: error.message || "Erro ao exportar conversas" };
  }
}

// Export WhatsApp Messages to JSON
export async function exportMessagesToJSON(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Get all messages
    const { data: messages, error: msgError } = await supabase
      .from("wapi_messages")
      .select(`
        id,
        conversation_id,
        message_id,
        from_me,
        message_type,
        content,
        media_url,
        status,
        timestamp
      `)
      .order("timestamp", { ascending: false });

    if (msgError) throw msgError;

    if (!messages || messages.length === 0) {
      return { success: false, count: 0, error: "Nenhuma mensagem encontrada" };
    }

    // Get all conversations to map contact_phone
    const conversationIds = [...new Set(messages.map(m => m.conversation_id))];
    
    // Fetch conversations in batches if needed
    const { data: conversations } = await supabase
      .from("wapi_conversations")
      .select("id, contact_phone")
      .in("id", conversationIds.slice(0, 1000));

    const phoneMap = new Map<string, string>();
    conversations?.forEach(conv => {
      phoneMap.set(conv.id, conv.contact_phone);
    });

    // Transform data to include contact_phone
    const exportData = messages.map(msg => ({
      contact_phone: phoneMap.get(msg.conversation_id) || "Desconhecido",
      message_id: msg.message_id,
      from_me: msg.from_me,
      message_type: msg.message_type,
      content: msg.content,
      media_url: msg.media_url,
      status: msg.status,
      timestamp: msg.timestamp,
    }));

    const filename = `messages-export-${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`;
    downloadJSON(exportData, filename);

    return { success: true, count: exportData.length };
  } catch (error: any) {
    console.error("Error exporting messages:", error);
    return { success: false, count: 0, error: error.message || "Erro ao exportar mensagens" };
  }
}

// Export Sales Materials to JSON
export async function exportSalesMaterialsToJSON(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { data: materials, error } = await supabase
      .from("sales_materials")
      .select("name, type, unit, file_url, file_path, photo_urls, guest_count, sort_order, is_active, created_at")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    if (!materials || materials.length === 0) {
      return { success: false, count: 0, error: "Nenhum material de vendas encontrado" };
    }

    const filename = `sales-materials-export-${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`;
    downloadJSON(materials, filename);

    return { success: true, count: materials.length };
  } catch (error: any) {
    console.error("Error exporting sales materials:", error);
    return { success: false, count: 0, error: error.message || "Erro ao exportar materiais" };
  }
}

// Export Bot Settings to JSON
export async function exportBotSettingsToJSON(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Fetch bot settings with instance info
    const { data: settings, error: settingsError } = await supabase
      .from("wapi_bot_settings")
      .select(`
        instance_id,
        bot_enabled,
        welcome_message,
        completion_message,
        transfer_message,
        qualified_lead_message,
        next_step_question,
        next_step_visit_response,
        next_step_questions_response,
        next_step_analyze_response,
        follow_up_enabled,
        follow_up_message,
        follow_up_delay_hours,
        follow_up_2_enabled,
        follow_up_2_message,
        follow_up_2_delay_hours,
        auto_send_materials,
        auto_send_pdf,
        auto_send_pdf_intro,
        auto_send_photos,
        auto_send_photos_intro,
        auto_send_presentation_video,
        auto_send_promo_video,
        message_delay_seconds
      `);

    if (settingsError) throw settingsError;

    // Fetch bot questions
    const { data: questions, error: questionsError } = await supabase
      .from("wapi_bot_questions")
      .select("instance_id, step, question_text, confirmation_text, sort_order, is_active")
      .order("sort_order", { ascending: true });

    if (questionsError) throw questionsError;

    // Fetch instances to map unit names
    const { data: instances } = await supabase
      .from("wapi_instances")
      .select("id, unit");

    const instanceMap = new Map<string, string>();
    instances?.forEach(inst => {
      instanceMap.set(inst.id, inst.unit || "Desconhecida");
    });

    // Group questions by instance_id
    const questionsByInstance = new Map<string, any[]>();
    questions?.forEach(q => {
      const existing = questionsByInstance.get(q.instance_id) || [];
      existing.push({
        step: q.step,
        question_text: q.question_text,
        confirmation_text: q.confirmation_text,
        sort_order: q.sort_order,
        is_active: q.is_active,
      });
      questionsByInstance.set(q.instance_id, existing);
    });

    // Build export data grouped by unit
    const exportData = settings?.map(s => ({
      unit: instanceMap.get(s.instance_id) || "Desconhecida",
      settings: {
        bot_enabled: s.bot_enabled,
        welcome_message: s.welcome_message,
        completion_message: s.completion_message,
        transfer_message: s.transfer_message,
        qualified_lead_message: s.qualified_lead_message,
        next_step_question: s.next_step_question,
        next_step_visit_response: s.next_step_visit_response,
        next_step_questions_response: s.next_step_questions_response,
        next_step_analyze_response: s.next_step_analyze_response,
        follow_up_enabled: s.follow_up_enabled,
        follow_up_message: s.follow_up_message,
        follow_up_delay_hours: s.follow_up_delay_hours,
        follow_up_2_enabled: s.follow_up_2_enabled,
        follow_up_2_message: s.follow_up_2_message,
        follow_up_2_delay_hours: s.follow_up_2_delay_hours,
        auto_send_materials: s.auto_send_materials,
        auto_send_pdf: s.auto_send_pdf,
        auto_send_pdf_intro: s.auto_send_pdf_intro,
        auto_send_photos: s.auto_send_photos,
        auto_send_photos_intro: s.auto_send_photos_intro,
        auto_send_presentation_video: s.auto_send_presentation_video,
        auto_send_promo_video: s.auto_send_promo_video,
        message_delay_seconds: s.message_delay_seconds,
      },
      questions: questionsByInstance.get(s.instance_id) || [],
    })) || [];

    if (exportData.length === 0) {
      return { success: false, count: 0, error: "Nenhuma configuração de bot encontrada" };
    }

    const filename = `bot-settings-export-${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`;
    downloadJSON(exportData, filename);

    return { success: true, count: exportData.length };
  } catch (error: any) {
    console.error("Error exporting bot settings:", error);
    return { success: false, count: 0, error: error.message || "Erro ao exportar configurações" };
  }
}
