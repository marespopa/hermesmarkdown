import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";

export default tseslint.config(
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
    plugins: {
      "react": reactPlugin,
      "react-hooks": hooksPlugin,
      "@next/next": nextPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // --- Standard Next.js & React Rules ---
      ...reactPlugin.configs["jsx-runtime"].rules,
      ...hooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      
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
