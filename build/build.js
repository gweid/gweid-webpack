const myWebpack = require('../myWebpack/src/index')

try {
  const myWebpackConfig = require('../myWebpack.config')
  myWebpack(myWebpackConfig)
} catch (error) {
  myWebpack()
}

