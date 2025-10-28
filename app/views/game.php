<?php include __DIR__ . '/partials/header.php'; ?>

<div id="game-container">
  <canvas id="game-canvas"></canvas>
  <div id="score-display">0</div>

  <div id="start-screen">
    <input type="text" id="player-name" placeholder="Seu Nome">
    <button id="start-button">Iniciar Jogo</button>
  </div>

  <div id="game-over-screen"></div>
  <div id="leaderboard-container" class="leaderboard">
    <h2>🏆 Ranking</h2>
    <table id="leaderboard-table">
      <thead>
        <tr>
          <th>Posição</th>
          <th>Jogador</th>
          <th>Pontos</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
    <div class="leaderboard-pagination">
      <button id="prevPage">Anterior</button>
      <span id="pageInfo"></span>
      <button id="nextPage">Próxima</button>
    </div>
  </div>

</div>

<?php include __DIR__ . '/partials/footer.php'; ?>