const fs = require('fs')
const { resolve, relative, extname } = require('path')
const crypto = require('crypto')

/**
 * 判断数据类型
 * @param {*} source 
 */
const checkType = source => {
  return Object.prototype.toString.call(source).slice(8, -1)
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

/**
 * 根据用户在代码中的引用生成相对根目录的相对路径
 */
const getRootPath = (dirPath, moduleName, rootPath) => {
  if (/^[a-zA-Z\$_][a-zA-Z\d_]*/.test(moduleName)) {
    // 如果模块名满足一个变量的正则，说明引用的是 node 模块
    return './node_modules/' + moduleName
  } else {
    return './'
    + relative(rootPath, resolve(dirPath, moduleName))
    + (extname(moduleName).length === 0 ? '.js' : '')
  }
}

module.exports = {
  checkType,
  getCompleteFilePath,
  readFileWithHash,
  getRootPath
}
