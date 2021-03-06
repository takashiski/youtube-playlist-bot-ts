import Fs from "fs";
import { google, oauth2_v2 } from "googleapis";
import Express from "express";
import { URL } from "url";
import https from "https";

const tokenPath: Fs.PathOrFileDescriptor = "./.credential/client_secret.json";
const credentialPath: Fs.PathOrFileDescriptor = "./.credential/credentials.json";
const credentials = JSON.parse(Fs.readFileSync(credentialPath).toString()).web;

const oauth2Client = new google.auth.OAuth2(
  credentials.client_id,
  credentials.client_secret,
  credentials.redirect_uris[0]);

const SCOPES = ["https://www.googleapis.com/auth/youtube"];

const authUrL = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES
});

const app = Express();
// const port = 3000;
const port = 80;

type CallbackParams = {
  code: string,
  scope: string
}

app.get("/", async(req, res) => {
  const url = "http://localhost" + req.url;
  console.log(url)
  const codeOrNull: string | null = (new URL(url)).searchParams.get("code");
  const code = codeOrNull ? codeOrNull : "";
  if (code === "") {
    res.send(`Please access from authorization URL`);
  }
  else {
    console.log(code);
    const credential = (await oauth2Client.getToken(code));
    console.log(credential);
    const token = credential.tokens;
    console.log(token);
    if (!(token.refresh_token)) {
      res.send(`retry after you remove permission from https://myaccount.google.com/u/0/permissions. then, access ${authUrL}.`);
    }
    else {
      Fs.writeFileSync(tokenPath, JSON.stringify(token));
      res.send(`you authorized. close window and run discord bot`);
    }
  }
})

app.get("/callback", async (req, res) => {

  const url = "http://localhost" + req.url;
  console.log(url)
  const codeOrNull: string | null = (new URL(url)).searchParams.get("code");
  const code = codeOrNull ? codeOrNull : "";
  if (code === "") {
    res.send(`Please access from authorization URL`);
  }
  else {
    console.log(code);
    const credential = (await oauth2Client.getToken(code));
    console.log(credential);
    const token = credential.tokens;
    console.log(token);
    if (!(token.refresh_token)) {
      res.send(`retry after you remove permission from https://myaccount.google.com/u/0/permissions. then, access ${authUrL}.`);
    }
    else {
      Fs.writeFileSync(tokenPath, JSON.stringify(token));
      res.send(`you authorized. close window and run discord bot`);
    }
  }
});
//https://note.kiriukun.com/entry/20190704-https-express
const pemPath:Fs.PathOrFileDescriptor = "key/private_key.pem";
const crtPath:Fs.PathOrFileDescriptor = "key/server.crt";
const httpsOptions = {
  key: Fs.readFileSync(pemPath),
  cert: Fs.readFileSync(crtPath)
}

if (!(Fs.existsSync(tokenPath))) {
  console.log(`access to ${authUrL} to get youtube API token`);
  const server = https.createServer(httpsOptions,app).listen(port);
  // app.listen(port, () => {
  // })
}
else {
  console.error(`you already authorized`);
}