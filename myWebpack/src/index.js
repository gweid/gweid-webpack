const Compiler = require('./compiler')
const { normalizeOption } = require('./utils')

function myWebpack(options) {
  // 检验参数
  const config = normalizeOption(options)

  // 生成 compiler
  const compiler = new Compiler(config)
  // 运行编译
  compiler.run()
}

module.exports = myWebpack
