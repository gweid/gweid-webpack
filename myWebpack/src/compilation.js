const path = require('path')

const babel = require('@babel/core')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const types = require('@babel/types')
const generator = require('@babel/generator').default

const { checkType, getCompleteFilePath, readFileWithHash } = require('./utils')
const { parse } = require('path')

class Compilation {
  constructor(options) {
    const { entryPath, rootPath, outputDir, outputFileName, loaders, hooks } = options

    this.entryPath = entryPath
    this.rootPath = rootPath
    this.outputDir = outputDir
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
  async walker(sourcePath) {
    // 处理过的模块不需要再做处理
    if (this.moduleMap.hasOwnProperty(sourcePath)) return

    // 获取带 .js 结尾的路径
    sourcePath = getCompleteFilePath(sourcePath)
    //

    // 编译一：使用所有满足条件的 loader 对模块进行编译，并返回编译后的代码和文件的 md5 哈希（用于缓存）
    const [sourceCode, md5Hash] = await this.loaderParse(sourcePath)

    // 编译二：将所有模块中的 require 或者 import 方法的函数名称替换成 __webpack_require__
    const [moduleCode, relyModule] = this.parse(sourceCode)

  }

  async loaderParse(path) {
    // 根据路径读取模块
    let [content, md5Hash] = await readFileWithHash(path)

    // 遍历 loader 对模块进行编译
    this.loaders.forEach(loader => {
      // 使用 loader 的时候类似 { test: /\.js$/, use: { loader: 'babel-loader' } }
      const { test, use } = loader

      // 如果文件与 loader 匹配规则 test 匹配上
      if (path.match(test)) {
        if (checkType(use) === 'String') {
          // use 类型一：use: 'babel-loader'
          const loaderFun = require(use)
          content = loaderFun(content)

        } else if (checkType(use.loader) === 'String') {
          // use 类型二：use: { loader: 'babel-loader', options: {} }
          const loaderFun = require(use.loader)
          console.log(loaderFun(content))
          content = loaderFun(content)

        } else if (checkType(use) === 'Array') {
          // use 类型二：use: [{ loader: 'babel-loader' }] 或者 use: ['style-loader', 'css-loader']
          while(use.length) {
            const current = use.pop()
            let loaderFun
            if (checkType(current) === 'String') {
              loaderFun = require(current)
            } else if (checkType(current) === 'Object') {
              loaderFun = require(current.loader)
            }

            content = loaderFun(content)
          }
        }
      }
    })

    return [content, md5Hash]
  }

  /**
   * 将所有模块中的 require 或者 import 方法的函数名称替换成 __webpack_require__
   *    1、@babel/parse 将源码解析成 ast
   *    2、@bebal/traverse 遍历词法节点
   *    3、@babel/types 生成一个参数不变，函数名为 __webpack_require__ 的 babel 节点，替换原有节点
   *    4、@babel/generator 将更改后的 ast 还原出代码字符串
   */
  parse(source) {
    const relyModule = [] // 当前文件所依赖的所有模块

    // 这里要注意，直接使用 parser.parse 是不支持 es6 的 import 和 export 语法的
    // 所以需要先使用 babel.transform 将 import 转换为 require
    source = babel.transform(source, {
      sourceType: 'module',
      presets: [['@babel/preset-env']]
    }).code

    // 转换成 ast
    const ast = parser.parse(source)

    // 遍历 ast
    traverse(ast, {
      CallExpression(p) {
        console.log(p.node)
      }
    })

    return [relyModule]
  }
}

module.exports = Compilation
