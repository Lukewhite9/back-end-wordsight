const fs = require('fs');
const glob = require('glob');
const Database = require("@replit/database");
const db = new Database();

// File patterns for each round
const filePatterns = {
  1: glob.sync("wordpairtxts/difficulty_[0-6]_[3]_steps.txt"),
  2: [
    ...glob.sync("wordpairtxts/difficulty_[3-5]_[3-4]_steps.txt"),
    ...glob.sync("wordpairtxts/difficulty_[1-3]_[5]_steps.txt"),
  ],
  3: [
    ...glob.sync("wordpairtxts/difficulty_[5-6]_[5-6]_steps.txt"),
    ...glob.sync("wordpairtxts/difficulty_[0-4]_[7]_steps.txt"),
  ],
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

      // Extract path information segments
      let pathSegments = restLine.join(':').split('Path ');

      let path1Length = 0;
      let path2Length = 0;
      let path1Words = "";
      let path2Words = "";

      pathSegments.forEach(segment => {
        const match = segment.match(/(\d+) \(length (\d+)\): ([\w\s,]+)/);
        if (match) {
          const pathNumber = parseInt(match[1]);
          const pathLength = parseInt(match[2]);
          const pathWords = match[3].trim();

          if (pathNumber === 1) {
            path1Length = pathLength;
            path1Words = pathWords;
          } else if (pathNumber === 2) {
            path2Length = pathLength;
            path2Words = pathWords;
          }
        }
      });

      return {
        start_word,
        goal_word,
        path_length: path1Length,
        best_possible_length: path2Length,
        path1_words: path1Words,
        best_possible_words: path2Words === "" ? path1Words : path2Words,
      };
    } else {
      return null;
    }
  }).filter(pair => pair && !seenPairs.has(`${pair.start_word}-${pair.goal_word}`));

  return shuffle(wordPairs);
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

    async function main() {
      let version = 5;
      let startingDate = new Date('2024-01-18');
      let daysProcessed = 0;

      const devPrefix = "dev"; 
      const prodPrefix = "prod"; 

      while (true) {
        let formattedDate = formatDate(startingDate, 'yyyy-MM-dd');
        let gameDataDev = {
          gameID: `${devPrefix}-wordpair-${version}-${formattedDate}`, 
          rounds: [],
        };

        let gameDataProd = {
          gameID: `${prodPrefix}-wordpair-${version}-${formattedDate}`, 
          rounds: [],
        };

    for (let round = 1; round <= 3; round++) {
      let files = shuffle(filePatterns[round]);
      let pairAdded = false;

      for (let file of files) {
        let wordPairs = parseTxtToJson(file);

        for (let pair of wordPairs) {
          if (!seenPairs.has(`${pair.start_word}-${pair.goal_word}`)) {
            seenPairs.add(`${pair.start_word}-${pair.goal_word}`);

            let roundData = {
              round_number: round,
              start_word: pair.start_word,
              goal_word: pair.goal_word,
              path_length: pair.path_length,
              best_possible_length: pair.best_possible_length,
              best_possible_words: pair.best_possible_words
            };

            gameDataDev.rounds.push(roundData);
            gameDataProd.rounds.push(roundData);

            console.log(
              `Added pair ${pair.start_word}-${pair.goal_word} with path length ${pair.path_length}, best possible length ${pair.best_possible_length}, and best possible words ${pair.best_possible_words} for round ${round} on ${formatDate(startingDate)} to both environments`
            );

            pairAdded = true;
            break; 
          }
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

if (gameDataDev.rounds.length === 3 && gameDataProd.rounds.length === 3) {
  await db.set(gameDataDev.gameID, gameDataDev);
  await db.set(gameDataProd.gameID, gameDataProd);

  daysProcessed++;
} else {
  console.log(`Couldn't find enough unique pairs for ${formattedDate}. Stopping.`);
  break;
}

startingDate.setDate(startingDate.getDate() + 1);
}

console.log(`Finished processing. ${daysProcessed} complete days were processed.`);
}

main();