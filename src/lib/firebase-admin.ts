import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
  projectId: string;
  storageBucket?: string;
};

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
    ...(firebaseConfig.storageBucket
      ? { storageBucket: firebaseConfig.storageBucket }
      : {}),
  });
}

export const adminAuth = getAuth();
export const adminStorage = getStorage();
export const firebaseStorageBucketName = firebaseConfig.storageBucket ?? '';
