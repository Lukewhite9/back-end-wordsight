const Database = require("@replit/database");


const db = new Database();


const targetDate = new Date("2024-06-23");


db.list().then(keys => {

  const filteredKeys = keys.filter(key => {

    return db.get(key).then(value => {

      const entryDate = new Date(value.date); 
      return entryDate < targetDate;
    });
  });

  const deletePromises = filteredKeys.map(key => db.delete(key));

  Promise.all(deletePromises)
    .then(() => {
      console.log("Selected entries have been deleted from the database.");
    })
    .catch(error => {
      console.error("An error occurred while deleting the entries:", error);
    });
})
.catch(error => {
  console.error("An error occurred while listing the keys:", error);
});
