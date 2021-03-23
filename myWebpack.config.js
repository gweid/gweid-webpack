const { resolve } = require('path')

const MyTestPlugin = require('./plugins/MyTestPlugin')

module.exports = {
  entry: './src/index.js',
  output: {
    path: resolve(__dirname, 'dist'),
    fileName: 'bundle.js'
  },
  // module: {
  //   rules: [
  //     {
  //       test: /\.js$/,
  //       // 编译匹配 include 路径的文件
  //       include: [
  //         resolve('src')
  //       ],
  //       use: {
  //         loader: resolve('loaders', 'MyBabelLoader.js') // 通过Babel编译react代码
  //       }
  //     }
  //   ]
  // },
  plugins: [
    new MyTestPlugin()
  ]
}
