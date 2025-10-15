<?php include __DIR__ . '/partials/header.php'; ?>

<div id="game-container">
  <canvas id="game-canvas"></canvas>
  <div id="score-display">0</div>

  <div id="start-screen">
    <input type="text" id="player-name" placeholder="Seu Nome">
    <button id="start-button">Iniciar Jogo</button>
  </div>

  <div id="game-over-screen"></div>
</div>

<?php include __DIR__ . '/partials/footer.php'; ?>