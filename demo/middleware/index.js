const compose = require('koa-compose')
module.exports = compose([
  require('./error')(),
  require('koa-logger')(),
  require('koa-body')['koaBody'](),
])
