import express from 'express';
import db, { resetDatabase } from '../db/main';
import path from 'path';

const app = express();
const port = Number(process.env.PORT) || 4567;

app.post('/api/nest/reset', (req, res) => {
    resetDatabase();
    res.status(200).json({ message: 'Database reset successfully' });
});

app.get('/api/rooms', (req, res) => {
    const rooms = db.query('SELECT * FROM rooms').all();
    res.status(200).json(rooms);
});

app.use('/', express.static(path.join(__dirname, '..', 'app')));

app.listen(port, '127.0.0.1', () => {
    console.log(`Server is running on port ${port}`);
});

export default app;