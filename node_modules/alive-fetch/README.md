# Alive Fetch
Alive Fetch is a simple way to use keep alive in your requests.
```js
const fetch = require('alive-fetch');

const res = await fetch('https://github.com/');
const body = await res.text();

console.log(body);
```