const Database = require("@replit/database");
const db = new Database();

function formatDate(date) {
  let year = date.getFullYear();
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function deleteWordpairKeys(startDate, endDate, version) {
  let currentDate = new Date(startDate);
  endDate = new Date(endDate);

  while (currentDate <= endDate) {
    const dateString = formatDate(currentDate);
    const devKey = `dev-wordpair-${version}-${dateString}`;
    const prodKey = `prod-wordpair-${version}-${dateString}`;

    try {
      await Promise.all([db.delete(devKey), db.delete(prodKey)]);
      console.log(`Deleted keys for date: ${dateString}`);
    } catch (error) {
      console.error(`Error deleting keys for ${dateString}:`, error);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }
}

// Usage
const startDate = '2023-12-14'; // Format: YYYY-MM-DD
const endDate = '2024-01-16'; // Format: YYYY-MM-DD
const versionNumber = '5'; // Version number

deleteWordpairKeys(startDate, endDate, versionNumber);
