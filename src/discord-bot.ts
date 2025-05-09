import { Client, GatewayIntentBits, Message } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

interface StoredVideo {
  videoId: string;
  message: Message;
}

const postedVideos = new Map<string, StoredVideo>();

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const YOUTUBE_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/g;
  const matches = message.content.matchAll(YOUTUBE_REGEX);

  for (const match of matches) {
    const videoId = match[1];

    if (postedVideos.has(videoId)) {
      const original = postedVideos.get(videoId)!;
      await message.delete();

      const msgLink = `https://discord.com/channels/${original.message.guildId}/${original.message.channelId}/${original.message.id}`;

      message.author.send(
        `Hi ${message.author.username}, this YouTube video was already shared here:\n${msgLink}\n\nInstead of reposting, feel free to react to the original message to show your support! ✅`
      ).catch(() => {
        console.log(`DM failed for ${message.author.tag}`);
      });

      return;
    } else {
      postedVideos.set(videoId, { videoId, message });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
