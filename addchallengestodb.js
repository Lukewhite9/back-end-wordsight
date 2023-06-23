const fs = require('fs');
const glob = require('glob');
const Database = require("@replit/database");
const db = new Database();

// File patterns for each round
const filePatterns = {
  1: glob.sync("wordpairtxts/swapsclean_4_steps_1_difference.txt").concat(glob.sync("wordpairtxts/swapsclean_5_steps_*_difference.txt")),
  2: glob.sync("wordpairtxts/swapsclean_4_steps_*_difference.txt").concat(glob.sync("wordpairtxts/swapsclean_5_steps_*_difference.txt")),
  3: glob.sync("wordpairtxts/swapsclean_5_steps_*_difference.txt"),
  4: glob.sync("wordpairtxts/swapsclean_5_steps_*_difference.txt").concat(glob.sync("wordpairtxts/swapsclean_6_steps_*_difference.txt")),
  5: glob.sync("wordpairtxts/swapsclean_6_steps_*_difference.txt").concat(glob.sync("wordpairtxts/swapsclean_7_steps_*_difference.txt")).concat(glob.sync("wordpairtxts/swapsclean_8_steps_*_difference.txt")),
};

let seenPairs = new Set();

// Function to parse file to word pairs
function parseTxtToJson(txtFile) {
  let data = fs.readFileSync(txtFile, 'utf8');
  let lines = data.split('\n');

  return lines.map(line => {
    let [wordPairString, ...restLine] = line.split(':');
    let wordPairs = wordPairString.split(',');

    if (wordPairs.length >= 2) {
      let start_word = wordPairs[0].trim();
      let goal_word = wordPairs[wordPairs.length - 1].trim();
      return { start_word, goal_word };
    } else {
      return null; // Skip invalid lines without valid word pairs
    }
  }).filter(pair => pair && !seenPairs.has(`${pair.start_word}-${pair.goal_word}`));
}

async function main() {
  let version = 1; // Change this for different versions
  let startingDate = new Date('2023-06-22'); // Set your starting date here
  let daysProcessed = 0;

  // Loop through each day
  while (true) {
    let pairsAdded = 0;

    // Process each round
    for (let round = 1; round <= 5; round++) {
      let files = filePatterns[round];
      let pairAdded = false;

      // Loop through each file
      for (let file of files) {
        let wordPairs = parseTxtToJson(file);

        // Loop through each word pair
        for (let pair of wordPairs) {
          const existingPair = await db.get(`version${version}-${formatDate(startingDate)}-round${round}`);
          if (existingPair && existingPair.start_word === pair.start_word && existingPair.goal_word === pair.goal_word) {
            continue;
          }

          let pairData = {
  id: `version${version}-${formatDate(startingDate)}-round${round}`, // Changed here
  version: version,
  date: formatDate(startingDate),
  round: round,
  start_word: pair.start_word,
  goal_word: pair.goal_word,
};

// Save the pair to the database
await db.set(pairData.id, pairData); // Use the same id for the key

          console.log(`Added pair ${pair.start_word}-${pair.goal_word} for round ${round} on ${formatDate(startingDate)}`);
          seenPairs.add(`${pair.start_word}-${pair.goal_word}`);
          pairAdded = true;
          pairsAdded++;
          break;
        }

        if (pairAdded) break;
      }
    }

    if (pairsAdded < 5) {
      console.log(`Couldn't find enough unique pairs for ${formatDate(startingDate)}. Stopping.`);
      break;
    }

    // Advance to the next date
    startingDate.setDate(startingDate.getDate() + 1);
    daysProcessed++;
  }

  console.log(`Finished processing. ${daysProcessed} complete days were processed.`);
}

function formatDate(date) {
  let year = date.getFullYear();
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

main();
