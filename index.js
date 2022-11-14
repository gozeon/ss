#!/usr/bin/env node
import path from 'node:path'
import fs from 'node:fs'

import Debug from 'debug'
import minimist from 'minimist'
import chalk from 'chalk'
import figlet from 'figlet'
import glob from 'fast-glob'
import Ignore from 'ignore'
import Koa from 'koa'
import Router from 'koa-router'
import chokidar from 'chokidar'

const debug = Debug('ss')
const argv = minimist(process.argv.slice(2))
debug('argv', argv)
const ignore = Ignore()
const server = new Koa()

const port = process.env.PORT || argv.port || 3000
const host = process.env.HOST || argv.host || '0.0.0.0'
const cwd = process.cwd()

let router, middlewarePath
const methods = ['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE']

debug('cwd: ', cwd)

const watcher = chokidar.watch(cwd)

watcher.on('ready', function () {
    console.log('Watching Routers...')

    watcher.on('all', async function (eventName, p) {
        console.log(`[${eventName}] ${p}`)
        console.log('Reloading server...')
        dynamicRouter()
        console.log('Server reloaded.')
        logRouters()
    })
})

/**
 * config middlewares
 */
async function loadMiddlewares() {
    try {
        const tmpPath = path.join(cwd, 'middleware', 'index.js')
        debug('loadMiddlewares middlewarePath', tmpPath)
        const m = await import(tmpPath)
        middlewarePath = tmpPath
        server.use(m.default)
    } catch (e) {
        debug('loadMiddlewares error', e)
        if (e?.code !== 'ERR_MODULE_NOT_FOUND') {
            console.log(e?.message)
        }
    }
}

await loadMiddlewares()

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
            tmp.path
                .replace(/\.js$/gi, '')
                .replace(/\_/gi, ':')
                .replace(/\s/g, '-'),
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
        ignore: ['**/node_modules/**', '**/middleware/**'],
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
        router[current.method](current.routePath, async (ctx, next) => {
            // @doc https://ar.al/2021/02/22/cache-busting-in-node.js-dynamic-esm-imports/
            await import(`${current.modulePath}?cache=${Date.now()}`).then(
                (m) => m.default(ctx, next)
            )
        })
    }
    server.use(router.routes())
}

dynamicRouter()

function logRouters() {
    // console.clear()
    console.log(figlet.textSync('Simple Server'))
    console.log(`HTTP Listen: ${chalk.underline(`http://${host}:${port}`)}`)
    middlewarePath && console.log(`Middleware Path: ${middlewarePath}`)
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
