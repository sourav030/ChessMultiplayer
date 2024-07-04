const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const turnIndicator = document.getElementById("turnIndicator");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

function renderBoard() {
  const board = chess.board();
  boardElement.innerHTML = "";

  board.forEach((row, rowIndex) => {
    row.forEach((square, squareIndex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowIndex;
      squareElement.dataset.col = squareIndex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );

        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;

        pieceElement.addEventListener("dragstart", (event) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowIndex, col: squareIndex };
            event.dataTransfer.setData("text/plain", "");
            pieceElement.classList.add("dragging");
          }
        });

        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
          pieceElement.classList.remove("dragging");
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece) {
          const targetSquare = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };
          handleMove(sourceSquare, targetSquare);
        }
      });

      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }

  updateTurnIndicator();
}

function handleMove(source, target) {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q", // Handle promotion logic if needed
  };

  // Validate the move before sending it to the server
  const result = chess.move(move);
  if (result) {
    socket.emit("move", move);
  } else {
    console.error("Illegal move:", move);
    renderBoard();
  }
}

function getPieceUnicode(piece) {
  const unicodePieces = {
    p: "♟",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
  };
  return unicodePieces[piece.type] || "";
}

function updateTurnIndicator() {
  const turn = chess.turn() === "w" ? "White's turn" : "Black's turn";
  turnIndicator.innerText = turn;
}

socket.on("playerRole", function(role) {
  playerRole = role;
  renderBoard();
});

socket.on("spectatorRole", function() {
  playerRole = null;
  renderBoard();
});

socket.on("boardState", function(fen) {
  chess.load(fen);
  renderBoard();
});

socket.on("move", function(move) {
  chess.move(move);
  renderBoard();
});

renderBoard();
