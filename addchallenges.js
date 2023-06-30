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

function parseTxtToJson(txtFile) {
  let data = fs.readFileSync(txtFile, 'utf8');
  let lines = data.split('\n');

  return lines.map(line => {
    let [wordPairString, ...restLine] = line.split(':');
    let wordPairs = wordPairString.split(',');

    if (wordPairs.length >= 2) {
      let start_word = wordPairs[0].trim();
      let goal_word = wordPairs[wordPairs.length - 1].trim();

      // Extract path lengths from the line
      let pathLengths = restLine.map(path => {
        let pathInfo = path.trim().match(/Path \d+ \(length (\d+)\)/);
        return pathInfo ? parseInt(pathInfo[1]) : 0;
      });

      // Return the modified object including the path_length
      return {
        start_word,
        goal_word,
        path_length: pathLengths[0] // Assuming we want the length of the first path
      };
    } else {
      return null; // Skip invalid lines without valid word pairs
    }
  }).filter(pair => pair && !seenPairs.has(`${pair.start_word}-${pair.goal_word}`));
}

async function main() {
  let version = 1; // Change this for different versions
  let startingDate = new Date('2023-06-2'); // Set your starting date here
  let daysProcessed = 0;

  // Loop through each day
  while (true) {
    let gameData = {
      gameID: `version${version}-${formatDate(startingDate, 'yyyy-MM-dd')}`,
      rounds: [],
    };

    // Process each round
for (let round = 1; round <= 5; round++) {
  let files = filePatterns[round];
  let pairAdded = false;

  // Loop through each file
  for (let file of files) {
    let wordPairs = parseTxtToJson(file);

    // Loop through each word pair
    for (let pair of wordPairs) {
      const existingPairIndex = gameData.rounds.findIndex(
        (roundData) => roundData.start_word === pair.start_word && roundData.goal_word === pair.goal_word
      );

      if (existingPairIndex !== -1) {
        continue;
      }

      gameData.rounds.push({
        round_number: round,
        start_word: pair.start_word,
        goal_word: pair.goal_word,
        path_length: pair.path_length,
      });

      console.log(
        `Added pair ${pair.start_word}-${pair.goal_word} with path length ${pair.path_length} for round ${round} on ${formatDate(startingDate)}`
      );

      seenPairs.add(`${pair.start_word}-${pair.goal_word}`);
      pairAdded = true;
      break; // This break is for the innermost for loop
    }

    if (pairAdded) break; // This break is for the middle for loop
  }

  // Comment out the break that was here
}

if (gameData.rounds.length < 5) {
  console.log(`Couldn't find enough unique pairs for ${formatDate(startingDate)}. Stopping.`);
  break;
}

    // Save the gameData to the database
    await db.set(gameData.gameID, gameData);

    // Advance to the next date
    startingDate.setDate(startingDate.getDate() + 1);
    daysProcessed++;
  }

  console.log(`Finished processing. ${daysProcessed} complete days were processed.`);
}

function formatDate(date, format = 'yyyy-MM-dd') {
  let year = date.getFullYear();
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let day = String(date.getDate()).padStart(2, '0');

  if (format === 'MMddyyyy') {
    return `${month}${day}${year}`;
  }

  return `${year}-${month}-${day}`;
}

main();
