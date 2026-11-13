export default {
  layout: "service.njk",
  permalink: (data) => `/${data.page.fileSlug.toLowerCase()}.html`,
};
