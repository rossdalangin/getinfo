<?php
// delete.php

// --- Initialization ---
require_once 'config.php';

// --- Response Helper ---
function send_json_response($success, $message) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'message' => $message
    ]);
    exit;
}

// --- Request Validation ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_response(false, 'Invalid request method.');
}

// --- Admin Token Validation ---
$token = htmlspecialchars($_POST['token'] ?? '', ENT_QUOTES, 'UTF-8');
if (!$token || !hash_equals(ADMIN_TOKEN, $token)) {
    send_json_response(false, 'Invalid admin token.');
}

// --- Input Validation ---
$user_id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
if (!$user_id) {
    send_json_response(false, 'Invalid user ID.');
}

// --- Database Interaction ---
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // First, get the photo path to delete the file
    $stmt = $pdo->prepare("SELECT photo_path FROM users_captured WHERE id = :id");
    $stmt->execute([':id' => $user_id]);
    $photo_path = $stmt->fetchColumn();

    if ($photo_path && file_exists($photo_path)) {
        unlink($photo_path);
    }

    // Then, delete the record from the database
    $stmt = $pdo->prepare("DELETE FROM users_captured WHERE id = :id");
    $stmt->execute([':id' => $user_id]);

    if ($stmt->rowCount() > 0) {
        send_json_response(true, "User data (ID: $user_id) deleted successfully.");
    } else {
        send_json_response(false, "User not found.");
    }

} catch (PDOException $e) {
    // In a real application, log this error.
    send_json_response(false, 'Database error: ' . $e->getMessage());
}
?>
