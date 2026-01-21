/**
 * PostCSS Configuration
 * ---------------------
 * Uses explicit CommonJS Tailwind config
 * to prevent node-jiti temp-file issues
 * on macOS and Vite environments.
 */

export default {
  plugins: {
    tailwindcss: {
      config: "./tailwind.config.cjs",
    },
    autoprefixer: {},
  },
};
