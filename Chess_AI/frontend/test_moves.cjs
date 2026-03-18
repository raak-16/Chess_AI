const { Chess } = require('chess.js');
const game = new Chess();
const square = 'e2';
const moves = game.moves({ square, verbose: true });
console.log(moves);
const piece = game.get(square);
console.log(piece);
