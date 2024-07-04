const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Welcome to Chess Game" });
});

io.on("connection", (uniqueSocket) => {
  console.log("A user connected:", uniqueSocket.id);

  if (!players.white) {
    players.white = uniqueSocket.id;
    uniqueSocket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniqueSocket.id;
    uniqueSocket.emit("playerRole", "b");
  } else {
    uniqueSocket.emit("spectatorRole");
  }

  uniqueSocket.on("disconnect", () => {
    console.log("A user disconnected:", uniqueSocket.id);

    if (uniqueSocket.id === players.white) {
      delete players.white;
    } else if (uniqueSocket.id === players.black) {
      delete players.black;
    }

    // If a player disconnects, reset the game and notify all users
    if (!players.white || !players.black) {
      chess.reset();
      io.emit("boardState", chess.fen());
    }
  });

  uniqueSocket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && uniqueSocket.id !== players.white) return;
      if (chess.turn() === "b" && uniqueSocket.id !== players.black) return;

      const result = chess.move(move);
      if (result) {
        io.emit("move", move);
        io.emit("boardState", chess.fen());
      } else {
        console.log("Invalid Move:", move);
        uniqueSocket.emit("invalidMove", move);
      }
    } catch (err) {
      console.log("Error processing move:", err);
      uniqueSocket.emit("error", "Invalid move");
    }
  });

  // Send the initial board state to the connected client
  uniqueSocket.emit("boardState", chess.fen());
});

server.listen(3000, () => {
  console.log("Server is running at port 3000");
});
