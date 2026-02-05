import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { 
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
  if (!roleData || roleData.role !== "admin") {
    return new Response(JSON.stringify({ error: "Admin only" }), { 
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  // Get Trujillo materials with wrong path
  const { data: materials } = await supabase
    .from("sales_materials")
    .select("*")
    .eq("unit", "Trujillo")
    .like("file_path", "manchester/%");

  if (!materials?.length) {
    return new Response(JSON.stringify({ message: "Nothing to migrate", migrated: 0 }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  let success = 0;
  for (const m of materials) {
    const oldPath = m.file_path;
    const newPath = oldPath.replace("manchester/", "trujillo/");
    
    const { data: fileData } = await supabase.storage.from("sales-materials").download(oldPath);
    if (!fileData) continue;

    await supabase.storage.from("sales-materials").upload(newPath, fileData, { contentType: "application/pdf", upsert: true });
    
    const { data: urlData } = supabase.storage.from("sales-materials").getPublicUrl(newPath);
    
    await supabase.from("sales_materials").update({ file_path: newPath, file_url: urlData.publicUrl }).eq("id", m.id);
    await supabase.storage.from("sales-materials").remove([oldPath]);
    
    success++;
  }

  return new Response(JSON.stringify({ message: `Migrated ${success} files`, migrated: success }), { 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
});
