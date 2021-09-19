import { Client, Intents, Message } from "discord.js";
import fs from "fs";
import path from "node:path";
import { addVideoToPlaylist, addPlaylist, init } from "./youtube";

import admin from "firebase-admin";

const serviceAccountKeyPath: fs.PathOrFileDescriptor = ".credential/serviceAccountKey.json";
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountKeyPath).toString());
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const collectionRef = db.collection("subscribedPlaylist");

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});
const tokenPath: fs.PathOrFileDescriptor = ".credential/config.json"
const TOKEN = JSON.parse(fs.readFileSync(tokenPath).toString());
console.log(TOKEN);
type SubscribedChannel = {
  id: string,
  name: string
}
const subscribedMap = new Map<string, SubscribedChannel>();



client.on("ready", () => {
  console.log("ready bot")
})

client.on("messageCreate", async (m: Message) => {
  if (m.author.bot) return;
  if (!m.channel.isText()) return;
  const channelName = m.guild?.channels.cache.get(m.channelId)?.name!;
  console.log(`this channel id is ${m.channelId}`);

  if (m.mentions.users.has(client.user?.id!)) {
    console.log("this is to me");
    console.log(m.channel.toString())
    const args = m.content.split(" ");
    const command = args[1];
    // const command = m.content.slice(m.content.indexOf(" "), undefined).trim();
    switch (command) {
      case "subscribe":
        if (!subscribedMap.has(m.channelId)) {
          try {
            const playlistId = args[2]?args[2]:(await addPlaylist(channelName)).data.id!;
            subscribedMap.set(m.channelId, {
              id: playlistId,
              name: channelName
            });
            await updateSubscribedMap();
            m.react("🙆");
          }
          catch (e) {
            console.error(e);
            m.react("❌");
          }
        }
        break;
      case "unsubscribe":
        if (subscribedMap.has(m.channelId)) {
          subscribedMap.delete(m.channelId);
          await updateSubscribedMap();
          m.channel.send("unsubscribed");
        }
        else {
          m.channel.send("I haven't subscribed this channel.");
        }
        m.react("🙆");
        break;
      case "list":
        if (subscribedMap.size != 0) {
          let channelListString = "subscribing channel list:\n\n";
          subscribedMap.forEach((v, k, m) => {
            channelListString += `  - ${getChannelNameFromId(k)} ${getPlaylistUrl(v.id)}`;
            channelListString += "\n";
          });
          m.channel.send(channelListString);
          console.log(subscribedMap);
        }
        else {
          m.channel.send("I subscribe no channel now.");
        }
        m.react("🙆");
        break;
      default:
        console.log(`command list:
          - subscribe
          - unsubscribe
          - list`);
    }
  }
  //待ち時間入れないとembed展開前に呼ばれて無反応になる
  await new Promise(resolve=>setTimeout(resolve, 500));
  if (m.embeds.length > 0) {
    if (!subscribedMap.has(m.channelId)) {
      console.error("I haven't subscribed this channel yet");
      m.react("❓");
      m.channel.send("I haven't subscribed this channel yet.");
    }
    else {
      const playlistId = (subscribedMap.get(m.channelId))?.id!;
      m.embeds.forEach(async (v, i, a) => {
        const url = new URL(v.video?.url!);
        console.log(v.video?.url!);
        if (url.hostname === "www.youtube.com") {
          const videoId = path.basename(url.pathname);
          try {
            console.log(`add ${videoId} to ${playlistId}`);
            const res = await addVideoToPlaylist(videoId, playlistId);
            m.react("✅");
          }
          catch (e) {
            console.error(e);
            m.react("❌");
          }
        }
      });
    }
  }
});

type fsChannelData = {
  playlistId: string,
  channelId: string,
  channelName: string
}
type firestoreData = {
  subscribedChannels: Array<fsChannelData>
}
async function main() {
  try {
    init();
    client.login(TOKEN.token);
    console.log("read correct discord token");
    const snapshot = await collectionRef.doc("testPlaylist").get();
    if (snapshot.exists) {
      const test: any = snapshot.data()!.subscribedChannels;
      console.log(test);
      const channels:Array<fsChannelData> = test;
      channels.forEach((v) => {
        subscribedMap.set(v.channelId, {
          id: v.playlistId,
          name: v.channelName
        });
      });
      // console.log(snapshot.data());
      console.log(subscribedMap);
    }
  }
  catch (err) {
    console.error(err);
  }
}

main();

async function updateSubscribedMap() {
  const docRef = await collectionRef.doc("testPlaylist");
  try {
    const res = await docRef.set({
      servername: "takashiski's sandbox",
      subscribedChannels:[...subscribedMap.entries()].map(v => {
      return {
        channelId: v[0],
        channelName: v[1].name,
        playlistId: v[1].id
      }
    })}
    );
  }
  catch (e) {
    console.error(e);
  }
}
function getChannelNameFromId(channelId:string){
  return `<#${channelId}>`;
}
function getPlaylistUrl(playlistId:string){
  const baseUrl = "https://www.youtube.com/playlist?list=";
  return baseUrl+playlistId;
}