import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default tseslint.config(
  // 1. Next.js config first to help with detection
  ...compat.extends("next/core-web-vitals"),

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
      "next-env.d.ts"
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // --- The "Noise Reduction" Fixes ---
      "@next/next/no-html-link-for-pages": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unescaped-entities": "off",       // Fixes errors for ' > } in JSX
      
      // --- TypeScript Relaxed Mode ---
      "@typescript-eslint/no-explicit-any": "off",   // Stops screaming about 'any'
      "@typescript-eslint/no-unused-vars": "warn",   // Change from Error to Warning
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-wrapper-object-types": "warn",
      
      // --- Build Stability ---
      "@next/next/no-img-element": "warn",          // Warn instead of fail for <img>
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  }
);
