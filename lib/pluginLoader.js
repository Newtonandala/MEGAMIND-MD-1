const path = require('path');
const fs = require('fs-extra');
const { registerCommand } = require('./handler');
const logger = require('./logger');

// Directories to auto-load plugins from
const PLUGIN_DIRS = [
  path.resolve(__dirname, '../commands'),
  path.resolve(__dirname, '../plugins'),
];

async function loadPlugins() {
  let total = 0;
  for (const dir of PLUGIN_DIRS) {
    await fs.ensureDir(dir);
    const files = await fs.readdir(dir);
    for (const file of files) {
      if (!file.endsWith('.js')) continue;
      const filePath = path.join(dir, file);
      try {
        // Clear require cache for hot-reload support
        delete require.cache[require.resolve(filePath)];
        const plugin = require(filePath);

        if (Array.isArray(plugin)) {
          for (const cmd of plugin) {
            registerCommand(cmd);
            total++;
          }
        } else if (plugin && plugin.name && typeof plugin.execute === 'function') {
          registerCommand(plugin);
          total++;
        }
      } catch (err) {
        logger.error({ file, err: err.message }, 'Failed to load plugin');
      }
    }
  }
  logger.info(`Loaded ${total} commands/plugins`);
  return total;
}

module.exports = { loadPlugins };
