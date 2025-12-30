import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const VITE_API_BASE_URL = env.VITE_API_BASE_URL;

  return {
    base:
      mode === "production" && env.VITE_PUBLIC_URL
        ? env.VITE_PUBLIC_URL
        : "/",

    plugins: [react()],

    css: {
      postcss: {
        plugins: [autoprefixer],
      },
    },

    // ✅ ADD THIS SECTION BELOW
    server: {
      proxy: {
        "/api": {
          target: `${VITE_API_BASE_URL}`, // backend URL
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
