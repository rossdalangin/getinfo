<?php
// Test script
header('Content-Type: application/json; charset=UTF-8');
echo json_encode([
    'success' => true,
    'message' => 'Test successful. The server environment is working correctly.'
]);
exit;
?>
