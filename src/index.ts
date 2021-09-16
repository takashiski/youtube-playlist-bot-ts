import { Client, Intents, Message } from "discord.js";
import fs from "fs";


const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]

});
const tokenPath: fs.PathOrFileDescriptor = ".credential/config.json"
const TOKEN = JSON.parse(fs.readFileSync(tokenPath).toString());
console.log(TOKEN);

client.on("ready",()=>{
  console.log("ready bot")
})

client.on("messageCreate", async (m: Message) => {
  if (m.author.bot) return;
  console.log(m.content);
  if (m.content === "ping") {
    await m.channel.send("pong");
    console.log("replyed")
  }
})
async function main() {
  try{
    client.login(TOKEN.token);
    console.log("read correct discord token");
  }
  catch(err){
    console.error(err);
  }
}

main();