import antfu from "@antfu/eslint-config";

export default antfu({
  type: "app",
  typescript: true,
  formatters: true,
  stylistic: {
    indent: 2,
    semi: true,
    quotes: "double",
  },
  ignores: ["**/migrations/*", "**/validation/schemas/*"],
}, {
  rules: {
    "no-console": ["warn"],
    "style/comma-dangle": ["off"],
    "style/arrow-parens": ["off"],
    "antfu/if-newline": "off",
    "antfu/no-top-level-await": ["off"],
    "node/prefer-global/process": ["off"],
    "node/no-process-env": ["error"],
    "perfectionist/sort-imports": ["error", {
      tsconfigRootDir: ".",
    }],
    "unicorn/filename-case": ["error", {
      case: "kebabCase",
      ignore: ["README.md"],
    }],
    "@stylistic/brace-style": ["error", "1tbs", {
      allowSingleLine: true,
    }],
  },
});
