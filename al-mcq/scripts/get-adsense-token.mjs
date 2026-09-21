/**
 * One-off: produces the ADSENSE_REFRESH_TOKEN for /admin/earnings.
 *
 *   node scripts/get-adsense-token.mjs
 *
 * Needs GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your
 * environment, from a Google Cloud OAuth client of type "Web application"
 * with http://localhost:8737 listed as an authorised redirect URI.
 *
 * Run it once, sign in as the Google account that owns the AdSense account,
 * and paste the token it prints into Vercel. The token does not expire
 * unless you revoke it.
 */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const PORT = 8737;
const REDIRECT = `http://localhost:${PORT}`;

if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET first.");
  process.exit(1);
}

const state = randomBytes(16).toString("hex");
const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/adsense.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
  });

console.log("\nOpen this in your browser:\n");
console.log(authUrl + "\n");

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400).end("No code in the callback.");
    return;
  }
  if (url.searchParams.get("state") !== state) {
    res.writeHead(400).end("State mismatch — start again.");
    return;
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT,
      grant_type: "authorization_code",
    }),
  });

  const data = await tokenRes.json();

  if (!data.refresh_token) {
    res.writeHead(400).end("No refresh token returned. Revoke the app's access and retry.");
    console.error(data);
    process.exit(1);
  }

  res.writeHead(200, { "Content-Type": "text/html" }).end(
    "<p style='font:16px system-ui;padding:40px'>Done. The refresh token is in your terminal.</p>"
  );

  console.log("\nADSENSE_REFRESH_TOKEN=" + data.refresh_token + "\n");
  console.log("Add that to Vercel, along with ADSENSE_ACCOUNT_ID (your pub-… id).\n");

  server.close();
  process.exit(0);
});

server.listen(PORT, () => console.log(`Waiting for the callback on ${REDIRECT} …`));
