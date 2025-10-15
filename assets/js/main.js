// assets/js/main.js
// main.js — Lógica do jogo + efeitos visuais aprimorados para power-ups
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 800
  canvas.height = 400

  const groundHeight = 50
  const groundY = canvas.height
  const normalHeight = 100
  const duckHeight = 50
  const playerWidth = 50
  const ghostWidth = 50
  const ghostHeight = 100
  const obsWidth = 40
  const lowObsHeight = 50
  const highObsHeight = 150
  const highObsY = groundY - normalHeight - highObsHeight + 50 // Ajuste para colidir com cabeça
  const powerupSize = 30

  // Carregar imagens (usamos uma imagem fixa por tipo para evitar piscar)
  const images = {
    playerRun: loadImage('assets/sprites/personagem_correndo.png'),
    playerJump: loadImage('assets/sprites/personagem_pulando.png'),
    playerDuck: loadImage('assets/sprites/personagem_agachado.png'),
    ghost1: loadImage('assets/sprites/fantasma_correndo.png'),
    ghost2: loadImage('assets/sprites/fantasma_correndo2.png'),
    obsHigh: loadImage('assets/sprites/obstaculo_alto.png'),
    obsLow: loadImage('assets/sprites/obstaculo_baixo.png'),
    bg: loadImage('assets/sprites/fundo.png'),
    ground: loadImage('assets/sprites/chao.png'),
    powerSpeed: loadImage('assets/sprites/powerup_velocidade.png'),
    powerShield: loadImage('assets/sprites/powerup_escudo.png'),
  }

  function loadImage(src) {
    const img = new Image()
    img.src = src
    return img
  }

  // Sons
  const jumpSound = new Audio('assets/sounds/pulo.mp3')
  const gameOverSound = new Audio('assets/sounds/game_over.mp3')
  const powerupSound = new Audio('assets/sounds/powerup.mp3')

  const startScreen = document.getElementById('start-screen')
  const playerNameInput = document.getElementById('player-name')
  const startButton = document.getElementById('start-button')
  const gameOverScreen = document.getElementById('game-over-screen')
  const scoreDisplay = document.getElementById('score-display')

  let playerName = ''
  let running = false
  let score = 0
  let gameSpeed = GAME_CONFIG.INITIAL_GAME_SPEED
  let obstacles = []
  let powerups = []
  let player = {
    x: 200,
    y: groundY - normalHeight,
    width: playerWidth,
    height: normalHeight,
    velocityY: 0,
    jumping: false,
    ducking: false,
  }
  let ghost = {
    x: player.x - GAME_CONFIG.GHOST_DISTANCE_BEHIND,
    y: groundY - ghostHeight,
    width: ghostWidth,
    height: ghostHeight,
  }
  let shieldActive = false
  let powerupActive = null
  // slowTimer usado na mesma unidade que você tinha: decrementado por (delta/16.67)
  // valor 90 = ~1.5s (90 * 16.67ms ≈ 1500ms)
  let slowTimer = 0
  let frame = 0
  let lastObstacle = 50 // Iniciar com delay para evitar spawn imediato
  let lastPowerup = 0
  let lastTime = 0
  let bgX = 0
  let groundX = 0
  let bgWidth = 800 // Assumido
  let groundWidth = 800 // Assumido
  let keys = {}

  document.addEventListener('keydown', (e) => (keys[e.key] = true))
  document.addEventListener('keyup', (e) => (keys[e.key] = false))

  startButton.addEventListener('click', () => {
    playerName = playerNameInput.value.trim() || 'Anonimo'
    startScreen.style.display = 'none'
    initGame()
    lastTime = performance.now()
    requestAnimationFrame(gameLoop)
  })

  function initGame() {
    score = 0
    gameSpeed = GAME_CONFIG.INITIAL_GAME_SPEED
    obstacles = []
    powerups = []
    player = {
      x: 200,
      y: groundY - normalHeight,
      width: playerWidth,
      height: normalHeight,
      velocityY: 0,
      jumping: false,
      ducking: false,
    }
    ghost = {
      x: player.x - GAME_CONFIG.GHOST_DISTANCE_BEHIND,
      y: groundY - ghostHeight,
      width: ghostWidth,
      height: ghostHeight,
    }
    shieldActive = false
    powerupActive = null
    slowTimer = 0
    frame = 0
    lastObstacle = 50
    lastPowerup = 0
    bgX = 0
    groundX = 0
    running = true
  }

  function gameLoop(time) {
    if (!running) return
    requestAnimationFrame(gameLoop)

    const delta = time - lastTime
    lastTime = time

    handleInput()
    updateGame(delta)
    draw()
  }

  function handleInput() {
    if ((keys['ArrowUp'] || keys[' ']) && !player.jumping) {
      player.jumping = true
      player.velocityY = -GAME_CONFIG.PLAYER_JUMP_VELOCITY
      // reproduzir som — leve proteção para não estourar se arquivo não carregou
      try {
        jumpSound.play()
      } catch (e) {}
      keys['ArrowUp'] = false
      keys[' '] = false
    }
    player.ducking = keys['ArrowDown'] && !player.jumping
  }

  function updateGame(delta) {
    // Atualizar pontuação (mesma lógica: 1 ponto por segundo)
    score += delta / 1000
    if (score < 0) score = 0
    scoreDisplay.textContent = Math.floor(score)

    // Aumentar velocidade com o tempo
    gameSpeed += GAME_CONFIG.GAME_SPEED_INCREASE * (delta / 16.67)

    // slowTimer (mesma unidade que antes)
    let slowFactor = 1
    if (slowTimer > 0) {
      slowTimer -= delta / 16.67
      if (slowTimer < 0) slowTimer = 0
      slowFactor = 0.5
    }

    // Power-up ativo (usa timeLeft em ms; decrementa por delta — compatível com config)
    let speedMult = 1
    if (powerupActive) {
      powerupActive.timeLeft -= delta
      if (powerupActive.timeLeft <= 0) {
        powerupActive = null
      } else if (powerupActive.type === 'speed') {
        speedMult = GAME_CONFIG.POWERUP_SPEED_BOOST_MULTIPLIER
      }
    }

    const effectiveScroll = gameSpeed * slowFactor * speedMult

    // Atualizar jogador (pulo / gravidade)
    player.height = player.ducking ? duckHeight : normalHeight
    if (!player.jumping) {
      player.y = groundY - player.height
    } else {
      player.velocityY += GAME_CONFIG.PLAYER_GRAVITY * (delta / 16.67)
      player.y += player.velocityY * (delta / 16.67)
      if (player.y >= groundY - player.height) {
        player.y = groundY - player.height
        player.jumping = false
        player.velocityY = 0
      }
    }

    // Lógica para o fantasma: manter comportamento anterior + correções
    let relativeSpeed =
      gameSpeed * (GAME_CONFIG.GHOST_SPEED_FACTOR - slowFactor * speedMult)
    // evitar que relativeSpeed cause movimento exagerado para trás (mantemos clamp similar ao original)
    relativeSpeed = Math.max(relativeSpeed, -gameSpeed * 0.1)
    ghost.x += relativeSpeed * (delta / 16.67)
    // Não permitir sumir completamente
    if (ghost.x < 0 - ghostWidth) {
      ghost.x = 0 - ghostWidth
    }

    // Fundo e chão (wrap)
    bgX -= effectiveScroll * 0.5 * (delta / 16.67)
    if (bgX <= -bgWidth) bgX += bgWidth
    groundX -= effectiveScroll * (delta / 16.67)
    if (groundX <= -groundWidth) groundX += groundWidth

    // Gerar obstáculos: mantemos spawn baseado em frame e minSpawnDist do original (para evitar spawn muito próximo com velocidade alta)
    frame += delta / 16.67
    const minSpawnDist =
      GAME_CONFIG.OBSTACLE_SPAWN_RATE_MIN +
      (gameSpeed / GAME_CONFIG.INITIAL_GAME_SPEED) * 20 // Aumenta espaço com velocidade
    if (
      frame - lastObstacle >
      Math.random() * (GAME_CONFIG.OBSTACLE_SPAWN_RATE_MAX - minSpawnDist) +
        minSpawnDist
    ) {
      const type = Math.random() < 0.5 ? 'low' : 'high'
      const obsY = type === 'low' ? groundY - lowObsHeight : highObsY
      const obsH = type === 'low' ? lowObsHeight : highObsHeight
      // Evitar overlap com último obstáculo
      const lastObs = obstacles[obstacles.length - 1]
      let spawnX = canvas.width + Math.random() * 100
      if (lastObs && spawnX - lastObs.x < obsWidth * 2) {
        spawnX += obsWidth * 2
      }
      obstacles.push({
        x: spawnX,
        y: obsY,
        width: obsWidth,
        height: obsH,
        type,
      })
      lastObstacle = frame
    }

    // Gerar power-ups: usamos chance por frame (como original) e delay mínimo (frame - lastPowerup)
    if (
      Math.random() < GAME_CONFIG.POWERUP_SPAWN_CHANCE * (delta / 16.67) &&
      frame - lastPowerup > 100
    ) {
      const type = Math.random() < 0.5 ? 'speed' : 'shield'
      const puY = groundY - normalHeight / 2 - Math.random() * 100
      let spawnX = canvas.width + Math.random() * 100
      // Evitar overlap com obstáculos
      let overlap = obstacles.some(
        (o) => Math.abs(spawnX - o.x) < powerupSize + obsWidth,
      )
      if (overlap) spawnX += powerupSize + obsWidth
      powerups.push({
        x: spawnX,
        y: puY,
        width: powerupSize,
        height: powerupSize,
        type,
      })
      lastPowerup = frame
    }

    // Atualizar posições
    obstacles.forEach((o) => (o.x -= effectiveScroll * (delta / 16.67)))
    obstacles = obstacles.filter((o) => o.x > -o.width)
    powerups.forEach((p) => (p.x -= effectiveScroll * (delta / 16.67)))
    powerups = powerups.filter((p) => p.x > -p.width)

    // Colisões com obstáculos (mesma lógica: escudo, slowTimer e penalidade de score)
    for (let i = 0; i < obstacles.length; i++) {
      if (checkCollision(player, obstacles[i])) {
        if (shieldActive) {
          shieldActive = false
        } else {
          if (slowTimer > 0) {
            // Se bater novamente enquanto lento, game over imediato
            running = false
            try {
              gameOverSound.play()
            } catch (e) {}
            endGame()
            return
          } else {
            score -= 2
            slowTimer = 90 // ~1.5s como antes
            if (score < 0) score = 0
          }
        }
        obstacles.splice(i, 1)
        break
      }
    }

    // Colisões com power-ups (mantém incrementos e efeitos, reseta slowTimer)
    for (let i = 0; i < powerups.length; i++) {
      if (checkCollision(player, powerups[i])) {
        powerupSound.play()
        score += 2
        const p = powerups[i]
        if (p.type === 'speed') {
          powerupActive = {
            type: 'speed',
            timeLeft: GAME_CONFIG.POWERUP_SPEED_BOOST_DURATION, // em ms
          }
        } else if (p.type === 'shield') {
          shieldActive = true
        }
        // Reset slowTimer ao pegar powerup (mesma lógica do seu main.js)
        slowTimer = 0
        powerups.splice(i, 1)
        break
      }
    }

    // Fim de jogo se fantasma alcançar
    if (ghost.x + ghost.width >= player.x) {
      running = false
      try {
        gameOverSound.play()
      } catch (e) {}
      endGame()
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Fundo (duas cópias para loop)
    ctx.drawImage(images.bg, bgX, 0, bgWidth, canvas.height)
    ctx.drawImage(images.bg, bgX + bgWidth, 0, bgWidth, canvas.height)

    // Chão (duas cópias)
    ctx.drawImage(
      images.ground,
      groundX,
      canvas.height - groundHeight,
      groundWidth,
      groundHeight,
    )
    ctx.drawImage(
      images.ground,
      groundX + groundWidth,
      canvas.height - groundHeight,
      groundWidth,
      groundHeight,
    )

    // Jogador (sprites conforme estado)
    let playerImg = player.jumping
      ? images.playerJump
      : player.ducking
      ? images.playerDuck
      : images.playerRun
    ctx.drawImage(playerImg, player.x, player.y, player.width, player.height)

    // Fantasma (animação simples alternando imagens)
    let ghostImg = Math.floor(frame) % 20 < 10 ? images.ghost1 : images.ghost2
    ctx.drawImage(ghostImg, ghost.x, ghost.y, ghost.width, ghost.height)

    // Obstáculos
    obstacles.forEach((o) => {
      let img = o.type === 'low' ? images.obsLow : images.obsHigh
      ctx.drawImage(img, o.x, o.y, o.width, o.height)
    })

    // Power-ups (fixos, sem piscar — com leve efeito visual)
    powerups.forEach((p) => {
      let img = p.type === 'speed' ? images.powerSpeed : images.powerShield

      // brilho radial por trás para destacar o powerup
      ctx.save()
      const rg = ctx.createRadialGradient(
        p.x + p.width / 2,
        p.y + p.height / 2,
        p.width * 0.1,
        p.x + p.width / 2,
        p.y + p.height / 2,
        Math.max(p.width, p.height),
      )
      if (p.type === 'speed') {
        rg.addColorStop(0, 'rgba(255, 235, 150, 0.9)')
        rg.addColorStop(1, 'rgba(255, 235, 150, 0)')
      } else {
        rg.addColorStop(0, 'rgba(150, 220, 255, 0.9)')
        rg.addColorStop(1, 'rgba(150, 220, 255, 0)')
      }
      ctx.fillStyle = rg
      ctx.fillRect(
        p.x - p.width * 0.5,
        p.y - p.height * 0.5,
        p.width * 2,
        p.height * 2,
      )
      // sombra extra
      ctx.shadowColor =
        p.type === 'speed' ? 'rgba(255,215,0,0.8)' : 'rgba(0,191,255,0.8)'
      ctx.shadowBlur = p.type === 'speed' ? 18 : 22
      ctx.drawImage(img, p.x, p.y, p.width, p.height)
      ctx.restore()
    })

    // Efeitos visuais

    // Efeito power-up velocidade: rastro / brilho de tela (mantém a jogabilidade)
    if (powerupActive && powerupActive.type === 'speed') {
      // leve overlay amarelado para sensação de velocidade
      ctx.save()
      // intensidade pulsante baseada no timeLeft (mais forte no início)
      const intensity = Math.min(
        0.45,
        0.25 +
          (powerupActive.timeLeft / GAME_CONFIG.POWERUP_SPEED_BOOST_DURATION) *
            0.2,
      )
      ctx.globalAlpha = intensity
      ctx.fillStyle = 'rgba(255, 200, 50, 1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.restore()

      // opcional: trail do jogador (desenhar retângulos translúcidos atrás do jogador)
      ctx.save()
      ctx.globalAlpha = 0.12
      for (let t = 0; t < 4; t++) {
        ctx.fillRect(
          player.x - (t + 1) * 10,
          player.y + t * 2,
          player.width,
          player.height,
        )
      }
      ctx.restore()
    }

    // Escudo aprimorado: gradiente + pulsação suave
    if (shieldActive) {
      const radius = Math.max(player.width, player.height) / 2 + 12
      const cx = player.x + player.width / 2
      const cy = player.y + player.height / 2

      const gradient = ctx.createRadialGradient(
        cx,
        cy,
        radius * 0.4,
        cx,
        cy,
        radius,
      )
      gradient.addColorStop(0, 'rgba(0,191,255,0.55)')
      gradient.addColorStop(1, 'rgba(0,0,255,0.15)')

      ctx.save()
      // pulsação: varia entre 0.7 e 1.1 alpha dependendo do frame
      const pulse = 0.85 + Math.sin(frame / 8) * 0.15
      ctx.globalAlpha = pulse
      ctx.fillStyle = gradient
      ctx.shadowColor = 'rgba(0,191,255,0.9)'
      ctx.shadowBlur = 18
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
      ctx.fill()

      // borda brilhante
      ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(0, 230, 255, 0.9)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, radius + 2, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.restore()
    }
  }

  function endGame() {
    // Mostra a tela imediatamente com a pontuação
    gameOverScreen.innerHTML = `
            <h2>Game Over</h2>
            <p>Sua pontuação: ${Math.floor(score)}</p>
            <h3>Carregando Top 10...</h3>
            <button id="restart-button">Tentar de Novo</button>
        `
    gameOverScreen.style.display = 'flex'

    // Configura o botão de restart imediatamente
    document.getElementById('restart-button').addEventListener('click', () => {
      location.reload() // Reinicia a página
    })

    // Envia o score e atualiza o ranking (mesma rota '/save' do seu Controller)
    fetch('save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, score: Math.floor(score) }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Falha na requisição: ' + res.status)
        }
        return res.json()
      })
      .then((data) => {
        console.log('Top scores carregados:', data) // Para depuração
        // Atualiza a tela com o top 10
        const top10Html = `
                <h3>Top 10</h3>
                <ol>
                    ${data
                      .map((s) => `<li>${s.name}: ${s.score}</li>`)
                      .join('')}
                </ol>
            `
        // Substitui o <h3> "Carregando Top 10..." pelo ranking
        const h3 = gameOverScreen.querySelector('h3')
        if (h3) h3.outerHTML = top10Html
      })
      .catch((error) => {
        console.error('Erro ao salvar/carregar score:', error)
        const h3 = gameOverScreen.querySelector('h3')
        if (h3) h3.textContent = 'Erro ao carregar Top 10: ' + error.message
      })
  }

  function checkCollision(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    )
  }
})
