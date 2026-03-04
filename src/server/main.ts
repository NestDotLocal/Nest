import express from 'express';
import db, { resetDatabase } from '../db/main';

const app = express();
const port = Number(process.env.PORT) || 4567;

app.post('/api/nest/reset', (req, res) => {
    resetDatabase();
    res.status(200).json({ message: 'Database reset successfully' });
});

app.listen(port, 'localhost', () => {
    console.log(`Server is running on port ${port}`);
});

export default app;