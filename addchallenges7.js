const fs = require('fs');
const glob = require('glob');
const Database = require("@replit/database");
const db = new Database();

// 7-day cycle schedule for difficulty
const sevenDaySchedule = {
  1: [3, 3, 4, 4, 5],
  2: [3, 4, 4, 5, 5],
  3: [4, 4, 5, 5, 6],
  4: [4, 5, 5, 6, 6],
  5: [5, 5, 6, 6, 7],
  6: [5, 6, 6, 7, 8],
  7: [5, 6, 7, 8, 9],
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
  let version = 3;
  let startingDate = new Date('2023-09-04');
  let daysProcessed = 0;

  while (true) {
    let dayOfCycle = daysProcessed % 7 + 1;
    let filePatterns = {};

    for (let round = 1; round <= 5; round++) {
      let step = sevenDaySchedule[dayOfCycle][round - 1];
      filePatterns[round] = glob.sync(`wordpairtxts/anagrams_${step}_steps_*_difference.txt`);
    }

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
