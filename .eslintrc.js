module.exports = {
  root: true,
  parserOptions: {
    parser: "babel-eslint",
    ecmaVersion: 2017
  },
  env: {
    browser: true,
    node: true,
    mocha: true,
    es6: true
  },
  globals: {
    expect: true,
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
    it: true,
    assert: true,
    contract: true,
    after: true,
    before: true,
    beforeAll: true,
    web3: true,
    describe: true,
    artifacts: true
  },
  extends: ["plugin:prettier/recommended", "eslint:recommended"],
  plugins: ["markdown", "prettier", "json"],
  rules: {
    "prettier/prettier": "error",
    "no-console": 0,
    "no-unused-vars": "warn",
    "no-case-declarations": 0,
    "no-empty": 0,
    quotes: ["error", "double"]
  }
};