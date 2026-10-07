import { google } from 'googleapis';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import http from 'node:http';
import url from 'node:url';

const rl = readline.createInterface({ input, output });

async function getRefreshToken() {
  console.log('--- GoSakha Gmail OAuth Token Generator ---\n');

  const CLIENT_ID = await rl.question('Enter your Client ID: ');
  const CLIENT_SECRET = await rl.question('Enter your Client Secret: ');
  const REDIRECT_URI = await rl.question('Enter your Redirect URI (http://localhost:4000/api/auth/google/callback): ');

  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
  ];

  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Crucial: ensures a refresh_token is returned
    scope: scopes,
    include_granted_scopes: true,
  });

  console.log('\nOpening the following URL in your browser. If it does not open, please copy and paste it manually:');
  console.log(authorizationUrl);

  // Start a temporary server to listen for the callback
  const server = http.createServer(async (req, res) => {
    const q = url.parse(req.url, true).query;

    if (q.error) {
      console.error('\nError during authorization:', q.error);
      res.end('Authorization failed. Check the terminal for details.');
      server.close();
      rl.close();
      return;
    }

    if (q.code) {
      res.end('Authorization successful! You can close this browser tab and check your terminal.');
      server.close();

      try {
        const { tokens } = await oauth2Client.getToken(q.code);
        console.log('\n--- SUCCESS! ---');
        console.log('Add these to your backend/.env file:\n');
        console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
        console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
        console.log(`GOOGLE_REDIRECT_URI=${REDIRECT_URI}`);
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('\n--- END OF CREDENTIALS ---');
      } catch (err) {
        console.error('Error exchanging code for token:', err.message);
      } finally {
        rl.close();
      }
    }
  });

  server.listen(4000, () => {
    console.log(`\nLocal server listening on http://localhost:4000. Waiting for authorization...`);
  });
}

getRefreshToken();