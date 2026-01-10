const canvas = document.getElementById('lifeCanvas');
const ctx = canvas.getContext('2d');
const controls = document.getElementById('controls');

// Inputs
const yearInput = document.getElementById('yearInput');
const colsInput = document.getElementById('colsInput');
const fontSelect = document.getElementById('fontSelect');
const resSelect = document.getElementById('resSelect');
const marginTopInput = document.getElementById('marginTop');
const marginSideInput = document.getElementById('marginSide');
const marginBottomInput = document.getElementById('marginBottom');

const colorBgInput = document.getElementById('colorBg');
const colorFilledInput = document.getElementById('colorFilled');
const colorEmptyInput = document.getElementById('colorEmpty');
const colorTextInput = document.getElementById('colorText');
const colorCurrentInput = document.getElementById('colorCurrent');

const downloadBtn = document.getElementById('downloadBtn');
const generatedURLInput = document.getElementById('generatedURL');
const copyURLBtn = document.getElementById('copyURLBtn');

// State
let config = {
    year: 2026,
    cols: 15, // Default to 15 columns as shown in reference image
    font: "'Outfit', sans-serif", // Default to Minimal
    width: 1290,
    height: 2796,
    marginTop: 1300,
    marginSide: 40,
    marginBottom: 150,
    bg: '#000000',
    filled: '#ffffff',
    empty: '#333333',
    current: '#ff6600',
    text: '#cccccc' // Slightly dimmer text default
};

let serverIp = null;

function init() {
    // Attempt to get local IP from server
    fetch('/api/ip')
        .then(res => res.json())
        .then(data => {
            if (data.ip) {
                serverIp = data.ip;
                generateURL(); // Regenerate URL once we have the valid IP
            }
        })
        .catch(err => console.log('Could not fetch server IP', err));

    // Parse URL params - comprehensive handling
    const params = new URLSearchParams(window.location.search);

    // Basic settings
    if (params.has('year')) yearInput.value = params.get('year');
    if (params.has('cols')) colsInput.value = params.get('cols');
    if (params.has('font')) fontSelect.value = params.get('font');

    // Resolution
    if (params.has('width') && params.has('height')) {
        const customRes = `${params.get('width')}x${params.get('height')}`;
        // Check if this resolution exists in the dropdown
        let found = false;
        for (let option of resSelect.options) {
            if (option.value === customRes) {
                resSelect.value = customRes;
                found = true;
                break;
            }
        }
        // If not found, we'll still use it via direct config update
        // We ensure config is updated after inputs are set
    }

    // Margins
    if (params.has('marginTop')) marginTopInput.value = params.get('marginTop');
    if (params.has('marginSide')) marginSideInput.value = params.get('marginSide');
    if (params.has('marginBottom')) marginBottomInput.value = params.get('marginBottom');

    // Colors - Add # prefix back for input.value
    const fixColor = (c) => c ? (c.startsWith('#') ? c : '#' + c) : null;
    if (params.has('bg')) colorBgInput.value = fixColor(params.get('bg'));
    if (params.has('filled')) colorFilledInput.value = fixColor(params.get('filled'));
    if (params.has('empty')) colorEmptyInput.value = fixColor(params.get('empty'));
    if (params.has('current')) colorCurrentInput.value = fixColor(params.get('current'));
    if (params.has('text')) colorTextInput.value = fixColor(params.get('text'));

    // Hide UI for automation
    if (params.get('hideUI') === 'true') {
        controls.classList.add('hidden');
        document.querySelector('.preview-container').style.padding = '0';
        document.querySelector('.preview-container').style.background = '#000';
        document.body.style.background = '#000';
    }

    addListeners();

    // Initial draw immediately with fallback fonts so canvas isn't empty
    updateConfig();

    // Re-draw when fonts are loaded for better quality
    document.fonts.ready.then(() => {
        updateConfig();
        setTimeout(() => document.body.classList.add('render-complete'), 100);
    }).catch(e => {
        console.log('Font loading failed or timed out', e);
        // Ensure we still signal completion
        setTimeout(() => document.body.classList.add('render-complete'), 100);
    });

    // Fallback safety: If fonts hang forever, signal complete after 2s anyway
    setTimeout(() => {
        if (!document.body.classList.contains('render-complete')) {
            document.body.classList.add('render-complete');
        }
    }, 2000);
}

