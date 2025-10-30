<?php
require_once __DIR__ . '/../models/Leaderboard.php';

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
    require __DIR__ . '/../views/game.php';
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
    if ($raw === false || $raw === '') {
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

    $playerName = trim($data['playerName'] ?? 'Anônimo');
    $playerName = strip_tags($playerName);
    $playerName = mb_substr($playerName, 0, 32);
    if ($playerName === '') $playerName = 'Anônimo';

    $score = (int) ($data['score'] ?? 0);
    if ($score < 0) {
      http_response_code(400);
      echo json_encode(['error' => 'Pontuação inválida']);
      return;
    }

    try {
      $this->leaderboard->saveScore($playerName, $score);
      echo json_encode($this->leaderboard->getTopScores());
    } catch (Exception $e) {
      http_response_code(500);
      echo json_encode(['error' => 'Erro ao salvar pontuação: ' . $e->getMessage()]);
    }
  }
}