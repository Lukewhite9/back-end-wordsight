const fetch = require("alive-fetch");

const parseJson = (val) => {
	try {
		return JSON.parse(val); 
	} catch (err) {
		return val;
	}
}

const encode = encodeURIComponent;

class Client {
	#url;

	/**
	 * Initiates Class.
	 * @param {String} url Custom database URL
	 */
	constructor(url) {
		this.#url = new URL(url || process.env.REPLIT_DB_URL).toString();
		this.cache = {};
	}

	/**
	 * Retrieves a value from the cache or the database.
	 * @param {String|Number} key - The key to retrieve.
	 * @param {Object} [config] - Configuration options.
	 * @param {Boolean} [config.raw=false] - If true, returns the raw string value instead of parsing it.
	 * @returns {*} - The value of the key.
	 */
	async get(key, config = {}) {
		const { raw = false } = config;

		let value = this.cache[key];
		if (typeof value === 'undefined') {
			value = await fetch(`${this.#url}/${encode(key)}`).then(res => res.text());
			this.cache[key] = value;
		}

		return raw ? value : parseJson(value);
	}

	/**
	 * Sets entries through an object.
	 * @param {Object} entries An object containing key/value pairs to be set.
	 */
	async set(entries) {
		if (typeof entries !== 'object') throw Error('Set method expects an object.');

		let query = '';
		for (const key in entries) {
			const value = JSON.stringify(entries[key]);
  		query += `${encode(key)}=${encode(value)}&`;
			this.cache[key] = value;
		}

		const body = query.slice(0, -1); // removes the trailing &

		await fetch(this.#url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body,
		});
	}

	/**
	 * Deletes a key
	 * @param {String|Number} key Key
	 */
	async delete(key) {
		delete this.cache[key];
		await fetch(`${this.#url}/${encode(key)}`, { method: 'DELETE' });
	}

	/**
	 * List keys starting with a prefix or list all.
	 * @param {Object} [config] - Configuration options.
	 * @param {String} [config.prefix=''] Filter keys starting with prefix.
	 */
	async list(config = {}) {
		const { prefix = '' } = config;

		const text = await fetch(`${this.#url}?encode=true&prefix=${encode(prefix)}`).then(res => res.text());
		if (text.length === 0) return [];

		return text.split('\n').map(decodeURIComponent);
	}

	/**
	 * Clears the database.
	 */
	async empty() {
		this.cache = {};

		const keys = await this.list();
		await this.deleteMany(keys);
	}

	/**
	 * Get all key/value pairs and return as an object.
	 */
	async getAll() {
		const output = {};
		const keys = await this.list();
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			output[key] = await this.get(key);
		}

		return output;
	}

	/**
	 * Delete many entries by keys.
	 * @param {Array<String|Number>} keys List of keys to delete.
	 */
	async deleteMany(keys) {
		for (let i = 0; i < keys.length; i++)
			await this.delete(keys[i]);
	}
}

module.exports = { Client };