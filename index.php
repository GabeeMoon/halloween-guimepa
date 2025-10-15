<?php
// Roteamento básico (versão mais robusta)
$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$script_dir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$base_path = $script_dir === '/' ? '' : $script_dir;
$uri = '/' . trim(substr($request_uri, strlen($base_path)), '/');

if ($uri === '//') $uri = '/';
if ($uri === '') $uri = '/';

$method = $_SERVER['REQUEST_METHOD'];

require_once __DIR__ . '/app/controllers/GameController.php';

$controller = new GameController();

if ($uri === '/' && $method === 'GET') {
  $controller->index();
} elseif ($uri === '/save' && $method === 'POST') {
  $controller->save();
} else {
  http_response_code(404);
  echo 'Not Found';
}