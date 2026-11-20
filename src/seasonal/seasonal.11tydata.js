// Seasonal landing pages (e.g. Christmas or Valentine's proposals). Same layout as the service pages.
export default {
  layout: "service.njk",
  enquiryType: "Proposal",
  permalink: (data) => `/${data.page.fileSlug.toLowerCase()}.html`,
};
