<?php
require_once(__DIR__ . '/../models/Leaderboard.php');

class GameController
{
  private $leaderboard;

  public function __construct()
  {
    $this->leaderboard = new Leaderboard();
  }

  public function index()
  {
    $topScores = $this->leaderboard->getTopScores();
    require(__DIR__ . '/../views/game.php');
  }

  public function save()
  {
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
      http_response_code(405);
      echo json_encode(['error' => 'Método não permitido']);
      return;
    }

    $raw = file_get_contents('php://input');
    if ($raw === false) {
      http_response_code(400);
      echo json_encode(['error' => 'Corpo da requisição vazio']);
      return;
    }

    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
      http_response_code(400);
      echo json_encode(['error' => 'JSON inválido: ' . json_last_error_msg()]);
      return;
    }

    // Sanitização e validação do nome
    $playerName = trim($data['playerName'] ?? 'Anônimo');
    $playerName = strip_tags($playerName);  // Remove HTML/JS
    $playerName = htmlspecialchars($playerName, ENT_QUOTES, 'UTF-8');  // Escapa especial chars
    $playerName = preg_replace('/[^\p{L}\p{N}\s\-_.]/u', '', $playerName);  // Só letras, números, espaços, -, _, . (Unicode-safe)
    $playerName = substr($playerName, 0, 50);  // Limite maior para nomes reais
    if (empty($playerName)) {
      $playerName = 'Anônimo';
    }

    // Validação do score
    $score = (int)($data['score'] ?? 0);
    if ($score < 0) {
      http_response_code(400);
      $this->logSecurity('Negative score attempt: ' . $score . ' by ' . $playerName);
      echo json_encode(['error' => 'Pontuação inválida (negativa)']);
      return;
    }
    if ($score == 0) {
      http_response_code(400);
      echo json_encode(['error' => 'Pontuação inválida (zero)']);
      return;
    }

    // Limite máximo realista (baseado em jogo: ~2pts/s * 2500s = 5000, com boosts)
    define('MAX_SCORE', 500);
    if ($score > MAX_SCORE) {
      http_response_code(400);
      $this->logSecurity('High score cheat attempt: ' . $score . ' by ' . $playerName . ' (max allowed: ' . MAX_SCORE . ')');
      echo json_encode(['error' => 'Pontuação inválida (excede limite máximo: ' . MAX_SCORE . ')']);
      return;
    }

    // Rate limiting por IP (1 save a cada 10s)
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $rateFile = __DIR__ . '/../../data/rate_locks.json';
    $locks = file_exists($rateFile) ? json_decode(file_get_contents($rateFile), true) : [];
    if (isset($locks[$ip]) && (time() - $locks[$ip] < 1)) {
      http_response_code(429);
      echo json_encode(['error' => 'Muitas tentativas. Aguarde 10s.']);
      return;
    }
    $locks[$ip] = time();
    file_put_contents($rateFile, json_encode($locks, JSON_PRETTY_PRINT));

    try {
      $this->leaderboard->saveScore($playerName, $score);
      echo json_encode($this->leaderboard->getTopScores());
    } catch (Exception $e) {
      http_response_code(500);
      $this->logSecurity('Save error: ' . $e->getMessage() . ' by ' . $playerName);
      echo json_encode(['error' => 'Erro ao salvar pontuação: ' . $e->getMessage()]);
    }
  }

  // Método auxiliar para log de segurança
  private function logSecurity($message)
  {
    $logFile = __DIR__ . '/../../data/security.log';
    $logEntry = date('Y-m-d H:i:s') . ' - IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . ' - ' . $message . PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
  }
}
