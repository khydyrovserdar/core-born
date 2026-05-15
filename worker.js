// Cloudflare Worker — serves static assets and proxies model chunks

export default {
  async fetch(request, env) {
    // Serve everything from static assets (including /chunks/)
    return env.ASSETS.fetch(request);
  },
};
