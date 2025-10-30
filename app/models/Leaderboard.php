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
    if (!file_exists($this->file)) {
      return [];
    }

    $json = file_get_contents($this->file);
    if ($json === false) {
      return [];
    }

    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
      // Log de possível corrupção
      error_log('Leaderboard JSON corrupted: ' . json_last_error_msg());
      return [];
    }

    return $data;
  }

  public function saveScore($playerName, $score)
  {
    $scores = $this->getTopScores();

    // Verifica se jogador existe e atualiza só se score maior
    $found = false;
    foreach ($scores as &$entry) {  // Referência para modificar
      if (($entry['name'] ?? '') === $playerName) {
        if ($score > ($entry['score'] ?? 0)) {
          $entry['score'] = $score;
          $entry['date'] = date('Y-m-d H:i:s');
        }
        $found = true;
        break;
      }
    }

    // Adiciona novo se não encontrado
    if (!$found) {
      $scores[] = [
        'name' => $playerName,
        'score' => $score,
        'date' => date('Y-m-d H:i:s')
      ];
    }

    // Ordena por score descendente
    usort($scores, function ($a, $b) {
      return ($b['score'] ?? 0) - ($a['score'] ?? 0);
    });

    // Limita a 100 entradas para evitar spam/inchaço (mantém top + recentes)
    $scores = array_slice($scores, 0, 100);

    // Diretório e escrita atômica com lock
    $dir = dirname($this->file);
    if (!is_dir($dir)) {
      if (!mkdir($dir, 0777, true) || !is_dir($dir)) {
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

    if (!rename($tmpFile, $this->file)) {
      // Fallback: sobrescreve direto com lock
      if (file_put_contents($this->file, $json, LOCK_EX) === false) {
        throw new Exception('Falha ao mover arquivo temporário para destino.');
      }
    }

    // Define permissões seguras (para XAMPP local: owner writable, others read)
    chmod($this->file, 0644);
  }
}