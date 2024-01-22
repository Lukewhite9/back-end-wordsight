const axios = require('axios');
const baseUrl = 'https://craftword-backend.replit.app'; // Replace with your server URL

async function queryWordpairEntries(startDate, endDate, version) {
  let currentDate = new Date(startDate);
  endDate = new Date(endDate);

  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0];
    const url = `${baseUrl}/wordpairs?date=${dateString}&version=${version}`;

    try {
      const response = await axios.get(url);
      console.log(`Data for ${dateString}:`, response.data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`No data found for ${dateString}`);
      } else {
        console.error(`Error fetching data for ${dateString}:`, error.message);
      }
    }

    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

// Usage
const startDate = '2024-01-18'; // Format: YYYY-MM-DD
const endDate = '2024-03-15'; // Format: YYYY-MM-DD
const versionNumber = '5'; // Version number

queryWordpairEntries(startDate, endDate, versionNumber);