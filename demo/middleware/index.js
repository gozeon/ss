import compose from 'koa-compose'
import logger from 'koa-logger'
import { koaBody } from 'koa-body'
import error from './error.js'
// or use code for clear cache
// const { default: error } = await import(`./error.js?t=${Date.now()}`)

export default compose([error(), logger(), koaBody()])
