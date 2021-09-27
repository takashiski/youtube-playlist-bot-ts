import { Client, Intents, Message, MessageEmbed, MessageReaction, Permissions, User } from "discord.js";
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
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
  partials:["CHANNEL","MESSAGE","REACTION"]
});

const discordToken = JSON.parse(process.env.discord!);
console.log(discordToken);

client.on("ready", () => {
  console.log("ready bot")
})

client.on("messageCreate", async (m: Message) => {
  // if (m.author.bot) {
  //   //botが投稿したdiscord URLは展開する
  //   try{
  //     const url = new URL(m.content);
  //     if(url.host === "discord.com"){
  //       const embed={};
  //       m.channel.send(embed);
  //     }
  //   }
  //   catch{
  //     //content is not url;
  //     return;
  //   }
  //   return;
  // }
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
          m.react("🗑");
        } else {
          m.channel.send("this channel has been subscribed yet.");
        }
        break;
      case "list":
        const subscribedChannels = db.collection("guilds").doc(m.guildId!).collection("subscribedChannels");
        let channelListString = "subscribing channel list:\n\n";
        let lists = await subscribedChannels.get();
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
      case "transport":
        //m.channelでreactがついた投稿を与えられたチャンネルに投げる
        console.log("transport");
        const transportChannels = db.collection("guilds").doc(m.guildId!).collection("transportChannels");
        if (args[2]) {
          if (args[2] === "delete") {
            await transportChannels.doc(m.channelId).delete();
            m.react("🗑");
          }
          else {
            console.log(`[${args[2]}]`);
            console.log(args[2].substr(2, args[2].length - 3));
            await transportChannels.doc(m.channelId).set({
              sendto: args[2].trim().substr(2, args[2].length - 3)
            });
          }
        }
        break;
      default:
        m.channel.send(`command list:
          - subscribe [youtube playlist id]
          - unsubscribe
          - list
          - transport [channel]
          - transport delete`);
    }
  }
  //embedsの中にyoutube動画あったらプレイリストに突っ込む

  //待ち時間入れないとembed展開前に呼ばれて無反応になる
  await new Promise(resolve => setTimeout(resolve, 500));

  if (m.embeds.length > 0) {
    const doc = await db.collection("guilds").doc(m.guildId!).collection("subscribedChannels").doc(m.channelId).get();
    if (doc) {
      const playlistId = doc.data()!.playlistId;
      m.embeds.forEach(async (v, i, a) => {
        if (v.video) {
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
        }
      });
    }
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (user === client.user) return;
  if (reaction.emoji.toString() === "😀") {
    const doc = await db.collection("guilds").doc(reaction.message.guildId!).collection("transportChannels").doc(reaction.message.channelId).get();
    console.log(doc.data());
    if (doc.data()) {
      const url = reaction.message.url;
      const sendto = doc.data()!.sendto;
      const channel = client.channels.cache.get(sendto);
      let message=reaction.partial?(await reaction.fetch()).message:reaction.message; 
      console.log("get transport reaction");
      const embeds = [
        new MessageEmbed()
          .setDescription(message.content!)
          .setAuthor(message.author?.username!)
      ];
      reaction.message.embeds.forEach((v) => {
        embeds.push(v);
      });
      if (channel?.isText()) {
        try {

          channel.send({
            content: url,
            embeds
          });
        }
        catch (error) {
          console.log(error);
        }
      }
    }
  }
});

async function main() {
  try {
    init();
    await client.login(discordToken.token);
    console.log("read correct discord token");
    //https://discordjs.guide/additional-info/changes-in-v13.html#client
    console.log(client.generateInvite({
      scopes: ["bot"],
      permissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.ADD_REACTIONS,
        Permissions.FLAGS.EMBED_LINKS,
        Permissions.FLAGS.USE_PUBLIC_THREADS,
        Permissions.FLAGS.MANAGE_ROLES,
        Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS,
        Permissions.FLAGS.MANAGE_CHANNELS,
        Permissions.FLAGS.VIEW_CHANNEL
      ]
    }));
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