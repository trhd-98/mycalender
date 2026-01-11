const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer to a local folder in the project.
    // This allows Render to cache it via node_modules (if we put it there) or just helps us find it.
    // We will use a dedicated folder ".puppeteer_cache" in the root.
    cacheDirectory: join(__dirname, '.puppeteer_cache'),
};
