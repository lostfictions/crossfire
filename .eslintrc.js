require("eslint-config-lostfictions/patch");
module.exports =
  /** @type {import("@typescript-eslint/utils").TSESLint.Linter.Config} */ {
    extends: ["lostfictions"],
    parserOptions: { tsconfigRootDir: __dirname },
    rules: {
      // FIXME: rule seems broken now, unsure why
      "unicorn/expiring-todo-comments": "off",
    },
  };
