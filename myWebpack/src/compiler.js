const fs = require('fs')
const path = require('path')
const ejs = require('ejs')
// wbepack 的生命周期依赖于 tapable 库，这个库可以很方便地帮助我们创建一个发布订阅模式的钩子，将钩子挂在到实例上，在合适的时机触发对应的函数处理
const { AsyncSeriesHook } = require('tapable') // 使用 tapable 的 AsyncSeriesHook 创建异步钩子
const Compilation = require('./compilation')
const { getRootPath } = require('./utils')

class Compiler {
  constructor(options) {
    const { entry, output, module, plugins } = options

    // 入口文件
    this.entryPath = entry
    // 输出目录
    this.outputDir = output.path
    // 输出文件名
    this.outputFileName = output.fileName
    // loader
    this.loaders = module.rules
    // plugins
    this.plugins = plugins
    // 根路径
    this.rootPath = process.cwd()
    // 入口文件 id
    this.entryId = getRootPath(this.rootPath, this.entryPath, this.rootPath)
    // 用于存储 new Compilation
    this.compilation = {}

    this.hooks = {
      // compiler 代表将向回调事件中传入一个 compiler 参数
      beforeRun: new AsyncSeriesHook(['compiler']), // run 之前
      afterRun: new AsyncSeriesHook(['compiler']),
      beforeCompile: new AsyncSeriesHook(['compiler']),
      afterCompile: new AsyncSeriesHook(['compiler']),
      emit: new AsyncSeriesHook(['compiler']),
      failed: new AsyncSeriesHook(['compiler'])
    }

    this.mountPlugin()
  }

  // 注册所有 plugins
  mountPlugin() {
    this.plugins.forEach((p) => {
      if (p.apply && typeof p.apply === 'function') {
        // 注册插件生命周期钩子的发布订阅监听事件
        p.apply(this)
      }
    })
  }

  async run() {
    // 在特定的生命周期发布消息，触发对应的订阅事件，将 compiler 传给回调
    /**
     * 每一个 plugin Class 都必须实现一个 apply 方法
     * 这个方法接收 compiler 实例，然后将真正的钩子函数挂载到 compiler.hook 的某一个声明周期上
     * 如果我们声明了一个 hook 但是没有挂载任何方法，在 call 函数触发的时候是会报错的
     * 但是实际上 Webpack 的每一个生命周期钩子除了挂载用户配置的 plugin ,都会挂载至少一个 Webpack 自己的 plugin，所以不会有这样的问题
     */
    this.hooks.beforeRun.callAsync(this)

    this.compilation = new Compilation({
      entryPath: this.entryPath,
      rootPath: this.rootPath,
      outputDir: this.outputDir,
      outputFileName: this.outputFileName,
      loaders: this.loaders,
      hooks: this.hooks
    })

    await this.compilation.make()

    // 生成打包产物
    this.emitFiles()
  }

  // 生成打包后的 bundle.js 文件
  emitFiles() {
    // 拼接文件输出路径
    const outputFile = path.join(this.outputDir, this.outputFileName)
    // 模板
    const templateEjs = fs.readFileSync(path.join(__dirname, '../template.ejs'), 'utf-8')
    // 渲染输出文件模板
    const code = ejs.render(templateEjs, { entryId: this.entryId, modules: this.compilation.moduleMap })

    function writeFile(outputFile, code) {
      fs.writeFile(outputFile, code, (err) => {
        if (err) {
          console.log(`[Error] ${err}`)
        } else {
          console.log('[Ok] 编译成功')
        }
      })
    }

    if (fs.existsSync(this.outputDir)) {
      writeFile(outputFile, code)
    } else {
      // 输出文件夹不存在，先创建
      fs.mkdirSync(this.outputDir)
      writeFile(outputFile, code)
    }
  }
}

module.exports = Compiler
