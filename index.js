import { initializeApp } from "firebase/app";
import {
  getDatabase,
  onValue,
  ref,
  set,
  child,
  get,
  update,
} from "firebase/database";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  deleteUser,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB53DqTk-Zalw2b95IAOw2iLvTlXRnBfFI",
  authDomain: "snake-battle-d9baf.firebaseapp.com",
  projectId: "snake-battle-d9baf",
  storageBucket: "snake-battle-d9baf.appspot.com",
  messagingSenderId: "1076892404000",
  appId: "1:1076892404000:web:569ae2f12543a9bfe62f45",
  databaseURL:
    "https://snake-battle-d9baf-default-rtdb.europe-west1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
let dbRef = ref(database);

// Gameroom data
let myRole = "";
let opponentRole = "";

// References for onvalue listeners. (What value in database to listen for)
let references = {};

let gameRoom = {
  startGame: false,
  id: 0,
  players: 1,
  creator: {
    matchPoints: 0,
    score: 0,
    ready: false,
    gameOver: false,
  },
  joiner: {
    matchPoints: 0,
    score: 0,
    ready: false,
    gameOver: false,
  },
};
let snakeArray = [68];
let snakeDirection = "right";
let foodOnBoard = false;
let snakeGameState = false;
let myScore = 0;
let opponentScore = 0;
let myMatchPoints = 0;
let opponentMatchPoints = 0;
// Creating and Joining a room logic
// Function for generating a random number, we use it to generate a random room id.
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}
// This function generates a random 6 digit room ID.
function generateRoomID() {
  let number = 0;
  let roomID = "";
  for (let i = 0; i < 6; i++) {
    number = getRandomIntInclusive(1, 9);
    roomID += number;
  }
  return roomID;
}

// Creates a gameRoom in the database with a randomly generated 6 digit id.
function createRoom() {
  myRole = "creator";
  opponentRole = "joiner";
  let roomID = generateRoomID();
  gameRoom.id = roomID;
  try {
    set(ref(database, "rooms/" + roomID), {
      gameRoom,
    });
  } catch (error) {
    console.log(error);
  }

  document.querySelector(".room-logic").style.display = "none";
  document.querySelector(".waiting-screen").style.display = "flex";
  document.querySelector(
    ".room-id-container"
  ).textContent = `ROOM ID: ${roomID}`;
  createReferences();
  createOnValueListeners();
}

// Function that joines the room based on the ID entered in the input field.
function joinRoom() {
  let inputValue = document.querySelector(".join-room-input").value;
  if (inputValue === null || inputValue === "") {
    alert("Room id can't be empty when joining a room");
    return;
  }
  myRole = "joiner";
  opponentRole = "creator";
  let roomID = inputValue;
  get(child(dbRef, `rooms/${roomID}`))
    .then((snapshot) => {
      if (snapshot.exists()) {
        gameRoom.id = roomID;
        const updates = {};
        updates["rooms/" + roomID + "/gameRoom/players"] = 2;
        update(ref(database), updates);
        document.querySelector(".room-logic").style.display = "none";
        document.querySelector(".waiting-screen").style.display = "flex";
        document.querySelector(".waiting-screen-text").textContent =
          "Please click ready.";
        document.querySelector(".waiting-screen-button").style.display =
          "inline";
        document.querySelector(".room-id-container").style.display = "none";
        createReferences();
        createOnValueListeners();
      } else {
        alert("Room doesn't exist");
      }
    })
    .catch((error) => {
      console.error(error);
    });
}

// Function that creates the references that we can later refer our onValueListeners to.
function createReferences() {
  references.startGame = ref(
    database,
    "rooms/" + gameRoom.id + "/gameRoom/startGame"
  );

  references.players = ref(
    database,
    "rooms/" + gameRoom.id + "/gameRoom/players"
  );

  references.opponentScore = ref(
    database,
    "rooms/" + gameRoom.id + "/gameRoom/" + opponentRole + "/score"
  );
  references.opponentPoints = ref(
    database,
    "rooms/" + gameRoom.id + "/gameRoom/" + opponentRole + "/matchPoints"
  );
  references.opponentReady = ref(
    database,
    "rooms/" + gameRoom.id + "/gameRoom/" + opponentRole + "/ready"
  );
  references.opponentGameOver = ref(
    database,
    "rooms/" + gameRoom.id + "/gameRoom/" + opponentRole + "/gameOver"
  );
}

