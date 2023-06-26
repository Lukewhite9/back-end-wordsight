const Database = require("@replit/database");
const db = new Database();

db.list("version1-2023-06-26").then(matches => {
  matches.forEach(key => {
    db.get(key).then(value => {
      console.log(value);
    });
  });
});
