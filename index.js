const express = require('express');
let fetch;

(async () => {
  fetch = await import('node-fetch').then(module => module.default);
})();

const Database = require('@replit/database');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = new Database(process.env.REPLIT_DB_URL);
const app = express();
const natural = require('natural');

const { WORDNIK_API_KEY } = process.env;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const referer = req.get('Referer');
  console.log(`[Request] Detected Referer: ${referer}`); // This should log on every API call

  let DB_ENV_PREFIX;
  // Determine DB_ENV_PREFIX based on the referer
  if (referer && referer.includes('wordpath.lukewhite9.repl.co')) {
    DB_ENV_PREFIX = 'dev';
  } else if (referer && referer.includes('craftword.replit.app')) {
    DB_ENV_PREFIX = 'prod';
  } else {
    DB_ENV_PREFIX = 'dev'; // Default to 'dev'
  }

  console.log(`[Request] DB_ENV_PREFIX is set to: ${DB_ENV_PREFIX}`); // This should log on every API call
  req.DB_ENV_PREFIX = DB_ENV_PREFIX; // Setting the prefix on the request object
  next();
});


app.post('/leaderboard', async (req, res) => {
  try {
    const { name, score, time, date, version } = req.body;
    const entryId = `${req.DB_ENV_PREFIX}-leaderboard-${date}-${generateEntryId()}`;
    console.log(`Attempting to add leaderboard entry with ID: ${entryId}`); // Logs the ID with prefix

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
    console.log(`[GET /some-route] DB_ENV_PREFIX: ${req.DB_ENV_PREFIX}`);
    const keys = await db.list(`${req.DB_ENV_PREFIX}-leaderboard-${date}`);
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

    const keys = await db.list(`${req.DB_ENV_PREFIX}-wordpair-${version}-${date}`);
    const gameKeys = keys.filter(key => key.includes(`wordpair-${version}-${date}`));

    if (!gameKeys || gameKeys.length === 0) {
      return res.status(404).json({ message: 'No games found for the specified date and version' });
    }

    gameKeys.sort();
    const latestGameKey = gameKeys[gameKeys.length - 1];

    const gameData = await db.get(latestGameKey);
    if (!gameData) {
      return res.status(404).json({ message: `Game data not found for date ${date} and version ${version}` });
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

app.get('/fetchDefinition/:word', async (req, res) => {
  const word = req.params.word;
  try {
    const url = `http://api.wordnik.com:80/v4/word.json/${word}/definitions?limit=1&includeRelated=false&useCanonical=false&includeTags=false&api_key=${WORDNIK_API_KEY}`;
    const response = await fetch(url);
    const definitions = await response.json();

    if (!definitions.length) {
      return res.status(404).json({ message: 'No definition found for the word' });
    }
    return res.status(200).json({ definition: definitions[0].text });
  } catch (error) {
    console.error('Error fetching definition:', error);
    return res.status(500).json({ message: 'Failed to fetch definition' });
  }
});

app.get('/pronunciation/:word', async (req, res) => {
  try {
    const word = natural.PorterStemmer.stem(req.params.word);

    const response = await fetch(`https://api.wordnik.com/v4/word.json/${word}/pronunciations?useCanonical=false&sourceDictionary=all&typeFormat=all&limit=2&api_key=${WORDNIK_API_KEY}`);
    const data = await response.json();

    if (data.length > 0) {
      return res.status(200).json(data);
    } else {

      const originalWordResponse = await fetch(`https://api.wordnik.com/v4/word.json/${req.params.word}/pronunciations?useCanonical=false&sourceDictionary=all&typeFormat=all&limit=2&api_key=${WORDNIK_API_KEY}`);
      const originalWordData = await originalWordResponse.json();
      res.status(200).json(originalWordData);
    }

  } catch (error) {
    console.error('Error fetching pronunciation:', error);
    return res.status(500).json({ message: 'Failed to fetch pronunciation' });
  }
});



app.listen(8080, () => {
  console.log('Server is running on port 3000');
});

function generateEntryId() {
  return Date.now().toString();
}
