module.exports = function MyBabelLoader(source) {
  console.log('loader 执行..')
  return source
}