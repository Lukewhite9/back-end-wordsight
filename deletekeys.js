const Database = require("@replit/database");
const db = new Database();
const targetDate = new Date("2024-09-12");

// Fetch all keys from the database
db.list()
  .then(async (keys) => {
    // Fetch values for all keys and filter based on date and version
    const valuesPromises = keys.map((key) => db.get(key));
    const allValues = await Promise.all(valuesPromises);

    const filteredKeys = keys.filter((key, index) => {
      const entry = allValues[index];
      const entryDate = new Date(entry.date);
      return entryDate > targetDate && entry.gameID && entry.gameID.startsWith("version4");
    });

    // Delete entries with filtered keys
    const deletePromises = filteredKeys.map((key) => db.delete(key));
    return Promise.all(deletePromises);
  })
  .then(() => {
    console.log("Selected entries have been deleted from the database.");
  })
  .catch((error) => {
    console.error("An error occurred:", error);
  });
