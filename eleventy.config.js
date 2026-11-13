// Eleventy turns the editable content in src/ into the website in _site/.
export default function (eleventyConfig) {
  // Files copied to the site as they are
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/downloads");
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

  // Turn plain text with blank lines into paragraphs
  eleventyConfig.addFilter("paras", (text = "") =>
    String(text)
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
      .join("\n")
  );

  eleventyConfig.addFilter("niceDate", (value) =>
    value ? new Date(value).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : ""
  );
  eleventyConfig.addFilter("year", () => new Date().getFullYear());
  eleventyConfig.addFilter("isoDate", (value) => (value ? new Date(value).toISOString().slice(0, 10) : ""));

  // Responsive photos. On Netlify, images go through the Netlify Image CDN, which
  // resizes them and serves a lighter format (WebP/AVIF) to browsers that support it.
  // Locally the original file is used, so previews still work.
  const onNetlify = process.env.NETLIFY === "true";
  const widths = [480, 800, 1200, 1800];
  const cdn = (src, w) => `/.netlify/images?url=${encodeURIComponent(src)}&amp;w=${w}&amp;q=75`;
  eleventyConfig.addShortcode("image", (src, alt = "", sizes = "100vw", cls = "", lazy = true) => {
    if (!src) return "";
    const attrs = [
      cls && `class="${cls}"`,
      `alt="${escapeHtml(String(alt || ""))}"`,
      lazy ? `loading="lazy" decoding="async"` : `fetchpriority="high"`,
    ].filter(Boolean);
    if (!onNetlify || !src.startsWith("/")) return `<img src="${escapeHtml(src)}" ${attrs.join(" ")}>`;
    const srcset = widths.map((w) => `${cdn(src, w)} ${w}w`).join(", ");
    return `<img src="${cdn(src, 1200)}" srcset="${srcset}" sizes="${sizes}" ${attrs.join(" ")}>`;
  });

  const byOrder = (a, b) => (a.data.order ?? 99) - (b.data.order ?? 99);
  eleventyConfig.addCollection("servicePages", (api) => api.getFilteredByGlob("src/services/*.md").sort(byOrder));
  eleventyConfig.addCollection("areaPages", (api) => api.getFilteredByGlob("src/areas/*.md").sort(byOrder));
  eleventyConfig.addCollection("articles", (api) =>
    api.getFilteredByGlob("src/journal/*.md").sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addCollection("caseStudies", (api) =>
    api.getFilteredByGlob("src/portfolio/*.md").filter((p) => p.data.published).sort((a, b) => b.date - a.date)
  );

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
  };
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
