import compose from 'koa-compose'
import error from './error.js'
import logger from 'koa-logger'
import { koaBody } from 'koa-body'

export default compose([error(), logger(), koaBody()])
