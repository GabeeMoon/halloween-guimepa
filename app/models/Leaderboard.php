<?php
class Leaderboard
{
  private $file;

  public function __construct()
  {
    $this->file = __DIR__ . '/../../data/leaderboard.json';
  }

  public function getTopScores()
  {
    if (!file_exists($this->file)) return [];
    $json = file_get_contents($this->file);
    $data = json_decode($json, true);
    return is_array($data) ? $data : [];
  }

  public function saveScore($playerName, $score)
  {
    $scores = $this->getTopScores();

    // Evitar duplicatas (mantém melhor score)
    $scores = array_filter($scores, fn($s) => $s['name'] !== $playerName);

    $scores[] = [
      'name' => $playerName,
      'score' => $score,
      'date' => date('Y-m-d H:i')
    ];

    usort($scores, fn($a, $b) => $b['score'] - $a['score']);
    $scores = array_slice($scores, 0, 10);

    if (!is_dir(dirname($this->file))) {
      mkdir(dirname($this->file), 0777, true);
    }

    if (file_put_contents($this->file, json_encode($scores, JSON_PRETTY_PRINT)) === false) {
      throw new Exception('Falha ao gravar arquivo JSON.');
    }
  }
}