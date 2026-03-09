import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
const port = process.env.PORT || 8080;

console.log(`Starting server configuration. Port: ${port}`);

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- API Routes ---

// API Key Proxy
app.get('/api/key', (req, res) => {
    let apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
        // Trim and clean
        apiKey = apiKey.trim();
        if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
            apiKey = apiKey.slice(1, -1);
        }

        const keyPrefix = apiKey.substring(0, 4);
        console.log(`Serving API Key. Length: ${apiKey.length}, Prefix: ${keyPrefix}***`);
        res.json({ apiKey: apiKey });
    } else {
        console.error('GEMINI_API_KEY not set in environment variables.');
        res.status(500).json({ error: 'API key not configured on the server.' });
    }
});

app.post('/api/save-image', (req, res) => {
    try {
        const { image, filename } = req.body;
        if (!image || !filename) {
            return res.status(400).json({ error: 'Image and filename are required' });
        }

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        // Save to public (source) so it can be committed
        const publicDir = path.join(__dirname, 'public', 'images', 'generated');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(path.join(publicDir, filename), buffer);

        // Save to dist (serving) so it works immediately
        const distDir = path.join(__dirname, 'dist', 'images', 'generated');
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
        }
        const filePath = path.join(distDir, filename);
        fs.writeFileSync(filePath, buffer);

        console.log(`Saved image to ${filePath} and public source`);
        res.json({ url: `/images/generated/${filename}` });
    } catch (error) {
        console.error('Failed to save image:', error);
        res.status(500).json({ error: 'Failed to save image' });
    }
}
);

app.post('/api/save-video', async (req, res) => {
    try {
        const { video, videoUrl, filename } = req.body;
        if ((!video && !videoUrl) || !filename) {
            return res.status(400).json({ error: 'Video (or videoUrl) and filename are required' });
        }

        let buffer;
        if (videoUrl) {
            console.log(`Fetching video from URL: ${videoUrl}`);
            const vidRes = await fetch(videoUrl);
            if (!vidRes.ok) throw new Error(`Failed to fetch video: ${vidRes.statusText}`);
            const arrayBuffer = await vidRes.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } else {
            // Handle base64 string
            const base64Data = video.replace(/^data:video\/\w+;base64,/, "");
            buffer = Buffer.from(base64Data, 'base64');
        }

        // Save to public (source)
        const publicDir = path.join(__dirname, 'public', 'videos', 'generated');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(path.join(publicDir, filename), buffer);

        // Save to dist (serving)
        const distDir = path.join(__dirname, 'dist', 'videos', 'generated');
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
        }
        const filePath = path.join(distDir, filename);
        fs.writeFileSync(filePath, buffer);

        console.log(`Saved video to ${filePath} and public source`);
        res.json({ url: `/videos/generated/${filename}` });
    } catch (error) {
        console.error('Failed to save video:', error);
        res.status(500).json({ error: 'Failed to save video' });
    }
});

// Audience Persistence
const AUDIENCES_FILE = path.join(__dirname, 'public', 'data', 'audiences.json');

