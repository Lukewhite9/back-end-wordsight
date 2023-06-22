const fs = require('fs');
const path = require('path');
const glob = require('glob');
const Database = require("@replit/database");
const db = new Database();

// File patterns for each round
const filePatterns = {
  1: glob.glob.sync("path_to_files/swapsclean_4_steps_*_difference.txt").concat(glob.glob.sync("path_to_files/swapsclean_5_steps_*_difference.txt")),
  2: glob.glob.sync("path_to_files/swapsclean_4_steps_*_difference.txt").concat(glob.glob.sync("path_to_files/swapsclean_5_steps_*_difference.txt")),
  3: glob.glob.sync("path_to_files/swapsclean_5_steps_*_difference.txt"),
  4: glob.glob.sync("path_to_files/swapsclean_5_steps_*_difference.txt").concat(glob.glob.sync("path_to_files/swapsclean_6_steps_*_difference.txt")),
  5: glob.glob.sync("path_to_files/swapsclean_6_steps_*_difference.txt").concat(glob.glob.sync("path_to_files/swapsclean_7_steps_*_difference.txt")).concat(glob.glob.sync("path_to_files/swapsclean_8_steps_*_difference.txt")),
};

// Function to parse file to word pairs
function parseTxtToJson(txtFile, seenPairs) {
  let data = fs.readFileSync(txtFile, 'utf8');
  let lines = data.split('\n');

  for (let line of lines) {
    line = line.trim();
    let [startWord, restLine] = line.split(':', 1);
    let [start, goalWord] = startWord.split(',');

    if (seenPairs.has(`${start}-${goalWord}`)) continue; // Skip if we've seen this pair before

    seenPairs.add(`${start}-${goalWord}`);
  }

  return Array.from(seenPairs);
}

async function main() {
  let seenPairs = new Set();
  let version = 1; // Change this for different versions
  let startingDate = new Date('2023-01-01'); // Set your starting date here

  // Process each round
  for (let round = 1; round <= 5; round++) {
    // Get the files for this round
    let files = filePatterns[round];

    // Process each file
    for (let file of files) {
      let wordPairs = parseTxtToJson(file, seenPairs);

      // Assign each word pair to a date and round
      for (let pair of wordPairs) {
        let pairData = {
          id: `version${version}-${formatDate(startingDate)}-round${round}-${pair}`, // Unique ID
          version: version,
          date: formatDate(startingDate),
          round: round,
          pair: pair,
        };

        // Save the pair to the database
        await db.set(pairData.id, pairData);

        // Advance to the next date if we've assigned a pair to every round of this date
        if (round === 5) {
          startingDate.setDate(startingDate.getDate() + 1);
          round = 0; // Will be incremented to 1 at the start of the next loop
        }
      }
    }
  }
}

function formatDate(date) {
  let year = date.getFullYear();
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

main();
