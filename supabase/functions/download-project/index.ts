import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id, lovable_token } = await req.json();

    if (!project_id || !lovable_token) {
      return new Response(
        JSON.stringify({ error: "Missing project_id or lovable_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionToken = req.headers.get("x-session-token");
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: "Missing session token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: session } = await supabase
      .from("sessions")
      .select("id, license_id, expires_at")
      .eq("session_token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[download-project] Fetching source-code for project ${project_id}`);

    // Step 1: GET source-code
    const sourceResponse = await fetch(
      `https://lovable-api.com/projects/${project_id}/source-code`,
      {
        method: "GET",
        headers: { "Authorization": `Bearer ${lovable_token}` },
      }
    );

    console.log(`[download-project] source-code status: ${sourceResponse.status}`);

    if (!sourceResponse.ok) {
      const errText = await sourceResponse.text();
      console.error(`[download-project] source-code error: ${errText.slice(0, 500)}`);
      return new Response(
        JSON.stringify({ error: "Não foi possível obter o código-fonte.", hint: "Token inválido ou sem acesso." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sourceData = await sourceResponse.json();

    // Log the structure of the first file to understand the format
    const files = Array.isArray(sourceData) ? sourceData : (sourceData.files || sourceData.data || []);
    if (files.length > 0) {
      const sample = files[0];
      console.log(`[download-project] Sample file keys: ${Object.keys(sample).join(', ')}`);
      console.log(`[download-project] Sample file: path=${sample.path || sample.name}, hasContent=${sample.content != null}, contentType=${typeof sample.content}, contentLen=${String(sample.content || '').length}`);
    }
    console.log(`[download-project] Total files: ${files.length}`);

    // Step 2: Build ZIP
    const zip = new JSZip();
    const binaryFiles: Array<{ path: string }> = [];
    const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|zip|woff|woff2|ttf|eot|mp3|mp4|pdf)$/i;

    for (const file of files) {
      const filePath = file.path || file.name || file.filename;
      if (!filePath) continue;

      // Check if content exists (could be string or object)
      const content = file.content ?? file.code ?? file.text ?? file.body;
      
      if (content != null && typeof content === 'string' && content.length > 0) {
        zip.file(filePath, content);
      } else if (IMAGE_EXTENSIONS.test(filePath)) {
        // Binary file without inline content - queue for parallel fetch
        binaryFiles.push({ path: filePath });
      } else if (content != null) {
        // Empty content but exists
        zip.file(filePath, typeof content === 'string' ? content : JSON.stringify(content));
      } else {
        // No content at all - try to fetch as text
        binaryFiles.push({ path: filePath });
      }
    }

    console.log(`[download-project] Inline files: ${files.length - binaryFiles.length}, binary/missing: ${binaryFiles.length}`);

    // Step 3: Fetch binary files in PARALLEL batches of 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < binaryFiles.length; i += BATCH_SIZE) {
      const batch = binaryFiles.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (file) => {
          const rawResponse = await fetch(
            `https://api.lovable.dev/projects/${project_id}/files/raw?path=${encodeURIComponent(file.path)}`,
            { headers: { "Authorization": `Bearer ${lovable_token}` } }
          );
          if (rawResponse.ok) {
            const contentType = rawResponse.headers.get("content-type") || "";
            if (contentType.includes("text") || contentType.includes("json") || contentType.includes("javascript") || contentType.includes("xml") || contentType.includes("svg")) {
              return { path: file.path, data: await rawResponse.text(), type: "text" };
            }
            return { path: file.path, data: await rawResponse.arrayBuffer(), type: "binary" };
          }
          return { path: file.path, data: null, type: "error" };
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value.data != null) {
          zip.file(r.value.path, r.value.data);
        }
      }
    }

    console.log(`[download-project] Generating ZIP...`);
    const zipBuffer = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 } // Lower compression = faster
    });

    console.log(`[download-project] ZIP done: ${zipBuffer.byteLength} bytes`);

    return new Response(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${project_id}.zip"`,
      },
    });

  } catch (error) {
    console.error("[download-project] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error: " + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
