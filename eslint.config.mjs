import nextConfig from "eslint-config-next";

/**
 * Flat ESLint config.
 *
 * `eslint-config-next` v16 ships a native flat config, so it is spread
 * directly rather than bridged through `FlatCompat` — the compat layer cannot
 * serialise the plugin graph and throws on a circular structure.
 */
const config = [
  ...nextConfig,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".data/**",
      ".uploads/**",
      "next-env.d.ts",
    ],
  },
];

export default config;
