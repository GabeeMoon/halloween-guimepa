// assets/js/main.js
// main.js — Lógica do jogo + melhorias (pré-carregamento, segurança, base URL)
document.addEventListener('DOMContentLoaded', () => {
  const BASE = window.BASE_URL || ''

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
  const highObsY = groundY - normalHeight - highObsHeight + 50
  const powerupSize = 30

  // Lista de imagens com caminhos relativos ao BASE
  const imagePaths = {
    playerRun1: BASE + '/assets/sprites/personagem_correndo.png',
    playerRun2: BASE + '/assets/sprites/personagem_correndo2.png',
    playerRun3: BASE + '/assets/sprites/personagem_correndo3.png',
    playerRun4: BASE + '/assets/sprites/personagem_correndo4.png',
    playerJump: BASE + '/assets/sprites/personagem_pulando.png',
    playerDuck: BASE + '/assets/sprites/personagem_agachado.png',
    ghost1: BASE + '/assets/sprites/fantasma_correndo.png',
    ghost2: BASE + '/assets/sprites/fantasma_correndo2.png',
    obsHigh: BASE + '/assets/sprites/obstaculo_alto.png',
    obsLow: BASE + '/assets/sprites/obstaculo_baixo.png',
    bg: BASE + '/assets/sprites/fundo.png',
    ground: BASE + '/assets/sprites/chao.png',
    powerSpeed: BASE + '/assets/sprites/powerup_velocidade.png',
    powerShield: BASE + '/assets/sprites/powerup_escudo.png',
  }

  const images = {}

  function loadImage(src) {
    const img = new Image()
    img.src = src
    return img
  }

  // Pré-carrega todas as imagens e resolve quando todas carregarem (ou mesmo que algum erro ocorra)
  function preloadImages(paths) {
    const promises = []
    for (const key in paths) {
      promises.push(
        new Promise((resolve) => {
          const img = new Image()
          img.onload = () => {
            images[key] = img
            resolve({ key, ok: true })
          }
          img.onerror = () => {
            // Mesmo em erro, criamos um canvas temporário para não quebrar drawImage
            const fallback = document.createElement('canvas')
            fallback.width = 64
            fallback.height = 64
            const fctx = fallback.getContext('2d')
            fctx.fillStyle = '#ff00ff'
            fctx.fillRect(0, 0, fallback.width, fallback.height)
            images[key] = fallback
            resolve({ key, ok: false })
          }
          img.src = paths[key]
        }),
      )
    }
    return Promise.all(promises)
  }

  // Sons (mantemos caminhos via BASE)
  function safeAudio(src) {
    try {
      const a = new Audio(src)
      // Não tocar agora, só instanciar
      return a
    } catch (e) {
      return { play: () => {} }
    }
  }

  const jumpSound = safeAudio(BASE + '/assets/sounds/pulo.mp3')
  const gameOverSound = safeAudio(BASE + '/assets/sounds/game_over.mp3')
  const powerupSound = safeAudio(BASE + '/assets/sounds/powerup.mp3')

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
  let lastObstacle = 50
  let lastPowerup = 0
  let lastTime = 0
  let bgX = 0
  let groundX = 0
  let bgWidth = 800
  let groundWidth = 800
  let keys = {}

  document.addEventListener('keydown', (e) => (keys[e.key] = true))
  document.addEventListener('keyup', (e) => (keys[e.key] = false))

  // Função utilitária para escapar HTML (evita XSS ao mostrar nomes)
  function escapeHtml(str) {
    if (!str) return ''
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // Carregar imagens primeiro, depois liberar o startButton
  preloadImages(imagePaths).then(() => {
    // imagens carregadas (ou fallback criado)
    startButton.disabled = false
  })

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
      player.velocityY = -GAME_CONFIG.PLAYER_JUMP_VELOCITY // Ajustado para pulo mais baixo
      try {
        jumpSound.play()
      } catch (e) {}
      keys['ArrowUp'] = false
      keys[' '] = false
    }
    player.ducking = keys['ArrowDown'] && !player.jumping
  }

  function updateGame(delta) {
    score += delta / 1000
    if (score < 0) score = 0
    scoreDisplay.textContent = Math.floor(score)

    gameSpeed += GAME_CONFIG.GAME_SPEED_INCREASE * (delta / 16.67)

    let slowFactor = 1
    if (slowTimer > 0) {
      slowTimer -= delta / 16.67
      if (slowTimer < 0) slowTimer = 0
      slowFactor = 0.5
    }

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

    if (!player.jumping) {
      player.y = groundY - normalHeight
    } else {
      player.velocityY += GAME_CONFIG.PLAYER_GRAVITY * (delta / 16.67)
      player.y += player.velocityY * (delta / 16.67)
      if (player.y >= groundY - normalHeight) {
        player.y = groundY - normalHeight
        player.jumping = false
        player.velocityY = 0
      }
    }

    let relativeSpeed =
      gameSpeed * (GAME_CONFIG.GHOST_SPEED_FACTOR - slowFactor * speedMult)
    relativeSpeed = Math.max(relativeSpeed, -gameSpeed * 0.1)
    ghost.x += relativeSpeed * (delta / 16.67)
    if (ghost.x < 0 - ghostWidth) {
      ghost.x = 0 - ghostWidth
    }

    bgX -= effectiveScroll * 0.5 * (delta / 16.67)
    if (bgX <= -bgWidth) bgX += bgWidth
    groundX -= effectiveScroll * (delta / 16.67)
    if (groundX <= -groundWidth) groundX += groundWidth

    frame += delta / 16.67
    const minSpawnDist =
      GAME_CONFIG.OBSTACLE_SPAWN_RATE_MIN +
      (gameSpeed / GAME_CONFIG.INITIAL_GAME_SPEED) * 20
    if (
      frame - lastObstacle >
      Math.random() * (GAME_CONFIG.OBSTACLE_SPAWN_RATE_MAX - minSpawnDist) +
        minSpawnDist
    ) {
      const type = Math.random() < 0.5 ? 'low' : 'high'
      const obsY = type === 'low' ? groundY - lowObsHeight : highObsY
      const obsH = type === 'low' ? lowObsHeight : highObsHeight
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

    if (
      Math.random() < GAME_CONFIG.POWERUP_SPAWN_CHANCE * (delta / 16.67) &&
      frame - lastPowerup > 100
    ) {
      const type = Math.random() < 0.5 ? 'speed' : 'shield'
      const puY = groundY - normalHeight / 2 - Math.random() * 100
      let spawnX = canvas.width + Math.random() * 100
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

    obstacles.forEach((o) => (o.x -= effectiveScroll * (delta / 16.67)))
    obstacles = obstacles.filter((o) => o.x > -o.width)
    powerups.forEach((p) => (p.x -= effectiveScroll * (delta / 16.67)))
    powerups = powerups.filter((p) => p.x > -p.width)

    for (let i = 0; i < obstacles.length; i++) {
      if (checkCollision(player, obstacles[i])) {
        if (shieldActive) {
          shieldActive = false
        } else {
          if (slowTimer > 0) {
            running = false
            try {
              gameOverSound.play()
            } catch (e) {}
            endGame()
            return
          } else {
            score -= 2
            slowTimer = 90
            if (score < 0) score = 0
          }
        }
        obstacles.splice(i, 1)
        break
      }
    }

    for (let i = 0; i < powerups.length; i++) {
      if (checkCollision(player, powerups[i])) {
        try {
          powerupSound.play()
        } catch (e) {}
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
        slowTimer = 0
        powerups.splice(i, 1)
        break
      }
    }

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

    // Jogador com animação de corrida
    const runImages = [
      images.playerRun1,
      images.playerRun2,
      images.playerRun3,
      images.playerRun4,
    ]
    let playerImg
    if (player.jumping) {
      playerImg = images.playerJump
    } else if (player.ducking) {
      playerImg = images.playerDuck
    } else {
      const runFrameIndex = Math.floor(frame / 5) % 4 // Ciclo a cada 5 frames para animação suave
      playerImg = runImages[runFrameIndex]
    }
    ctx.drawImage(playerImg, player.x, player.y, player.width, normalHeight)

    // Fantasma
    let ghostImg = Math.floor(frame) % 20 < 10 ? images.ghost1 : images.ghost2
    ctx.drawImage(ghostImg, ghost.x, ghost.y, ghost.width, ghost.height)

    // Obstáculos
    obstacles.forEach((o) => {
      let img = o.type === 'low' ? images.obsLow : images.obsHigh
      ctx.drawImage(img, o.x, o.y, o.width, o.height)
    })

    // Power-ups com brilho
    powerups.forEach((p) => {
      let img = p.type === 'speed' ? images.powerSpeed : images.powerShield

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
      ctx.shadowColor =
        p.type === 'speed' ? 'rgba(255,215,0,0.8)' : 'rgba(0,191,255,0.8)'
      ctx.shadowBlur = p.type === 'speed' ? 18 : 22
      ctx.drawImage(img, p.x, p.y, p.width, p.height)
      ctx.restore()
    })

    // Efeito power-up velocidade
    if (powerupActive && powerupActive.type === 'speed') {
      ctx.save()
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

    // Escudo
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
      const pulse = 0.85 + Math.sin(frame / 8) * 0.15
      ctx.globalAlpha = pulse
      ctx.fillStyle = gradient
      ctx.shadowColor = 'rgba(0,191,255,0.9)'
      ctx.shadowBlur = 18
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
      ctx.fill()

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
    // Mostrar tela
    gameOverScreen.innerHTML = `
            <h2>Game Over</h2>
            <p>Sua pontuação: ${Math.floor(score)}</p>
            <h3>Carregando Top 10...</h3>
            <button id="restart-button">Tentar de Novo</button>
        `
    gameOverScreen.style.display = 'flex'

    document.getElementById('restart-button').addEventListener('click', () => {
      location.reload()
    })

    fetch((BASE || '') + '/save', {
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
        console.log('Top scores carregados:', data)
        const top10Html = `
                <h3>Top 10</h3>
                <ol>
                    ${data
                      .map(
                        (s) =>
                          `<li>${escapeHtml(s.name || 'Anonimo')}: ${Number(
                            s.score || 0,
                          )}</li>`,
                      )
                      .join('')}
                </ol>
            `
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
    let effectiveY = a.y
    let effectiveHeight = normalHeight // Padrão

    if (a.ducking) {
      // Ajusta colisão para "abaixar" sem mudar visual: move topo para baixo e reduz altura
      effectiveY = a.y + (normalHeight - duckHeight)
      effectiveHeight = duckHeight
    }

    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      effectiveY < b.y + b.height &&
      effectiveY + effectiveHeight > b.y
    )
  }
})
