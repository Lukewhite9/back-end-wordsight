const express = require('express');
const fetch = require('node-fetch');
const { Client } = require('replit-storage');
const Database = require('@replit/database');
const cors = require('cors');

const client = new Client();
const db = new Database(process.env.REPLIT_DB_URL);
const app = express();

const { WORDNIK_API_KEY } = process.env;

app.use(cors());
app.use(express.json());

app.post('/leaderboard', async (req, res) => {
  try {
    const { name, score, time } = req.body;

    if (!name || !score || !time) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const entryId = generateEntryId();

    await db.set(entryId, { name, score, time });

    return res.status(201).json({ message: 'Leaderboard entry added successfully' });
  } catch (error) {
    console.error('Error adding leaderboard entry:', error);
    return res.status(500).json({ message: 'Failed to add leaderboard entry' });
  }
});

app.get('/leaderboard', async (req, res) => {
  try {
    const keys = await db.list();
    const entries = await Promise.all(keys.map(async (key) => {
      const entry = await db.get(key);
      return entry;
    }));

    const sortedEntries = entries.sort((a, b) => b.score - a.score);

    return res.status(200).json(sortedEntries);
  } catch (error) {
    console.error('Error retrieving leaderboard entries:', error);
    return res.status(500).json({ message: 'Failed to retrieve leaderboard entries' });
  }
});

app.get('/definition/:word', async (req, res) => {
  try {
    const { word } = req.params;

    const response = await fetch(`https://api.wordnik.com/v4/word.json/${word}/definitions?limit=3&includeRelated=false&sourceDictionaries=ahd-5&useCanonical=false&includeTags=false&api_key=${WORDNIK_API_KEY}`);
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching definition:', error);
    return res.status(500).json({ message: 'Failed to fetch definition' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

function generateEntryId() {
  return Date.now().toString();
}
