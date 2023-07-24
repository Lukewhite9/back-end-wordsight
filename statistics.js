const express = require('express');
const { Database } = require('@replit/database');
const db = new Database(process.env.REPLIT_DB_URL);
const app = express();

app.use(express.json());

app.get('/statistics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const parsedStartDate = Date.parse(startDate);
    const parsedEndDate = Date.parse(endDate);
    
    const keys = await db.list();
    const scoresPromises = keys.map(key => db.get(key));
    const scores = await Promise.all(scoresPromises);

    const filteredScores = scores.filter(score => {
      const scoreDate = new Date(score.date);
      return scoreDate >= new Date(startDate) && scoreDate <= new Date(endDate);
    });

    const numPlayers = filteredScores.length;
    const totalScore = filteredScores.reduce((sum, score) => sum + score.score, 0);
    const avgScore = totalScore / numPlayers;
    const minScore = Math.min(...filteredScores.map(score => score.score));
    const maxScore = Math.max(...filteredScores.map(score => score.score));
    
    const totalTime = filteredScores.reduce((sum, score) => sum + score.time, 0);
    const avgTime = totalTime / numPlayers;
    const minTime = Math.min(...filteredScores.map(score => score.time));
    const maxTime = Math.max(...filteredScores.map(score => score.time));

    const response = {
      numPlayers,
      avgScore,
      scoreRange: [minScore, maxScore],
      avgTime,
      timeRange: [minTime, maxTime]
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

app.listen(4000, () => {
  console.log('Statistics server is running on port 4000');
});
