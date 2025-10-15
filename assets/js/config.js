// Arquivo: config.js
const GAME_CONFIG = {
  PLAYER_JUMP_VELOCITY: 18,
  PLAYER_GRAVITY: 0.8,
  INITIAL_GAME_SPEED: 8,
  GAME_SPEED_INCREASE: 0.001,

  GHOST_DISTANCE_BEHIND: 150, // Distância inicial em pixels que o fantasma começa atrás do jogador
  GHOST_SPEED_FACTOR: 0.95, // Fator de velocidade do fantasma em relação à gameSpeed (menor que 1 para ser mais lento)

  OBSTACLE_SPAWN_RATE_MIN: 50, // Mínimo de frames para um novo obstáculo
  OBSTACLE_SPAWN_RATE_MAX: 120, // Máximo de frames para um novo obstáculo

  POWERUP_SPAWN_CHANCE: 0.01, // Chance de um power-up aparecer a cada frame (aumentado para mais power-ups)

  POWERUP_SPEED_BOOST_MULTIPLIER: 1.5, // Multiplicador da velocidade do jogo
  POWERUP_SPEED_BOOST_DURATION: 3000, // Duração em milissegundos (3 segundos)
}
