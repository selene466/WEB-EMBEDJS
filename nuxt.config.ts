// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      serverUrl: process.env.SERVER_URL,
    },
  },
  components: {
    dirs: [{ path: "./components", pathPrefix: true }],
  },
  colorMode: {
    preference: "light",
  },
  modules: ["@nuxt/ui", "@formkit/auto-animate/nuxt"],
  compatibilityDate: "2025-01-05",
  experimental: {
    appManifest: false,
  },
});
