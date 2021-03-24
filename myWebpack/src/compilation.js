const path = require('path')

const babel = require('@babel/core')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const types = require('@babel/types')
const generator = require('@babel/generator').default

const { checkType, getCompleteFilePath, readFileWithHash, getRootPath } = require('./utils')
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

    this.assets = {}
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
    const modulePath = getRootPath(this.rootPath, sourcePath, this.rootPath)

    // 编译一：使用所有满足条件的 loader 对模块进行编译，并返回编译后的代码和文件的 md5 哈希（用于缓存）
    const [sourceCode, md5Hash] = await this.loaderParse(sourcePath)

    // 编译二：将所有模块中的 require 或者 import 方法的函数名称替换成 __webpack_require__
    const [moduleCode, relyModule] = this.parse(sourceCode, path.dirname(modulePath))

    // 将模块代码放进 moduleMap
    this.moduleMap[modulePath] = moduleCode
    this.assets[modulePath] = md5Hash

    // 递归处理模块依赖
    if (relyModule.length) {
      for(let i = 0; i < relyModule.length; i++) {
        await this.walker(relyModule[i])
      }
    }
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
   * 将所有模块中的 require 方法的函数名称替换成 __webpack_require__
   *    1、先使用 babel 支持 es6 的 import，将 import 的转换为 require
   *    2、@babel/parse 将源码解析成 ast
   *    3、@bebal/traverse 遍历词法节点
   *    4、@babel/types 生成一个参数不变，函数名为 __webpack_require__ 的 babel 节点，替换原有节点
   *    5、@babel/generator 将更改后的 ast 还原出代码字符串
   */
  parse(source, dirPath) {
    const _this = this

    // 当前文件所依赖的所有模块
    const relyModule = []

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
      // 遍历 ast，当遇到函数调用表达式的时候执行，对 ast 树进行改写
      CallExpression(p) {
        if (p.node.callee && p.node.callee.name === '_interopRequireDefault') {
          // 有些 require 是在 _interopRequireDefault 内
          const node = p.node.arguments[0]
          if (node.callee.name === 'require') {
            _this.transformNode(node, dirPath, relyModule)
          }
        } else if (p.node.callee.name === 'require') {
          _this.transformNode(p.node, dirPath, relyModule)
        }
      }
    })

    // 将改写后的 ast 重新组装成代码字符串
    const moduleCode = generator(ast).code

    return [moduleCode, relyModule]
  }

  // 将某个节点的 name 和 arguments 转换成想要的新节点
  transformNode(node, dirPath, relyModule) {
    node.callee.name = '__webpack_require__'
    // console.log(node)
    
    // 获取依赖模块
    const moduleName = node.arguments[0].value
    // 生成依赖模块相对项目根目录的路径
    const moduleKey = getCompleteFilePath(getRootPath(dirPath, moduleName, this.rootPath))
    // 添加进 relyModule
    relyModule.push(moduleKey)

    // 替换 __webpack_require__ 的参数字符串，因为这个字符串也是对应模块的 moduleKey，需要保持统一
    // 因为 ast 树中的每一个元素都是 babel 节点，所以需要使用 '@babel/types' 来进行生成
    node.arguments = [types.stringLiteral(moduleKey)]
    // console.log(node)
  }
}

module.exports = Compilation
