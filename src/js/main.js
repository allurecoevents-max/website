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

  // Calendly booking calendar
  const cal = document.querySelector("[data-calendly]");
  if (cal && CALENDLY_URL) {
    const widget = document.createElement("div");
    widget.className = "calendly-inline-widget";
    widget.dataset.url = CALENDLY_URL + (CALENDLY_URL.includes("?") ? "&" : "?") + "hide_gdpr_banner=1&primary_color=1d1916";
    cal.appendChild(widget);
    cal.hidden = false;
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
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
