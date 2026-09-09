import { createClient } from "npm:@supabase/supabase-js@2";

const SITES = new Set(["atlas-eye", "yavorcik-medmal", "valley-smr", "atlas-supplier-intake", "owner-notifications"]);
const IMMEDIATE = new Set(["inquiry", "signup", "supplier_submission", "supplier_review", "upload", "project_change", "access_change", "processing_failure", "delivery_failure", "owner_test", "daily_digest"]);
const METRICS = new Set(["page_view", "click", "download"]);
const ORIGINS: Record<string, string> = {
  "https://atlaseye.ai": "atlas-eye",
  "https://www.atlaseye.ai": "atlas-eye",
  "https://atlas-eye.netlify.app": "atlas-eye",
  "https://yavorciklaw.com": "yavorcik-medmal",
  "https://www.yavorciklaw.com": "yavorcik-medmal",
  "https://yavorcik-medmal.netlify.app": "yavorcik-medmal",
  "https://valleysmr.com": "valley-smr",
  "https://www.valleysmr.com": "valley-smr",
  "https://valleysmr.netlify.app": "valley-smr",
};

const json = (body: unknown, status = 200, origin?: string | null) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": origin && ORIGINS[origin] ? origin : "https://atlaseye.ai",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-owner-activity-secret",
    "vary": "Origin",
  },
});
const text = (value: unknown, max: number) => typeof value === "string" && value.trim().length <= max ? value.trim() : "";
const safePath = (value: unknown) => {
  const candidate = text(value, 300).split(/[?#]/, 1)[0];
  return candidate.startsWith("/") ? candidate : "/";
};
const safeTime = (value: unknown) => {
  const parsed = Date.parse(String(value || ""));
  const now = Date.now();
  return Number.isFinite(parsed) && Math.abs(parsed - now) < 48 * 60 * 60 * 1000 ? new Date(parsed).toISOString() : new Date(now).toISOString();
};
async function equalSecret(expected: string, actual: string) {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([expected, actual].map((v) => crypto.subtle.digest("SHA-256", encoder.encode(v))));
  return Array.from(new Uint8Array(a)).every((v, i) => v === new Uint8Array(b)[i]);
}
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const base64 = (value: string) => btoa(String.fromCharCode(...new TextEncoder().encode(value)));

async function sendEvent(supabase: ReturnType<typeof createClient>, event: Record<string, string>, privateAttachment = "") {
  const { data: claimed, error: claimError } = await supabase.rpc("claim_owner_notification", { p_event_id: event.event_id });
  if (claimError) throw new Error("delivery_claim_failed");
  if (!claimed?.length) {
    const { data } = await supabase.from("owner_notification_deliveries").select("status").eq("event_id", event.event_id).maybeSingle();
    return { duplicate: true, sent: data?.status === "sent" };
  }
  const attempt = claimed[0].attempts as number;
  const apiKey = Deno.env.get("RESEND_API_KEY") || "";
  const destination = Deno.env.get("NOTIFY_EMAIL") || "";
  if (!apiKey || destination.toLowerCase() !== "yavorcik@gmail.com") throw new Error("delivery_configuration_invalid");
  const isTest = event.event_type === "owner_test";
  const label = event.event_type.replaceAll("_", " ");
  const subject = `${isTest ? "[OWNER TEST] " : ""}[Owner activity] ${event.site} — ${label}`;
  const lines = [
    `Site: ${event.site}`,
    `Event: ${label}`,
    `Timestamp: ${event.occurred_at}`,
    `Reference: ${event.reference || event.event_id}`,
    `Next action: ${event.next_action || "Review the applicable private system record."}`,
    "",
    "This alert intentionally excludes form narratives, documents, credentials, and private review notes.",
  ];
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "idempotency-key": event.event_id },
    body: JSON.stringify({
      from: "Atlas Owner Activity <notify@atlaseye.ai>", to: [destination], subject,
      text: lines.join("\n"),
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>${escapeHtml(subject)}</h2><dl><dt>Site</dt><dd>${escapeHtml(event.site)}</dd><dt>Event</dt><dd>${escapeHtml(label)}</dd><dt>Timestamp</dt><dd>${escapeHtml(event.occurred_at)}</dd><dt>Reference</dt><dd>${escapeHtml(event.reference || event.event_id)}</dd><dt>Next action</dt><dd>${escapeHtml(event.next_action || "Review the applicable private system record.")}</dd></dl><p><small>This alert intentionally excludes form narratives, documents, credentials, and private review notes.</small></p></div>`,
      ...(privateAttachment ? { attachments: [{ filename: `${event.reference || "submission"}-private.txt`, content: base64(privateAttachment) }] } : {}),
    }),
  });
  if (!response.ok) {
    const retryMinutes = Math.min(60, 2 ** Math.min(attempt, 5));
    await supabase.from("owner_notification_deliveries").update({ status: "failed", last_error_code: `resend_${response.status}`, next_attempt_at: new Date(Date.now() + retryMinutes * 60000).toISOString(), updated_at: new Date().toISOString() }).eq("event_id", event.event_id);
    throw new Error(`delivery_failed_${response.status}`);
  }
  const result = await response.json().catch(() => ({}));
  await supabase.from("owner_notification_deliveries").update({ status: "sent", provider_id: text(result?.id, 180) || null, last_error_code: null, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("event_id", event.event_id);
  return { sent: true };
}

async function createImmediate(supabase: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const site = text(body.site, 80), eventType = text(body.event_type, 80), eventId = text(body.event_id, 180);
  if (!SITES.has(site) || !IMMEDIATE.has(eventType) || !/^[A-Za-z0-9][A-Za-z0-9:._#-]{7,179}$/.test(eventId)) throw new Error("invalid_event");
  const event = { event_id: eventId, site, event_type: eventType, occurred_at: safeTime(body.occurred_at), reference: text(body.reference, 180) || null, next_action: text(body.next_action, 300) || null };
  const { error } = await supabase.from("owner_activity_events").upsert(event, { onConflict: "event_id", ignoreDuplicates: true });
  if (error) throw new Error("event_storage_failed");
  await supabase.from("owner_notification_deliveries").upsert({ event_id: eventId }, { onConflict: "event_id", ignoreDuplicates: true });
  const privateAttachment = text(body.private_attachment, 30000);
  if (privateAttachment && !((eventType === "inquiry" && (site === "yavorcik-medmal" || site === "atlas-eye")) || (eventType === "signup" && site === "atlas-eye"))) throw new Error("private_attachment_not_allowed");
  return sendEvent(supabase, event as Record<string, string>, privateAttachment);
}

async function createDigest(supabase: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(body.day || "")) ? String(body.day) : formatter.format(yesterday);
  const start = new Date(`${day}T00:00:00-04:00`); // queried window is widened; local-day filtering below is exact
  const from = new Date(start.getTime() - 60 * 60 * 1000).toISOString(), to = new Date(start.getTime() + 26 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await supabase.from("owner_activity_events").select("site,event_type,occurred_at").in("event_type", [...METRICS]).gte("occurred_at", from).lt("occurred_at", to);
  if (error) throw new Error("digest_query_failed");
  const counts: Record<string, Record<string, number>> = {};
  for (const site of ["atlas-eye", "yavorcik-medmal", "valley-smr"]) counts[site] = { page_view: 0, click: 0, download: 0 };
  for (const row of rows || []) if (formatter.format(new Date(row.occurred_at)) === day && counts[row.site]) counts[row.site][row.event_type] += 1;
  const { data: sources } = await supabase.from("owner_activity_sources").select("site,collection_started_at");
  const active = new Map((sources || []).map((s) => [s.site, s.collection_started_at]));
  const summary = Object.entries(counts).map(([site, value]) => active.has(site) ? `${site}: ${value.page_view} traffic events, ${value.click} clicks, ${value.download} downloads` : `${site}: unavailable (collection has not been observed live)`).join("; ");
  return createImmediate(supabase, { event_id: `daily-digest:${day}`, site: "owner-notifications", event_type: "daily_digest", occurred_at: new Date().toISOString(), reference: day, next_action: summary });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return origin && ORIGINS[origin] ? json({ ok: true }, 200, origin) : json({ error: "origin_not_allowed" }, 403, origin);
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  let body: Record<string, unknown>;
  try { body = JSON.parse(await req.text()); } catch { return json({ error: "invalid_json" }, 400, origin); }
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "", serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return json({ error: "configuration_unavailable" }, 503, origin);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  try {
    if (METRICS.has(String(body.event_type || ""))) {
      const expectedSite = origin ? ORIGINS[origin] : undefined;
      const eventId = text(body.event_id, 180), eventType = text(body.event_type, 30);
      if (!expectedSite || body.site !== expectedSite || !/^[0-9a-f-]{36}$/.test(eventId)) return json({ error: "invalid_metric" }, 400, origin);
      const occurredAt = safeTime(body.occurred_at);
      await supabase.from("owner_activity_sources").upsert({ site: expectedSite, collection_started_at: occurredAt }, { onConflict: "site", ignoreDuplicates: true });
      const { error } = await supabase.from("owner_activity_events").upsert({ event_id: eventId, site: expectedSite, event_type: eventType, occurred_at: occurredAt, path: safePath(body.path) }, { onConflict: "event_id", ignoreDuplicates: true });
      if (error) throw new Error("metric_storage_failed");
      return json({ accepted: true }, 202, origin);
    }
    const expected = Deno.env.get("OWNER_ACTIVITY_SHARED_SECRET") || "", actual = req.headers.get("x-owner-activity-secret") || "";
    if (!expected || !actual || !(await equalSecret(expected, actual))) return json({ error: "unauthorized" }, 401, origin);
    const result = body.action === "digest" ? await createDigest(supabase, body) : await createImmediate(supabase, body);
    return json(result, 200, origin);
  } catch (error) {
    console.error("owner-activity failure", { code: error instanceof Error ? error.message : "unknown" });
    return json({ error: error instanceof Error ? error.message : "unavailable" }, 503, origin);
  }
});
