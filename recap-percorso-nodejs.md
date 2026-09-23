# Percorso Node.js Backend — Recap

**Punto di partenza:** frontend developer React/TypeScript (corso 5 mesi completato)
**Obiettivo:** competenze backend solide per potersi definire fullstack junior
**Ritmo:** 2-4 ore al giorno

---

## Stack scelto

| Componente | Tecnologia |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Linguaggio | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| Dev runner | tsx watch |
| Test API | Thunder Client (VS Code) |

**Progetto guida:** task manager con utenti (ogni utente vede solo i propri task)

---

## ✅ COMPLETATO

### Giorno 1 — Fondamenta Node + Express

**Concetti:**
- Node.js fa girare JavaScript **fuori dal browser**, con accesso a cose vietate nel browser (es. filesystem via modulo `fs`)
- Un server HTTP **resta acceso** in ascolto (`server.listen`), a differenza di uno script normale che termina
- `req` = richiesta in arrivo, `res` = oggetto per costruire la risposta
- **Status code** ≠ porta. Lo status code (200, 404, 500) comunica l'esito; la porta (3000) è il canale su cui il server ascolta
- `500` si scrive quasi sempre dentro un `try/catch`, come rete di sicurezza per errori imprevisti

**Cosa semplifica Express rispetto a `http.createServer()` puro:**
1. Rotte multiple dichiarative (`app.get()`) invece di un grande `if/else` su `req.url`
2. Header e status impostati in automatico (`res.send()` invece di `writeHead` + `end`)
3. `res.json()` per inviare JSON senza conversioni manuali
4. Middleware (`app.use()`)
5. Parametri dinamici nell'URL (`/tasks/:id` → `req.params.id`)

**Setup fatto:**
```bash
npm init -y
npm install express
npm install -D typescript @types/express @types/node
```

---

### Giorno 2 — CRUD completo (in memoria)

**Le 4 operazioni (pattern CRUD):**

| Operazione | Metodo HTTP | Significato |
|---|---|---|
| **C**reate | POST | crea un nuovo dato |
| **R**ead | GET | legge dati |
| **U**pdate | PUT | modifica un dato esistente |
| **D**elete | DELETE | cancella un dato |

**Concetti chiave imparati:**
- `app.use(express.json())` → middleware che **decodifica** il JSON in arrivo e lo rende leggibile in `req.body`
- `express.json()` (riceve) ≠ `res.json()` (invia) — nomi simili, scopi opposti
- `req.body.campo` → dati mandati dal client. Il nome del campo lo decidi tu, ma deve coincidere tra backend e client
- `req.params.id` → valore dinamico dall'URL, arriva sempre come **stringa** (serve `Number(...)`)
- `console.log` lato server → si vede nel **terminale**, non nella console del browser
- I dati in un array vivono solo in **memoria RAM**: spariscono ad ogni riavvio del server

---

### Giorno 3 — Database vero (PostgreSQL + Prisma)

**Fatto:**
- Installato PostgreSQL + pgAdmin
- Creato database `taskmanager`
- Installato e configurato Prisma
- Definito il modello `Task` in `schema.prisma`
- Migrazione con `npx prisma migrate dev`
- Sostituito l'array in memoria con query reali al database

**Metodi Prisma (il pattern che userai sempre):**

| Operazione | Prisma | SQL equivalente |
|---|---|---|
| Leggere tutti | `prisma.task.findMany()` | `SELECT * FROM Task` |
| Leggere uno | `prisma.task.findUnique({ where: { id } })` | `SELECT ... WHERE id = ...` |
| Creare | `prisma.task.create({ data: {...} })` | `INSERT INTO ...` |
| Modificare | `prisma.task.update({ where, data })` | `UPDATE ... SET ... WHERE ...` |
| Cancellare | `prisma.task.delete({ where: { id } })` | `DELETE FROM ... WHERE ...` |
| JOIN | `include: { user: true }` | `JOIN "User" ON ...` |

**Perché ora tutto è `async`/`await` + `try/catch`:**
- Parlare col database richiede tempo → operazione asincrona
- Prisma **lancia un errore** se non trova il record (a differenza di `find` su array che restituiva `undefined`) → serve `try/catch` per rispondere 404

