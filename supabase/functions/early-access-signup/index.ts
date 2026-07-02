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

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers: corsHeaders }
      );
    }

    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const notifyEmail = Deno.env.get("NOTIFY_EMAIL");

      if (!resendApiKey || !notifyEmail) {
        return Response.json(
          { error: "Missing email configuration" },
          { status: 500, headers: corsHeaders }
        );
      }

      const body = await req.json();

      const name = escapeHtml(body.name || "Unknown");
      const email = escapeHtml(body.email || "No email provided");
      const interest = escapeHtml(body.interest || "Not specified");
      const source = escapeHtml(body.source || "atlaseye.ai");
      const time = new Date().toISOString();

      const subject = "New Atlas Eye Early Access Signup";

      const html = `
        <h2>New Atlas Eye Early Access Signup</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Interest:</strong> ${interest}</p>
        <p><strong>Source:</strong> ${source}</p>
        <p><strong>Time:</strong> ${time}</p>
      `;

      const text = `New Atlas Eye Early Access Signup

Name: ${name}
Email: ${email}
Interest: ${interest}
Source: ${source}
Time: ${time}
`;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Atlas Eye <notify@atlaseye.ai>",
          to: [notifyEmail],
          subject,
          html,
          text,
        }),
      });

      if (!resendResponse.ok) {
        const detail = await resendResponse.text();

        return Response.json(
          { error: "Email send failed", detail },
          { status: 500, headers: corsHeaders }
        );
      }

      return Response.json(
        { ok: true },
        { status: 200, headers: corsHeaders }
      );
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
