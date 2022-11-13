module.exports = (ops) => async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.body = {
      errNo: err?.status || 500,
      errMsg: err?.message || 'sys error',
    }
  }
}
