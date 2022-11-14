# ss

Simple Server

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
