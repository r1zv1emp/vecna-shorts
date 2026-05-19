import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import CryptoJS from 'crypto-js';

const router = Router();
const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'vecna-secret-key-32chars-minimum!!';

const encrypt = (text: string) => CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
const decrypt = (cipher: string) => {
  try {
    return CryptoJS.AES.decrypt(cipher, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
  } catch { return ''; }
};

// Get API settings (masked)
router.get('/api', async (req: AuthRequest, res: Response) => {
  const settings = await prisma.apiSettings.findUnique({ where: { userId: req.user!.id } });
  if (!settings) return res.json(null);
  res.json({
    id: settings.id,
    apiKey: settings.apiKey.slice(0, 8) + '****' + settings.apiKey.slice(-4),
    secretKey: '****',
    isTestnet: settings.isTestnet,
    updatedAt: settings.updatedAt
  });
});

// Save API settings
router.post('/api',
  [body('apiKey').notEmpty(), body('secretKey').notEmpty(), body('isTestnet').isBoolean()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { apiKey, secretKey, isTestnet } = req.body;
    const settings = await prisma.apiSettings.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        apiKey: encrypt(apiKey),
        secretKey: encrypt(secretKey),
        isTestnet
      },
      update: { apiKey: encrypt(apiKey), secretKey: encrypt(secretKey), isTestnet }
    });

    res.json({ success: true, isTestnet: settings.isTestnet });
  }
);

export const getDecryptedApiSettings = async (userId: string) => {
  const settings = await prisma.apiSettings.findUnique({ where: { userId } });
  if (!settings) return null;
  return {
    apiKey: decrypt(settings.apiKey),
    secretKey: decrypt(settings.secretKey),
    isTestnet: settings.isTestnet
  };
};

// User route
router.use('/user', async (_req: AuthRequest, res: Response) => {
  res.json({ ok: true });
});

export default router;
