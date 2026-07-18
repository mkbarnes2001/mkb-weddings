import { mergeConfig, type Plugin } from "vite";
import baseConfig from "./vite.config";

function adminEntryPlugin(): Plugin {
  return {
    name: "photography-intelligence-admin-entry",

    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const mainEntryPattern =
          /(["'])\/?src\/main\.tsx(?:\?[^"']*)?\1/;

        const nextHtml = html.replace(
          mainEntryPattern,
          '"/src/main-admin.tsx"',
        );

        if (nextHtml === html) {
          throw new Error(
            "Admin build could not find the main.tsx entry in index.html.",
          );
        }

        return nextHtml
          .replace(
            /<title>.*?<\/title>/s,
            "<title>Photography Intelligence</title>",
          )
          .replace(
            "</head>",
            '  <meta name="robots" content="noindex, nofollow, noarchive" />\n</head>',
          );
      },
    },
  };
}

export default mergeConfig(baseConfig, {
  plugins: [adminEntryPlugin()],
  build: {
    outDir: "build-admin",
    emptyOutDir: true,
  },
});
