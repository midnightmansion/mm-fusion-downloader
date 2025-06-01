import 'dotenv/config'
import express from 'express'
import axios from 'axios'
import { downloadFusionFiles } from './download.js'
import open from 'open'

const app = express();
const PORT = 3000;

const scopes = [
  'data:read',
  'data:write',
  'data:create',
  'viewables:read',
].join(' ');

// Step 1: Redirect to Autodesk login
app.get('/', (req, res) => {
  const url = `https://developer.api.autodesk.com/authentication/v2/authorize` +
  `?response_type=code&client_id=${process.env.CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(scopes)}`;
  res.redirect(url);
});

// Step 2: Handle OAuth callback
app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');

  try {
    const tokenRes = await axios.post(
      'https://developer.api.autodesk.com/authentication/v2/token',
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    console.log('\n🎉 ACCESS TOKEN:', access_token);
    console.log('🔄 REFRESH TOKEN:', refresh_token);
    console.log(`⏱️  Expires in: ${expires_in}s`);

    // OPTIONAL: Try a test call (e.g., list your hubs)
    const hubsRes = await axios.get('https://developer.api.autodesk.com/project/v1/hubs', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    // console.log('\n🧩 Hubs:', JSON.stringify(hubsRes.data, null, 2));

    console.log('now attempting to download Fusion files...');
    await downloadFusionFiles(access_token);

    res.send(`
      <h1>✅ Auth Complete</h1>
      <p>You can now use your access token to fetch data.</p>
      <pre>${JSON.stringify(hubsRes.data, null, 2)}</pre>
    `);

  } catch (err) {
    console.error('❌ Error during token exchange:', err.message);
    res.status(500).send('OAuth error');
  }
});

// Start server and open browser
app.listen(PORT, () => {
  console.log(`🌐 Visit: http://localhost:${PORT}`);
  open(`http://localhost:${PORT}`);
});

