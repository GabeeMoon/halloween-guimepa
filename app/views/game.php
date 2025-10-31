<?php include __DIR__ . '/partials/header.php'; ?>

<div id="game-container">
  <!-- NOVO: Intro overlay (primeira visita) -->
  <div id="intro-screen">
    <div class="intro-wrap">
      <!-- Logo (use uma imagem se tiver em assets/sprites/logo.png) -->
      <div class="intro-logo">
        <!-- Se tiver logo: <img src="<?= $base ?>/assets/sprites/logo.png" alt="Guimepa" /> -->
        <h1>Fuga do Fantasma</h1>
      </div>

      <div class="intro-story">
        <p>Você está prestes a entrar em uma jornada sombria.</p>
        <p>Mas cuidado: o fantasma da concorrência está à espreita — pronto para te alcançar com prazos quebrados,
          promessas vazias e produtos duvidosos!</p>
        <p>Seu objetivo é simples: correr o máximo possível, desviando dos obstáculos e coletando bons parceiros pelo
          caminho.</p>
        <div class="intro-badges">
          <div class="badge"><span class="ico">⚡</span> Produtos Vonder te dão mais velocidade.</div>
          <div class="badge"><span class="ico">🛡️</span> Produtos Makita te protegem dos ataques do fantasma.</div>
        </div>
        <p class="intro-cta">Mostre que quem confia na Guimepa sempre chega mais longe.</p>
        <p class="intro-cta">Boa sorte — e corra, antes que o fantasma te alcance!</p>
      </div>

      <div class="intro-tutorial">
        <h3>Como jogar</h3>
        <ul>
          <li><kbd>↑</kbd> ou <kbd>Espaço</kbd> para pular</li>
          <li><kbd>↓</kbd> para agachar</li>
          <li>Desvie dos obstáculos, colete power-ups e maximize sua pontuação</li>
        </ul>
      </div>

      <button id="intro-continue">Entrar no Desafio</button>


    </div>

  </div>

  <!-- Canvas e HUD -->
  <canvas id="game-canvas"></canvas>
  <div id="score-display">0</div>

  <!-- Tela de início existente -->
  <div id="start-screen">
    <input type="text" id="player-name" placeholder="Seu Nome">
    <button id="start-button">Iniciar Jogo</button>
  </div>

  <!-- Game Over e Leaderboard existentes -->
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
<script>

</script> <?php include __DIR__ . '/partials/footer.php'; ?>