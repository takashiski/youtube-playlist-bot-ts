import { Client, Intents, Message } from "discord.js";
import fs from "fs";
import path from "node:path";
import { addVideoToPlaylist, addPlaylist, init } from "./youtube";

import admin from "firebase-admin";
import dotenv from "dotenv";
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const serviceAccount = JSON.parse(process.env.firebase!);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS]
});

const discordToken = JSON.parse(process.env.discord!);
console.log(discordToken);

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
    const doc = db.collection("guilds").doc(m.guildId!).collection("subscribedChannels").doc(m.channelId);
    switch (command) {
      case "subscribe":
        console.log((await doc.get()).data());
        if (!(await doc.get()).data()) {
          try {
            await doc.set({
              playlistId: args[2] ? args[2] : ((await addPlaylist(channelName)).data.id!),
              channelName: channelName
            });
            m.react("🙆");
          }
          catch (error) {
            console.error(error);
            m.react("❌");
          }

        }
        else {
          m.channel.send("this channel is already subscribed.");
        }
        break;
      case "unsubscribe":
        if (await doc.get()) {
          await doc.delete();
          m.react("🙆");
        } else {
          m.channel.send("this channel has been subscribed yet.");
        }
        break;
      case "list":
        const channels = db.collection("guilds").doc(m.guildId!).collection("subscribedChannels");
        let channelListString = "subscribing channel list:\n\n";
        let lists = await channels.get();
        if (lists.size > 0) {
          lists.forEach((doc) => {
            channelListString += ` - <#${doc.id}> ${doc.data().channelName} ${getPlaylistUrl(doc.data().playlistId)} \n`;
          });
          m.channel.send(channelListString);
        }
        else {
          m.channel.send("I subscribe no channel now.");
        }
        m.react("🙆");
        break;
      default:
        m.channel.send(`command list:
          - subscribe
          - unsubscribe
          - list`);
    }
  }
  //embedsの中にyoutube動画あったらプレイリストに突っ込む

  //待ち時間入れないとembed展開前に呼ばれて無反応になる
  await new Promise(resolve => setTimeout(resolve, 500));

  const doc = await db.collection("guilds").doc(m.guildId!).collection("subscribedChannels").doc(m.channelId).get();
  if (doc) {
    if (m.embeds.length > 0) {
      const playlistId = doc.data()!.playlistId;
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
  else{
    m.channel.send("this channel has not been subscribed yet.");
  }
});

async function main() {
  try {
    init();
    client.login(discordToken.token);
    console.log("read correct discord token");
  }
  catch (err) {
    console.error(err);
  }
}

main();

function getPlaylistUrl(playlistId: string) {
  const baseUrl = "https://www.youtube.com/playlist?list=";
  return baseUrl + playlistId;
}