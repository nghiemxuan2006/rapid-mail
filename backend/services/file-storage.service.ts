import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import settings from '../config/env';
import { BAD_REQUEST_ERROR } from '../utils/error';

const ATTACHMENTS_DIR = path.resolve(String(settings.FILE_STORAGE_PATH), 'attachments');

export const ensureStorageDir = () => {
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
};

const buildFilePath = (campaignId: string, filename: string) =>
  path.join(ATTACHMENTS_DIR, campaignId, filename);

const buildCampaignDir = (campaignId: string) =>
  path.join(ATTACHMENTS_DIR, campaignId);

export const saveFiles = async (
  campaignId: string,
  files: Express.Multer.File[],
): Promise<{ filename: string; storedName: string; mimeType: string; size: number }[]> => {
  const campaignDir = buildCampaignDir(campaignId);
  await fsp.mkdir(campaignDir, { recursive: true });

  return Promise.all(
    files.map(async (file) => {
      const uniqueName = `${Date.now()}_${file.originalname}`;
      await fsp.writeFile(path.join(campaignDir, uniqueName), file.buffer);
      return {
        filename: file.originalname,
        storedName: uniqueName,
        mimeType: file.mimetype,
        size: file.size,
      };
    }),
  );
};

export const readFile = async (campaignId: string, storedName: string): Promise<Buffer> => {
  const filePath = buildFilePath(campaignId, storedName);
  try {
    return await fsp.readFile(filePath);
  } catch {
    throw new BAD_REQUEST_ERROR(`Attachment file not found: ${storedName}`);
  }
};

export const deleteFiles = async (campaignId: string): Promise<void> => {
  const campaignDir = buildCampaignDir(campaignId);
  try {
    await fsp.rm(campaignDir, { recursive: true, force: true });
  } catch {
    // directory may not exist — ignore
  }
};

export const deleteSingleFile = async (campaignId: string, storedName: string): Promise<void> => {
  const filePath = buildFilePath(campaignId, storedName);
  try {
    await fsp.unlink(filePath);
  } catch {
    // file may not exist — ignore
  }
};

const buildConfigPath = (campaignId: string) =>
  path.join(ATTACHMENTS_DIR, campaignId, 'config.json');

export const writeCampaignConfig = async (
  campaignId: string,
  config: { signature: string },
): Promise<void> => {
  const campaignDir = buildCampaignDir(campaignId);
  await fsp.mkdir(campaignDir, { recursive: true });
  await fsp.writeFile(buildConfigPath(campaignId), JSON.stringify(config), 'utf-8');
};

export const readCampaignConfig = async (
  campaignId: string,
): Promise<{ signature: string } | null> => {
  try {
    const raw = await fsp.readFile(buildConfigPath(campaignId), 'utf-8');
    return JSON.parse(raw) as { signature: string };
  } catch {
    return null;
  }
};
