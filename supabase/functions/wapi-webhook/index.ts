import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WAPI_BASE_URL = 'https://api.w-api.app/v1';

// Default questions fallback (used if no custom questions in DB)
const DEFAULT_QUESTIONS: Record<string, { question: string; confirmation: string | null; next: string }> = {
  nome: { question: 'Para começar, me conta: qual é o seu nome? 👑', confirmation: 'Muito prazer, {nome}! 👑✨', next: 'mes' },
  mes: { question: 'Que legal! 🎉 E pra qual mês você tá pensando em fazer essa festa incrível?\n\n📅 Ex: Fevereiro, Março, Abril...', confirmation: '{mes}, ótima escolha! 🎊', next: 'dia' },
  dia: { question: 'Maravilha! Tem preferência de dia da semana? 🗓️\n\n• Segunda a Quinta\n• Sexta\n• Sábado\n• Domingo', confirmation: 'Anotado!', next: 'convidados' },
  convidados: { question: 'E quantos convidados você pretende chamar pra essa festa mágica? 🎈\n\n👥 Ex: 50, 70, 100 pessoas...', confirmation: null, next: 'complete' },
};

const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

async function isVipNumber(supabase: SupabaseClient, instanceId: string, phone: string): Promise<boolean> {
  const n = normalizePhone(phone);
  const { data } = await supabase.from('wapi_vip_numbers').select('id').eq('instance_id', instanceId)
    .or(`phone.ilike.%${n}%,phone.ilike.%${n.replace(/^55/, '')}%`).limit(1);
  return Boolean(data?.length);
}

async function getBotSettings(supabase: SupabaseClient, instanceId: string) {
  const { data } = await supabase.from('wapi_bot_settings').select('*').eq('instance_id', instanceId).single();
  return data;
}

async function getBotQuestions(supabase: SupabaseClient, instanceId: string): Promise<Record<string, { question: string; confirmation: string | null; next: string }>> {
  const { data } = await supabase.from('wapi_bot_questions')
    .select('step, question_text, confirmation_text, sort_order')
    .eq('instance_id', instanceId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!data || data.length === 0) {
    return DEFAULT_QUESTIONS;
  }

  // Build question chain based on sort order
  const questions: Record<string, { question: string; confirmation: string | null; next: string }> = {};
  for (let i = 0; i < data.length; i++) {
    const q = data[i];
    const nextStep = i < data.length - 1 ? data[i + 1].step : 'complete';
    questions[q.step] = {
      question: q.question_text,
      confirmation: q.confirmation_text || null,
      next: nextStep,
    };
  }
  return questions;
}

function replaceVariables(text: string, data: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
  }
  return result;
}

async function sendBotMessage(instanceId: string, instanceToken: string, remoteJid: string, message: string): Promise<string | null> {
  try {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    const res = await fetch(`${WAPI_BASE_URL}/message/send-text?instanceId=${instanceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instanceToken}` },
      body: JSON.stringify({ phone, message, delayTyping: 1 }),
    });
    if (!res.ok) return null;
    const r = await res.json();
    return r.messageId || r.id || null;
  } catch { return null; }
}

