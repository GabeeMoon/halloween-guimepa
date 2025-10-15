<?php
// Roteamento básico
$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$script_dir = dirname($_SERVER['SCRIPT_NAME']);
$uri = substr($request_uri, strlen($script_dir));

if ($uri === '' || $uri === '/') {
  $uri = '/';
} elseif ($uri === '/save') {
  // Mantém /save
} else {
  $uri = rtrim($uri, '/');
}

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