import { Router } from 'express';
import path from 'node:path';

const base = path.resolve('src/rooms/notes/frontend');

// API Router
const apiRouter = Router();

apiRouter.get('/', (req, res) => {
    res.json({ room: 'notes', status: 'ok' });
});

// Frontend Router
const frontendRouter = Router();

frontendRouter.get('/', (req, res) => {
    res.sendFile(path.join(base, 'index.html'));
});

export { apiRouter as api, frontendRouter as frontend };