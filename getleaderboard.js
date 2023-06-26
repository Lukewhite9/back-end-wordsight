const Database = require("@replit/database");

const db = new Database();

// Fetch leaderboard entries
const fetchLeaderboard = async () => {
  try {
    const leaderboardData = await db.list();
    // Process the leaderboard data
    console.log(leaderboardData);
  } catch (error) {
    console.error("Error fetching leaderboard entries:", error);
  }
};

fetchLeaderboard();
