# 为了更好的避免一些模块问题，不推荐使用这个命令行了，使用更好理解的目录管理方式，参考：https://github.com/gozeon/code-collections/tree/master/ss-next

# ss

Simple Server

**IMPORTANT:** `v2` is ESM, if you use commonjs, see `v1`

![](https://github.com/gozeon/ss/raw/master/Simple%20Server.png)

# install

```bash
npm install ss -g
```

# get starter

```bash
mkdir demo && cd demo
touch time.js
```

time.js

```js
export default (ctx) => {
    ctx.body = new Date()
}
```

run server

```bash
ss
```

test

```
curl -I http://0.0.0.0:3000/time
```

### ignore

new file `.ssignore`, same as `.gitignore`

### port & host

use `--port` , `--host` or `PORT=3000 HOST=0.0.0.0 ss`

### method

`$POSTname.js` -> `post 'name'`

### params

`_id.js` -> `../:id`

# referece

https://prettier.io/
