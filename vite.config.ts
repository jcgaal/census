import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Fills the page title and the optional social image in index.html from
// the same env vars src/site.config.ts reads, so the HTML that crawlers
// see is branded (or neutral) without any code change.
function siteHtml(env: Record<string, string>): Plugin {
  const name = env.VITE_SITE_NAME?.trim() || 'Census';
  const title = `${name} · Customer data demo`;
  const og = env.VITE_OG_IMAGE_URL?.trim();
  const ogTags = og
    ? [
        `<meta property="og:image" content="${esc(og)}" />`,
        '<meta property="og:image:width" content="1200" />',
        '<meta property="og:image:height" content="630" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        `<meta name="twitter:image" content="${esc(og)}" />`,
      ].join('\n    ')
    : '';
  return {
    name: 'site-html',
    transformIndexHtml: (html) => html.replaceAll('%SITE_TITLE%', esc(title)).replace('<!-- og:image -->', ogTags),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), siteHtml(env)],
    server: {
      port: 5173,
      proxy: {
        '/api': `http://localhost:${process.env.PORT ?? 3001}`,
      },
    },
  };
});
