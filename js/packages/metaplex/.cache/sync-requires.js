
// prefer default export if available
const preferDefault = m => (m && m.default) || m


exports.components = {
  "component---src-pages-404-tsx": preferDefault(require("/Users/jprince/Documents/other/metaplex/js/packages/metaplex/src/pages/404.tsx")),
  "component---src-pages-contact-tsx": preferDefault(require("/Users/jprince/Documents/other/metaplex/js/packages/metaplex/src/pages/contact.tsx")),
  "component---src-pages-index-tsx": preferDefault(require("/Users/jprince/Documents/other/metaplex/js/packages/metaplex/src/pages/index.tsx"))
}