// Function that generates value listeners for the database values we need.
function createOnValueListeners() {
  // Listens if opponentReady value changes.
  onValue(references.opponentReady, (snapshot) => {
    const data = snapshot.val();
    if (myRole === "creator") {
      if (data && gameRoom.creator.ready) {
        setStartGame();
      } else if (data) {
        document.querySelector(".waiting-screen-text").textContent =
          "Other player is ready. Please click Ready.";
      }
    } else {
      if (data && gameRoom.joiner.ready) {
        setStartGame();
      } else if (data) {
        document.querySelector(".waiting-screen-text").textContent =
          "Other player is ready. Please click Ready.";
      }
    }
  });
  // Listens for opponent matchpoints value changes.
  onValue(references.opponentPoints, (snapshot) => {
    const data = snapshot.val();
    opponentMatchPoints = data;
    document.querySelector(".opponent-match-score").textContent =
      opponentMatchPoints;
  });
  // Listens for opponentscore value changes.
  onValue(references.opponentScore, (snapshot) => {
    const data = snapshot.val();
    opponentScore = data;
    document.querySelector(".opponent-snake-score").textContent = opponentScore;
  });
  // Listens for opponent GameOver value changes.
  onValue(references.opponentGameOver, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      document.querySelector(".opponent-snake-score").style.backgroundColor =
        "red";
    }
    if (myRole === "creator") {
      gameRoom.joiner.gameOver = data;

      if (gameRoom.creator.gameOver) {
        snakeArray = [68];
        delay = 250;
        foodOnBoard = false;
        snakeDirection = "right";
      }
    } else if (myRole === "joiner") {
      gameRoom.creator.gameOver = data;

      if (gameRoom.joiner.gameOver) {
        snakeArray = [68];
        delay = 250;
        foodOnBoard = false;
        snakeDirection = "right";
      }
    }
  });
  // Listens for startGame value.
  onValue(references.startGame, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      if (myScore > opponentScore) {
        myMatchPoints += 1;
        document.querySelector(".your-match-score").textContent = myMatchPoints;
        const updates = {};
        updates[
          "rooms/" + gameRoom.id + "/gameRoom/" + myRole + "/matchPoints"
        ] = myMatchPoints;
        update(ref(database), updates);
      } else if (myScore < opponentScore) {
        opponentMatchPoints += 1;
        document.querySelector(".opponent-match-score").textContent =
          opponentMatchPoints;
        const updates = {};
        updates[
          "rooms/" + gameRoom.id + "/gameRoom/" + opponentRole + "/matchPoints"
        ] = opponentMatchPoints;
        update(ref(database), updates);
      }
      if (myMatchPoints === 3 || opponentMatchPoints === 3) {
        document.querySelector(".waiting-screen").style.display = "flex";
        if (myMatchPoints === 3 && opponentMatchPoints === 3) {
          document.querySelector(".waiting-screen-text").textContent =
            "ITS A TIE!";
        } else if (myMatchPoints === 3) {
          document.querySelector(".waiting-screen-text").textContent =
            "YOU WON!";
        } else if (opponentMatchPoints === 3) {
          document.querySelector(".waiting-screen-text").textContent =
            "YOU LOST";
        }
      } else {
        startCountdown();
      }
    }
  });
  // Listens for the amount of players in the gameroom.
  onValue(references.players, (snapshot) => {
    if (snapshot.val() === 2) {
      document.querySelector(".waiting-screen-text").textContent =
        "Please click ready.";
      document.querySelector(".waiting-screen-button").style.display = "inline";
      document.querySelector(".room-id-container").style.display = "none";
    }
  });
}

// Function that sets the startGame value in database to true
function setStartGame() {
  const updates = {};
  updates["rooms/" + gameRoom.id + "/gameRoom/startGame"] = true;
  update(ref(database), updates);
}

// Function for the ready game room mechanic.
function playerStateReady() {
  if (myRole === "creator") {
    gameRoom.creator.ready = true;
    const updates = {};
    updates["rooms/" + gameRoom.id + "/gameRoom/" + myRole + "/ready"] = true;
    update(ref(database), updates);
    if (gameRoom.joiner.ready) {
      setStartGame();
    } else {
      document.querySelector(".waiting-screen-text").textContent =
        "Other player not ready.";
      document.querySelector(".waiting-screen-button").style.display = "none";
    }
  } else if (myRole === "joiner") {
    gameRoom.joiner.ready = true;
    const updates = {};
    updates["rooms/" + gameRoom.id + "/gameRoom/" + myRole + "/ready"] = true;
    update(ref(database), updates);
    if (gameRoom.creator.ready) {
      setStartGame();
    } else {
      document.querySelector(".waiting-screen-text").textContent =
        "Other player not ready.";
      document.querySelector(".waiting-screen-button").style.display = "none";
    }
  }
}