async function processBotQualification(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null },
  conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: Record<string, unknown> | null; lead_id: string | null },
  content: string, contactPhone: string, contactName: string | null
) {
  const settings = await getBotSettings(supabase, instance.id);
  if (!settings) return;

  const n = normalizePhone(contactPhone);
  const tn = settings.test_mode_number ? normalizePhone(settings.test_mode_number) : null;
  const isTest = tn && n.includes(tn.replace(/^55/, ''));
  
  // Bot runs if: test mode enabled AND is test number, OR global bot enabled (and not test mode only)
  const shouldRun = conv.bot_enabled !== false && (
    (settings.test_mode_enabled && isTest) || 
    (settings.bot_enabled && !settings.test_mode_enabled)
  );
  
  if (!shouldRun) return;
  if (await isVipNumber(supabase, instance.id, contactPhone)) return;
  
  // Check if lead already exists and has complete data - skip bot
  if (conv.lead_id) {
    const { data: existingLead } = await supabase.from('campaign_leads')
      .select('name, month, day_preference, guests')
      .eq('id', conv.lead_id)
      .single();
    
    // If lead already has all qualification data, skip bot
    if (existingLead?.name && existingLead?.month && existingLead?.day_preference && existingLead?.guests) {
      console.log(`[Bot] Lead ${conv.lead_id} already qualified, skipping bot`);
      return;
    }
  }

  // Get questions from database
  const questions = await getBotQuestions(supabase, instance.id);
  const questionSteps = Object.keys(questions);
  const firstStep = questionSteps[0] || 'nome';

  const step = conv.bot_step || 'welcome';
  const botData = (conv.bot_data || {}) as Record<string, string>;
  let nextStep: string, msg: string;
  const updated = { ...botData };

  if (step === 'welcome') {
    // Send welcome + first question
    const firstQ = questions[firstStep];
    msg = settings.welcome_message + '\n\n' + (firstQ?.question || DEFAULT_QUESTIONS.nome.question);
    nextStep = firstStep;
  } else if (questions[step]) {
    // Save the answer
    updated[step] = content.trim();
    
    const currentQ = questions[step];
    const nextStepKey = currentQ.next;
    
    if (nextStepKey === 'complete') {
      // All questions answered - create or update lead
      nextStep = 'complete';
      
      if (conv.lead_id) {
        // Update existing lead
        await supabase.from('campaign_leads').update({
          name: updated.nome || contactName || contactPhone,
          month: updated.mes || null,
          day_preference: updated.dia || null,
          guests: updated.convidados || null,
        }).eq('id', conv.lead_id);
        
        msg = `Perfeito, ${updated.nome}! 🏰✨\n\nAnotei tudo aqui:\n\n📅 Mês: ${updated.mes}\n🗓️ Dia: ${updated.dia}\n👥 Convidados: ${updated.convidados}\n\nNossa equipe vai entrar em contato em breve! 👑🎉`;
      } else {
        // Create new lead
        const { data: newLead, error } = await supabase.from('campaign_leads').insert({
          name: updated.nome || contactName || contactPhone,
          whatsapp: n,
          unit: instance.unit,
          campaign_id: 'whatsapp-bot',
          campaign_name: 'WhatsApp Bot',
          status: 'novo',
          month: updated.mes || null,
          day_preference: updated.dia || null,
          guests: updated.convidados || null,
        }).select('id').single();
        
        if (error) {
          msg = 'Muito obrigado pelas informações! 🏰\n\nEm breve nossa equipe vai entrar em contato!';
        } else {
          await supabase.from('wapi_conversations').update({ lead_id: newLead.id }).eq('id', conv.id);
          msg = `Perfeito, ${updated.nome}! 🏰✨\n\nAnotei tudo aqui:\n\n📅 Mês: ${updated.mes}\n🗓️ Dia: ${updated.dia}\n👥 Convidados: ${updated.convidados}\n\nNossa equipe vai entrar em contato em breve! 👑🎉`;
        }
      }
    } else {
      // More questions to ask
      nextStep = nextStepKey;
      const nextQ = questions[nextStepKey];
      
      // Build response: confirmation (if any) + next question
      let confirmation = currentQ.confirmation || '';
      if (confirmation) {
        confirmation = replaceVariables(confirmation, updated);
      }
      
      msg = confirmation ? `${confirmation}\n\n${nextQ?.question || ''}` : (nextQ?.question || '');
    }
  } else {
    // Unknown step, reset
    return;
  }

  const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
  if (msgId) {
    await supabase.from('wapi_messages').insert({
      conversation_id: conv.id,
      message_id: msgId,
      from_me: true,
      message_type: 'text',
      content: msg,
      status: 'sent',
      timestamp: new Date().toISOString()
    });
  }
  
  await supabase.from('wapi_conversations').update({
    bot_step: nextStep,
    bot_data: updated,
    last_message_at: new Date().toISOString(),
    last_message_content: msg.substring(0, 100),
    last_message_from_me: true
  }).eq('id', conv.id);
}

function isPdfContent(bytes: Uint8Array): boolean { return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; }

function getExt(mime: string, fn?: string): string {
  if (fn) { const p = fn.split('.'); if (p.length > 1) return p[p.length - 1].toLowerCase(); }
  const m: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'video/mp4': 'mp4', 'application/pdf': 'pdf' };
  return m[mime] || 'bin';
}

