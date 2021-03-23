const babel = require('@babel/core')

module.exports = function MyBabelLoader(source) {
  // 允许使用 import 和 export 语法
  // babel/core 会默认读取目录下的 babel.config.js 配置
  const res = babel.transform(source, {
    sourceType: 'module'
  })

  return res.code
}