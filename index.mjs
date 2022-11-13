#!/usr/bin/env node
import path from 'node:path'
import fs from 'node:fs'

// https://stackoverflow.com/a/67984316
import createDebugMessages from 'debug'
const debug = createDebugMessages('ss')
import minimist from 'minimist';
const argv = minimist(process.argv.slice(2))
debug('argv', argv)

import chalk  from 'chalk'
import figlet  from 'figlet'
import glob  from 'fast-glob'
import Ignore  from 'ignore'
const ignore = Ignore()
import decache  from 'decache'

import Koa from 'koa'
const server = new Koa()
import Router from 'koa-router'

// import compose from 'koa-compose'
import chokidar from 'chokidar'

const port = process.env.PORT || argv.port || 3000
const host = process.env.HOST || argv.host || '0.0.0.0'
const cwd = process.cwd()

let router
const methods = ['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE']

debug('cwd: ', cwd)

const watcher = chokidar.watch(cwd)
// server.use(compose([require('koa-logger')(), require('koa-body')()]))

// Error Handle
server.use(async function handleError(ctx, next) {
  try {
    await next()
  } catch (err) {
    ctx.status = err.status || 500
    ctx.body = err.message + err.stack
  }
})

watcher.on('ready', function () {
  console.log('Watching...')

  watcher.on('all', function (eventName, p) {
    console.log(`[${eventName}] ${p}`)
    console.log('Reloading server...')
    // delete require.cache
    Object.keys(require.cache).forEach((id) => {
      // Get the local path to the module
      if (id.includes(cwd)) {
        console.log('Delete require cache', id)
        //Remove the module from the cache
        decache(id)
        // delete require.cache[id]
      }
    })
    dynamicRouter()
    console.log('Server reloaded.')
    logRouters()
  })
})

/**
 * example:
 *    xx/x.js => /xx/x
 *    xx/_x.js => /xx/:x
 */
function getCurrentPath(target) {
  let tmp = {}
  const filename = path.basename(target)

  for (let i = 0; i < methods.length; i++) {
    const rex = new RegExp('\\$' + methods[i])
    debug('getCurrentPath regexp', rex)
    debug('getCurrentPath match', rex.test(filename))
    if (rex.test(filename)) {
      tmp.method = methods[i]
      tmp.path = target.replace(rex, '')
      break
    } else {
      tmp.method = 'GET'
      tmp.path = target
    }
  }

  return {
    method: tmp.method.toLowerCase(),
    routePath:
      '/' +
      tmp.path.replace(/\.js$/gi, '').replace(/\_/gi, ':').replace(/\s/g, '-'),
    modulePath: path.join(cwd, target),
  }
}

/**
 * Dynamic config routers
 */
function dynamicRouter() {
  const __SS_IGNORE__ = path.join(cwd, '.ssignore')
  if (fs.existsSync(__SS_IGNORE__)) {
    ignore.add(fs.readFileSync(__SS_IGNORE__).toString())
  }
  const results = glob.sync('**/*.js', {
    cwd: cwd,
    onlyFiles: true,
    dot: true,
    ignore: ['**/node_modules/**'],
  })
  debug('results: ', results)
  const files = ignore.filter(results)
  debug('files: ', files)

  // new Router instance
  router = new Router()
  // dynamic routers
  for (let i = 0; i < files.length; i++) {
    const current = getCurrentPath(files[i])
    debug('dynamic routers', current)
    router[current.method](current.routePath, (ctx, next) => {
      require(current.modulePath)(ctx, next)
    })
  }
  server.use(router.routes())
}

dynamicRouter()

function logRouters() {
  // console.clear()
  console.log(figlet.textSync('Simple Server'))
  console.log(`HTTP Listen: ${chalk.underline(`http://${host}:${port}`)}`)
  router.stack.length && console.log(`Routers: `)
  for (let i = 0; i < router.stack.length; i++) {
    console.log(
      `  ${chalk.green(`[${router.stack[i].methods}]`)} ${chalk.grey(
        `${router.stack[i].path}`
      )}`
    )
  }
}

// start server
server.listen(port, host, logRouters())
