module.exports = {
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        parser: "@typescript-eslint/parser",
        project: "./tsconfig.json",
    },
    plugins: ['@typescript-eslint'],
    rules:{
        "@typescript-eslint/no-floating-promises": "error"
    },
    root: true,
};