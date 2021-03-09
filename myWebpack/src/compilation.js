const { getCompleteFilePath, readFileWithHash } = require('./utils')

class Compilation {
  constructor(options) {
    const { entryPath, rootPath, optputDir, outputFileName, loaders, hooks } = options

    this.entryPath = entryPath
    this.rootPath = rootPath
    this.optputDir = optputDir
    this.outputFileName = outputFileName
    this.loaders = loaders
    this.hooks = hooks
  }

  // 存放处理完毕的模块代码 Map
  moduleMap = {}

  // 执行编译
  async make() {
    await this.walker(this.entryPath)
  }

  /**
   * 从入口文件开始进行编译，并收集所依赖的模块，递归所有依赖模块执行编译
   * 
   * 编译一：匹配符合条件的 loader 对模块进行编译，并返回编译后的源代码
   * 
   * 编译二：执行 webpack 自己的编译步骤，目的是构建各个独立模块之间的依赖调用关系，
   *        将所有的 require 方法替换成 webpack 自定义的 __webpack_require__ 函数。
   *        因为所有被编译后的模块将被 webpack 存储在一个闭包的对象 moduleMap 中，
   *        而 __webpack_require__ 函数则是唯一一个有权限访问 moduleMap 的方法
   * 
   * 完成编译二时，会对当前模块引用的依赖进行收集，并且返回到 Compilation 中，然后对依赖模块进行递归编译
   * 对于重复引用的依赖，需要根据引用文件的路径生成一个独一无二的 key 值，当 key 值重复时跳过
   */
  walker(sourcePath) {
    // 处理过的模块不需要再做处理
    if (this.moduleMap.hasOwnProperty(sourcePath)) return
    // 获取带 .js 结尾的路径
    sourcePath = getCompleteFilePath(sourcePath)

    // 编译一：loader 对模块进行编译
    this.loaderParse(sourcePath)
  }

  async loaderParse(path) {
    // 根据路径读取模块
    const [content, md5Hash] = await readFileWithHash(path)
    // 遍历 loader 对模块进行编译
    this.loaders.forEach(l => {
      
    })
  }
}

module.exports = Compilation