import { mergeConfig, type Plugin } from "vite";
import baseConfig from "./vite.config";

function wedPlannedEntryPlugin(): Plugin {
  return {
    name: "wedplanned-public-entry",

    transformIndexHtml: {
      order: "pre",
      handler() {
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="theme-color"
      content="#111111"
    />
    <title>WedPlanned | One Platform for Wedding Professionals</title>
    <meta
      name="description"
      content="WedPlanned brings business management, CRM, website content, client galleries and commerce together in one connected platform for wedding professionals."
    />
    <link rel="canonical" href="https://wedplanned.com/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="WedPlanned" />
    <meta property="og:title" content="WedPlanned | One Platform for Wedding Professionals" />
    <meta
      property="og:description"
      content="Run your wedding business through one connected platform with WedNav, WedCRM, WedStudio and WedStore."
    />
    <meta property="og:url" content="https://wedplanned.com/" />
    <script type="module" src="/src/wedplanned/main.tsx"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
      },
    },
  };
}

export default mergeConfig(baseConfig, {
  plugins: [wedPlannedEntryPlugin()],
  publicDir: "config/wedplanned/public",
  build: {
    outDir: "build-wedplanned",
    emptyOutDir: true,
  },
});
