# search-everything

针对各论坛,百科,搜索引擎的搜索结果获取或内容摘要

# Installing

```sh
npm i search-everything
```

# Usage

```js
const search = require('search-everything')

search.moegirl('萝莉').then(res => {
    console.log(res)
})

search.baike('丁真').then(res => {
    console.log(res)
})
```

# 支持的接口
- bing
- baike
- moegirl
- bilibili