**Problemi tecnici risolti (esperienza reale di debug):**
- Versioni disallineate tra `prisma` e `@prisma/client`
- Node 24 incompatibile con Prisma 5 → aggiornato a Prisma 7
- `ts-node-dev` non gestisce la risoluzione moduli NodeNext → sostituito con **`tsx watch`**
- Prisma 7 richiede un adapter esplicito: `new PrismaClient({ adapter: new PrismaPg({ connectionString: ... }) })`

---

### Giorno 4 — SQL puro + Autenticazione JWT

**SQL scritto a mano in pgAdmin (Query Tool):**
```sql
SELECT * FROM "Task";
INSERT INTO "Task" (titolo) VALUES ('Studiare SQL');
SELECT * FROM "Task" WHERE id > 1;

-- JOIN: unire due tabelle
SELECT "Task".titolo, "User".nome
FROM "Task"
JOIN "User" ON "Task"."userId" = "User".id;
```
*(Nota: le virgolette doppie servono perché Prisma crea tabelle con la maiuscola)*

**Relazione uno-a-molti creata:**
```prisma
model User {
  id       Int    @id @default(autoincrement())
  nome     String
  email    String @unique
  password String
  tasks    Task[]
}

model Task {
  id     Int    @id @default(autoincrement())
  titolo String
  userId Int
  user   User   @relation(fields: [userId], references: [id])
}
```

**Flusso di autenticazione JWT (il concetto):**
1. Utente si registra → password **hashata** con bcrypt prima di salvarla
2. Utente fa login → se le credenziali sono corrette, il server genera un **token**
3. Il client salva il token e lo manda ad ogni richiesta nell'header `Authorization: Bearer ...`
4. Il server verifica il token e sa chi è l'utente, senza richiedere di nuovo la password

> *Analogia: è come il braccialetto di un evento. Mostri il documento una volta (login), poi entri/esci solo col braccialetto (token).*

**Implementato:**
- `POST /register` → `bcrypt.hash(password, 10)`, mai restituire la password nella risposta
- `POST /login` → `bcrypt.compare()` per verificare, `jwt.sign()` per generare il token
- Middleware `autentica` → legge l'header, verifica il token con `jwt.verify()`, salva `userId` in `req`, chiama `next()`
- Tutte le rotte `/tasks` protette con `autentica`
- **Isolamento dati:** `where: { id, userId }` → un utente può modificare/cancellare solo i propri task

**Nota sulla sicurezza:** in caso di credenziali sbagliate si risponde sempre con un generico "Credenziali non valide", senza rivelare se l'email esiste o meno.

---

### Giorno 5 — Rifinitura (Fase 1 completata)

**I 3 concetti della giornata:**

1. **I segreti non si scrivono nel codice** → chiave JWT spostata nel `.env`, che non finisce su Git
2. **Non fidarti mai di quello che arriva dal client** → validazione con zod prima di usare i dati
3. **Gli errori interni non si mostrano all'utente** → gestore errori centralizzato

**Chiave JWT nel `.env`:**
```
JWT_SECRET="una-chiave-lunga-e-casuale"
```
```typescript
const JWT_SECRET = process.env.JWT_SECRET!;
```
*(Nota: i token firmati con la vecchia chiave smettono di funzionare — serve rifare il login)*

**Validazione con zod — il pattern che si ripete in ogni rotta:**
```typescript
const risultato = SCHEMA.safeParse(req.body);
if (!risultato.success) {
  res.status(400).json({ errori: risultato.error.issues });
  return;
}
const { campo1, campo2 } = risultato.data;
```

**Gli schemi definiti:**
```typescript
const registerSchema = z.object({
  nome: z.string().min(2, 'Il nome deve avere almeno 2 caratteri'),
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'La password deve avere almeno 8 caratteri')
});

const taskSchema = z.object({
  titolo: z.string().min(1, 'Il titolo non può essere vuoto')
});
```

- `safeParse` non lancia errori: restituisce `{ success: true/false }`
- `risultato.data` contiene i dati **già validati e tipizzati**
- Status **400** = "i dati che mi hai mandato non vanno bene"
- Nelle rotte protette la validazione va **dopo** `autentica`: prima chi sei, poi cosa mandi

