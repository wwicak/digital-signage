module.exports = {
  presets: [
    '@babel/preset-env', // For general JS compatibility
    ['@babel/preset-react', { runtime: 'automatic' }], // For JSX - runtime: automatic is common for modern React
    '@babel/preset-typescript', // For TypeScript
  ],
};
