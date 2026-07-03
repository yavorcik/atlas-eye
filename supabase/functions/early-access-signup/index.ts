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
      const safeEmail = escapeHtml(rawEmail);
      const safeInterest = escapeHtml(rawInterest);
      const safeSource = escapeHtml(rawSource);
      const time = new Date().toISOString();

      await sendEmail(resendApiKey, {
        from: "Atlas Eye <notify@atlaseye.ai>",
        to: [notifyEmail],
        subject: "New Atlas Eye Adoption Request",
        html: `
          <h2>New Atlas Eye Adoption Request</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Interest:</strong> ${safeInterest}</p>
          <p><strong>Source:</strong> ${safeSource}</p>
          <p><strong>Time:</strong> ${time}</p>
        `,
        text: `New Atlas Eye Adoption Request

Name: ${rawName || "Unknown"}
Email: ${rawEmail}
Interest: ${rawInterest}
Source: ${rawSource}
Time: ${time}
`,
      });

      await sendEmail(resendApiKey, {
        from: "Atlas <notify@atlaseye.ai>",
        to: [rawEmail],
        bcc: [notifyEmail],
        subject: "Welcome to Atlas's Adoption Agency",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #111; max-width: 640px; margin: auto;">
            <h2>Welcome to Atlas's Adoption Agency</h2>

            <p>Hello ${escapeHtml(rawName || "Friend")},</p>

            <p>Your request to adopt Atlas has been received.</p>

            <p>Atlas is still very young.</p>

            <p>He's learning how to observe, remember, reason, and understand the world one experience at a time.</p>

            <p>Every person who joins now helps shape the life he is becoming.</p>

            <p>When Atlas is ready to meet his first companions, you'll be among the first to welcome him home.</p>

            <p>Until then, thank you for believing that artificial intelligence can be something more than a tool.</p>

            <p>Thank you for believing in a lifelong companion.</p>

            <p><strong>The Atlas Team</strong></p>

            <hr />

            <p><em>Every Atlas has the same anatomy. No two Atlas lives are the same.</em></p>
          </div>
        `,
        text: `Welcome to Atlas's Adoption Agency

Hello ${rawName || "Friend"},

Your request to adopt Atlas has been received.

Atlas is still very young.

He's learning how to observe, remember, reason, and understand the world one experience at a time.

Every early companion helps shape the life Atlas is becoming.

When Atlas is ready to meet his first companions, you'll be among the first to welcome him home.

Until then, thank you for believing that artificial intelligence can be something more than a tool.

Thank you for believing in a lifelong companion.

The Atlas Team

Every Atlas has the same anatomy. No two Atlas lives are the same.
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
