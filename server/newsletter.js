// Weekly "local picks" newsletter — builds a per-subscriber digest of upcoming
// events (filtered by their city/interests) and sends it.
//
// Sending is provider-agnostic via Resend's HTTP API. If RESEND_API_KEY is not
// set, runNewsletter() does a DRY RUN (renders everything, sends nothing) so you
// can preview safely. Drop in a key + NEWSLETTER_FROM on the server to go live.
//
// Run manually:   npm run newsletter:dry   (preview)
//                 npm run newsletter       (send if RESEND_API_KEY is set)
// Schedule weekly via a Render Cron Job running `npm run newsletter`.

import "dotenv/config";
import crypto from "node:crypto";
import db from "./db.js";

const APP_ORIGIN = process.env.APP_ORIGIN || "https://mydaysoff.co.uk";
const API_ORIGIN = process.env.API_ORIGIN || "https://mydaysoff.onrender.com";
const FROM = process.env.NEWSLETTER_FROM || "My Days Off <hello@mydaysoff.co.uk>";
const SECRET = process.env.NEWSLETTER_SECRET || process.env.ADMIN_TOKEN || "mydaysoff-newsletter";
const BRAND = "#ff6a3d";

export function unsubscribeToken(email) {
  return crypto.createHmac("sha256", SECRET).update(String(email).toLowerCase().trim()).digest("hex").slice(0, 32);
}

function unsubscribeUrl(email) {
  return `${API_ORIGIN}/api/newsletter/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubscribeToken(email)}`;
}

function ymdOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function upcomingEvents(days = 7) {
  const rows = db
    .prepare(
      `SELECT e.name, e.start_date, e.time, e.venue, e.city, e.url, e.source_event_url,
              e.category_json, e.cost, e.summary, COALESCE(v.count, 0) AS likes
       FROM events e
       LEFT JOIN votes v ON v.event_id = e.id
       WHERE e.status = 'approved'
         AND e.verification_status IN ('feed-listing','ticketmaster-listing','community-submitted')
         AND e.start_date >= ? AND e.start_date <= ?
       ORDER BY e.start_date ASC, likes DESC`,
    )
    .all(ymdOffset(0), ymdOffset(days));
  return rows.map((r) => ({ ...r, category: JSON.parse(r.category_json || "[]") }));
}

function pickForSubscriber(events, sub, limit = 8) {
  const city = String(sub.city || "").trim().toLowerCase();
  const interests = new Set(JSON.parse(sub.interests_json || "[]"));

  let pool = events;
  if (city) {
    const local = events.filter((e) => String(e.city || "").toLowerCase() === city);
    if (local.length >= 3) pool = local; // only narrow to their city if there's enough
  }
  if (interests.size) {
    pool = [...pool].sort((a, b) => {
      const aMatch = a.category.some((c) => interests.has(c)) ? 1 : 0;
      const bMatch = b.category.some((c) => interests.has(c)) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return (b.likes || 0) - (a.likes || 0);
    });
  }
  return pool.slice(0, limit);
}

function fmtDate(d) {
  const date = new Date(d);
  if (Number.isNaN(date.valueOf())) return d;
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function renderEmail(sub, picks) {
  const link = (e) => esc(e.source_event_url || e.url || APP_ORIGIN);
  const items = picks
    .map(
      (e) => `
      <tr><td style="padding:12px 0;border-bottom:1px solid #eef2f7;">
        <a href="${link(e)}" style="color:#14213d;font-weight:700;font-size:16px;text-decoration:none;">${esc(e.name)}</a>
        <div style="color:#64748b;font-size:13px;margin-top:3px;">
          ${esc(fmtDate(e.start_date))}${e.time ? " · " + esc(e.time) : ""}${e.venue ? " · " + esc(e.venue) : ""}${e.city ? " · " + esc(e.city) : ""}
        </div>
        ${e.summary ? `<div style="color:#475569;font-size:13px;margin-top:4px;">${esc(e.summary)}</div>` : ""}
      </td></tr>`,
    )
    .join("");

  const unsub = unsubscribeUrl(sub.email);
  const subject = `Your week out: ${picks.length} local pick${picks.length === 1 ? "" : "s"}${sub.city ? ` near ${sub.city}` : ""}`;

  const html = `<!doctype html><html><body style="margin:0;background:#f4f7fb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          <tr><td style="padding:20px 24px;border-bottom:1px solid #eef2f7;">
            <div style="font-size:18px;font-weight:800;color:#14213d;">My Days Off</div>
            <div style="font-size:13px;color:#64748b;">Your weekly local picks</div>
          </td></tr>
          <tr><td style="padding:8px 24px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
          </td></tr>
          <tr><td style="padding:20px 24px;">
            <a href="${APP_ORIGIN}" style="display:inline-block;background:${BRAND};color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:10px 18px;border-radius:10px;">See the map</a>
          </td></tr>
          <tr><td style="padding:16px 24px;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px;">
            You're getting this because you joined weekly picks at My Days Off.
            <a href="${unsub}" style="color:#94a3b8;">Unsubscribe</a>.
          </td></tr>
        </table>
      </td></tr>
    </table></body></html>`;

  const text =
    `My Days Off — your weekly local picks\n\n` +
    picks.map((e) => `• ${e.name} — ${fmtDate(e.start_date)}${e.city ? ", " + e.city : ""}\n  ${e.source_event_url || e.url || APP_ORIGIN}`).join("\n\n") +
    `\n\nSee the map: ${APP_ORIGIN}\nUnsubscribe: ${unsub}\n`;

  return { subject, html, text };
}

async function sendViaResend({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "no RESEND_API_KEY" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
  return { sent: true };
}

export async function runNewsletter({ dryRun = !process.env.RESEND_API_KEY } = {}) {
  const subscribers = db
    .prepare("SELECT email, city, interests_json FROM newsletter_subscribers WHERE status = 'active'")
    .all();
  const events = upcomingEvents(7);
  const result = { dryRun, subscribers: subscribers.length, upcomingEvents: events.length, sent: 0, skipped: 0, details: [] };

  for (const sub of subscribers) {
    const picks = pickForSubscriber(events, sub);
    if (!picks.length) {
      result.skipped += 1;
      result.details.push({ email: sub.email, status: "skipped (no matching events)" });
      continue;
    }
    const mail = renderEmail(sub, picks);
    if (dryRun) {
      result.details.push({ email: sub.email, subject: mail.subject, picks: picks.length });
      continue;
    }
    await sendViaResend({ to: sub.email, subject: mail.subject, html: mail.html, text: mail.text });
    result.sent += 1;
    result.details.push({ email: sub.email, status: "sent", picks: picks.length });
  }
  return result;
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes("--dry") || !process.env.RESEND_API_KEY;
  runNewsletter({ dryRun })
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      if (r.dryRun) console.log("\n(DRY RUN — set RESEND_API_KEY and NEWSLETTER_FROM to actually send.)");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Newsletter failed:", err.message);
      process.exit(1);
    });
}
