const fs = require('fs')
const { resolve } = require('path')

/**
 * 检验 webpack 初始参数
 * @param {*} options 
 */
const normalizeOption = (options) => {
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
  if (Object.prototype.toString.call(options).slice(8, -1) === 'Object') {
    return { ...config, ...options }
  }
}

/**
 * 获取完整的文件路径，包含 .js
 * @param {*} sourcePath 
 */
const getCompleteFilePath = (sourcePath) => {
  try {
    // 如果不是以 .js 结尾的文件
    if (!sourcePath.endsWith('.js')) {
      if (fs.existsSync(`${sourcePath}.js`)) {
        // 如果 ${sourcePath}.js 这个路径存在
        return `${sourcePath}.js`
      } else if (fs.existsSync(`${sourcePath}/index.js`)) {
        // 如果 ${sourcePath}/index.js 这个路径存在
        return `${sourcePath}/index.js`
      } else {
        throw new Error(`[error]读取${sourcePath}内容时出错`)
      }
    } else {
      return sourcePath
    }
  } catch (error) {
    console.log(error)
  }
}

module.exports = {
  normalizeOption,
  getCompleteFilePath
}