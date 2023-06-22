const req = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const https = require('https');

const agent = new https.Agent({
	keepAlive: true
});

module.exports = (url, options = {}) => {
	options.agent = agent;
	return req(url, options);
}