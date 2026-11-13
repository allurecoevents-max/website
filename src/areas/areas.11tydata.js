export default {
  layout: "area.njk",
  permalink: (data) => `/event-planner-${data.page.fileSlug.toLowerCase()}.html`,
};
