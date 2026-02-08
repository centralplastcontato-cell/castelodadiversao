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