function addListeners() {
    const inputs = [yearInput, colsInput, fontSelect, resSelect, marginTopInput, marginSideInput, marginBottomInput, colorBgInput, colorFilledInput, colorEmptyInput, colorTextInput, colorCurrentInput];
    inputs.forEach(input => {
        input.addEventListener('input', updateConfig);
        input.addEventListener('change', updateConfig);
    });

    downloadBtn.addEventListener('click', downloadWallpaper);
    copyURLBtn.addEventListener('click', copyURL);
}

function updateConfig() {
    const resParts = resSelect.value.split('x');
    config.width = parseInt(resParts[0]);
    config.height = parseInt(resParts[1]);

    config.year = parseInt(yearInput.value);
    config.cols = colsInput.value ? parseInt(colsInput.value) : 0;
    config.font = fontSelect.value;

    config.marginTop = parseInt(marginTopInput.value);
    config.marginSide = parseInt(marginSideInput.value);
    config.marginBottom = parseInt(marginBottomInput.value);

    config.bg = colorBgInput.value;
    config.filled = colorFilledInput.value;
    config.empty = colorEmptyInput.value;
    config.current = colorCurrentInput.value;
    config.text = colorTextInput.value;

    draw();
    generateURL(); // Update URL whenever config changes
}

function generateURL() {
    // Use LAN IP for mobile access if available, else fallback to host
    let baseURL = `${window.location.protocol}//${window.location.host}/wallpaper`;

    if (serverIp && window.location.hostname === 'localhost') {
        // If we are on localhost but know the LAN IP, use it
        baseURL = `${window.location.protocol}//${serverIp}:${window.location.port}/wallpaper`;
    } else if (serverIp && window.location.hostname !== 'localhost') {
        // If we are already on LAN IP, use window.location
        // or just force serverIp to be safe
        baseURL = `${window.location.protocol}//${serverIp}:${window.location.port}/wallpaper`;
    }

    const params = new URLSearchParams();

    // Only add non-default or important params
    params.append('year', config.year);
    if (config.cols > 0) params.append('cols', config.cols);
    params.append('font', config.font);
    params.append('width', config.width);
    params.append('height', config.height);
    params.append('marginTop', config.marginTop);
    params.append('marginSide', config.marginSide);
    params.append('marginBottom', config.marginBottom);

    // Colors (without # prefix)
    params.append('bg', config.bg.replace('#', ''));
    params.append('filled', config.filled.replace('#', ''));
    params.append('empty', config.empty.replace('#', ''));
    params.append('current', config.current.replace('#', ''));
    params.append('text', config.text.replace('#', ''));

    params.append('hideUI', 'true');

    const fullURL = `${baseURL}?${params.toString()}`;
    generatedURLInput.value = fullURL;
}

