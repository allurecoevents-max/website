/* Design your event: live illustrated preview + estimated price range.
   Options and prices come from src/_data/designer.json (editable in the website editor). */
(function () {
  const dataEl = document.getElementById("dz-data");
  const svg = document.getElementById("dz-scene");
  if (!dataEl || !svg) return;
  const D = JSON.parse(dataEl.textContent);
  const byId = (list, id) => list.find((x) => x.id === id) || list[0];
  const $ = (id) => document.getElementById(id);
  const guestsEl = $("dz-guests");
  const STORE = "allureDesign";

  /* ---------- State ---------- */
  const state = {
    occasion: D.occasions[0].id, guests: D.occasions[0].defaultGuests, venue: D.venues[0].id,
    palette: (D.palettes[1] || D.palettes[0]).id, flower: D.flowers[0].id, level: "lush", table: D.tables[0].id,
    chair: D.chairs[0].id, backdrop: (D.backdrops[1] || D.backdrops[0]).id, extras: []
  };
  try { Object.assign(state, JSON.parse(localStorage.getItem(STORE) || "{}")); } catch (e) {}
  try { const d = new URLSearchParams(location.search).get("d"); if (d) Object.assign(state, JSON.parse(decodeURIComponent(escape(atob(d))))); } catch (e) {}
  if (!Array.isArray(state.extras)) state.extras = [];
  if (state.occasion === "proposal" && state.backdrop === "flowerwall" && !localStorage.getItem(STORE)) state.backdrop = "heart";

  function syncInputs() {
    ["occasion", "venue", "palette", "flower", "level", "table", "chair", "backdrop"].forEach((g) => {
      const el = document.querySelector(`input[name="${g}"][value="${state[g]}"]`);
      if (el) el.checked = true;
    });
    document.querySelectorAll('input[name="extras"]').forEach((el) => (el.checked = state.extras.includes(el.value)));
    const occ = byId(D.occasions, state.occasion);
    guestsEl.min = occ.minGuests; guestsEl.max = occ.maxGuests;
    state.guests = Math.min(occ.maxGuests, Math.max(occ.minGuests, +state.guests || occ.defaultGuests));
    guestsEl.value = state.guests;
  }

  document.querySelectorAll(".dz__steps input[type=radio]").forEach((el) =>
    el.addEventListener("change", () => {
      state[el.name] = el.value;
      if (el.name === "occasion") {
        const occ = byId(D.occasions, el.value);
        state.guests = occ.defaultGuests;
        if (el.value === "proposal" && state.backdrop === "flowerwall") state.backdrop = "heart";
      }
      update();
    })
  );
  document.querySelectorAll('input[name="extras"]').forEach((el) =>
    el.addEventListener("change", () => {
      state.extras = [...document.querySelectorAll('input[name="extras"]:checked')].map((x) => x.value);
      update();
    })
  );
  guestsEl.addEventListener("input", () => { state.guests = +guestsEl.value; update(); });

  /* ---------- Price ---------- */
  const money = (n) => "£" + Math.round(n).toLocaleString("en-GB");
  function tableCount() {
    const occ = byId(D.occasions, state.occasion);
    if (state.occasion === "proposal" && state.guests <= 2) return 1;
    const seats = state.table === "long" ? 10 : state.table === "lounge" ? 6 : Math.max(8, occ.seats);
    return Math.max(1, Math.ceil(state.guests / seats));
  }
  function estimate() {
    const occ = byId(D.occasions, state.occasion);
    const t = tableCount();
    const fl = byId(D.flowers, state.flower), lv = byId(D.flowerLevels, state.level);
    const tb = byId(D.tables, state.table), ch = byId(D.chairs, state.chair), bd = byId(D.backdrops, state.backdrop);
    const lines = [
      [`${occ.label}: planning and styling`, occ.low, occ.high],
      [`${t} ${tb.label.toLowerCase().replace(/s$/, "")}${t > 1 ? "s" : ""} with linen`, tb.low * t, tb.high * t],
      [`${state.guests} ${ch.label.toLowerCase().replace(/s$/, "")}${state.guests > 1 ? "s" : ""}`, ch.low * state.guests, ch.high * state.guests],
      [`${lv.label} ${fl.label.toLowerCase()} on ${t} table${t > 1 ? "s" : ""}`, fl.low * lv.mult * t, fl.high * lv.mult * t]
    ];
    if (bd.low) lines.push([bd.label, bd.low, bd.high]);
    state.extras.forEach((id) => { const x = byId(D.extras, id); lines.push([x.label, x.low, x.high]); });
    const low = Math.floor(lines.reduce((a, l) => a + l[1], 0) / 50) * 50;
    const high = Math.ceil(lines.reduce((a, l) => a + l[2], 0) / 50) * 50;
    return { lines, low, high, tables: t };
  }

  /* ---------- Drawing helpers ---------- */
  let seed = 1;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const shade = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16);
    const c = (s) => Math.max(0, Math.min(255, ((n >> s) & 255) + amt));
    return "#" + ((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, "0");
  };

  function venue(id, pal) {
    let s = "";
    if (id === "ballroom") {
      s += `<rect width="1200" height="440" fill="#efe5d8"/>`;
      for (let x = 40; x < 1200; x += 190) s += `<rect x="${x}" y="150" width="150" height="250" fill="none" stroke="#e0d2c0" stroke-width="4"/>`;
      s += `<path d="M0 0 H1200 V60 Q1050 150 900 60 Q750 150 600 60 Q450 150 300 60 Q150 150 0 60Z" fill="#fbf8f2"/>`;
      s += `<path d="M0 0 V340 Q40 200 70 0Z M1200 0 V340 Q1160 200 1130 0Z" fill="#f6efe5"/>`;
      [300, 600, 900].forEach((x) => {
        s += `<line x1="${x}" y1="0" x2="${x}" y2="60" stroke="#c9a45c" stroke-width="3"/>`;
        s += `<g fill="#f7e7b8" stroke="#c9a45c" stroke-width="2"><path d="M${x - 50} 70 Q${x} 120 ${x + 50} 70Z"/></g>`;
        for (let i = -40; i <= 40; i += 10) s += `<line x1="${x + i}" y1="76" x2="${x + i}" y2="${100 + Math.abs(i) * -0.3 + 10}" stroke="#e9d9a8" stroke-width="2"/><circle cx="${x + i}" cy="${110 + Math.abs(i) * -0.3}" r="3.5" fill="#fff6d6"/>`;
      });
      s += `<rect y="440" width="1200" height="280" fill="#e8e0d4"/>`;
      for (let x = -200; x < 1400; x += 160) s += `<line x1="${x}" y1="440" x2="${x + (x - 600) * 0.9}" y2="720" stroke="#dcd2c4" stroke-width="2"/>`;
    } else if (id === "garden") {
      s += `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe0ea"/><stop offset="1" stop-color="#f6efe4"/></linearGradient></defs>`;
      s += `<rect width="1200" height="440" fill="url(#sky)"/>`;
      s += `<path d="M0 0 L600 -20 L1200 0 V40 Q900 90 600 40 Q300 90 0 40Z" fill="#fffdf9" opacity=".9"/>`;
      for (let x = -40; x < 1240; x += 85) s += `<ellipse cx="${x}" cy="${360 + (x % 3) * 8}" rx="80" ry="${110 + (x % 5) * 6}" fill="${["#7f936b", "#8fa37a", "#6f8460"][x % 3 === 0 ? 0 : x % 2 ? 1 : 2]}"/>`;
      s += `<rect y="430" width="1200" height="290" fill="#a8b98c"/>`;    } else if (id === "dining") {
      s += `<rect width="1200" height="440" fill="#5d4033"/>`;
      for (let x = 30; x < 1200; x += 150) s += `<rect x="${x}" y="40" width="120" height="360" fill="none" stroke="#735244" stroke-width="5"/>`;
      s += `<rect x="440" y="50" width="320" height="300" fill="#d8dde0"/><rect x="440" y="50" width="320" height="300" fill="none" stroke="#e9e2d6" stroke-width="10"/><line x1="600" y1="50" x2="600" y2="350" stroke="#e9e2d6" stroke-width="8"/>`;
      s += `<path d="M400 30 Q420 200 380 370 H460 Q440 200 470 30Z M800 30 Q780 200 820 370 H740 Q760 200 730 30Z" fill="${shade(pal[1], -40)}"/>`;
      s += `<rect y="440" width="1200" height="280" fill="#8a6a52"/>`;
      for (let x = -400; x < 1600; x += 60) s += `<line x1="${x}" y1="440" x2="${x + 300}" y2="720" stroke="#7a5c46" stroke-width="2"/>`;
    } else if (id === "rooftop") {
      s += `<defs><linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e2741"/><stop offset="1" stop-color="#4a4a68"/></linearGradient></defs>`;
      s += `<rect width="1200" height="440" fill="url(#night)"/>`;
      for (let i = 0; i < 40; i++) s += `<circle cx="${rnd() * 1200}" cy="${rnd() * 180}" r="${rnd() * 1.6 + .4}" fill="#fff" opacity=".7"/>`;
      let x = 0;
      while (x < 1200) { const w = 50 + rnd() * 80, h = 90 + rnd() * 200; s += `<rect x="${x}" y="${420 - h}" width="${w}" height="${h + 20}" fill="#2a2f45"/>`; for (let wy = 430 - h; wy < 400; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 18) if (rnd() > .55) s += `<rect x="${wx}" y="${wy}" width="8" height="10" fill="#f3d98b" opacity=".8"/>`; x += w + 6; }
      s += `<rect y="400" width="1200" height="40" fill="#3a3a44"/><rect y="440" width="1200" height="280" fill="#6e655d"/>`;
      for (let y = 450; y < 720; y += 26) s += `<line x1="0" y1="${y}" x2="1200" y2="${y}" stroke="#5f574f" stroke-width="2"/>`;
    } else if (id === "loft") {
      s += `<rect width="1200" height="440" fill="#a65f45"/>`;
      for (let y = 0; y < 440; y += 22) { s += `<line x1="0" y1="${y}" x2="1200" y2="${y}" stroke="#8e4f39" stroke-width="2"/>`; for (let x = (y / 22) % 2 ? 0 : 30; x < 1200; x += 60) s += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 22}" stroke="#8e4f39" stroke-width="2"/>`; }
      [200, 420, 780, 1000].forEach((px) => { s += `<line x1="${px}" y1="0" x2="${px}" y2="110" stroke="#222" stroke-width="2"/><path d="M${px - 26} 130 Q${px} 95 ${px + 26} 130Z" fill="#222"/><circle cx="${px}" cy="134" r="9" fill="#ffe7a6"/>`; });
      s += `<rect y="440" width="1200" height="280" fill="#b9b2a8"/>`;
    } else {
      s += `<rect width="1200" height="440" fill="#ece5dc"/>`;
      s += `<rect x="100" y="80" width="260" height="270" fill="#dfe6ea" stroke="#fff" stroke-width="12"/><line x1="230" y1="80" x2="230" y2="350" stroke="#fff" stroke-width="8"/>`;
      s += `<rect x="880" y="120" width="120" height="150" fill="#d9c7b6" stroke="#c9a45c" stroke-width="6"/><rect x="1030" y="150" width="90" height="110" fill="#cdbba8" stroke="#c9a45c" stroke-width="6"/>`;
      s += `<path d="M60 440 q30 -120 60 -150 q20 60 -10 150Z" fill="#7f936b"/>`;
      s += `<rect y="440" width="1200" height="280" fill="#c9a98a"/>`;
      for (let y = 450; y < 720; y += 30) s += `<line x1="0" y1="${y}" x2="1200" y2="${y}" stroke="#b8977a" stroke-width="2"/>`;
    }
    return s;
  }

  function bloom(x, y, style, pal, r) {
    const c = [pal[0], pal[1], pal[0], pal[1], "#ffffff"][Math.floor(rnd() * 5)];
    if (style === "hydrangea") { let s = ""; for (let i = 0; i < 6; i++) s += `<circle cx="${x + (rnd() - .5) * r * 1.6}" cy="${y + (rnd() - .5) * r * 1.6}" r="${r * .38}" fill="${i % 2 ? pal[1] : shade(pal[1], 25)}"/>`; return s; }
    if (style === "dried") return `<ellipse cx="${x}" cy="${y}" rx="${r * .45}" ry="${r * 1.3}" fill="#e8dcc4" transform="rotate(${(rnd() - .5) * 50} ${x} ${y})"/>`;
    if (style === "wild") return `<line x1="${x}" y1="${y}" x2="${x + (rnd() - .5) * 8}" y2="${y + r * 1.5}" stroke="${pal[3]}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${r * .45}" fill="${c}"/>`;
    if (style === "orchids") return `<circle cx="${x}" cy="${y}" r="${r * .55}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${r * .2}" fill="${shade(pal[1], -40)}"/>`;
    const rr = style === "peonies" ? r * 1.25 : r;
    return `<circle cx="${x}" cy="${y}" r="${rr}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${rr * .5}" fill="none" stroke="${shade(c, -25)}" stroke-width="1.5"/>`;
  }

  function centrepiece(x, y, scale, pal) {
    const lv = state.level, style = state.flower;
    const r = 9 * scale;
    let s = "", cy = y - 10 * scale, w = (lv === "minimal" ? 28 : 46) * scale, n = lv === "minimal" ? 7 : 14;
    if (lv === "statement") { s += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 110 * scale}" stroke="#c9a45c" stroke-width="${3 * scale}"/><ellipse cx="${x}" cy="${y}" rx="${10 * scale}" ry="${3 * scale}" fill="#c9a45c"/>`; cy = y - 125 * scale; w = 60 * scale; n = 22; }
    for (let i = 0; i < 6; i++) s += `<ellipse cx="${x + (rnd() - .5) * w * 2}" cy="${cy + (rnd() - .2) * 14 * scale}" rx="${12 * scale}" ry="${5 * scale}" fill="${pal[3]}" transform="rotate(${(rnd() - .5) * 60} ${x} ${cy})"/>`;
    if (style === "orchids") s += `<path d="M${x} ${cy} q${30 * scale} ${-50 * scale} ${70 * scale} ${-20 * scale}" stroke="${pal[3]}" stroke-width="${2 * scale}" fill="none"/>`;
    for (let i = 0; i < n; i++) s += bloom(x + (rnd() - .5) * w * 1.6, cy + (rnd() - .6) * (lv === "statement" ? 40 : 22) * scale, style, pal, r);
    if (state.extras.includes("candles")) [-1, 1].forEach((d) => (s += candle(x + d * (w + 14 * scale), y, scale)));
    return s;
  }
  function candle(x, y, sc) { return `<rect x="${x - 4 * sc}" y="${y - 22 * sc}" width="${8 * sc}" height="${22 * sc}" fill="#fffaf0"/><ellipse cx="${x}" cy="${y - 27 * sc}" rx="${3 * sc}" ry="${6 * sc}" fill="#ffc861"/><circle cx="${x}" cy="${y - 27 * sc}" r="${14 * sc}" fill="#ffd98a" opacity=".25"/>`; }

  function chair(x, y, sc, pal, front) {
    const t = state.chair, h = 70 * sc, w = 34 * sc;
    const col = { chiavari: "#c9a45c", ghost: "rgba(255,255,255,.55)", crossback: "#8a6244", louis: "#efe6d8", velvet: shade(pal[2] === "#ffffff" ? pal[1] : pal[2], -10) }[t];
    const st = t === "ghost" ? "#b9c3cb" : shade(t === "velvet" ? col : t === "louis" ? "#c9a45c" : col, -30);
    let s = `<g stroke="${st}" stroke-width="${2 * sc}">`;
    if (t === "chiavari") { s += `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" fill="none" stroke="${col}" stroke-width="${4 * sc}"/>`; for (let i = 1; i < 4; i++) s += `<line x1="${x - w / 2}" y1="${y - h + i * h / 4.5}" x2="${x + w / 2}" y2="${y - h + i * h / 4.5}" stroke="${col}" stroke-width="${3 * sc}"/>`; }
    else if (t === "crossback") s += `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" fill="none" stroke="${col}" stroke-width="${5 * sc}"/><path d="M${x - w / 2} ${y - h} L${x + w / 2} ${y - h * .35} M${x + w / 2} ${y - h} L${x - w / 2} ${y - h * .35}" stroke="${col}" stroke-width="${4 * sc}"/>`;
    else if (t === "louis") s += `<ellipse cx="${x}" cy="${y - h * .62}" rx="${w * .55}" ry="${h * .42}" fill="${col}" stroke="#c9a45c" stroke-width="${3 * sc}"/>`;
    else if (t === "ghost") s += `<ellipse cx="${x}" cy="${y - h * .6}" rx="${w * .55}" ry="${h * .45}" fill="${col}"/>`;
    else s += `<path d="M${x - w / 2} ${y} V${y - h * .8} Q${x} ${y - h * 1.15} ${x + w / 2} ${y - h * .8} V${y}Z" fill="${col}"/>`;
    s += `</g>`;
    if (!front) s = `<g opacity=".95">${s}</g>`;
    return s;
  }

  function table(x, y, sc, pal) {
    const t = state.table, linen = pal[0] === "#b3192e" || pal[0] === "#7a2232" ? "#fbf8f3" : "#fbf8f3";
    let s = "";
    if (t === "lounge") {
      s += `<rect x="${x - 110 * sc}" y="${y - 40 * sc}" width="${220 * sc}" height="${60 * sc}" rx="${20 * sc}" fill="${shade(pal[1], -15)}"/><rect x="${x - 120 * sc}" y="${y - 70 * sc}" width="${240 * sc}" height="${45 * sc}" rx="${18 * sc}" fill="${shade(pal[1], -30)}"/>`;
      s += `<ellipse cx="${x}" cy="${y + 50 * sc}" rx="${60 * sc}" ry="${14 * sc}" fill="#f4efe8" stroke="#c9a45c" stroke-width="${2 * sc}"/>`;
      return s + centrepiece(x, y + 48 * sc, sc * .8, pal);
    }
    const back = [], frontCh = [];
    if (t === "long") {
      const half = 230 * sc;
      for (let i = -3; i <= 3; i++) back.push(chair(x + i * 65 * sc, y - 4 * sc, sc * .85, pal, false));
      s += back.join("");
      s += `<path d="M${x - half} ${y} L${x + half} ${y} L${x + half + 30 * sc} ${y + 26 * sc} L${x - half - 30 * sc} ${y + 26 * sc}Z" fill="${linen}"/>`;
      s += `<rect x="${x - half - 30 * sc}" y="${y + 26 * sc}" width="${(half + 30 * sc) * 2}" height="${60 * sc}" fill="${shade(linen, -8)}"/>`;
      s += `<rect x="${x - half}" y="${y + 6 * sc}" width="${half * 2}" height="${12 * sc}" fill="${pal[3]}" opacity=".35"/>`;
      for (let i = -2; i <= 2; i++) s += centrepiece(x + i * 90 * sc, y + 14 * sc, sc * .8, pal);
      for (let i = -3; i <= 3; i += 2) frontCh.push(chair(x + i * 70 * sc, y + 100 * sc, sc * 1.05, pal, true));
      return s + frontCh.join("");
    }
    [-1, 0, 1].forEach((d) => back.push(chair(x + d * 70 * sc, y - 6 * sc, sc * .8, pal, false)));
    s += back.join("");
    s += `<path d="M${x - 120 * sc} ${y} Q${x - 128 * sc} ${y + 60 * sc} ${x - 120 * sc} ${y + 90 * sc} H${x + 120 * sc} Q${x + 128 * sc} ${y + 60 * sc} ${x + 120 * sc} ${y}Z" fill="${shade(linen, -8)}"/>`;
    s += `<ellipse cx="${x}" cy="${y}" rx="${120 * sc}" ry="${32 * sc}" fill="${linen}"/>`;
    s += centrepiece(x, y + 2 * sc, sc, pal);
    [-1, 1].forEach((d) => frontCh.push(chair(x + d * 85 * sc, y + 108 * sc, sc * 1.05, pal, true)));
    return s + frontCh.join("");
  }

  function backdrop(pal) {
    const b = state.backdrop; let s = "";
    if (b === "flowerwall") {
      s += `<rect x="440" y="120" width="320" height="320" fill="${pal[3]}"/>`;
      for (let i = 0; i < 150; i++) s += bloom(450 + rnd() * 300, 130 + rnd() * 300, state.flower === "dried" ? "roses" : state.flower, pal, 14);
    } else if (b === "heart") {
      const pts = [];
      for (let a = 0; a < Math.PI * 2; a += 0.06) { const hx = 16 * Math.sin(a) ** 3, hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); pts.push([600 + hx * 11, 270 - hy * 11]); }
      pts.forEach(([x, y]) => { s += bloom(x + (rnd() - .5) * 10, y + (rnd() - .5) * 10, "roses", pal, 16); s += bloom(x + (rnd() - .5) * 24, y + (rnd() - .5) * 24, "roses", pal, 12); s += bloom(x + (rnd() - .5) * 24, y + (rnd() - .5) * 24, "roses", pal, 10); });
      s += `<line x1="600" y1="420" x2="600" y2="440" stroke="#c9a45c" stroke-width="6"/>`;
      if (state.occasion === "proposal" && !state.extras.includes("neon")) s += `<text x="600" y="280" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="54" fill="#fff6dc" filter="url(#glow)">Marry me?</text>`;
    } else if (b === "arch") {
      s += `<path d="M450 440 V280 A150 150 0 0 1 750 280 V440" fill="none" stroke="#c9a45c" stroke-width="10"/>`;
      s += `<path d="M455 280 Q470 360 440 440 H500 Q470 360 470 250Z M745 280 Q730 360 760 440 H700 Q730 360 730 250Z" fill="#fffdf8" opacity=".9"/>`;
      for (let i = 0; i < 26; i++) s += bloom(470 + rnd() * 90, 170 + rnd() * 90, state.flower, pal, 14);
      for (let i = 0; i < 14; i++) s += bloom(690 + rnd() * 60, 380 + rnd() * 50, state.flower, pal, 12);
    } else if (b === "balloons") {
      for (let a = 0; a <= Math.PI; a += 0.07) { const x = 600 - Math.cos(a) * 200, y = 430 - Math.sin(a) * 240; [0, 1].forEach(() => { const c = [pal[0], pal[1], pal[2], "#ffffff"][Math.floor(rnd() * 4)]; s += `<circle cx="${x + (rnd() - .5) * 40}" cy="${y + (rnd() - .5) * 40}" r="${14 + rnd() * 16}" fill="${c}" stroke="${shade(c, -18)}" stroke-width="1.5"/>`; }); }
    }
    return s;
  }

  function neonText() {
    return { proposal: "Marry me?", engagement: "Better together", "bridal-shower": "Bride to be", "baby-shower": "Oh baby", birthday: "Let's celebrate", wedding: "Happily ever after" }[state.occasion] || "Love";
  }

  function draw() {
    seed = 7;
    const pal = byId(D.palettes, state.palette).colors;
    let s = `<defs><filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    s += venue(state.venue, pal);
    if (state.extras.includes("lights")) for (let k = 0; k < 4; k++) { const y0 = 20 + k * 22; let p = `M0 ${y0}`; for (let x = 0; x < 1200; x += 150) p += ` Q${x + 75} ${y0 + 60} ${x + 150} ${y0}`; s += `<path d="${p}" stroke="#4b4038" stroke-width="1.2" fill="none" opacity=".6"/>`; for (let x = 0; x < 1200; x += 25) { const tt = (x % 150) / 150; s += `<circle cx="${x}" cy="${y0 + 120 * tt * (1 - tt)}" r="3" fill="#fff1b8"/><circle cx="${x}" cy="${y0 + 120 * tt * (1 - tt)}" r="8" fill="#ffe9a0" opacity=".18"/>`; } }
    s += backdrop(pal);
    if (state.extras.includes("neon")) { const y = state.backdrop === "none" ? 250 : 100; const w = neonText().length * 27 + 70; s += `<rect x="${600 - w / 2}" y="${y - 62}" width="${w}" height="86" rx="10" fill="#1d1916" opacity=".88"/><text x="600" y="${y}" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="64" fill="#fff4e6" stroke="${[pal[2], pal[1], pal[0], "#e8d5c9"].find((c) => { const n = parseInt(c.slice(1), 16), l = ((n >> 16) & 255) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11; return l > 90 && l < 235; })}" stroke-width="2" filter="url(#glow)">${neonText()}</text>`; }
    if (state.extras.includes("dancefloor")) { s += `<path d="M420 470 H780 L840 540 H360Z" fill="#fbfaf7"/>`; for (let i = 0; i < 8; i++) s += `<line x1="${420 + i * 45}" y1="470" x2="${360 + i * 60}" y2="540" stroke="#e7e2da" stroke-width="2"/>`; }
    if (state.extras.includes("candles") && state.backdrop !== "none") [480, 520, 680, 720].forEach((x, i) => (s += candle(x, 455 + (i % 2) * 8, 1.4)));
    // side pieces
    const slots = [[110, 470], [1090, 470], [1110, 640]];
    const side = ["photobooth", "booth360", "dessert", "music"].filter((x) => state.extras.includes(x)).slice(0, 3);
    side.forEach((id, i) => { const [x, y] = slots[i]; s += sidePiece(id, x, y, pal); });
    if (state.extras.includes("welcome")) s += `<g><line x1="70" y1="710" x2="95" y2="600" stroke="#8a6244" stroke-width="5"/><line x1="140" y1="710" x2="115" y2="600" stroke="#8a6244" stroke-width="5"/><rect x="60" y="560" width="90" height="110" fill="#fffdf8" stroke="#c9a45c" stroke-width="3"/><text x="105" y="605" text-anchor="middle" font-family="Cormorant Garamond, serif" font-style="italic" font-size="20" fill="#1d1916">Welcome</text><line x1="80" y1="625" x2="130" y2="625" stroke="${pal[1]}" stroke-width="3"/></g>`;
    // tables
    const n = state.table === "long" ? 1 : Math.min(3, tableCount());
    const pos = n === 1 ? [[600, 545, state.table === "long" ? 1.2 : 1.5]] : n === 2 ? [[380, 570, 1], [820, 570, 1]] : [[240, 585, .9], [600, 560, 1], [960, 585, .9]];
    pos.forEach(([x, y, sc]) => (s += table(x, y, sc, pal)));
    if (tableCount() > n && state.table !== "long") s += `<g><rect x="1010" y="12" width="176" height="40" rx="20" fill="rgba(29,25,22,.7)"/><text x="1098" y="38" text-anchor="middle" font-family="Jost, Arial, sans-serif" font-size="18" fill="#fff">${tableCount()} tables in total</text></g>`;
    svg.innerHTML = `<title id="dz-scene-title">An illustration of your event</title>` + s;
  }

  function sidePiece(id, x, y, pal) {
    if (id === "photobooth") return `<g><rect x="${x - 55}" y="${y - 150}" width="110" height="150" fill="#1d1916"/><rect x="${x - 45}" y="${y - 140}" width="90" height="26" fill="${pal[1]}"/><text x="${x}" y="${y - 122}" text-anchor="middle" font-family="Jost, Arial" font-size="11" letter-spacing="1" fill="#1d1916">PHOTO BOOTH</text><circle cx="${x}" cy="${y - 75}" r="22" fill="#333" stroke="#c9a45c" stroke-width="4"/><circle cx="${x}" cy="${y - 75}" r="9" fill="#7b8fa5"/></g>`;
    if (id === "booth360") return `<g><ellipse cx="${x}" cy="${y}" rx="80" ry="20" fill="#f2efe9" stroke="#c9a45c" stroke-width="3"/><line x1="${x}" y1="${y}" x2="${x + 70}" y2="${y - 120}" stroke="#555" stroke-width="5"/><rect x="${x + 60}" y="${y - 140}" width="26" height="20" fill="#222"/><text x="${x}" y="${y + 40}" text-anchor="middle" font-family="Jost, Arial" font-size="14" letter-spacing="2" fill="#1d1916">360 BOOTH</text></g>`;
    if (id === "dessert") return `<g><rect x="${x - 70}" y="${y - 40}" width="140" height="40" fill="#fbf8f3"/><rect x="${x - 70}" y="${y}" width="140" height="50" fill="#f1ebe3"/><rect x="${x - 22}" y="${y - 100}" width="44" height="22" fill="#fffaf2" stroke="${pal[1]}"/><rect x="${x - 30}" y="${y - 78}" width="60" height="22" fill="#fffaf2" stroke="${pal[1]}"/><rect x="${x - 38}" y="${y - 56}" width="76" height="16" fill="#fffaf2" stroke="${pal[1]}"/>${bloom(x - 10, y - 102, "roses", pal, 7)}${bloom(x + 8, y - 104, "roses", pal, 6)}</g>`;
    if (id === "music") return `<g><path d="M${x - 50} ${y} V${y - 60} Q${x - 50} ${y - 100} ${x} ${y - 100} Q${x + 60} ${y - 100} ${x + 60} ${y - 40} V${y}Z" fill="#1d1916"/><rect x="${x - 50}" y="${y - 40}" width="110" height="12" fill="#fff"/></g>`;
    return "";
  }

  /* ---------- Summary ---------- */
  function update() {
    syncInputs();
    const occ = byId(D.occasions, state.occasion);
    $("dz-guests-out").textContent = `${state.guests} guest${state.guests > 1 ? "s" : ""}`;
    draw();
    const e = estimate();
    const range = `${money(e.low)} to ${money(e.high)}`;
    $("dz-total").textContent = range;
    $("dz-total-2").textContent = range;
    const list = $("dz-lines");
    list.innerHTML = "";
    const v = byId(D.venues, state.venue), p = byId(D.palettes, state.palette);
    [["Occasion", occ.label], ["Guests", String(state.guests)], ["Venue", v.label + " (venue hire not included)"], ["Colours", p.label]].forEach(([k, val]) => {
      const li = document.createElement("li"); const b = document.createElement("span"); b.textContent = k; const t = document.createElement("span"); t.textContent = val; li.append(b, t); list.append(li);
    });
    e.lines.forEach(([label, lo, hi]) => {
      const li = document.createElement("li"); const a = document.createElement("span"); a.textContent = label; const b = document.createElement("span"); b.textContent = `${money(Math.floor(lo / 10) * 10)} to ${money(Math.ceil(hi / 10) * 10)}`; li.append(a, b); list.append(li);
    });
    const text = [`Occasion: ${occ.label}`, `Guests: ${state.guests}`, `Venue: ${v.label}`, `Colours: ${p.label}`,
      ...e.lines.map(([l, lo, hi]) => `${l}: ${money(lo)} to ${money(hi)}`), `Estimated total: ${range}`].join("\n");
    $("dz-design").value = text;
    $("dz-estimate").value = range;
    $("dz-subject").value = `New ${occ.label.toLowerCase()} design (${state.guests} guests, ${range})`;
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (err) {}
  }

  const link = () => location.origin + location.pathname + "?d=" + btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  const shareBtn = $("dz-share");
  if (shareBtn) shareBtn.addEventListener("click", () => {
    const url = link(), msg = $("dz-share-msg");
    const done = (t) => (msg.textContent = t);
    try { navigator.clipboard.writeText(url).then(() => done("Link copied. Send it to your partner or a friend."), () => done(url)); } catch (e) { done(url); }
  });

  update();
})();
