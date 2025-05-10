
import { Client, TextChannel } from 'discord.js';

const DEBUG_CHANNEL_ID = '1370897588202770543';

export enum logLevel {
    INFO = "🟢",
    WARN = "🟡",
    ERROR = "🔴",
}

export const sendDebugLog = async (client: Client, message: string, level: logLevel) => {
  const channel = client.channels.cache.get(DEBUG_CHANNEL_ID) as TextChannel;
  if (channel && channel.isTextBased()) {
    const timestamp = Math.floor(Date.now() / 1000); // UNIX time in seconds
    await channel.send(`${level} [DejaView] [<t:${timestamp}:F>] ${message}`);
    console.log(message);
  }
}
