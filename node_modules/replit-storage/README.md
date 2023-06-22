[![npm version](https://badge.fury.io/js/replit-storage.svg)](https://badge.fury.io/js/replit-storage)

[![Run on Repl.it](https://repl.it/badge/github/7heMech/Replit-Storage)](https://repl.it/github/7heMech/Replit-Storage)

# Replit Storage
Replit Storage is a simple way to use the Replit Database in your Node.js repls.

## Get started
```js
const { Client } = require("replit-storage");
const client = new Client();

const key = 'str';

await client.set({
	key, // key: str
	[key]: key, // str: str
	other: 'value' // other: value
});

await client.get('key'); // str
```

## Docs
### `class Client(String url?)`
The parameter url is an optional custom DB URL.

**Functions**

These are the methods which a client instance provides.


> `get(String key, Object config?)`

Gets a value.

```js
client.get("key", { raw: false });
```


> `set(Object entries)`

Sets entries through an object.


> `delete(String key)`

Deletes a key.


> `list(Object config?)`

Lists all of the keys, or all of the keys starting with `prefix` if specifed.

```js
client.list({ prefix: "" });
```


> `empty()`

Clears the database.


> `getAll()`

Get all key/value pairs and return as an object.


> `deleteMany(Array keys)`

Deletes multiple keys.


## Tests
```sh
npm i
npm run test
```