const Database = require("@replit/database");
const db = new Database();

db.list("version3-2023-09-12").then(matches => {
  matches.forEach(key => {
    db.get(key).then(value => {
      console.log(value);
    });
  });
});
