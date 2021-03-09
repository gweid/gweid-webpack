const { getCompleteFilePath } = require('./utils')

class Compilation {
  constructor(options) {
    const { entry, rootPath, optputDir, outputFileName, loaders, hooks } = options

    this.entry = entry
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
    await this.walker(this.entry)
  }

  /**
   * 从入口文件开始，开始编译，并递归所有依赖模块执行编译
   */
  walker(sourcePath) {
    // 处理过的模块不需要再做处理
    if (this.moduleMap.hasOwnProperty(sourcePath)) return
    // 获取带 .js 结尾的路径
    sourcePath = getCompleteFilePath(sourcePath)
  }
}

module.exports = Compilation