// Starting the snake game
// This function calls the start of the countdown
function startCountdown() {
  generateGameBoard();
  document.querySelector(".waiting-screen").style.display = "flex";
  document.querySelector(".waiting-screen-text").textContent = 3;
  countDown()
    .then(() => {
      // The countdown has finished, call changeGameDisplay()
      startGame();
    })
    .catch((error) => {
      console.error("Error during countdown:", error);
    });
}

// This function simulates a countdown on the screen.
function countDown() {
  return new Promise((resolve) => {
    let count = 2;

    const countdownInterval = setInterval(() => {
      const countdownElement = document.querySelector(".waiting-screen-text");
      countdownElement.textContent = count;

      count -= 1;

      if (count < 0) {
        clearInterval(countdownInterval);
        resolve();
      }
    }, 1000);
  });
}

//////////////////// SNAKE GAME LOGIC ////////////////////

const rightBorder = [
  15, 31, 47, 63, 79, 95, 111, 127, 143, 159, 175, 191, 207, 223, 239, 255,
];
const leftBorder = [
  0, 16, 32, 48, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240,
];

function generateGameBoardArray() {
  let i = 0;
  let emptyArray = [];
  // Creates an array of 256 elements ranging from number 0 to number 255.
  // This represents 256 tiles which would be a 16x16 grid.
  while (i < 256) {
    emptyArray.push(i);
    i++;
  }
  return emptyArray;
}

const gameBoard = generateGameBoardArray();

function generateGameBoard() {
  let board = "";
  // creates a board variable that equals to 255 div elements.
  for (let i = 0; i < gameBoard.length; i++) {
    board += `<div class="tile E" id="${i}"></div>`;
  }
  // Selecting the game element from HTML (which is a div container) and setting it's innerHTML value to our
  // board variable so we will have 255 divs in our HTML code after calling this function.
  document.querySelector(".game-container").innerHTML = board;
}

function spawnFood() {
  // Checks if there is food on the board.
  if (!foodOnBoard) {
    let state = true;

    // A loop that generates a random number to decide the tile where to spawn the food. If the random number is in snake array it means that the tile is a part of snake,
    // and foot cannot be spawned on that tile, so it loops until it gets an ID that is not part of the snake array and
    // spawns food there by changing the tile element to F meaning food.
    while (state) {
      let randomInt = getRandomIntInclusive(0, 255);
      if (!snakeArray.includes(randomInt)) {
        const foodElement = document.getElementById(randomInt);
        foodElement.className = "tile F";
        foodOnBoard = true;
        state = false;
        foodLoop = 0;
      }
    }
  }
}

function calculateTileAheadSnake() {
  let newTileId = 0;
  // checks direction and if snake is on the respective border. For example if snakeDirection is right, the snake cant be on the right border.
  // otherwise we will set the gameState to false and send an alert that the game is over.
  if (snakeDirection === "right" && !rightBorder.includes(snakeArray[0])) {
    newTileId = snakeArray[0] + 1;
  } else if (snakeDirection === "down" && !(snakeArray[0] > 239)) {
    newTileId = snakeArray[0] + 16;
  } else if (snakeDirection === "left" && !leftBorder.includes(snakeArray[0])) {
    newTileId = snakeArray[0] - 1;
  } else if (snakeDirection === "up" && !(snakeArray[0] < 16)) {
    newTileId = snakeArray[0] - 16;
  } else if (
    snakeDirection === "right" &&
    rightBorder.includes(snakeArray[0])
  ) {
    newTileId = snakeArray[0] - 15;
  } else if (snakeDirection === "down" && snakeArray[0] > 239) {
    newTileId = snakeArray[0] % 16;
  } else if (snakeDirection === "left" && leftBorder.includes(snakeArray[0])) {
    newTileId = snakeArray[0] + 15;
  } else if (snakeDirection === "up" && snakeArray[0] < 16) {
    newTileId = 15 * 16 + snakeArray[0];
  } else {
    snakeGameState = false;
  }
  return newTileId;
}

function changeTile(id) {
  const tileElement = document.getElementById(id);
  // If the tile is E meaning Empty, set the snake to that tile and remove the last snake tile in snakeArray.
  if (tileElement.classList.contains("E")) {
    snakeArray.unshift(id);
    tileElement.className = "tile S";
    document.getElementById(snakeArray.pop()).className = "tile E";
  } else if (tileElement.classList.contains("F")) {
    snakeArray.unshift(id);
    tileElement.className = "tile S";
    delay -= 12.5; // decreases delay each time after snake eats food.
    delay = Math.max(delay, 50); // delay cant go under 50ms
    myScore += 1;
    const updates = {};
    updates["rooms/" + gameRoom.id + "/gameRoom/" + myRole + "/score"] =
      myScore;
    update(ref(database), updates);
    document.querySelector(".your-snake-score").textContent = myScore;

    foodOnBoard = false;
  } else if (tileElement.classList.contains("S")) {
    snakeGameState = false;
  }
}

