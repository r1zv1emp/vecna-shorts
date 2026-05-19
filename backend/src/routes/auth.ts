import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';

const router = Router();
const prisma = new PrismaClient();

// Login
router.post('/login',
  [body('username').trim().notEmpty(), body('password').notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;

    // Static owner check
    if (username === 'Vecna7' && password === '@Hassanr1zv1') {
      let owner = await prisma.user.findUnique({ where: { username: 'Vecna7' } });
      if (!owner) {
        owner = await prisma.user.create({
          data: {
            username: 'Vecna7',
            email: 'owner@vecna.local',
            password: await bcrypt.hash('@Hassanr1zv1', 10),
            role: 'OWNER',
          }
        });
      }
      const token = jwt.sign({ id: owner.id, username: owner.username, role: 'OWNER' }, process.env.JWT_SECRET!, { expiresIn: '7d' });
      return res.json({ token, user: { id: owner.id, username: owner.username, role: 'OWNER' } });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.isActive) return res.status(401).json({ error: 'Account disabled' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  }
);

// Register
router.post('/register',
  [
    body('username').trim().isLength({ min: 3, max: 20 }),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('inviteCode').trim().notEmpty()
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password, inviteCode } = req.body;

    // Validate invite code
    const code = await prisma.inviteCode.findUnique({ where: { code: inviteCode } });
    if (!code) return res.status(400).json({ error: 'Invalid invite code' });
    if (code.isUsed) return res.status(400).json({ error: 'Invite code already used' });
    if (code.expiresAt && code.expiresAt < new Date()) return res.status(400).json({ error: 'Invite code expired' });

    const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (existing) return res.status(400).json({ error: 'Username or email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword, inviteCodeId: code.id }
    });

    await prisma.inviteCode.update({ where: { id: code.id }, data: { isUsed: true, usedAt: new Date() } });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, username: user.username, role: user.role } });
  }
);

export default router;
