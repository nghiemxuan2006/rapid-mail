import fs from 'fs';
import path from 'path';
import settings from '../config/env';
import { BAD_REQUEST_ERROR } from '../utils/error';

const ATTACHMENTS_DIR = path.resolve(String(settings.FILE_STORAGE_PATH), 'attachments');

export const ensureStorageDir = () => {
    fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
};

const buildFilePath = (campaignId: string, filename: string) => {
    return path.join(ATTACHMENTS_DIR, campaignId, filename);
};

const buildCampaignDir = (campaignId: string) => {
    return path.join(ATTACHMENTS_DIR, campaignId);
};

export const saveFiles = (campaignId: string, files: Express.Multer.File[]) => {
    const campaignDir = buildCampaignDir(campaignId);
    fs.mkdirSync(campaignDir, { recursive: true });

    return files.map((file) => {
        const uniqueName = `${Date.now()}_${file.originalname}`;
        const filePath = path.join(campaignDir, uniqueName);
        fs.writeFileSync(filePath, file.buffer);

        return {
            filename: file.originalname,
            storedName: uniqueName,
            mimeType: file.mimetype,
            size: file.size,
        };
    });
};

export const readFile = (campaignId: string, storedName: string): Buffer => {
    const filePath = buildFilePath(campaignId, storedName);
    if (!fs.existsSync(filePath)) {
        throw new BAD_REQUEST_ERROR(`Attachment file not found: ${storedName}`);
    }
    return fs.readFileSync(filePath);
};

export const deleteFiles = (campaignId: string) => {
    const campaignDir = buildCampaignDir(campaignId);
    if (fs.existsSync(campaignDir)) {
        fs.rmSync(campaignDir, { recursive: true, force: true });
    }
};

export const deleteSingleFile = (campaignId: string, storedName: string) => {
    const filePath = buildFilePath(campaignId, storedName);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

const buildConfigPath = (campaignId: string) =>
    path.join(ATTACHMENTS_DIR, campaignId, 'config.json');

export const writeCampaignConfig = (campaignId: string, config: { signature: string }): void => {
    const campaignDir = buildCampaignDir(campaignId);
    fs.mkdirSync(campaignDir, { recursive: true });
    fs.writeFileSync(buildConfigPath(campaignId), JSON.stringify(config), 'utf-8');
};

export const readCampaignConfig = (campaignId: string): { signature: string } | null => {
    const configPath = buildConfigPath(campaignId);
    if (!fs.existsSync(configPath)) return null;
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as { signature: string };
    } catch {
        return null;
    }
};
