const express = require('express');
const fetch = require('node-fetch');
const { Client } = require('replit-storage');
const Database = require('@replit/database');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const client = new Client();
const db = new Database(process.env.REPLIT_DB_URL);
const app = express();
const natural = require('natural');

const { WORDNIK_API_KEY } = process.env;

app.use(cors());
app.use(express.json());

function generateEntryId(date) {
  return `leaderboard-${date}-${Date.now().toString()}`;
}

app.post('/leaderboard', async (req, res) => {
  try {
    const { name, score, time, date, version } = req.body;
    const entryId = `${date}-${generateEntryId()}`;
    console.log(`Leaderboard entry being added for: ${name} with score: ${score}, time: ${time}, date: ${date}, and version: ${version}`);

    const entry = {
      name: name || null,
      score,
      time,
      date,
      version
    };

    await db.set(entryId, entry);

    return res.status(201).json({ message: 'Leaderboard entry added successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add leaderboard entry' });
  }
});

app.get('/leaderboard', async (req, res) => {
  try {
    const { date } = req.query;
    console.log('Leaderboard route queried with date:', date);

    // Fetch keys with the date prefix
    const keys = await db.list(date);

    // Fetch scores for all the matched keys
    const scoresPromises = keys.map(key => db.get(key));
    const scores = await Promise.all(scoresPromises);

    const response = scores.map(score => ({
      name: score.name,
      score: score.score,
      time: score.time,
      date: score.date,
      version: score.version
    }));

    res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch leaderboard scores' });
  }
});




app.get('/wordpairs', async (req, res) => {
  try {
    const { date, version } = req.query;

    const keys = await db.list();
    const gameKeys = keys.filter(key => key.includes(`version${version}-${date}`));

    if (!gameKeys || gameKeys.length === 0) {
      return res.status(404).json({ message: 'No games found for the specified date' });
    }

    gameKeys.sort();
    const latestGameKey = gameKeys[gameKeys.length - 1];

    const gameData = await db.get(latestGameKey);
    if (!gameData) {
      return res.status(404).json({ message: `Game data not found for date ${date}` });
    }
    return res.status(200).json(gameData);

  } catch (error) {
    console.error('Error fetching word pair:', error);
    return res.status(500).json({ message: 'Failed to fetch word pair' });
  }
});

app.get('/randomwordpair', async (req, res) => {
  try {
    const { round, difficulty } = req.query;
    const difficultyNumber = Number(difficulty);
    console.log('Received round number:', round, 'with difficulty:', difficulty);
    const filenames = fs.readdirSync(path.join(__dirname, 'practice_mode_files'))
      .filter(file => file.endsWith('_steps.txt'))
      .sort((a, b) => parseInt(a) - parseInt(b));

    console.log(filenames)
    const fileIndex = Math.floor(difficultyNumber * round / 2);
    const filename = filenames[fileIndex];

    if (!filename) {
      return res.status(404).json({ message: 'No more word pairs available' });
    }

    const filePath = path.join(__dirname, 'practice_mode_files', filename);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const wordPairs = fileContent.trim().split('\n');

    const randomIndex = Math.floor(Math.random() * wordPairs.length);
    const wordPair = wordPairs[randomIndex].split(',');
    return res.status(200).json({ start_word: wordPair[0], goal_word: wordPair[1] });
  } catch (error) {
    console.error('Error fetching random word pair:', error);
    return res.status(500).json({ message: 'Failed to fetch random word pair' });
  }
});






app.get('/definition/:word', async (req, res) => {
  try {

    const word = natural.PorterStemmer.stem(req.params.word);

    const response = await fetch(`https://api.wordnik.com/v4/word.json/${word}/definitions?limit=3&includeRelated=false&sourceDictionaries=ahd-5&useCanonical=false&includeTags=false&api_key=${WORDNIK_API_KEY}`);
    const data = await response.json();

    if (data.length > 0) {
      return res.status(200).json(data);
    } else {

      const originalWordResponse = await fetch(`https://api.wordnik.com/v4/word.json/${req.params.word}/definitions?limit=3&includeRelated=false&sourceDictionaries=ahd-5&useCanonical=false&includeTags=false&api_key=${WORDNIK_API_KEY}`);
      const originalWordData = await originalWordResponse.json();
      res.status(200).json(originalWordData);
    }

  } catch (error) {
    console.error('Error fetching definition:', error);
    return res.status(500).json({ message: 'Failed to fetch definition' });
  }
});

app.get('/pronunciation/:word', async (req, res) => {
  try {
    const word = natural.PorterStemmer.stem(req.params.word);

    const response = await fetch(`https://api.wordnik.com/v4/word.json/${word}/pronunciations?useCanonical=false&sourceDictionary=ahd-5&typeFormat=ahd-5&limit=2&api_key=${WORDNIK_API_KEY}`);
    const data = await response.json();

    if (data.length > 0) {
      return res.status(200).json(data);
    } else {

      const originalWordResponse = await fetch(`https://api.wordnik.com/v4/word.json/${req.params.word}/pronunciations?useCanonical=false&sourceDictionary=ahd-5&typeFormat=ahd-5&limit=2&api_key=${WORDNIK_API_KEY}`);
      const originalWordData = await originalWordResponse.json();
      res.status(200).json(originalWordData);
    }

  } catch (error) {
    console.error('Error fetching pronunciation:', error);
    return res.status(500).json({ message: 'Failed to fetch pronunciation' });
  }
});



app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

function generateEntryId() {
  return Date.now().toString();
}