let directionChanged = false;
document.addEventListener(
  "keydown",
  (event) => {
    var name = event.key;

    if (event.key === "ArrowUp") {
      if (snakeDirection !== "down" && !directionChanged) {
        snakeDirection = "up";
        directionChanged = true; // Set the flag to true
      }
    } else if (event.key === "ArrowDown") {
      if (snakeDirection !== "up" && !directionChanged) {
        snakeDirection = "down";
        directionChanged = true; // Set the flag to true
      }
    } else if (event.key === "ArrowLeft") {
      if (snakeDirection !== "right" && !directionChanged) {
        snakeDirection = "left";
        directionChanged = true; // Set the flag to true
      }
    } else if (event.key === "ArrowRight") {
      if (snakeDirection !== "left" && !directionChanged) {
        snakeDirection = "right";
        directionChanged = true; // Set the flag to true
      }
    }
  },
  false
);

let delay = 250;
let loopAmount = 0;
let foodLoop = 0;
function gameLoop() {
  if (!snakeGameState || loopAmount > 6000 || foodLoop > 300) {
    gameOver();
    foodLoop = 0;
    return;
  } else if (
    myScore > opponentScore &&
    (gameRoom.joiner.gameOver || gameRoom.creator.gameOver)
  ) {
    gameOver();
    return;
  }

  directionChanged = false;

  setTimeout(() => {
    loopAmount += 1;
    foodLoop += 1;
    console.log(foodLoop);
    spawnFood();
    changeTile(calculateTileAheadSnake());
    gameLoop();
  }, delay);
}
/////////////////////////////////////////////////////////
// Function that starts the snake game.
function startGame() {
  document.querySelector(".your-snake-score").style.backgroundColor = "aqua";
  document.querySelector(".opponent-snake-score").style.backgroundColor =
    "aqua";

  myScore = 0;
  opponentScore = 0;
  document.querySelector(".your-snake-score").textContent = myScore;
  document.querySelector(".opponent-snake-score").textContent = myScore;
  let updates = {};
  updates["rooms/" + gameRoom.id + "/gameRoom/" + myRole + "/score"] = myScore;
  update(ref(database), updates);
  updates = {};
  updates["rooms/" + gameRoom.id + "/gameRoom/" + opponentRole + "/score"] =
    opponentScore;
  gameRoom.creator.gameOver = false;
  gameRoom.joiner.gameOver = false;
  updates = {};
  updates["rooms/" + gameRoom.id + "/gameRoom/" + myRole + "/gameOver"] = false;
  update(ref(database), updates);
  updates = {};
  updates[
    "rooms/" + gameRoom.id + "/gameRoom/" + opponentRole + "/gameOver"
  ] = false;
  document.querySelector(".waiting-screen").style.display = "none";
  snakeGameState = true;
  document.getElementById(snakeArray[0]).className = "tile S";
  spawnFood();
  gameLoop();
}

function gameOver() {
  if (myRole === "creator") {
    gameRoom.creator.gameOver = true;
    const updates = {};
    updates[
      "rooms/" + gameRoom.id + "/gameRoom/" + myRole + "/gameOver"
    ] = true;
    document.querySelector(".your-snake-score").style.backgroundColor = "red";
    update(ref(database), updates);
  } else if (myRole === "joiner") {
    gameRoom.joiner.gameOver = true;
    const updates = {};
    updates[
      "rooms/" + gameRoom.id + "/gameRoom/" + myRole + "/gameOver"
    ] = true;
    document.querySelector(".your-snake-score").style.backgroundColor = "red";
    update(ref(database), updates);
  }

  if (gameRoom.joiner.gameOver && gameRoom.creator.gameOver) {
    const updates = {};
    updates["rooms/" + gameRoom.id + "/gameRoom/startGame"] = false;
    update(ref(database), updates);
    resetGame();
  }
}
// Repeating the snake game
function resetGame() {
  snakeArray = [68];
  delay = 250;
  foodOnBoard = false;
  snakeDirection = "right";
  gameRoom.creator.gameOver = false;
  gameRoom.joiner.gameOver = false;
  const updates = {};
  updates["rooms/" + gameRoom.id + "/gameRoom/startGame"] = true;
  update(ref(database), updates);
}
// Finishing the snake game

// Event listeners

// Eventlistener for the createroom button.
document
  .querySelector(".create-room-button")
  .addEventListener("click", createRoom);

// Eventlistener for the joinroom button
document.querySelector(".join-room-button").addEventListener("click", joinRoom);

document
  .querySelector(".waiting-screen-button")
  .addEventListener("click", playerStateReady);