function copyURL() {
    generatedURLInput.select();
    generatedURLInput.setSelectionRange(0, 99999); // For mobile
    navigator.clipboard.writeText(generatedURLInput.value).then(() => {
        // Visual feedback
        const originalText = copyURLBtn.textContent;
        copyURLBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyURLBtn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy URL. Please copy manually.');
    });
}

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function draw() {
    // Canvas Setup
    canvas.width = config.width;
    canvas.height = config.height;

    // Fill Background
    ctx.fillStyle = config.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Date Logic
    const targetYear = config.year;
    const totalDays = isLeapYear(targetYear) ? 366 : 365;

    const now = new Date();
    // Use local check against year
    let currentDayIndex = -1; // 0-based index of "Today"

    if (now.getFullYear() > targetYear) {
        // Past year -> all filled, no "current"
        currentDayIndex = totalDays; // all < currentDayIndex
    } else if (now.getFullYear() < targetYear) {
        // Future year -> all empty
        currentDayIndex = -1;
    } else {
        // Current year
        const dobj = getDayOfYear(now); // 1-based (Jan 1 = 1)
        currentDayIndex = dobj - 1; // 0-based index
    }

    // Days Passed = The count of FULL days that are effectively "history".
    // User requested: "each day pass, 1 light dot appear".
    // Usually this means if it's 10am on Jan 2, Jan 1 is passed (light dot). Jan 2 is Current (Orange).
    // So for i < currentDayIndex: Filled.
    // If i == currentDayIndex: Current (Orange).
    // If i > currentDayIndex: Empty.

    // Percentage Logic
    // "360 days left - 3%"
    // Days Left = totalDays - (currentDayIndex + 1)? 
    // If Jan 1 (index 0). 365 - 1 = 364 left.
    // Let's assume "Left" means future days + today? Or just future?
    // "Days Left" usually implies remaining days.
    // Let's do `totalDays - (currentDayIndex + 1)`. 
    // If currentDayIndex is -1 (future year), left = 365.
    // If currentDayIndex is 365 (past year), left = 0.

    // Actually, ensure we don't go negative if past year
    let daysLeft = 0;
    if (now.getFullYear() < targetYear) daysLeft = totalDays;
    else if (now.getFullYear() > targetYear) daysLeft = 0;
    else daysLeft = totalDays - (currentDayIndex + 1);

    if (daysLeft < 0) daysLeft = 0;

    // Percentage Passed
    // (currentDayIndex_1_based) / totalDays?
    // User said "360 days left - 3%". 3% of 365 is ~10 days. 
    // So percentage is likely "passed / total".
    let daysPassedCount = (now.getFullYear() > targetYear) ? totalDays : (now.getFullYear() < targetYear ? 0 : (currentDayIndex + 1));
    let percentage = (daysPassedCount / totalDays) * 100;

    // Draw Header (Year) - REMOVED per user request
    // ctx.fillStyle = config.text;
    // ctx.font = `bold ${config.width * 0.06}px ${config.font}`;
    // ctx.textAlign = 'center';
    // ctx.textBaseline = 'middle';
    // ctx.fillText(targetYear, config.width / 2, config.marginTop / 2);

    // Draw Footer (Percentage only)
    ctx.fillStyle = config.text;
    ctx.font = `${config.width * 0.04}px ${config.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percentage.toFixed(1)}%`, config.width / 2, config.height - (config.marginBottom / 2));

    // Grid Logic
    const gridX = config.marginSide;
    const gridY = config.marginTop;
    const gridW = config.width - (config.marginSide * 2);
    const gridH = config.height - (config.marginTop + config.marginBottom);

    let cols = config.cols;
    let rows = 0;

    if (cols > 0) {
        // User defined cols
        rows = Math.ceil(totalDays / cols);
    } else {
        // Auto calc (same logic as before)
        const aspect = gridW / gridH;
        rows = Math.round(Math.sqrt(totalDays / aspect));
        cols = Math.ceil(totalDays / rows);
        while (rows * cols < totalDays) {
            rows++;
            cols = Math.ceil(totalDays / rows);
        }
    }

    const gapRatio = 0.35;
    const cellSizeX = gridW / (cols + gapRatio * (cols - 1));
    const cellSizeY = gridH / (rows + gapRatio * (rows - 1));

    const cellSize = Math.min(cellSizeX, cellSizeY);
    const gap = cellSize * gapRatio;

    const blockWidth = cols * cellSize + (cols - 1) * gap;
    const blockHeight = rows * cellSize + (rows - 1) * gap;

    const startX = gridX + (gridW - blockWidth) / 2;
    const startY = gridY + (gridH - blockHeight) / 2;

    for (let i = 0; i < totalDays; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;

        const x = startX + c * (cellSize + gap);
        const y = startY + r * (cellSize + gap);

        const radius = cellSize / 2;

        ctx.beginPath();

        if (i < currentDayIndex) {
            // Past
            ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
            ctx.fillStyle = config.filled;
            ctx.shadowBlur = 0;
            ctx.fill();
        } else if (i === currentDayIndex) {
            // Current - Bigger, Glow, Orange
            // Bigger radius? e.g. 1.2x. Check if overlap?
            // If gap is 0.35, 1.2x radius might slightly overlap but it's ok for effect.
            // Let's limit overlap.

            const curRadius = radius * 1.3;
            ctx.arc(x + radius, y + radius, curRadius, 0, Math.PI * 2);
            ctx.fillStyle = config.current;

            // Glow
            ctx.shadowColor = config.current;
            ctx.shadowBlur = curRadius * 1.5; // Glow amount
            ctx.fill();

            // Reset for next
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        } else {
            // Future
            ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
            ctx.fillStyle = config.empty;
            ctx.shadowBlur = 0;
            ctx.fill();
        }
    }
}

function downloadWallpaper() {
    const link = document.createElement('a');
    link.download = `year-progress-${config.year}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Init
init();
