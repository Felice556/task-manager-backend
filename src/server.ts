import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import express, { Request, Response } from 'express';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import cors from 'cors';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const JWT_SECRET = process.env.JWT_SECRET!;
const registerSchema = z.object({
  nome: z.string().min(2, 'Il nome deve avere almeno 2 caratteri'),
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'La password deve avere almeno 8 caratteri')
});

const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password obbligatoria')
});

const taskSchema = z.object({
  titolo: z.string().min(1, 'Il titolo non può essere vuoto')
});

const app = express();
const PORT = 3000;
app.use(cors());  
app.use(express.json());



function autentica(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ errore: 'Token mancante' });
    return;
  }

  const token = authHeader.split(' ')[1]!;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as{ userId: number };
    (req as any).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ errore: 'Token non valido' });
  }
}

app.get('/tasks', autentica, async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const tasks = await prisma.task.findMany({
    where: { userId: userId }
  });

  res.json(tasks);
});

app.post('/tasks', autentica, async (req: Request, res: Response) => {
  const risultato = taskSchema.safeParse(req.body);

  if (!risultato.success) {
    res.status(400).json({ errori: risultato.error.issues });
    return;
  }

  const userId = (req as any).userId;

  const nuovoTask = await prisma.task.create({
    data: { titolo: risultato.data.titolo, userId }
  });

  res.status(201).json(nuovoTask);
});

app.put('/tasks/:id', autentica, async (req: Request, res: Response) => {
  const risultato = taskSchema.safeParse(req.body);

  if (!risultato.success) {
    res.status(400).json({ errori: risultato.error.issues });
    return;
  }

  const userId = (req as any).userId;
  const id = Number(req.params.id);

  try {
    const task = await prisma.task.update({
      where: { id, userId },
      data: { titolo: risultato.data.titolo }
    });
    res.json(task);
  } catch (errore) {
    res.status(404).json({ errore: 'Task non trovato' });
  }
});

app.delete('/tasks/:id', autentica, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const id = Number(req.params.id);

  try {
    await prisma.task.delete({ where: { id, userId } });
    res.status(204).send();
  } catch (errore) {
    res.status(404).json({ errore: 'Task non trovato' });
  }
});


app.post('/register', async (req: Request, res: Response) => {
  const risultato = registerSchema.safeParse(req.body);

  if (!risultato.success) {
    res.status(400).json({ errori: risultato.error.issues });
    return;
  }

  const { nome, email, password } = risultato.data;

  const passwordHashata = await bcrypt.hash(password, 10);

  const nuovoUser = await prisma.user.create({
    data: { nome, email, password: passwordHashata }
  });

  res.status(201).json({ id: nuovoUser.id, email: nuovoUser.email });
});

app.post('/login', async (req: Request, res: Response) => {
  const risultato = loginSchema.safeParse(req.body);

  if (!risultato.success) {
    res.status(400).json({ errori: risultato.error.issues });
    return;
  }

  const { email, password } = risultato.data;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    res.status(401).json({ errore: 'Credenziali non valide' });
    return;
  }

  const passwordCorretta = await bcrypt.compare(password, user.password);

  if (!passwordCorretta) {
    res.status(401).json({ errore: 'Credenziali non valide' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

  res.json({ token });
});

app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error(err);
  res.status(500).json({ errore: 'Errore interno del server' });
});

app.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});

