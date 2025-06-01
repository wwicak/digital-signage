module.exports = {
  generate: () => 'test-shortid-' + Math.random().toString(36).substr(2, 9),
}
