// Case studies only get a page once "Published" is ticked in the editor.
export default {
  layout: "case-study.njk",
  eleventyComputed: {
    permalink: (data) => (data.published ? `/portfolio/${data.page.fileSlug.toLowerCase()}.html` : false),
  },
};
