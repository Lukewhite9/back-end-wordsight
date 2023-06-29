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
    const { name, score, time, date, version } = req.body;
    console.log('Received leaderboard entry:', { name, score, time, date, version });

    const entryId = generateEntryId();

    const entry = {
      name: name || null,
      score,
      time,
      date,
      version
    };

    await db.set(entryId, entry);

    console.log('Leaderboard entry added successfully:', entryId);

    return res.status(201).json({ message: 'Leaderboard entry added successfully' });
  } catch (error) {
    console.error('Error adding leaderboard entry:', error);
    return res.status(500).json({ message: 'Failed to add leaderboard entry' });
  }
});


app.get('/leaderboard', async (req, res) => {
  try {
    const { date } = req.query;

    // Fetch the leaderboard scores from the database
    const scores = await db.list(); // Assuming the leaderboard entries are stored as key-value pairs in the database

    // Filter the scores based on the specified date
    const filteredScores = scores.filter(score => score.date === date);

    // Include the version and date data in the response
    const response = filteredScores.map(score => ({
      name: score.name,
      score: score.score,
      time: score.time,
      date: score.date,
      version: score.version
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching leaderboard scores:', error);
    return res.status(500).json({ message: 'Failed to fetch leaderboard scores' });
  }
});

// Your hardcoded dummy game
const dummyGame = {
  gameID: 'game-1', 
  rounds: [
    {
      round_number: 1,
      start_word: 'cat',
      goal_word: 'dog',
      path_length: 5,
    },
    {
      round_number: 2,
      start_word: 'sun',
      goal_word: 'moon',
      path_length: 4,
    },
    {
      round_number: 3,
      start_word: 'shirt',
      goal_word: 'pants',
      path_length: 6,
    },
    {
      round_number: 4,
      start_word: 'left',
      goal_word: 'right',
      path_length: 5,
    },
    {
      round_number: 5,
      start_word: 'black',
      goal_word: 'white',
      path_length: 4,
    }
  ]
};


app.get('/wordpairs', async (req, res) => {
  try {
    // Directly send the dummy game to the front end
    return res.status(200).json(dummyGame);
  } catch (error) {
    console.error('Error fetching game data:', error);
    return res.status(500).json({ message: 'Failed to fetch game data' });
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

app.get('/pronunciation/:word', async (req, res) => {
  try {
    const { word } = req.params;

    const response = await fetch(`https://api.wordnik.com/v4/word.json/${word}/pronunciations?useCanonical=false&sourceDictionary=ahd-5&typeFormat=ahd-5&limit=2&api_key=${WORDNIK_API_KEY}`);
    const data = await response.json();

    res.status(200).json(data);
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