async function downloadMedia(supabase: SupabaseClient, iId: string, iToken: string, msgId: string, type: string, fn?: string, mKey?: string | null, dPath?: string | null, mUrl?: string | null, mime?: string | null): Promise<{ url: string; fileName: string } | null> {
  try {
    if (!mKey || !dPath) {
      console.log(`[${msgId}] Skipping download - missing mediaKey or directPath`);
      return null;
    }
    
    console.log(`[${msgId}] Starting download for type: ${type}`);
    const defMime = type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/ogg' : mime || 'application/pdf';
    const body = { messageId: msgId, type, mimetype: defMime, mediaKey: mKey, directPath: dPath, ...(mUrl && !mUrl.includes('supabase.co') ? { url: mUrl } : {}) };
    
    const res = await fetch(`${WAPI_BASE_URL}/message/download-media?instanceId=${iId}`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${iToken}` }, 
      body: JSON.stringify(body) 
    });
    
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[${msgId}] W-API download failed: ${res.status} - ${errText.substring(0, 200)}`);
      return null;
    }
    
    const r = await res.json();
    console.log(`[${msgId}] W-API response keys: ${Object.keys(r).join(', ')}`);
    
    let b64 = r.base64 || r.data || r.media;
    let rMime = r.mimetype || r.mimeType || defMime;
    const link = r.fileLink || r.file_link || r.url || r.link;
    
    // If W-API returns a fileLink instead of base64, fetch it
    if (!b64 && link) {
      console.log(`[${msgId}] Fetching from fileLink: ${link.substring(0, 50)}...`);
      const fr = await fetch(link);
      if (!fr.ok) {
        console.error(`[${msgId}] Failed to fetch fileLink: ${fr.status}`);
        return null;
      }
      const ct = fr.headers.get('content-type');
      if (ct) rMime = ct.split(';')[0].trim();
      
      const ab = await fr.arrayBuffer();
      const bytes = new Uint8Array(ab);
      console.log(`[${msgId}] Downloaded ${bytes.length} bytes from fileLink`);
      
      // PDF validation
      if (type === 'document' && rMime === 'application/pdf' && !isPdfContent(bytes)) {
        console.log(`[${msgId}] Invalid PDF content, skipping`);
        return null;
      }
      
      // Convert to base64 in chunks to avoid memory issues
      const CHUNK_SIZE = 32768;
      let bin = '';
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
        bin += String.fromCharCode.apply(null, Array.from(chunk));
      }
      b64 = btoa(bin);
    }
    
    if (!b64) {
      console.log(`[${msgId}] No base64 data received from W-API`);
      return null;
    }
    
    console.log(`[${msgId}] Got base64 data, length: ${b64.length}`);
    
    // Decode base64 in chunks
    const bs = atob(b64);
    const bytes = new Uint8Array(bs.length);
    for (let i = 0; i < bs.length; i++) bytes[i] = bs.charCodeAt(i);
    
    // PDF validation
    if (type === 'document' && (rMime === 'application/pdf' || fn?.toLowerCase().endsWith('.pdf')) && !isPdfContent(bytes)) {
      console.log(`[${msgId}] Invalid PDF content after decode, skipping`);
      return null;
    }
    
    const ext = getExt(rMime, fn);
    const path = type === 'document' && fn ? `received/documents/${msgId}_${fn.replace(/[^a-zA-Z0-9\-_\.]/g, '_').substring(0, 100)}` : `received/${type}s/${msgId}.${ext}`;
    
    console.log(`[${msgId}] Uploading ${bytes.length} bytes to ${path}`);
    const { error } = await supabase.storage.from('whatsapp-media').upload(path, bytes, { contentType: rMime, upsert: true });
    
    if (error) {
      console.error(`[${msgId}] Storage upload error:`, error.message);
      return null;
    }
    
    const { data: pu } = supabase.storage.from('whatsapp-media').getPublicUrl(path);
    console.log(`[${msgId}] Upload successful, URL: ${pu?.publicUrl?.substring(0, 60)}...`);
    return pu?.publicUrl ? { url: pu.publicUrl, fileName: fn || `${msgId}.${ext}` } : null;
  } catch (err) {
    console.error(`[${msgId}] Download error:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

function extractMsgContent(mc: Record<string, unknown>, msg: Record<string, unknown>) {
  let type = 'text', content = '', url: string | null = null, key: string | null = null, path: string | null = null, fn: string | undefined, download = false, mime: string | null = null;
  
  if (mc.locationMessage) { type = 'location'; const l = mc.locationMessage as Record<string, unknown>; content = `📍 Localização: ${(l.degreesLatitude as number)?.toFixed(6) || '?'}, ${(l.degreesLongitude as number)?.toFixed(6) || '?'}`; }
  else if (mc.liveLocationMessage) { type = 'location'; content = '📍 Localização ao vivo'; }
  else if (mc.contactMessage || mc.contactsArrayMessage) { type = 'contact'; content = `👤 ${(mc.contactMessage as Record<string, unknown>)?.displayName || 'Contato'}`; }
  else if (mc.stickerMessage) { type = 'sticker'; content = '🎭 Figurinha'; }
  else if (mc.reactionMessage) return null;
  else if (mc.pollCreationMessage || mc.pollUpdateMessage) { type = 'poll'; content = '📊 Enquete'; }
  else if ((mc as Record<string, unknown>).conversation) content = (mc as Record<string, string>).conversation;
  else if ((mc.extendedTextMessage as Record<string, unknown>)?.text) content = ((mc.extendedTextMessage as Record<string, unknown>).text as string);
  else if (mc.imageMessage) { const m = mc.imageMessage as Record<string, unknown>; type = 'image'; content = (m.caption as string) || '[Imagem]'; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.videoMessage) { const m = mc.videoMessage as Record<string, unknown>; type = 'video'; content = (m.caption as string) || '[Vídeo]'; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.audioMessage) { const m = mc.audioMessage as Record<string, unknown>; type = 'audio'; content = '[Áudio]'; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.documentMessage) { const m = mc.documentMessage as Record<string, unknown>; type = 'document'; content = (m.fileName as string) || '[Documento]'; fn = m.fileName as string; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.documentWithCaptionMessage) { const d = ((mc.documentWithCaptionMessage as Record<string, unknown>).message as Record<string, unknown>)?.documentMessage as Record<string, unknown>; if (d) { type = 'document'; content = (d.caption as string) || (d.fileName as string) || '[Documento]'; fn = d.fileName as string; url = d.url as string || null; key = d.mediaKey as string || null; path = d.directPath as string || null; download = true; mime = d.mimetype as string || null; } }
  else if ((msg as Record<string, string>).body || (msg as Record<string, string>).text) content = (msg as Record<string, string>).body || (msg as Record<string, string>).text;
  
  return { type, content, url, key, path, fn, download, mime };
}

function getPreview(mc: Record<string, unknown>, msg: Record<string, unknown>): string {
  if ((mc as Record<string, unknown>).conversation) return (mc as Record<string, string>).conversation;
  if ((mc.extendedTextMessage as Record<string, unknown>)?.text) return ((mc.extendedTextMessage as Record<string, unknown>).text as string);
  if (mc.imageMessage) return '📷 Imagem';
  if (mc.videoMessage) return '🎥 Vídeo';
  if (mc.audioMessage) return '🎤 Áudio';
  if (mc.documentMessage) return '📄 ' + ((mc.documentMessage as Record<string, unknown>).fileName || 'Documento');
  if (mc.documentWithCaptionMessage) return '📄 ' + (((mc.documentWithCaptionMessage as Record<string, unknown>).message as Record<string, unknown>)?.documentMessage as Record<string, unknown>)?.fileName || 'Documento';
  if (mc.locationMessage) return '📍 Localização';
  if (mc.contactMessage || mc.contactsArrayMessage) return '👤 Contato';
  if (mc.stickerMessage) return '🎭 Figurinha';
  return (msg as Record<string, string>).body || (msg as Record<string, string>).text || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    const { event, instanceId, data } = body;
    const { data: instance, error: iErr } = await supabase.from('wapi_instances').select('*').eq('instance_id', instanceId).single();
    if (iErr || !instance) return new Response(JSON.stringify({ error: 'Instance not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const evt = event || body.event;

    switch (evt) {
      case 'connection': case 'webhookConnected': {
        const c = data?.connected ?? body.connected ?? false;
        await supabase.from('wapi_instances').update({ status: c ? 'connected' : 'disconnected', phone_number: data?.phone || body.connectedPhone || null, connected_at: c ? new Date().toISOString() : null }).eq('id', instance.id);
        break;
      }
      case 'disconnection': case 'webhookDisconnected':
        await supabase.from('wapi_instances').update({ status: 'disconnected', connected_at: null }).eq('id', instance.id);
        break;
      case 'call': case 'webhookCall': case 'call_offer': case 'call_reject': case 'call_timeout': break;
      case 'message': case 'message-received': case 'webhookReceived': {
        const msg = data?.message || data || body;
        if (!msg) break;
        const mc = msg.message || msg.msgContent || {};
        if (mc.protocolMessage) break;
        
        let rj = msg.key?.remoteJid || msg.from || msg.remoteJid || (msg.chat?.id ? `${msg.chat.id}` : null) || (msg.sender?.id ? `${msg.sender.id}@s.whatsapp.net` : null);
        if (!rj) break;
        const isGrp = rj.includes('@g.us');
        if (!isGrp && !rj.includes('@')) rj = `${rj}@s.whatsapp.net`;
        else if (rj.includes('@c.us')) rj = rj.replace('@c.us', '@s.whatsapp.net');
        
        const fromMe = msg.key?.fromMe || msg.fromMe || false;
        const msgId = msg.key?.id || msg.id || msg.messageId;
        const phone = rj.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '');
        
        let cName = isGrp ? (msg.chat?.name || msg.groupName || msg.subject || null) : (msg.pushName || msg.verifiedBizName || msg.sender?.pushName || phone);
        const cPic = msg.chat?.profilePicture || msg.sender?.profilePicture || null;

        if (Object.keys(mc).length === 0 && !msg.body && !msg.text) break;
        if (mc.call || mc.callLogMessage || mc.bcallMessage || mc.missedCallMessage || msg.type === 'call' || msg.callId) break;

        const preview = getPreview(mc, msg);
        const { data: ex } = await supabase.from('wapi_conversations').select('*, bot_enabled, bot_step, bot_data').eq('instance_id', instance.id).eq('remote_jid', rj).single();
        
        if (fromMe && ex?.bot_step && ex.bot_step !== 'complete') await supabase.from('wapi_conversations').update({ bot_enabled: false }).eq('id', ex.id);

        let conv;
        if (ex) {
          conv = ex;
          const upd: Record<string, unknown> = { last_message_at: new Date().toISOString(), unread_count: fromMe ? ex.unread_count : (ex.unread_count || 0) + 1, last_message_content: preview.substring(0, 100), last_message_from_me: fromMe };
          if (!fromMe && ex.is_closed) upd.is_closed = false;
          if (isGrp) { const gn = msg.chat?.name || msg.groupName || msg.subject; if (gn && gn !== ex.contact_name) upd.contact_name = gn; }
          else if (cName && cName !== ex.contact_name) upd.contact_name = cName;
          if (cPic) upd.contact_picture = cPic;
          await supabase.from('wapi_conversations').update(upd).eq('id', ex.id);
        } else {
          const n = phone.replace(/\D/g, ''), vars = [n, n.replace(/^55/, ''), `55${n}`];
          const { data: lead } = await supabase.from('campaign_leads').select('id, name, month, day_preference, guests').or(vars.map(p => `whatsapp.ilike.%${p}%`).join(',')).eq('unit', instance.unit).limit(1).single();
          
          // Determine if bot should start: only for new contacts without complete lead data
          const hasCompleteLead = lead?.name && lead?.month && lead?.day_preference && lead?.guests;
          const shouldStartBot = !hasCompleteLead;
          
          const { data: nc, error: ce } = await supabase.from('wapi_conversations').insert({
            instance_id: instance.id, remote_jid: rj, contact_phone: phone, contact_name: cName || (isGrp ? `Grupo ${phone}` : phone), contact_picture: cPic,
            last_message_at: new Date().toISOString(), unread_count: fromMe ? 0 : 1, last_message_content: preview.substring(0, 100), last_message_from_me: fromMe,
            lead_id: lead?.id || null, bot_enabled: shouldStartBot, bot_step: shouldStartBot ? 'welcome' : null, bot_data: {}
          }).select('*, bot_enabled, bot_step, bot_data').single();
          if (ce) break;
          conv = nc;
        }

        const ext = extractMsgContent(mc, msg);
        if (!ext) break;
        let { type, content, url, key, path, fn, download, mime } = ext;

        if (download && !fromMe && msgId) {
          const res = await downloadMedia(supabase, instance.instance_id, instance.instance_token, msgId, type, fn, key, path, url, mime);
          if (res) { url = res.url; key = null; path = null; }
          else if (type === 'document') url = null;
        }

        await supabase.from('wapi_messages').insert({
          conversation_id: conv.id, message_id: msgId, from_me: fromMe, message_type: type, content,
          media_url: url, media_key: key, media_direct_path: path, status: fromMe ? 'sent' : 'received',
          timestamp: msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000).toISOString() : msg.moment ? new Date(msg.moment * 1000).toISOString() : new Date().toISOString()
        });

        if (!fromMe && !isGrp && type === 'text' && content) await processBotQualification(supabase, instance, conv, content, phone, cName);
        break;
      }
      case 'message-status': case 'message_ack': case 'webhookStatus': case 'webhookDelivery': {
        const sd = data || body, mId = sd?.messageId || body?.messageId, st = sd?.status, ack = sd?.ack;
        const fm = body?.fromMe || sd?.fromMe || false, mcd = body?.msgContent || sd?.msgContent;
        
        if (fm && mcd && mId) {
          const { data: em } = await supabase.from('wapi_messages').select('id').eq('message_id', mId).single();
          if (!em) {
            const cId = body?.chat?.id || sd?.chat?.id;
            if (cId) {
              let rj = cId.includes('@') ? cId : `${cId}@s.whatsapp.net`;
              const p = rj.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '');
              if (!rj.includes('@g.us')) {
                const { data: ec } = await supabase.from('wapi_conversations').select('*').eq('instance_id', instance.id).eq('remote_jid', rj).single();
                let pv = '';
                if (mcd.conversation) pv = mcd.conversation;
                else if (mcd.extendedTextMessage?.text) pv = mcd.extendedTextMessage.text;
                else if (mcd.imageMessage) pv = '📷 Imagem';
                else if (mcd.documentMessage) pv = '📄 ' + (mcd.documentMessage.fileName || 'Documento');
                
                let cv;
                if (ec) { cv = ec; await supabase.from('wapi_conversations').update({ last_message_at: new Date().toISOString(), last_message_content: pv.substring(0, 100), last_message_from_me: true, ...(ec.bot_step && ec.bot_step !== 'complete' ? { bot_enabled: false } : {}) }).eq('id', ec.id); }
                else { const { data: nc } = await supabase.from('wapi_conversations').insert({ instance_id: instance.id, remote_jid: rj, contact_phone: p, contact_name: body?.chat?.name || p, last_message_at: new Date().toISOString(), last_message_content: pv.substring(0, 100), last_message_from_me: true, bot_enabled: false }).select().single(); cv = nc; }
                
                if (cv) {
                  let ct = '', tp = 'text', mu = null;
                  if (mcd.conversation) ct = mcd.conversation;
                  else if (mcd.extendedTextMessage?.text) ct = mcd.extendedTextMessage.text;
                  else if (mcd.imageMessage) { tp = 'image'; ct = mcd.imageMessage.caption || '[Imagem]'; mu = mcd.imageMessage.url; }
                  else if (mcd.documentMessage) { tp = 'document'; ct = mcd.documentMessage.fileName || '[Documento]'; mu = mcd.documentMessage.url; }
                  await supabase.from('wapi_messages').insert({ conversation_id: cv.id, message_id: mId, from_me: true, message_type: tp, content: ct, media_url: mu, status: 'sent', timestamp: body.moment ? new Date(body.moment * 1000).toISOString() : new Date().toISOString() });
                }
              }
            }
          }
        }
        
        const sm: Record<string | number, string> = { 0: 'error', 1: 'pending', 2: 'sent', 3: 'delivered', 4: 'read', 'PENDING': 'pending', 'SENT': 'sent', 'DELIVERY': 'delivered', 'READ': 'read', 'PLAYED': 'read', 'ERROR': 'error' };
        const ns = sm[st] || sm[ack] || 'unknown';
        if (mId && ns !== 'unknown') await supabase.from('wapi_messages').update({ status: ns }).eq('message_id', mId);
        break;
      }
      default: console.log('Unhandled event:', evt);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: unknown) {
    console.error('Webhook error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
