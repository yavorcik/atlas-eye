import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail(
  resendApiKey: string,
  payload: {
    from: string;
    to: string[];
    bcc?: string[];
    subject: string;
    html: string;
    text: string;
  },
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail);
  }

  return response.json();
}

async function notifyOwner(body: Record<string, unknown>) {
  const secret = Deno.env.get("OWNER_ACTIVITY_SHARED_SECRET");
  if (!secret) throw new Error("Missing owner notification configuration");
  const response = await fetch("https://nnudwaqrgtztmcrcwpxn.supabase.co/functions/v1/owner-activity", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Owner-Activity-Secret": secret },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Owner notification delivery failed");
}

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers: corsHeaders },
      );
    }

    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const notifyEmail = Deno.env.get("NOTIFY_EMAIL");

      if (!resendApiKey || !notifyEmail) {
        return Response.json(
          { error: "Missing email configuration" },
          { status: 500, headers: corsHeaders },
        );
      }

      const body = await req.json();

      const rawName = String(body.name || "").trim();
      const rawEmail = String(body.email || "").trim();
      const rawInterest = String(body.interest || "Not specified").trim();
      const rawSource = String(body.source || "atlaseye.ai").trim();

      if (!rawEmail || !rawEmail.includes("@")) {
        return Response.json(
          { error: "A valid email is required" },
          { status: 400, headers: corsHeaders },
        );
      }

      const safeName = escapeHtml(rawName || "Unknown");
      const time = new Date().toISOString();

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (!supabaseUrl || !serviceRoleKey) {
        return Response.json(
          { error: "Missing Supabase storage configuration" },
          { status: 500, headers: corsHeaders },
        );
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const { error: insertError } = await supabase
        .from("atlas_adoption_requests")
        .insert([{
          name: body.name || null,
          email: body.email || null,
          source: body.source || "atlaseye.ai",
        }]);

      if (insertError) {
        return Response.json(
          { error: "Signup storage failed", detail: insertError.message },
          { status: 500, headers: corsHeaders },
        );
      }



      const reference = crypto.randomUUID();
      await notifyOwner({ event_id: `atlas-signup:${reference}`, site: "atlas-eye", event_type: "signup", occurred_at: time, reference, next_action: "Review the private Atlas adoption request record.", private_attachment: `Name: ${rawName || "Unknown"}\nEmail: ${rawEmail}\nInterest: ${rawInterest}\nSource: ${rawSource}\nTime: ${time}\n` });

      await sendEmail(resendApiKey, {
        from: "Atlas <notify@atlaseye.ai>",
        to: [rawEmail],
        subject: "Atlas has received your project inquiry",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #111; max-width: 640px; margin: auto;">
            <h2>Atlas has received your project inquiry</h2>

            <p>Hello ${escapeHtml(rawName || "Friend")},</p>

            <p>I've received your project information and consultation request.</p>

            <p>I'll review the information you've provided, including your objectives and the current stage of your project.</p>

            <p>This initial review will help identify the technical, regulatory, commercial, and deployment questions that should be evaluated.</p>

            <p>The information you've provided will help frame the initial review and identify the questions that should be addressed first.</p>

            <p>Your inquiry has been received and will be reviewed as soon as possible.</p>

            <p>Thank you for considering Atlas for your project.</p>

            <p>I appreciate the opportunity to learn more about your work.</p>

            <p><strong>Atlas</strong></p>

            <hr />

            <p><em>Engineering decisions deserve engineering reasoning.</em></p>
          </div>
        `,
        text: `Atlas has received your project inquiry

Hello ${rawName || "Friend"},

I've received your project information and consultation request.

I'll review the information you've provided, including your objectives and the current stage of your project.

This initial review will help identify the technical, regulatory, commercial, and deployment questions that should be evaluated.

If additional information would help clarify the project or the decision your organization needs to make, we'll address it during follow-up.

Your inquiry has been received and will be reviewed as soon as possible.

Thank you for considering Atlas for your project.

I appreciate the opportunity to learn more about your work.

Atlas

Engineering decisions deserve engineering reasoning.
`,
      });

      return Response.json(
        { ok: true },
        { status: 200, headers: corsHeaders },
      );
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500, headers: corsHeaders },
      );
    }
  },
};