**Gestore errori centralizzato** (va alla fine, prima di `app.listen`):
```typescript
app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error(err);
  res.status(500).json({ errore: 'Errore interno del server' });
});
```
Si riconosce perché ha **quattro** parametri invece di tre. Express lo chiama da solo quando una rotta lancia un errore non gestito. Express 5 cattura anche gli errori nelle funzioni `async` (Express 4 no).

**Fix TypeScript incontrato:** `jwt.verify()` restituisce un tipo che non si converte direttamente → serve `as unknown as { userId: number }`

---

## Come studiare questo materiale

Non serve memorizzare la sintassi — si ritrova in 30 secondi cercandola. Serve saper rispondere a domande tipo:

| Domanda da colloquio | Risposta |
|---|---|
| Come gestisci i dati che arrivano dal client? | Li valido prima di usarli (es. zod), rispondo 400 se non sono validi |
| Dove metti le chiavi segrete? | In variabili d'ambiente, mai nel codice |
| Cosa restituisci se il server ha un errore interno? | Messaggio generico con 500, l'errore vero lo logghi lato server |
| Perché si hasha la password? | Se il database viene compromesso, le password restano illeggibili |
| Come funziona JWT? | Login una volta → token firmato → il client lo manda ad ogni richiesta → il server lo verifica |

**Esercizio consigliato:** rileggere `server.ts` ogni tanto spiegando a voce alta cosa fa ogni blocco. Se ci riesci, sei a posto.

---

## ⬜ DA FARE

### Fase 2 — Collegamento frontend React ← PROSSIMO PASSO
- [ ] Chiamate API dal frontend (fetch/axios)
- [ ] Gestione del token lato client (salvataggio, invio negli header)
- [ ] Configurazione CORS lato backend
- [ ] Pagine: login, registrazione, lista task

### Fase 3 — Deploy
- [ ] Backend su Render o Railway
- [ ] Database PostgreSQL hosted
- [ ] Frontend su Vercel
- [ ] README decente per il portfolio

### Fase 4 — Extra richiesti
- [ ] **Jest** — testing automatizzato
- [ ] **Docker** — containerizzazione
- [ ] **Stripe** — integrazione pagamenti

### Fase 5 — Progetto finale: App Palestra
App per gestire clienti: pesi, serie, reps, video esercizi.

**Stima:** 5-7 settimane a 2-4h/giorno
**Costi con clienti reali:** 15-35 €/mese (fascia 10-50 clienti)
**Semplificazione consigliata:** video linkati da YouTube invece di upload propri (l'upload video è la parte più complessa: serve storage esterno tipo Cloudinary/S3)

---

## Note utili

**Cosa NON copriremo (e non serve per un junior):**
GraphQL, WebSocket/Socket.IO, NestJS/Fastify, MongoDB, microservizi, CI/CD avanzato. Sono competenze che si costruiscono sul lavoro o quando un progetto le richiede.

**Sull'autenticazione scritta a mano:**
In produzione si usano spesso servizi pronti (Auth0, Clerk, Supabase Auth, Passport.js). Scriverla a mano serve a **capire il meccanismo sotto**, il che rende molto più forti anche quando poi si usano strumenti già pronti.

**Sui corsi Udemy valutati:**
Tutti e quattro giudicati troppo ampi e dispersivi per l'obiettivo attuale. Il quarto (Express/Fastify/NestJS + PostgreSQL/MongoDB/Prisma) è il più moderno e solido, eventualmente utile come "fase 2" dopo aver completato un progetto reale.

**Comando per avviare il server:**
```bash
npm run dev
```
*(usa `tsx watch src/server.ts` sotto)*

**Testo di copertina CV attuale:**
> Sono uno sviluppatore Frontend con solida formazione in HTML5, CSS, React e TypeScript, maturata attraverso un percorso formativo intensivo di 5 mesi con la realizzazione di più progetti in team e personali.
> Cerco un'opportunità come Junior Frontend Developer dove poter mettere in pratica le mie competenze in un contesto di team, continuare a crescere professionalmente e contribuire a progetti reali con impatto concreto.

*(Da aggiornare a percorso finito, aggiungendo l'esperienza backend Node.js/Express)*
