import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";

const config = [
  ...nextVitals,
  ...nextTs,
  security.configs.recommended,
  {
    rules: {
      // Raw HTML injection is banned; AI/markdown content goes through SafeMarkdown (rehype-sanitize).
      "react/no-danger": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      // Too noisy for typed, registry-driven lookups; keys are never user-controlled.
      "security/detect-object-injection": "off",
    },
  },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "public/sw.js"] },
];

export default config;
