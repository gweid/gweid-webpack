const fs = require('fs')
const { resolve } = require('path')
const crypto = require('crypto')

/**
 * 检验 webpack 初始参数
 * @param {*} options 
 */
const normalizeOption = options => {
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
const getCompleteFilePath = sourcePath => {
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

/**
 * 异步读取文件内容并且返回【代码字符串】和【唯一MD5哈希标识】
 * @param {*} path 
 */
const readFileWithHash = path => new Promise((resolve, reject) => {
  // 创建读取文件流
  const stream = fs.createReadStream(path)
  // 创建 md5 哈希
  const md5Hash = crypto.createHash('md5')

  let data = ''
  stream.on('data', chunk => {
    data += chunk
  })
  stream.on('error', err => reject(err))
  stream.on('end', () => {
    // 生成唯一 md5 标识
    const md5HashStr = md5Hash.update(data).digest('hex')
    //返回【代码字符串】和【唯一MD5哈希标识】
    resolve([data, md5HashStr])
  })
})

module.exports = {
  normalizeOption,
  getCompleteFilePath,
  readFileWithHash
}