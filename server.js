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
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        };
        console.log("Launching Puppeteer with options:", JSON.stringify(launchOptions));
        console.log("PUPPETEER_EXECUTABLE_PATH:", process.env.PUPPETEER_EXECUTABLE_PATH);

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        // Set viewport to a large resolution (or match requested resolution) to ensure high quality render
        // Logic: if user wants iPhone resolution, we can set viewport, but the canvas handles its own size.
        // We just need the viewport to be big enough or take a screenshot of the specific element.
        // Or simpler: set a massive viewport and take fullPage screenshot, or screenshot the canvas.
        // Canvas screenshot is cleanest.

        await page.setViewport({ width: 3840, height: 2160, deviceScaleFactor: 1 }); // Large default viewport
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Wait for canvas to be rendered (using the explicit class we added)
        try {
            await page.waitForSelector('.render-complete', { timeout: 5000 });
        } catch (e) {
            console.log("Timeout waiting for .render-complete, proceeding anyway...");
        }

        const element = await page.$('#lifeCanvas');
        const buffer = await element.screenshot({ type: 'png' });

        res.set('Content-Type', 'image/png');
        res.send(buffer);

    } catch (e) {
        console.error("Error generating wallpaper:", e);
        // Return detailed error to the client for debugging
        res.status(500).send(`Error generating wallpaper: ${e.message}\n\nStack:\n${e.stack}`);
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
