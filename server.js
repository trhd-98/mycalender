const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const os = require('os');

app.use(express.static('.'));

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (i.e. 127.0.0.1) and non-ipv4 addresses
            if ('IPv4' !== iface.family || iface.internal) {
                continue;
            }
            return iface.address;
        }
    }
    return 'localhost';
}

app.get('/api/ip', (req, res) => {
    res.json({ ip: getLocalIp() });
});

app.get('/wallpaper', async (req, res) => {
    // Extract query parameters
    const queryString = new URLSearchParams(req.query).toString();
    const localIp = getLocalIp();
    // Use localhost loopback for the renderer itself to ensure speed/reliability
    const url = `http://localhost:${port}/?${queryString}&hideUI=true`;

    console.log(`Generating wallpaper for: ${url}`);

    let browser;
    try {
        const launchOptions = {
            headless: "new",
            executablePath: null, // Let Puppeteer find its own downloaded browser
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        };
        console.log("Launching Puppeteer with options:", JSON.stringify(launchOptions));
        console.log("PUPPETEER_CACHE_DIR:", process.env.PUPPETEER_CACHE_DIR);
        console.log("Computed Executable Path:", puppeteer.executablePath());

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        // Set viewport to a large resolution (or match requested resolution) to ensure high quality render
        // Logic: if user wants iPhone resolution, we can set viewport, but the canvas handles its own size.
        // We just need the viewport to be big enough or take a screenshot of the specific element.
        // Or simpler: set a massive viewport and take fullPage screenshot, or screenshot the canvas.
        // Canvas screenshot is cleanest.

        console.log("Setting viewport...");
        await page.setViewport({ width: 3840, height: 2160, deviceScaleFactor: 1 }); // Large default viewport

        console.log(`Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        console.log("Waiting for .render-complete...");
        try {
            await page.waitForSelector('.render-complete', { timeout: 10000 });
            console.log(".render-complete found.");
        } catch (e) {
            console.log("Timeout waiting for .render-complete, proceeding anyway...");
        }

        console.log("Taking screenshot of #lifeCanvas...");
        const element = await page.$('#lifeCanvas');
        if (!element) {
            throw new Error("Could not find #lifeCanvas on the page");
        }
        const buffer = await element.screenshot({ type: 'png' });

        console.log("Screenshot taken successfully. Sending response.");
        res.set('Content-Type', 'image/png');
        res.send(buffer);

    } catch (e) {
        console.error("CRITICAL ERROR during wallpaper generation:", e);
        // Clear any half-set headers and send JSON
        res.status(500).json({
            error: "Wallpaper generation failed",
            message: e.message,
            stack: e.stack
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(port, '0.0.0.0', () => {
    const ip = getLocalIp();
    console.log(`Server running at:`);
    console.log(`- Local:   http://localhost:${port}`);
    console.log(`- Network: http://${ip}:${port}`);
});
