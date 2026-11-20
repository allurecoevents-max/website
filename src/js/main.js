/* ==========================================================================
   Allure & Co Events — site settings + small interactions
   ========================================================================== */

// WhatsApp, Calendly and email come from Site settings in the editor
// (src/_data/site.json), passed in on the <body> tag.

document.addEventListener("DOMContentLoaded", () => {
  const settings = document.body.dataset;
  const WHATSAPP_NUMBER = (settings.whatsapp || "").replace(/\D/g, "");
  const WHATSAPP_MESSAGE = settings.whatsappMessage || "";
  const CALENDLY_URL = (settings.calendly || "").trim();

  // Mobile menu
  const toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".nav a").forEach((link) =>
      link.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // Header border once the page scrolls
  const header = document.querySelector(".site-header");
  const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 10);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Fade sections in as they scroll into view
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // WhatsApp button
  const wa = document.querySelector(".whatsapp");
  if (wa && WHATSAPP_NUMBER) {
    wa.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    wa.hidden = false;
  }

  // Calendly booking calendar. Its script is heavy, so it only loads when the
  // visitor scrolls near the booking section, which keeps the page fast.
  // (The <body> also carries data-calendly for the settings, so target the section itself.)
  const cal = document.querySelector(".calendly-wrap[data-calendly]");
  if (cal && CALENDLY_URL) {
    const widget = document.createElement("div");
    widget.className = "calendly-inline-widget";
    widget.dataset.url = CALENDLY_URL + (CALENDLY_URL.includes("?") ? "&" : "?") + "hide_gdpr_banner=1&primary_color=1d1916";
    cal.appendChild(widget);
    cal.hidden = false;
    let loaded = false;
    const loadCalendly = () => {
      if (loaded) return;
      loaded = true;
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      document.body.appendChild(script);
    };
    if ("IntersectionObserver" in window) {
      const calIo = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { loadCalendly(); calIo.disconnect(); }
      }, { rootMargin: "800px 0px" });
      calIo.observe(cal);
    } else {
      loadCalendly();
    }
  }

  // Remember where this visit started (e.g. ?from=instagram, Google, Hitched),
  // so each enquiry email says how the person found the website.
  let source = null;
  try {
    source = JSON.parse(sessionStorage.getItem("allureSource") || "null");
    if (!source) {
      const from = new URLSearchParams(location.search).get("from");
      let ref = "";
      try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
      if (ref === location.hostname) ref = "";
      source = { from: from || ref.replace(/^www\./, "") || "Direct or unknown", page: location.pathname };
      sessionStorage.setItem("allureSource", JSON.stringify(source));
    }
  } catch (e) { source = null; }
  document.querySelectorAll('input[name="cameFrom"]').forEach((i) => (i.value = source ? source.from : ""));
  document.querySelectorAll('input[name="firstPage"]').forEach((i) => (i.value = source ? source.page : location.pathname));

  // Pages about one kind of event (e.g. Proposals) send visitors to the form
  // with that event already chosen: /?type=Proposal#contact
  const pageType = settings.enquiryType;
  if (pageType) {
    document.querySelectorAll('a[href="/#contact"]').forEach((a) => {
      a.href = `/?type=${encodeURIComponent(pageType)}#contact`;
    });
  }

  // Enquiry form: the questions adapt to what the visitor is planning
  const enquiry = document.querySelector("form[data-enquiry]");
  if (enquiry) {
    const radios = enquiry.querySelectorAll('input[name="eventType"]');
    const budget = enquiry.querySelector("select[data-budgets]");
    const budgets = JSON.parse(budget.dataset.budgets);
    const date = enquiry.querySelector("#f-date");
    const flex = enquiry.querySelector("#f-flex");
    const subject = enquiry.querySelector('input[name="_subject"]');

    const setBudgets = (type) => {
      const list = budgets[type] || budgets.default;
      const current = budget.value;
      budget.innerHTML = '<option value="">Please choose</option>' + list.map((b) => `<option>${b}</option>`).join("");
      if (list.includes(current)) budget.value = current;
    };
    const showFor = (el, type) => {
      const show = el.dataset.showFor ? el.dataset.showFor.split("|").includes(type) : !el.dataset.hideFor.split("|").includes(type);
      el.hidden = !show;
      el.querySelectorAll("input, select, textarea").forEach((i) => (i.disabled = !show));
    };
    const applyType = (type) => {
      enquiry.querySelectorAll("[data-show-for], [data-hide-for]").forEach((el) => showFor(el, type || ""));
      setBudgets(type);
    };

    radios.forEach((r) => r.addEventListener("change", () => applyType(r.value)));
    flex.addEventListener("change", () => {
      date.disabled = flex.checked;
      if (flex.checked) date.value = "";
    });
    enquiry.addEventListener("submit", () => {
      const type = enquiry.querySelector('input[name="eventType"]:checked')?.value || "event";
      const name = enquiry.querySelector("#f-first").value.trim();
      subject.value = `New ${type.toLowerCase()} enquiry${name ? " from " + name : ""}`;
    }, true);
    enquiry.addEventListener("reset", () => setTimeout(() => applyType(""), 0));

    // Pre-select the event type from the link the visitor followed
    const wanted = new URLSearchParams(location.search).get("type");
    const match = wanted && [...radios].find((r) => r.value.toLowerCase() === wanted.toLowerCase());
    if (match) match.checked = true;
    applyType(match ? match.value : "");
  }

  // Forms: send to Formspree without leaving the page
  document.querySelectorAll("form[data-ajax]").forEach((form) => {
    const status = form.querySelector(".form-status");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      const label = button.textContent;
      button.disabled = true;
      button.textContent = "Sending…";
      status.className = "form-status";
      status.textContent = "";
      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Request failed");
        form.reset();
        if (form.dataset.success) {
          window.location.href = form.dataset.success;
          return;
        }
        status.classList.add("ok");
        status.textContent = form.dataset.thanks || "Thank you! We'll be in touch within 24 hours.";
      } catch (err) {
        status.classList.add("err");
        status.textContent = `Sorry, something went wrong. Please email us at ${settings.email}.`;
      } finally {
        button.disabled = false;
        button.textContent = label;
      }
    });
  });

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
});
