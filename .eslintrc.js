module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ['airbnb-base'],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'no-console': 'off',
    'consistent-return': 'off',
    'no-param-reassign': ['error', { props: false }],
  },
};
