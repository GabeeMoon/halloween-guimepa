// assets/js/main.js
document.addEventListener('DOMContentLoaded', () => {
  const BASE = window.BASE_URL || ''

  // ===== CANVAS E CONTEXTO =====
  const canvas = document.getElementById('game-canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 800
  canvas.height = 400

  // ===== CONSTANTES DO JOGO (Dimensões e Posições) =====
  const GROUND_HEIGHT = 50
  const GROUND_Y = canvas.height
  const PLAYER_NORMAL_HEIGHT = 100
  const PLAYER_DUCK_HEIGHT = 50
  const PLAYER_WIDTH = 50
  const PLAYER_X = 200

  const GHOST_WIDTH = 50
  const GHOST_HEIGHT = 100

  // Obstáculos (dimensões e posições calculadas corretamente)
  const OBS_LOW_WIDTH = 40
  const OBS_LOW_HEIGHT = 50
  const OBS_LOW_Y = GROUND_Y - OBS_LOW_HEIGHT

  const OBS_HIGH_WIDTH = 40
  const OBS_HIGH_HEIGHT = 150
  const OBS_HIGH_Y = GROUND_Y - PLAYER_NORMAL_HEIGHT - OBS_HIGH_HEIGHT + 50

  const OBS_MID_WIDTH = 50
  const OBS_MID_HEIGHT = 90
  const OBS_MID_Y = GROUND_Y - OBS_MID_HEIGHT - 20

  const POWERUP_SIZE = 30

  const BG_WIDTH = 800
  const GROUND_WIDTH = 800

  // ===== ESTADO VISUAL PÓS-GAMEOVER (NOVO: com halloweenFilterProgress) =====
  let pumpkinParticles = []
  let halloweenFilterProgress = 0
  let endEffectsRunning = false

  // ===== SPRITES =====
  const imagePaths = {
    playerRun1: `${BASE}/assets/sprites/personagem_correndo.png`,
    playerRun2: `${BASE}/assets/sprites/personagem_correndo2.png`,
    playerJump: `${BASE}/assets/sprites/personagem_pulando.png`,
    playerDuck: `${BASE}/assets/sprites/personagem_agachado.png`,
    ghost1: `${BASE}/assets/sprites/fantasma_correndo.png`,
    ghost2: `${BASE}/assets/sprites/fantasma_correndo2.png`,
    obsHigh: `${BASE}/assets/sprites/obstaculo_alto.png`,
    obsLow: `${BASE}/assets/sprites/obstaculo_baixo.png`,
    obsMid1: `${BASE}/assets/sprites/obstaculo_medio.png`,
    obsMid2: `${BASE}/assets/sprites/obstaculo_medio2.png`,
    bg: `${BASE}/assets/sprites/fundo.png`,
    ground: `${BASE}/assets/sprites/chao.png`,
    powerSpeed: `${BASE}/assets/sprites/powerup_velocidade.png`,
    powerShield: `${BASE}/assets/sprites/powerup_escudo.png`,
  }

  const imageSizes = {
    obsLow: { w: OBS_LOW_WIDTH, h: OBS_LOW_HEIGHT },
    obsHigh: { w: OBS_HIGH_WIDTH, h: OBS_HIGH_HEIGHT },
    obsMid1: { w: OBS_MID_WIDTH, h: OBS_MID_HEIGHT },
    obsMid2: { w: OBS_MID_WIDTH, h: OBS_MID_HEIGHT },
  }

  const images = {}
  const preloadImages = (paths) =>
    Promise.all(
      Object.entries(paths).map(
        ([key, src]) =>
          new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
              images[key] = img
              resolve({ key, ok: true })
            }
            img.onerror = () => {
              const size = imageSizes[key] || { w: 64, h: 64 }
              const fallback = document.createElement('canvas')
              fallback.width = size.w
              fallback.height = size.h
              const fctx = fallback.getContext('2d')
              fctx.fillStyle = '#666'
              fctx.fillRect(0, 0, fallback.width, fallback.height)
              fctx.strokeStyle = '#888'
              fctx.lineWidth = 2
              fctx.strokeRect(0, 0, fallback.width, fallback.height)
              images[key] = fallback
              resolve({ key, ok: false })
            }
            img.src = src
          }),
      ),
    )

  // ===== ÁUDIO =====
  const safeAudio = (src) => {
    try {
      return new Audio(src)
    } catch {
      return { play: () => {}, pause: () => {}, currentTime: 0 }
    }
  }

  const jumpSound = safeAudio(`${BASE}/assets/sounds/pulo.mp3`)
  const gameOverSound = safeAudio(`${BASE}/assets/sounds/game_over.mp3`)
  const powerupSound = safeAudio(`${BASE}/assets/sounds/powerup.mp3`)

  // NOVO: Som alternativo de game over (1 em 15)
  const gameOverAltSound = safeAudio(`${BASE}/assets/sounds/game_over_alt.mp3`)

  // NOVA: Música de fundo (loop durante o jogo)
  const bgMusic = safeAudio(`${BASE}/assets/sounds/background.mp3`)
  bgMusic.loop = true

  // ===== Função de game over com sorteio 1/15 =====
  const playGameOverSound = () => {
    try {
      try {
        bgMusic.pause()
      } catch {}
      const useAlt = Math.floor(Math.random() * 15) === 0 // 1 em 15
      const s = useAlt ? gameOverAltSound : gameOverSound
      s.currentTime = 0
      s.play()
    } catch {}
  }

  // ===== DOM =====
  const introScreen = document.getElementById('intro-screen')
  const introContinue = document.getElementById('intro-continue')
  const startScreen = document.getElementById('start-screen')
  const playerNameInput = document.getElementById('player-name')
  const startButton = document.getElementById('start-button')
  const gameOverScreen = document.getElementById('game-over-screen')
  const scoreDisplay = document.getElementById('score-display')

  // ===== ESTADO DO JOGO =====
  playerNameInput.value = localStorage.getItem('playerName') || ''
  let playerName = playerNameInput.value.trim() || ''
  let running = false
  let paused = false
  let score = 0
  let gameSpeed = GAME_CONFIG.INITIAL_GAME_SPEED
  let obstacles = []
  let powerups = []

  let player = {
    x: PLAYER_X,
    y: GROUND_Y - PLAYER_NORMAL_HEIGHT,
    width: PLAYER_WIDTH,
    height: PLAYER_NORMAL_HEIGHT,
    velocityY: 0,
    jumping: false,
    ducking: false,
  }

  let ghost = {
    x: PLAYER_X - GAME_CONFIG.GHOST_DISTANCE_BEHIND,
    y: GROUND_Y - GHOST_HEIGHT,
    width: GHOST_WIDTH,
    height: GHOST_HEIGHT,
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
  let finalBgX = 0
  let finalGroundX = 0

  // NOVO: trava de pulo para impedir pulo contínuo
  let jumpLock = false

  const keys = {}
  document.addEventListener('keydown', (e) => (keys[e.key] = true))
  document.addEventListener('keyup', (e) => (keys[e.key] = false))

  const escapeHtml = (str = '') =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

  // ===== INICIALIZAÇÃO =====
  preloadImages(imagePaths).then(() => {
    startButton.disabled = false
  })

  introScreen.style.display = 'flex'
  startScreen.style.display = 'none'
  introContinue?.addEventListener('click', () => {
    introScreen.style.display = 'none'
    startScreen.style.display = 'flex'
    playerNameInput.focus()
  })

  startButton.addEventListener('click', () => {
    playerName = playerNameInput.value.trim() || 'Anonimo'
    localStorage.setItem('playerName', playerName)
    startScreen.style.display = 'none'
    playerNameInput.blur()
    initGame()
    lastTime = performance.now()
    requestAnimationFrame(gameLoop)
  })

  const initGame = () => {
    score = 0
    gameSpeed = GAME_CONFIG.INITIAL_GAME_SPEED
    obstacles = []
    powerups = []
    player = {
      x: PLAYER_X,
      y: GROUND_Y - PLAYER_NORMAL_HEIGHT,
      width: PLAYER_WIDTH,
      height: PLAYER_NORMAL_HEIGHT,
      velocityY: 0,
      jumping: false,
      ducking: false,
    }
    ghost = {
      x: PLAYER_X - GAME_CONFIG.GHOST_DISTANCE_BEHIND,
      y: GROUND_Y - GHOST_HEIGHT,
      width: GHOST_WIDTH,
      height: GHOST_HEIGHT,
    }
    shieldActive = false
    powerupActive = null
    slowTimer = 0
    frame = 0
    lastObstacle = 50
    lastPowerup = 0
    bgX = 0
    groundX = 0
    pumpkinParticles = []
    halloweenFilterProgress = 0 // NOVO: Reset do filtro
    endEffectsRunning = false
    paused = false
    running = true
    jumpLock = false // reseta trava

    // música de fundo
    try {
      bgMusic.currentTime = 0
      bgMusic.play()
    } catch {}
  }

  // ===== PAUSA POR VISIBILIDADE =====
  const pauseByVisibility = (on) => {
    if (on) {
      paused = true
      try {
        bgMusic.pause()
      } catch {}
    } else {
      lastTime = performance.now()
      if (running) {
        paused = false
        try {
          bgMusic.play()
        } catch {}
        requestAnimationFrame(gameLoop)
      }
    }
  }

  document.addEventListener('visibilitychange', () =>
    pauseByVisibility(document.hidden),
  )
  window.addEventListener('blur', () => pauseByVisibility(true))
  window.addEventListener('focus', () => pauseByVisibility(false))

  // ===== GAME LOOP =====
  const gameLoop = (time) => {
    if (!running || paused) return
    requestAnimationFrame(gameLoop)

    let delta = time - lastTime
    if (delta > 120) {
      lastTime = time
      return
    }
    lastTime = time

    handleInput()
    updateGame(delta)
    draw()
  }

  const handleInput = () => {
    const jumpKeyDown = !!(keys['ArrowUp'] || keys[' '])
    const crouchKeyDown = !!keys['ArrowDown']

    // Pula apenas quando a tecla vai de solta -> pressionada (com jumpLock)
    if (jumpKeyDown && !jumpLock && !player.jumping) {
      player.jumping = true

      // PULO BAIXO SOMENTE SE A TECLA DE AGACHAR ESTIVER PRESSIONADA AGORA
      const isLowJump = crouchKeyDown
      player.velocityY =
        -GAME_CONFIG.PLAYER_JUMP_VELOCITY * (isLowJump ? 0.7 : 1)

      try {
        jumpSound.currentTime = 0
        jumpSound.play()
      } catch {}
      jumpLock = true
    }

    // Libera a trava quando soltar a tecla de pulo
    if (!jumpKeyDown) {
      jumpLock = false
    }

    // Estado de agachado: só no chão
    player.ducking = crouchKeyDown && !player.jumping
  }

  const updateGame = (delta) => {
    // Pontuação
    score = Math.max(score + (delta / 1000) * GAME_CONFIG.SCORE_MULTIPLIER, 0)
    scoreDisplay.textContent = Math.floor(score)
    gameSpeed += GAME_CONFIG.GAME_SPEED_INCREASE * (delta / 16.67)

    const slowFactor =
      slowTimer > 0
        ? ((slowTimer -= delta / 16.67),
          (slowTimer = Math.max(slowTimer, 0)),
          GAME_CONFIG.SLOW_FACTOR)
        : 1

    const speedMult =
      powerupActive?.type === 'speed'
        ? ((powerupActive.timeLeft -= delta),
          powerupActive.timeLeft <= 0 && (powerupActive = null),
          GAME_CONFIG.POWERUP_SPEED_BOOST_MULTIPLIER)
        : 1

    const effectiveScroll = gameSpeed * slowFactor * speedMult

    // Física do jogador
    if (!player.jumping) {
      player.y = GROUND_Y - PLAYER_NORMAL_HEIGHT
      player.velocityY = 0
    } else {
      player.velocityY += GAME_CONFIG.PLAYER_GRAVITY * (delta / 16.67)
      player.y += player.velocityY * (delta / 16.67)
      if (player.y >= GROUND_Y - PLAYER_NORMAL_HEIGHT) {
        player.y = GROUND_Y - PLAYER_NORMAL_HEIGHT
        player.jumping = false
        player.velocityY = 0
      }
    }

    // Fantasma
    let relativeSpeed =
      gameSpeed * (GAME_CONFIG.GHOST_SPEED_FACTOR - slowFactor * speedMult)
    relativeSpeed = Math.max(relativeSpeed, -gameSpeed * 0.1)
    ghost.x += relativeSpeed * (delta / 16.67)
    if (ghost.x < -GHOST_WIDTH) ghost.x = -GHOST_WIDTH

    // Parallax
    bgX -= effectiveScroll * 0.5 * (delta / 16.67)
    if (bgX <= -BG_WIDTH) bgX += BG_WIDTH
    groundX -= effectiveScroll * (delta / 16.67)
    if (groundX <= -GROUND_WIDTH) groundX += GROUND_WIDTH

    frame += delta / 16.67

    // Spawn de obstáculos
    const minSpawnDist =
      GAME_CONFIG.OBSTACLE_SPAWN_RATE_MIN +
      (gameSpeed / GAME_CONFIG.INITIAL_GAME_SPEED) * 20
    if (
      frame - lastObstacle >
      Math.random() * (GAME_CONFIG.OBSTACLE_SPAWN_RATE_MAX - minSpawnDist) +
        minSpawnDist
    ) {
      const pool = ['low', 'high', 'mid', 'low', 'high', 'mid', 'low']
      let type = pool[Math.floor(Math.random() * pool.length)]

      const lastObs = obstacles.at(-1)
      if (lastObs && lastObs.type === 'mid' && type === 'mid') {
        type = Math.random() < 0.5 ? 'low' : 'high'
      }

      let obsY, obsH, obsW
      if (type === 'low') {
        obsY = OBS_LOW_Y
        obsH = OBS_LOW_HEIGHT
        obsW = OBS_LOW_WIDTH
      } else if (type === 'high') {
        obsY = OBS_HIGH_Y
        obsH = OBS_HIGH_HEIGHT
        obsW = OBS_HIGH_WIDTH
      } else {
        obsY = OBS_MID_Y
        obsH = OBS_MID_HEIGHT
        obsW = OBS_MID_WIDTH
      }

      let spawnX = canvas.width + Math.random() * 100
      if (lastObs && spawnX - lastObs.x < obsW * 2.5) spawnX += obsW * 2.5

      obstacles.push({ x: spawnX, y: obsY, width: obsW, height: obsH, type })
      lastObstacle = frame
    }

    // Spawn de powerups
    if (
      Math.random() < GAME_CONFIG.POWERUP_SPAWN_CHANCE * (delta / 16.67) &&
      frame - lastPowerup > 100
    ) {
      const type = Math.random() < 0.5 ? 'speed' : 'shield'
      const puY = GROUND_Y - PLAYER_NORMAL_HEIGHT / 2 - Math.random() * 100
      let spawnX = canvas.width + Math.random() * 100
      if (
        obstacles.some(
          (o) => Math.abs(spawnX - o.x) < POWERUP_SIZE + o.width + 20,
        )
      )
        spawnX += POWERUP_SIZE + 60
      powerups.push({
        x: spawnX,
        y: puY,
        width: POWERUP_SIZE,
        height: POWERUP_SIZE,
        type,
      })
      lastPowerup = frame
    }

    // Mover e limpar
    obstacles.forEach((o) => (o.x -= effectiveScroll * (delta / 16.67)))
    obstacles = obstacles.filter((o) => o.x > -o.width - 50)
    powerups.forEach((p) => (p.x -= effectiveScroll * (delta / 16.67)))
    powerups = powerups.filter((p) => p.x > -p.width - 50)

    // Colisões com obstáculos
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i]
      if (checkCollisionByType(player, o)) {
        if (shieldActive) {
          shieldActive = false
        } else {
          if (slowTimer > 0) {
            running = false
            playGameOverSound()
            endGame()
            return
          } else {
            if (powerupActive?.type === 'speed') {
              powerupActive = null
              slowTimer = GAME_CONFIG.COLLISION_SLOW_DURATION_SPEED
            } else {
              slowTimer = GAME_CONFIG.COLLISION_SLOW_DURATION_NORMAL
            }
            score = Math.max(score - 2, 0)
          }
        }
        obstacles.splice(i, 1)
        break
      }
    }

    // Coleta de powerups
    for (let i = 0; i < powerups.length; i++) {
      if (checkCollision(player, powerups[i])) {
        try {
          powerupSound.currentTime = 0
          powerupSound.play()
        } catch {}
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

    // Game over por fantasma
    if (ghost.x + ghost.width >= player.x) {
      running = false
      playGameOverSound()
      endGame()
    }
  }

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Pós-gameover
    if (!running && endEffectsRunning) {
      ctx.drawImage(images.bg, finalBgX, 0, BG_WIDTH, canvas.height)
      ctx.drawImage(images.bg, finalBgX + BG_WIDTH, 0, BG_WIDTH, canvas.height)
      ctx.drawImage(
        images.ground,
        finalGroundX,
        canvas.height - GROUND_HEIGHT,
        GROUND_WIDTH,
        GROUND_HEIGHT,
      )
      ctx.drawImage(
        images.ground,
        finalGroundX + GROUND_WIDTH,
        canvas.height - GROUND_HEIGHT,
        GROUND_WIDTH,
        GROUND_HEIGHT,
      )

      if (pumpkinParticles.length) {
        pumpkinParticles.forEach((p) => {
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot)
          ctx.globalAlpha = p.alpha
          ctx.beginPath()
          ctx.fillStyle = `rgba(255, ${120 + Math.floor(p.size)}, 0, 1)`
          ctx.ellipse(0, 0, p.size, p.size * 0.8, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = 'rgba(60,40,0,1)'
          ctx.fillRect(
            -p.size * 0.1,
            -p.size * 0.9,
            p.size * 0.2,
            p.size * 0.25,
          )
          ctx.strokeStyle = 'rgba(160,80,0,0.6)'
          ctx.lineWidth = Math.max(1, p.size * 0.08)
          ctx.beginPath()
          ctx.moveTo(-p.size * 0.3, -p.size * 0.1)
          ctx.quadraticCurveTo(0, -p.size * 0.15, 0, 0)
          ctx.stroke()
          ctx.restore()
        })
      }

      return
    }

    // Jogo ativo
    ctx.drawImage(images.bg, bgX, 0, BG_WIDTH, canvas.height)
    ctx.drawImage(images.bg, bgX + BG_WIDTH, 0, BG_WIDTH, canvas.height)
    ctx.drawImage(
      images.ground,
      groundX,
      canvas.height - GROUND_HEIGHT,
      GROUND_WIDTH,
      GROUND_HEIGHT,
    )
    ctx.drawImage(
      images.ground,
      groundX + GROUND_WIDTH,
      canvas.height - GROUND_HEIGHT,
      GROUND_WIDTH,
      GROUND_HEIGHT,
    )

    const runImages = [images.playerRun1, images.playerRun2]
    const playerImg = player.jumping
      ? images.playerJump
      : player.ducking
      ? images.playerDuck
      : runImages[Math.floor(frame / 5) % 2]
    ctx.drawImage(
      playerImg,
      player.x,
      player.y,
      player.width,
      PLAYER_NORMAL_HEIGHT,
    )

    const ghostImg = Math.floor(frame) % 20 < 10 ? images.ghost1 : images.ghost2
    ctx.drawImage(ghostImg, ghost.x, ghost.y, ghost.width, ghost.height)

    obstacles.forEach((o) => {
      let img
      if (o.type === 'low') {
        img = images.obsLow
        ctx.drawImage(img, o.x, o.y, o.width, o.height)
      } else if (o.type === 'high') {
        img = images.obsHigh
        ctx.drawImage(img, o.x, o.y, o.width, o.height)
      } else if (o.type === 'mid') {
        img = Math.floor(frame / 10) % 2 === 0 ? images.obsMid1 : images.obsMid2
        ctx.save()
        ctx.shadowColor = 'rgba(255, 80, 80, 0.9)'
        ctx.shadowBlur = Math.max(o.width, o.height) * 0.5
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        ctx.drawImage(img, o.x, o.y, o.width, o.height)
        ctx.restore()
      }
    })

    powerups.forEach((p) => {
      const img = p.type === 'speed' ? images.powerSpeed : images.powerShield
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
        rg.addColorStop(0, 'rgba(255,235,150,0.9)')
        rg.addColorStop(1, 'rgba(255,235,150,0)')
      } else {
        rg.addColorStop(0, 'rgba(150,220,255,0.9)')
        rg.addColorStop(1, 'rgba(150,220,255,0)')
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

    if (powerupActive?.type === 'speed') {
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
      for (let t = 0; t < 4; t++)
        ctx.fillRect(
          player.x - (t + 1) * 10,
          player.y + t * 2,
          player.width,
          player.height,
        )
      ctx.restore()
    }

    if (shieldActive) {
      const radius = Math.max(player.width, PLAYER_NORMAL_HEIGHT) / 2 + 12
      const cx = player.x + player.width / 2
      const cy = player.y + PLAYER_NORMAL_HEIGHT / 2
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

  // ===== COLISÃO =====
  const checkCollision = (a, b) => {
    const margin = GAME_CONFIG.COLLISION_MARGIN
    let effectiveY = a.y
    let effectiveHeight = PLAYER_NORMAL_HEIGHT
    if (a.ducking) {
      effectiveY = a.y + (PLAYER_NORMAL_HEIGHT - PLAYER_DUCK_HEIGHT)
      effectiveHeight = PLAYER_DUCK_HEIGHT
    }
    return (
      a.x + margin < b.x + b.width - margin &&
      a.x + a.width - margin > b.x + margin &&
      effectiveY + margin < b.y + b.height - margin &&
      effectiveY + effectiveHeight - margin > b.y + margin
    )
  }

  const checkCollisionByType = (a, b) => {
    const margin = GAME_CONFIG.COLLISION_MARGIN
    let effectiveY = a.y
    let effectiveHeight = PLAYER_NORMAL_HEIGHT
    if (b.type !== 'mid' && a.ducking) {
      effectiveY = a.y + (PLAYER_NORMAL_HEIGHT - PLAYER_DUCK_HEIGHT)
      effectiveHeight = PLAYER_DUCK_HEIGHT
    }
    return (
      a.x + margin < b.x + b.width - margin &&
      a.x + a.width - margin > b.x + margin &&
      effectiveY + margin < b.y + b.height - margin &&
      effectiveY + effectiveHeight - margin > b.y + margin
    )
  }

  // ===== EFEITOS DE PARTÍCULAS =====
  const spawnPumpkin = () => {
    pumpkinParticles.push({
      x: Math.random() * canvas.width,
      y: canvas.height + (10 + Math.random() * 80),
      size: 6 + Math.random() * 18,
      speedY: 0.6 + Math.random() * 2.2,
      alpha: 0.9 + Math.random() * 0.15,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.06,
      life: 200 + Math.random() * 200,
    })
  }

  const startEndEffectsLoop = () => {
    if (endEffectsRunning) return
    endEffectsRunning = true

    const step = () => {
      if (!endEffectsRunning) return

      draw()

      halloweenFilterProgress = Math.min(1, halloweenFilterProgress + 0.01)
      ctx.save()
      ctx.fillStyle = `rgba(10, 6, 12, ${0.55 * halloweenFilterProgress})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = `rgba(255, 100, 0, ${0.18 * halloweenFilterProgress})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.restore()

      if (pumpkinParticles.length < 80 && Math.random() < 0.5) {
        spawnPumpkin()
      }

      pumpkinParticles.forEach((p) => {
        p.y -= p.speedY
        p.x += Math.sin(p.life * 0.05) * 0.5
        p.rot += p.rotSpeed
        p.alpha -= 0.0025
        p.life -= 1
      })
      pumpkinParticles = pumpkinParticles.filter(
        (p) => p.alpha > 0 && p.life > 0,
      )

      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  // ===== RANKING =====
  const renderLeaderboardTableAll = (data, playerNameToHighlight = '') => {
    const tbody = document.querySelector('#leaderboard-table tbody')
    if (!tbody) return
    tbody.innerHTML = ''

    const sorted = Array.isArray(data)
      ? [...data].sort((a, b) => (b.score || 0) - (a.score || 0))
      : []
    sorted.forEach((item, i) => {
      const pos = i + 1
      const isTop4 = pos <= 4
      const isPlayer =
        (item.name || '').trim().toLowerCase() ===
        playerNameToHighlight.trim().toLowerCase()
      const badge = isTop4 ? ['🥇', '🥈', '🥉', '🏅'][pos - 1] : `${pos}.`
      const tr = document.createElement('tr')
      if (isTop4) tr.classList.add('top4')
      if (isPlayer) tr.classList.add('highlight')
      tr.innerHTML = `<td colspan="3" class="inline-ranking">${badge}${escapeHtml(
        item.name || 'Anonimo',
      )} ${Number(item.score || 0)}</td>`
      tbody.appendChild(tr)
    })
  }

  const renderRankingInGameOver = (data, playerNameToHighlight = '') => {
    const container = document.getElementById('ranking-container')
    if (!container) return

    const sorted = Array.isArray(data)
      ? [...data].sort((a, b) => (b.score || 0) - (a.score || 0))
      : []
    const rows = sorted
      .map((item, i) => {
        const pos = i + 1
        const isTop4 = pos <= 4
        const isPlayer =
          (item.name || '').trim().toLowerCase() ===
          playerNameToHighlight.trim().toLowerCase()
        const badge = isTop4 ? ['🥇', '🥈', '🥉', '🏅'][pos - 1] : `${pos}.`
        return `<tr class="${isTop4 ? 'top4' : ''} ${
          isPlayer ? 'highlight' : ''
        }"><td colspan="3" class="inline-ranking">${badge}${escapeHtml(
          item.name || 'Anonimo',
        )} ${Number(item.score || 0)}</td></tr>`
      })
      .join('')

    container.innerHTML = `
      <div class="leaderboard" style="width: 320px;">
        <table style="width:100%; border-collapse: collapse;">
          <thead><tr><th colspan="3">Ranking</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `
  }

  const showPersonalBest = (data, name) => {
    const player = Array.isArray(data)
      ? data.find(
          (d) =>
            (d.name || '').trim().toLowerCase() === name.trim().toLowerCase(),
        )
      : null
    const best = player ? Number(player.score || 0) : 0

    document.getElementById('personal-best')?.remove()
    const box = document.createElement('div')
    box.id = 'personal-best'
    box.style.cssText =
      'margin:7px 0;padding:6px 14px;background:#ffebeb;color:#a00;border-radius:8px;font-size:1em;'
    box.textContent = `Seu Recorde: ${best}`
    gameOverScreen.prepend(box)
  }

  const endGame = () => {
    finalBgX = bgX
    finalGroundX = groundX

    try {
      bgMusic.pause()
    } catch {}

    gameOverScreen.innerHTML = `
      <h2>Game Over</h2>
      <p>Sua pontuação: ${Math.floor(score)}</p>
      <h3 id="saving-text">Salvando e carregando Ranking...</h3>
      <div id="ranking-container" style="width:100%; display:flex; justify-content:center; margin-top:10px;"></div>
      <button id="restart-button" style="margin-top:12px;">Tentar de Novo</button>
    `
    gameOverScreen.style.display = 'flex'

    document.getElementById('restart-button')?.addEventListener('click', () => {
      endEffectsRunning = false
      halloweenFilterProgress = 0
      pumpkinParticles = []
      initGame()
      gameOverScreen.style.display = 'none'
      lastTime = performance.now()
      running = true
      requestAnimationFrame(gameLoop)
    })

    fetch(`${BASE || ''}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, score: Math.floor(score) }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Falha na requisição: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        renderLeaderboardTableAll(data, playerName)
        renderRankingInGameOver(data, playerName)
        showPersonalBest(data, playerName)
        const savingText = document.getElementById('saving-text')
        if (savingText) savingText.textContent = ''
      })
      .catch((err) => {
        const h3 = gameOverScreen.querySelector('h3')
        if (h3) h3.textContent = `Erro ao carregar Ranking: ${err.message}`
      })

    for (let i = 0; i < 18; i++) spawnPumpkin()
    startEndEffectsLoop()
  }
}
)
