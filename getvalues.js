const Database = require("@replit/database");
const db = new Database();

db.list("version1-2023-07-08").then(matches => {
  matches.forEach(key => {
    db.get(key).then(value => {
      console.log(value);
    });
  });
});
