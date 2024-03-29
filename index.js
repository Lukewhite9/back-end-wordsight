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
  console.log(`Detected Referer: ${referer}`); // Logs the detected referer

  let DB_ENV_PREFIX;
  if (referer && referer.includes('craftword.replit.app')) {
    DB_ENV_PREFIX = 'prod';
  } else {
    DB_ENV_PREFIX = process.env.REPLIT_DB_ENV || 'dev'; // Default to 'dev' or use REPLIT_DB_ENV if set
  }

  console.log(`DB_ENV_PREFIX is set to: ${DB_ENV_PREFIX}`); // Logs the DB_ENV_PREFIX
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

const fetchDefinition = async (word, sourceDictionary) => {
  const response = await fetch(`https://api.wordnik.com/v4/word.json/${word}/definitions?limit=3&includeRelated=false&sourceDictionaries=${sourceDictionary}&useCanonical=false&includeTags=false&api_key=${WORDNIK_API_KEY}`);
  if (response.status !== 200) {
    throw new Error(`Received ${response.status} status`);
  }
  const data = await response.json();
  return data;
};
app.get('/definition/:word', async (req, res) => {
  try {
    const word = natural.PorterStemmer.stem(req.params.word);
    try {
      const data = await fetchDefinition(word, 'ahd5');
      return res.status(200).json(data);
    } catch (error) {
    }
    try {
      const data = await fetchDefinition(word, 'wiktionary');
      return res.status(200).json(data);
    } catch (error) {
    }
    const data = await fetchDefinition(word, 'all');
    return res.status(200).json(data);
  } catch (error) {
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

app.get('/wordlist', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'data', 'ospd.txt'); 
    if (fs.existsSync(filePath)) {
      const wordList = fs.readFileSync(filePath, 'utf8');
      res.status(200).send(wordList);
    } else {
      res.status(404).send('Word list not found');
    }
  } catch (error) {
    res.status(500).send('Failed to fetch word list');
  }
});

app.get('/scowl35k', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'data', 'SCOWL35k.txt'); 
    if (fs.existsSync(filePath)) {
      const wordList = fs.readFileSync(filePath, 'utf8');
      res.status(200).send(wordList);
    } else {
      res.status(404).send('SCOWL35k word list not found');
    }
  } catch (error) {
    console.error('Error fetching SCOWL35k word list:', error);
    res.status(500).send('Failed to fetch SCOWL35k word list');
  }
});


app.listen(8080, () => {
  console.log('Server is running on port 3000');
});

function generateEntryId() {
  return Date.now().toString();
}

app.post('/playdata', async (req, res) => {
  try {
    const { date, challengeNumber, roundIndex, movesLength } = req.body;
    const entryId = `${req.DB_ENV_PREFIX}-playdata-${date}-${generateEntryId()}`;
    console.log(`Attempting to add playdata entry with ID: ${entryId}`);

    const entry = {
      date,
      challengeNumber,
      roundIndex,
      movesLength
    };

    await db.set(entryId, entry);

    return res.status(201).json({ message: 'Playdata entry added successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add playdata entry' });
  }
});

app.get('/playdata/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const keys = await db.list(`${req.DB_ENV_PREFIX}-playdata-${date}`);
    const playdataPromises = keys.map(key => db.get(key));
    const playdata = await Promise.all(playdataPromises);

    // Calculate statistics for each round index
    const roundStatistics = {};

    playdata.forEach(entry => {
      const { roundIndex, movesLength } = entry;
      if (!roundStatistics[roundIndex]) {
        roundStatistics[roundIndex] = {
          totalEntries: 0,
          totalMovesLength: 0,
          totalMovesLengthZero: 0, // Initialize the new field
        };
      }
      roundStatistics[roundIndex].totalEntries++;
      roundStatistics[roundIndex].totalMovesLength += movesLength;

      if (movesLength === 0) {
        roundStatistics[roundIndex].totalMovesLengthZero++; // Increment when movesLength is 0
      }
    });

    const response = {
      date,
      roundStatistics,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching playdata:', error);
    return res.status(500).json({ message: 'Failed to fetch playdata' });
  }
});


