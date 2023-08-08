const fs = require('fs');
const glob = require('glob');
const Database = require("@replit/database");
const db = new Database();

// File patterns for each round
const filePatterns = {
  1: glob.sync("wordpairtxts/anagrams_4_steps_1_difference.txt").concat(glob.sync("wordpairtxts/anagrams_5_steps_*_difference.txt")),
  2: glob.sync("wordpairtxts/anagrams_4_steps_*_difference.txt").concat(glob.sync("wordpairtxts/anagrams_5_steps_*_difference.txt")),
  3: glob.sync("wordpairtxts/anagrams_5_steps_*_difference.txt"),
  4: glob.sync("wordpairtxts/anagrams_5_steps_*_difference.txt").concat(glob.sync("wordpairtxts/anagrams_6_steps_*_difference.txt")),
  5: glob.sync("wordpairtxts/anagrams_6_steps_*_difference.txt").concat(glob.sync("wordpairtxts/anagrams_7_steps_*_difference.txt")).concat(glob.sync("wordpairtxts/anagrams_8_steps_*_difference.txt")),
};

let seenPairs = new Set();

function shuffle(array) {
  let currentIndex = array.length;
  let temporaryValue, randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function parseTxtToJson(txtFile) {
  let data = fs.readFileSync(txtFile, 'utf8');
  let lines = data.split('\n');

  let wordPairs = lines.map(line => {
    let [wordPairString, ...restLine] = line.split(':');
    let pairs = wordPairString.split(',');

    if (pairs.length >= 2) {
      let start_word = pairs[0].trim();
      let goal_word = pairs[pairs.length - 1].trim();

      // Extract path length from the line
      let pathLength = restLine[0].match(/Path \d+ \(length (\d+)\)/)[1];

      return {
        start_word,
        goal_word,
        path_length: parseInt(pathLength),
      };
    } else {
      return null;
    }
  }).filter(pair => pair && !seenPairs.has(`${pair.start_word}-${pair.goal_word}`));

  return shuffle(wordPairs);
}

async function main() {
  let version = 1;
  let startingDate = new Date('2023-09-08');
  let daysProcessed = 0;

  while (true) {
    let gameData = {
      gameID: `version${version}-${formatDate(startingDate, 'yyyy-MM-dd')}`,
      rounds: [],
    };

    for (let round = 1; round <= 5; round++) {
      let files = shuffle(filePatterns[round]);
      let pairAdded = false;

      for (let file of files) {
        let wordPairs = parseTxtToJson(file);

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
          break;
        }

        if (pairAdded) {
          break;
        }
      }

      if (!pairAdded) {
        console.log(`No suitable word pair found for round ${round} on ${formatDate(startingDate)}. Skipping day.`);
        break;
      }
    }

    if (gameData.rounds.length < 5) {
      console.log(`Couldn't find enough unique pairs for ${formatDate(startingDate)}. Stopping.`);
      break;
    }

    await db.set(gameData.gameID, gameData);

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
