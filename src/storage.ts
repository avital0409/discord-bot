import fs from 'fs';
import path from 'path';

const FILE_PATH = path.resolve(__dirname, '../postedVideos.json');

export interface StoredVideoData {
  __scanned: boolean;
  [videoId: string]: string | boolean;
}

export const loadPostedVideos = (): StoredVideoData => {
  if (!fs.existsSync(FILE_PATH)) {
    return { __scanned: false };
  }
  const raw = fs.readFileSync(FILE_PATH, 'utf-8');
  return JSON.parse(raw);
}

export const savePostedVideos = (videos: StoredVideoData): void => {
  fs.writeFileSync(FILE_PATH, JSON.stringify(videos, null, 2));
}
