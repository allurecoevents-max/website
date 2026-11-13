export default {
  layout: "article.njk",
  permalink: (data) => `/journal-${data.page.fileSlug.toLowerCase()}.html`,
};
