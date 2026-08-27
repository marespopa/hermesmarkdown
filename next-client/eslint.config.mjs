import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextConfig from "eslint-config-next/core-web-vitals";

export default tseslint.config(
  ...nextConfig,

  {
    // Global ignores - stops ESLint from scanning heavy/generated folders
    ignores: [
      ".next/**", 
      "node_modules/**", 
      ".yarn/**",
      "out/**", 
      "build/**", 
      "public/**",
      "**/*.config.js",
      "next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // --- The "Noise Reduction" Fixes ---
      "react/react-in-jsx-scope": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/preserve-manual-memoization": "off",

      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-wrapper-object-types": "warn",

      "@next/next/no-img-element": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  }
);