app.get('/api/audiences', (req, res) => {
    if (fs.existsSync(AUDIENCES_FILE)) {
        try {
            const data = fs.readFileSync(AUDIENCES_FILE, 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            console.error("Error reading audiences:", e);
            res.status(500).json({ error: "Failed to read audiences" });
        }
    } else {
        res.json([]); // Return empty if no file
    }
});

app.post('/api/audiences', (req, res) => {
    try {
        const dir = path.dirname(AUDIENCES_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(AUDIENCES_FILE, JSON.stringify(req.body, null, 2));

        // Also update dist if it exists so changes are reflected in current serve without rebuild
        const distFile = path.join(__dirname, 'dist', 'data', 'audiences.json');
        const distDir = path.dirname(distFile);
        if (fs.existsSync(path.join(__dirname, 'dist'))) {
            if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
            fs.writeFileSync(distFile, JSON.stringify(req.body, null, 2));
        }

        res.json({ success: true });
    } catch (e) {
        console.error("Error saving audiences:", e);
        res.status(500).json({ error: "Failed to save audiences" });
    }
});

// Email Campaigns Persistence
const EMAIL_CAMPAIGNS_FILE = path.join(__dirname, 'public', 'data', 'email_campaigns.json');

app.get('/api/load-email-campaigns', (req, res) => {
    if (fs.existsSync(EMAIL_CAMPAIGNS_FILE)) {
        try {
            const data = fs.readFileSync(EMAIL_CAMPAIGNS_FILE, 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            console.error("Error reading email campaigns:", e);
            res.json([]); // Return empty on error to avoid breaking UI
        }
    } else {
        res.json([]); // Return empty if no file
    }
});

app.post('/api/save-email-campaigns', (req, res) => {
    try {
        const campaigns = req.body;
        if (!Array.isArray(campaigns)) {
            return res.status(400).json({ error: "Campaigns must be an array" });
        }

        const dir = path.dirname(EMAIL_CAMPAIGNS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(EMAIL_CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2));

        // Update dist
        const distFile = path.join(__dirname, 'dist', 'data', 'email_campaigns.json');
        const distDir = path.dirname(distFile);
        if (fs.existsSync(path.join(__dirname, 'dist'))) {
            if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
            fs.writeFileSync(distFile, JSON.stringify(campaigns, null, 2));
        }

        res.json({ success: true });
    } catch (e) {
        console.error("Error saving email campaigns:", e);
        res.status(500).json({ error: "Failed to save email campaigns" });
    }
});

// Generic Run Persistence
const getRunFile = (featureId) => path.join(__dirname, 'public', 'data', `${featureId}_run.json`);

app.get('/api/load-run/:featureId', (req, res) => {
    const { featureId } = req.params;
    const filePath = getRunFile(featureId);

    if (fs.existsSync(filePath)) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            console.error(`Error reading ${featureId} run:`, e);
            res.status(500).json({ error: "Failed to read run" });
        }
    } else {
        res.status(404).json({ error: "No saved run found" });
    }
});

app.post('/api/save-run', (req, res) => {
    try {
        const { featureId, data } = req.body;
        if (!featureId) return res.status(400).json({ error: "featureId is required" });

        const filePath = getRunFile(featureId);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        // Update dist
        const distFile = path.join(__dirname, 'dist', 'data', `${featureId}_run.json`);
        const distDir = path.dirname(distFile);
        if (fs.existsSync(path.join(__dirname, 'dist'))) {
            if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
            fs.writeFileSync(distFile, JSON.stringify(data, null, 2));
        }

        res.json({ success: true });
    } catch (e) {
        console.error("Error saving run:", e);
        res.status(500).json({ error: "Failed to save run" });
    }
});

// Add application specific API routes here
// app.post('/api/some-feature', async (req, res) => { ... });

// ------------------

// Image Proxy Endpoint to bypass CORS
app.post('/api/proxy-image', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        console.log(`Proxying image request for: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch upstream image: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/png';

        res.json({ base64, mimeType });
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).json({ error: "Failed to proxy image" });
    }
});

// Debug Log Endpoint
app.post('/api/debug-log', async (req, res) => {
    try {
        const { prompt, imageUrl, timestamp } = req.body;
        console.log(`Received debug log request for ${imageUrl}`);

        let imageHtml = '<p>Image loading...</p>';
        try {
            const imgRes = await fetch(imageUrl);
            if (imgRes.ok) {
                const arrayBuffer = await imgRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64 = buffer.toString('base64');
                const mime = imgRes.headers.get('content-type') || 'image/png';
                imageHtml = `<img src="data:${mime};base64,${base64}" style="max-width: 100%; border: 1px solid #ccc;" />`;
            } else {
                imageHtml = `<p style="color:red">Failed to fetch image: ${imgRes.status} ${imgRes.statusText}</p>`;
            }
        } catch (fetchError) {
            imageHtml = `<p style="color:red">Error fetching image: ${fetchError.message}</p>`;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Debug Log</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; max-width: 800px; mx-auto; }
                    .card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #f9f9f9; }
                    h1 { color: #000000; }
                    pre { background: #eee; padding: 10px; overflow-x: auto; }
                </style>
            </head>
            <body>
                <h1>Debug Log</h1>
                <p><strong>Timestamp:</strong> ${timestamp}</p>
                
                <div class="card">
                    <h3>Prompt Sent to Service:</h3>
                    <pre>${prompt}</pre>
                </div>

                <div class="card" style="margin-top: 20px;">
                    <h3>Reference Image Sent to Service:</h3>
                    <p>Source URL: <a href="${imageUrl}">${imageUrl}</a></p>
                    ${imageHtml}
                </div>
            </body>
            </html>
        `;

        const publicPath = path.join(__dirname, 'public', 'debug.html');
        const distPath = path.join(__dirname, 'dist', 'debug.html');

        fs.writeFileSync(publicPath, htmlContent);
        // Ensure dist exists before writing
        if (fs.existsSync(path.join(__dirname, 'dist'))) {
            fs.writeFileSync(distPath, htmlContent);
        }

        console.log('Debug HTML generated at /debug.html');
        res.json({ success: true, url: '/debug.html' });

    } catch (error) {
        console.error("Debug log error:", error);
        res.status(500).json({ error: "Failed to generate debug log" });
    }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
});

process.on('SIGINT', () => {
    console.log('Server shutting down');
    process.exit(0);
});
