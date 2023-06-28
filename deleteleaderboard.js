const Database = require('@replit/database');

const db = new Database(process.env.REPLIT_DB_URL);

async function deleteLeaderboardEntries(date) {
  try {
    const keys = await db.list();
    const leaderboardKeys = keys.filter(key => key.startsWith('entry:'));
    const deletePromises = leaderboardKeys.map(async key => {
      const entry = await db.get(key);
      if (entry.date === date) {
        await db.delete(key);
        console.log(`Deleted entry with key: ${key}`);
      }
    });
    await Promise.all(deletePromises);
    console.log('Deletion completed.');
  } catch (error) {
    console.error('Error deleting leaderboard entries:', error);
  }
}

const dateToDelete = '2023-06-27'; // Specify the date you want to delete entries for
deleteLeaderboardEntries(dateToDelete);
