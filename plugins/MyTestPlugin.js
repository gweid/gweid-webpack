class MyTestPlugin {
  apply(compiler) {
    compiler.hooks.beforeRun.tapAsync('my-test-plugin', () => {
      console.log('MyTestPlugin 插件...')
    })
  }
}

module.exports = MyTestPlugin
