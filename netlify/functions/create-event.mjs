// "Create my event": turns a customer's choices into a realistic AI picture of their event.
// Uses Cloudflare Workers AI (free daily allowance). The secret details live in Netlify as
// environment variables, never in the website code:
//   CF_ACCOUNT_ID  your Cloudflare account ID
//   CF_API_TOKEN   an API token with "Workers AI" permission
//   CF_MODEL       optional, default "@cf/black-forest-labs/flux-1-schnell"
//
// POST /api/create-event  { occasion, guests, venue, palette, flower, level, table, chair, backdrop, extras }
//   -> { done: true, url: "data:image/jpeg;base64,..." }
// The picture is built only from the option codes below, so the service can't be used for anything else.
import D from "../../src/_data/designer.json";
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const pick = (list, id) => list.find((x) => x.id === id) || list[0];

const VENUE = {
  ballroom: "an elegant hotel ballroom with crystal chandeliers, tall windows and soft drapes",
  garden: "a beautiful English garden marquee with greenery and soft natural daylight",
  dining: "an intimate private dining room with wood panelling and warm candlelight",
  rooftop: "an open-air London rooftop setting at dusk with the city skyline and glowing lights",
  loft: "a stylish loft restaurant with exposed brick walls and pendant lights",
  home: "a cosy, beautifully styled living room at home",
};
const PALETTE = {
  "ivory-gold": "ivory, champagne and gold",
  "blush-sage": "blush pink, ivory and sage green",
  "burgundy-cream": "deep burgundy, cream and dark green",
  "dusty-blue": "dusty blue, white and soft green",
  "butter-sage": "butter yellow, ivory and sage green",
  "red-roses": "classic red and white",
  "black-white": "black and white with greenery",
  "lilac-silver": "lilac, lavender and silver",
};
const FLOWER = {
  roses: "roses", peonies: "lush peonies", hydrangea: "hydrangeas and roses",
  wild: "relaxed wildflowers and meadow flowers", orchids: "elegant orchids", dried: "pampas grass and dried flowers",
};
const LEVEL = { minimal: "small, low", lush: "full, lush", statement: "tall, dramatic statement" };
const TABLE = {
  round: "round tables dressed in floor-length ivory linen",
  long: "long banquet tables dressed in linen with a table runner",
  lounge: "a lounge set-up with velvet sofas and low cocktail tables",
};
const CHAIR = {
  chiavari: "gold Chiavari chairs", ghost: "clear acrylic ghost chairs", crossback: "wooden crossback chairs",
  louis: "cream Louis chairs", velvet: "velvet dining chairs",
};
const BACKDROP = {
  none: "",
  flowerwall: "A lush flower wall backdrop in the same colours.",
  heart: "A large heart-shaped arch made of roses as the centrepiece backdrop.",
  arch: "A round gold arch with flowing white drapes and flowers as the backdrop.",
  balloons: "An organic balloon garland arch in the colour palette as the backdrop.",
};
const EXTRA = {
  candles: "hundreds of glowing candles", neon: "a glowing neon sign on the wall", lights: "a canopy of warm fairy lights overhead",
  photobooth: "a stylish photo booth corner", booth360: "a 360 video booth platform", dessert: "a styled dessert table with a tiered cake",
  dancefloor: "a white dance floor", welcome: "a welcome sign on an easel", photographer: "", music: "a small live music corner",
};

function buildPrompt(d) {
  const occ = pick(D.occasions, d.occasion);
  const guests = Math.max(occ.minGuests, Math.min(occ.maxGuests, parseInt(d.guests, 10) || occ.defaultGuests));
  const extras = (Array.isArray(d.extras) ? d.extras : []).map((x) => EXTRA[x]).filter(Boolean).slice(0, 6);
  const scale = guests <= 2 ? "an intimate set-up for two" : guests <= 30 ? `an intimate set-up for ${guests} guests` : `a set-up for ${guests} guests`;
  return [
    `Professional event photography of a beautifully styled ${occ.label.toLowerCase()}, ${scale}, in ${VENUE[d.venue] || VENUE.ballroom}.`,
    `Colour palette: ${PALETTE[d.palette] || PALETTE["blush-sage"]}.`,
    d.table === "lounge" ? `Furniture: ${TABLE.lounge}.` : `${TABLE[d.table] || TABLE.round} with ${CHAIR[d.chair] || CHAIR.chiavari}.`,
    `${LEVEL[d.level] || LEVEL.lush} centrepieces of ${FLOWER[d.flower] || FLOWER.roses} in the palette colours.`,
    BACKDROP[d.backdrop] || "",
    extras.length ? `Also: ${extras.join(", ")}.` : "",
    "Luxury London event styling, wide-angle view of the whole room, warm and inviting lighting, photorealistic, magazine quality, empty room before guests arrive, no people, no text, no words, no logos.",
  ].filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}

export default async (req) => {
  const account = process.env.CF_ACCOUNT_ID, token = process.env.CF_API_TOKEN;
  if (!account || !token) return json({ error: "not_set_up" }, 503);
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // Only this website may use it
  const url = new URL(req.url);
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  if (origin && !origin.startsWith(url.origin)) return json({ error: "forbidden" }, 403);

  try {
    const d = await req.json().catch(() => ({}));
    const model = process.env.CF_MODEL || "@cf/black-forest-labs/flux-1-schnell";
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ prompt: buildPrompt(d), steps: 4 }),
    });
    const out = await res.json().catch(() => ({}));
    const b64 = out && out.result && out.result.image;
    if (!res.ok || !b64) return json({ error: res.status === 429 ? "busy" : "provider", status: res.status }, res.status === 429 ? 429 : 502);
    return json({ done: true, url: `data:image/jpeg;base64,${b64}` });
  } catch (e) {
    return json({ error: "failed" }, 500);
  }
};

export const config = { path: "/api/create-event" };
