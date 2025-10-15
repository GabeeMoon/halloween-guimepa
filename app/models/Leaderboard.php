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
    if ($json === false) return [];

    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
      // Se o JSON estiver corrompido, retornar array vazio e não quebrar a aplicação
      return [];
    }
    return is_array($data) ? $data : [];
  }

  public function saveScore($playerName, $score)
  {
    $scores = $this->getTopScores();

    // Evitar duplicatas (mantém melhor score)
    $scores = array_filter($scores, fn($s) => ($s['name'] ?? '') !== $playerName);

    $scores[] = [
      'name' => $playerName,
      'score' => $score,
      'date' => date('Y-m-d H:i')
    ];

    usort($scores, fn($a, $b) => $b['score'] - $a['score']);
    $scores = array_slice($scores, 0, 10);

    $dir = dirname($this->file);
    if (!is_dir($dir)) {
      if (!mkdir($dir, 0777, true) && !is_dir($dir)) {
        throw new Exception('Falha ao criar diretório de dados.');
      }
    }

    $json = json_encode($scores, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
      throw new Exception('Falha ao codificar JSON: ' . json_last_error_msg());
    }

    $tmpFile = $this->file . '.tmp';
    $bytes = file_put_contents($tmpFile, $json, LOCK_EX);
    if ($bytes === false) {
      throw new Exception('Falha ao gravar arquivo temporário.');
    }

    // rename é atomic em sistemas Unix-like; substitui o original
    if (!rename($tmpFile, $this->file)) {
      // Tentativa final: tentar gravar direto
      if (file_put_contents($this->file, $json, LOCK_EX) === false) {
        throw new Exception('Falha ao mover arquivo temporário para destino.');
      }
    }
  }
}