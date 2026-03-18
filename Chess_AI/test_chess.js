const { Chess } = require('chess.js');
const game = new Chess();
try {
  const res = game.move({ from: 'e2', to: 'e4', promotion: 'q' });
  console.log("Success!", res);
} catch (e) {
  console.log("Error!", e.message);
}
