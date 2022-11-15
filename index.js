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
import convert from 'koa-convert'
import chokidar from 'chokidar'

const debug = Debug('ss')
const argv = minimist(process.argv.slice(2))
debug('argv', argv)
const server = new Koa()

const port = process.env.PORT || argv.port || 3000
const host = process.env.HOST || argv.host || '0.0.0.0'
const cwd = process.cwd()

let ignore, router, middlewarePath
const methods = ['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE']

debug('cwd: ', cwd)

const watcher = chokidar.watch(cwd, {
    ignored: ['**/node_modules/**'],
})

watcher.on('ready', function () {
    console.log('Watching...')

    watcher.on('all', async function (eventName, p) {
        if (ignore.ignores(p.replace(cwd + path.sep, ''))) {
            return
        }

        if (/(middleware)/.test(p)) {
            console.log('Reloading middleware...')
            await loadMiddlewares()
            console.log('Middleware reloaded.')
            return
        }
        console.log(`[${eventName}] ${p}`)
        console.log('Reloading router...')
        dynamicRouter()
        console.log('Router reloaded.')
        logRouters()
    })
})

/**
 *
 * @param {*} name
 * @param {*} middleware
 */
function appUse(name, middleware) {
    middleware._name = name
    const idx = server.middleware.findIndex((m) => m._name == name)
    console.log('🚀 ~ file: index.js ~ line 51 ~ appUse ~ idx', idx)
    debug('find middleware <%s> index: %s', name, idx)
    idx > -1 && server.middleware.splice(idx, 1)
    if (name === 'middleware') {
        server.middleware.unshift(middleware)
    } else {
        server.use(convert(middleware))
    }
}

/**
 * @see https://ar.al/2021/02/22/cache-busting-in-node.js-dynamic-esm-imports/
 * @see https://github.com/sindresorhus/import-fresh/issues/22
 * @param {*} path
 * @returns
 */
function nocacheImport(path) {
    return import(`${path}?t=${Date.now()}`)
}

/**
 * config middlewares
 */
async function loadMiddlewares() {
    try {
        const tmpPath = path.join(cwd, 'middleware', 'index.js')
        debug('loadMiddlewares middlewarePath', tmpPath)
        const m = await nocacheImport(tmpPath)
        middlewarePath = tmpPath
        appUse('middleware', m.default)
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
    ignore = Ignore()
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
            await nocacheImport(current.modulePath).then((m) =>
                m.default(ctx, next)
            )
        })
    }
    appUse('router', router.routes())
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
