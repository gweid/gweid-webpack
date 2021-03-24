const { resolve } = require('path')
const Compiler = require('./compiler')
const { checkType } = require('./utils')

/**
 * 检验 webpack 初始参数
 * @param {*} options 
 */
function normalizeOption(options) {
  const config = {
    // 入口文件地址
    entry: './src/index.js',
    // 输出文件地址
    output: {
      path: resolve(process.cwd(), 'dist'),
      fileName: 'bundle.js'
    },
    module: {
      rules: []
    },
    plugins: []
  }

  if (!options) return config
  if (checkType(options) === 'Object') {
    return { ...config, ...options }
  }
}

/**
 * webpack 主体
 * @param {*} options 
 */
function myWebpack(options) {
  // 检验参数
  const config = normalizeOption(options)

  // 生成 compiler
  const compiler = new Compiler(config)
  // 运行编译
  compiler.run()
}

module.exports = myWebpack
