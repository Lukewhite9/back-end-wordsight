const Database = require("@replit/database");
const db = new Database();

// Get all keys for January 2023
db.list("version1-2023-06").then(matches => {
  console.log(matches); // This will print all keys starting with "version1-2023-01"
});
