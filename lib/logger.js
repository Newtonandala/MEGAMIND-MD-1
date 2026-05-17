const pino = require('pino');
const { logLevel } = require('../settings');

const logger = pino({
  level: logLevel || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
      messageFormat: '[MEGAMIND-MD] {msg}',
    },
  },
});

module.exports = logger;
