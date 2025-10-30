// assets/js/Config.js
const GAME_CONFIG = {
  // Física do jogador
  PLAYER_JUMP_VELOCITY: 14,
  PLAYER_GRAVITY: 0.7,

  // Velocidade do jogo
  INITIAL_GAME_SPEED: 8,
  GAME_SPEED_INCREASE: 0.005,

  // Pontuação
  SCORE_MULTIPLIER: 2, // Aumentado: 2 pontos por segundo (era 1)

  // Fantasma perseguidor
  GHOST_DISTANCE_BEHIND: 200,
  GHOST_SPEED_FACTOR: 0.98,

  // Spawn de obstáculos
  OBSTACLE_SPAWN_RATE_MIN: 80,
  OBSTACLE_SPAWN_RATE_MAX: 150,

  // Spawn de powerups
  POWERUP_SPAWN_CHANCE: 0.0008,
  POWERUP_SPEED_BOOST_DURATION: 3000,
  POWERUP_SPEED_BOOST_MULTIPLIER: 1.5,

  // Penalidade de colisão
  COLLISION_SLOW_DURATION_NORMAL: 90,
  COLLISION_SLOW_DURATION_SPEED: 60, // Reduzido quando com powerup de velocidade (mais vantajoso)
  COLLISION_MARGIN: 4,

  // Slow factor (redução de velocidade na colisão)
  SLOW_FACTOR: 0.5,
}
