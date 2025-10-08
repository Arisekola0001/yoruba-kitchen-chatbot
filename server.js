import express from 'express';
import cookieParser from 'cookie-parser';
import { v4 as uuid } from 'uuid';
import path from 'path';
import dotenv from 'dotenv';
import { router as chatRouter } from './routes/chat.js';
import { router as payRouter } from './routes/pay.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  if (!req.cookies.sessionId) {
    res.cookie('sessionId', uuid(), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30
    });
  }
  next();
});

app.use(express.static(path.join(process.cwd(), 'public')));

app.use('/api/chat', chatRouter);
app.use('/pay', payRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
