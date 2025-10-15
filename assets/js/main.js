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

  // Carregar imagens
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
    powerSpeed1: loadImage('assets/sprites/powerup_velocidade.png'),
    powerSpeed2: loadImage('assets/sprites/powerup_velocidade2.png'),
    powerShield1: loadImage('assets/sprites/powerup_escudo.png'),
    powerShield2: loadImage('assets/sprites/powerup_escudo2.png'),
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
      jumpSound.play()
      keys['ArrowUp'] = false
      keys[' '] = false
    }
    player.ducking = keys['ArrowDown'] && !player.jumping
  }

  function updateGame(delta) {
    // Atualizar pontuação
    score += delta / 1000
    if (score < 0) score = 0
    scoreDisplay.textContent = Math.floor(score)

    // Aumentar velocidade
    gameSpeed += GAME_CONFIG.GAME_SPEED_INCREASE * (delta / 16.67)

    // Fator de lentidão
    let slowFactor = 1
    if (slowTimer > 0) {
      slowTimer -= delta / 16.67
      if (slowTimer < 0) slowTimer = 0
      slowFactor = 0.5
    }

    // Power-up ativo
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

    // Atualizar jogador
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

    // Lógica para o fantasma: Correção para evitar bugs (clamp posição mínima, ajuste relativeSpeed)
    let relativeSpeed =
      gameSpeed * (GAME_CONFIG.GHOST_SPEED_FACTOR - slowFactor * speedMult)
    relativeSpeed = Math.max(relativeSpeed, -gameSpeed * 0.1) // Evitar afastamento muito rápido
    ghost.x += relativeSpeed * (delta / 16.67)
    if (ghost.x < 0 - ghostWidth) {
      ghost.x = 0 - ghostWidth // Não deixar sumir completamente
    }

    // Fundo e chão
    bgX -= effectiveScroll * 0.5 * (delta / 16.67)
    if (bgX <= -bgWidth) bgX += bgWidth
    groundX -= effectiveScroll * (delta / 16.67)
    if (groundX <= -groundWidth) groundX += groundWidth

    // Gerar obstáculos: Melhoria - spawn mais espaçado, evitar overlap
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
      // Verificar se não overlap com último obstáculo
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

    // Gerar power-ups: Melhoria - spawn mais frequente, evitar overlap com obstáculos
    if (
      Math.random() < GAME_CONFIG.POWERUP_SPAWN_CHANCE * (delta / 16.67) &&
      frame - lastPowerup > 100
    ) {
      // Delay mínimo entre powerups
      const type = Math.random() < 0.5 ? 'speed' : 'shield'
      const puY = groundY - normalHeight / 2 - Math.random() * 100
      let spawnX = canvas.width + Math.random() * 100
      // Evitar overlap com obstáculos
      let overlap = obstacles.some(
        (o) => Math.abs(spawnX - o.x) < powerupSize + obsWidth,
      )
      if (overlap) {
        spawnX += powerupSize + obsWidth
      }
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

    // Colisões com obstáculos
    for (let i = 0; i < obstacles.length; i++) {
      if (checkCollision(player, obstacles[i])) {
        if (shieldActive) {
          shieldActive = false
        } else {
          if (slowTimer > 0) {
            // Se bater novamente enquanto lento, game over imediato
            running = false
            gameOverSound.play()
            endGame()
            return
          } else {
            score -= 2
            slowTimer = 90 // 1.5 segundos
          }
        }
        obstacles.splice(i, 1)
        break
      }
    }

    // Colisões com power-ups
    for (let i = 0; i < powerups.length; i++) {
      if (checkCollision(player, powerups[i])) {
        powerupSound.play()
        score += 2
        const p = powerups[i]
        if (p.type === 'speed') {
          powerupActive = {
            type: 'speed',
            timeLeft: GAME_CONFIG.POWERUP_SPEED_BOOST_DURATION,
          }
        } else if (p.type === 'shield') {
          shieldActive = true
        }
        // Reset slowTimer ao pegar powerup
        slowTimer = 0
        powerups.splice(i, 1)
        break
      }
    }

    // Fim de jogo se fantasma alcançar
    if (ghost.x + ghost.width >= player.x) {
      running = false
      gameOverSound.play()
      endGame()
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Fundo
    ctx.drawImage(images.bg, bgX, 0, bgWidth, canvas.height)
    ctx.drawImage(images.bg, bgX + bgWidth, 0, bgWidth, canvas.height)

    // Chão
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

    // Jogador
    let playerImg = player.jumping
      ? images.playerJump
      : player.ducking
      ? images.playerDuck
      : images.playerRun
    ctx.drawImage(playerImg, player.x, player.y, player.width, player.height)

    // Fantasma
    let ghostImg = Math.floor(frame) % 20 < 10 ? images.ghost1 : images.ghost2
    ctx.drawImage(ghostImg, ghost.x, ghost.y, ghost.width, ghost.height)

    // Obstáculos
    obstacles.forEach((o) => {
      let img = o.type === 'low' ? images.obsLow : images.obsHigh
      ctx.drawImage(img, o.x, o.y, o.width, o.height)
    })

    // Power-ups
    powerups.forEach((p) => {
      let img =
        p.type === 'speed'
          ? Math.floor(frame) % 20 < 10
            ? images.powerSpeed1
            : images.powerSpeed2
          : Math.floor(frame) % 20 < 10
          ? images.powerShield1
          : images.powerShield2
      ctx.drawImage(img, p.x, p.y, p.width, p.height)
    })

    // Efeitos visuais
    if (powerupActive && powerupActive.type === 'speed') {
      ctx.globalAlpha = 0.5
      ctx.fillStyle = 'yellow'
      ctx.fillRect(player.x, player.y, player.width, player.height)
      ctx.globalAlpha = 1
    }
    if (shieldActive) {
      ctx.beginPath()
      ctx.arc(
        player.x + player.width / 2,
        player.y + player.height / 2,
        Math.max(player.width, player.height) / 2 + 10,
        0,
        2 * Math.PI,
      )
      ctx.strokeStyle = 'blue'
      ctx.lineWidth = 2
      ctx.stroke()
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

    // Envia o score e atualiza o ranking
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
        gameOverScreen.querySelector('h3').outerHTML = top10Html
      })
      .catch((error) => {
        console.error('Erro ao salvar/carregar score:', error)
        gameOverScreen.querySelector('h3').textContent =
          'Erro ao carregar Top 10: ' + error.message
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
