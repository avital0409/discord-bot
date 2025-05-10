import { loadPostedVideos, savePostedVideos, StoredVideoData } from './storage';
import { Client, Collection, GatewayIntentBits, Message, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import { logLevel, sendDebugLog } from './logger';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let postedVideos = loadPostedVideos();

const getYouTubeTitle = async (videoId: string): Promise<string | null> => {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as { title: string };
    return data.title;
  } catch {
    return null;
  }
}

const scanHistory = async (channel: TextChannel, postedVideos: StoredVideoData) => {
  let lastId: string | undefined = undefined;
  let keepGoing = true;

  while (keepGoing) {
    const messages: Collection<string, Message> = await channel.messages.fetch({ limit: 100, before: lastId });
    if (messages.size === 0) break;

    for (const msg of messages.values()) {
      const matches = msg.content.matchAll(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/g);
      for (const match of matches) {
        const videoId = match[1];
        if (!postedVideos[videoId]) {
          postedVideos[videoId] = `https://discord.com/channels/${msg.guildId}/${msg.channelId}/${msg.id}`;
        }
      }
    }

    lastId = messages.last()?.id;
    keepGoing = messages.size === 100;
  }

  savePostedVideos(postedVideos);
}

client.once('ready', async () => {
  await sendDebugLog(client, `Bot is online as ${client.user?.tag}.`, logLevel.INFO);

  if (!postedVideos.__scanned) {
    await sendDebugLog(client, `Scanning message history in all text channels... 🔍`, logLevel.INFO);

    for (const [guildId, guild] of client.guilds.cache) {
      const fullGuild = await guild.fetch(); // Ensures full data
      for (const [channelId, channel] of fullGuild.channels.cache) {
        if (
          channel.isTextBased() &&
          channel.type === 0 && // GuildText
          channel.viewable &&
          'messages' in channel // Only text channels have .messages
        ) {
          await scanHistory(channel as TextChannel, postedVideos);
        }
      }
    }

    postedVideos.__scanned = true;
    savePostedVideos(postedVideos);

    await sendDebugLog(client, `History scan complete.`, logLevel.INFO);
  }
  await sendDebugLog(client, `Waiting for requests...`, logLevel.INFO);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const YOUTUBE_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/g;
  const matches = message.content.matchAll(YOUTUBE_REGEX);

  for (const match of matches) {
    const videoId = match[1];
    const videoTitle = await getYouTubeTitle(videoId);

    if (postedVideos[videoId]) {
      await sendDebugLog(client, `Detected duplicate video request from ${message.author.tag} blocked in #${(message.channel as TextChannel).name}\n🎥 **${videoTitle}**`, logLevel.INFO);
      try {
        await message.delete();
      } catch (error: any) {
        if (error.code !== 10008) {
          await sendDebugLog(client, `Failed to delete message: ${error}`, logLevel.ERROR);
        }
      }

      const msgLink = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;
      const response = `Hey ${message.author.username},\n`
      + (videoTitle ? `The video 🎥 **${videoTitle}**` : 'That video')
      + ` was already requested for reaction earlier here: ${msgLink}`
      + `\nFeel free to react to the original message if you want Shady to check it out! 🎬`;
      
      message.author.send(response).catch(async () => {
        await sendDebugLog(client, `DM failed for ${message.author.tag}`, logLevel.WARN);
      });

      return;
    } else {
      const messageLink = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;
      postedVideos[videoId] = messageLink;
      savePostedVideos(postedVideos);
    }
  }
});

process.on('unhandledRejection', async (reason) => {
  await sendDebugLog(client, `Unhandled Rejection: ${reason}`, logLevel.ERROR);
});

client.login(process.env.DISCORD_TOKEN);
