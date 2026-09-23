app.get('/qualcosa', async (req: Request, res: Response) => {
  const dati = await prisma.NOMEMODELLO.findMany();
  res.json(dati);
});

app.post('/qualcosa', async (req: Request, res: Response) => {
  const nuovo = await prisma.NOMEMODELLO.create({
    data: { campo: req.body.campo }
  });
  res.status(201).json(nuovo);
});

app.put('/qualcosa/:id', async (req: Request, res: Response) => {
  try {
    const aggiornato = await prisma.NOMEMODELLO.update({
      where: { id: Number(req.params.id) },
      data: { campo: req.body.campo }
    });
    res.json(aggiornato);
  } catch {
    res.status(404).json({ errore: 'Non trovato' });
  }
});

app.delete('/qualcosa/:id', async (req: Request, res: Response) => {
  try {
    await prisma.NOMEMODELLO.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch {
    res.status(404).json({ errore: 'Non trovato' });
  }
});