import Fs from "fs";
import {google, oauth2_v2} from "googleapis";
const Youtube = google.youtube("v3");
const oauth2Client = google.auth.OAuth2;

const tokenPath: Fs.PathOrFileDescriptor = "./.credential/client_secret.json";
const credentialPath: Fs.PathOrFileDescriptor = "./.credential/credentials.json";
const credentials = JSON.parse(Fs.readFileSync(credentialPath).toString()).web;

const auth = new oauth2Client(
  credentials.client_id,
  credentials.client_secret,
  credentials.redirect_uris[0]);
//stringをStringにしてしまって1時間潰した
export async function addVideoToPlaylist(videoId:string, playlistId:string,pos=0){
  const response = await Youtube.playlistItems.insert({
    auth:auth,
    part: ["snippet"],
    requestBody:{
      id:videoId,
      snippet:{
        playlistId,
        // position:0,
        resourceId:{
          videoId,
          kind: "youtube#video"
        }
      }
    },
  });
  return response;
}

export async function addPlaylist(channelName:string){
  const response = await Youtube.playlists.insert({
    auth:auth,
    part:["snippet","status"],
    requestBody:{
      status:{
        privacyStatus:"public"
      },
      snippet:{
        title:channelName,
        description:"created by bot using takashiski's server"
      }
    }
  })
  return response;
}

export function init(){
  try{
  auth.setCredentials(JSON.parse(Fs.readFileSync(tokenPath).toString()));
  }
  catch(e){
    console.error(e);
  }
}

