<?php
// upload.php

// --- Robust Error Handling ---
// This will catch any fatal error or unhandled exception and return it as JSON.
// This is crucial for debugging API endpoints.
ini_set('display_errors', 1);
error_reporting(E_ALL);

function handle_shutdown() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR])) {
        // If headers have already been sent, we can't send a new JSON header.
        // But we can still try to output a JSON string.
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=UTF-8');
        }
        echo json_encode([
            'success' => false,
            'message' => 'A fatal error occurred on the server.',
            'error_details' => [
                'type'    => $error['type'],
                'message' => $error['message'],
                'file'    => $error['file'],
                'line'    => $error['line'],
            ]
        ]);
        exit;
    }
}
register_shutdown_function('handle_shutdown');

// --- Initialization ---
require_once 'config.php';
session_start();

// --- Response Helper ---
function send_json_response($success, $message, $data = []) {
    // Ensure no other output is sent
    if (headers_sent()) {
        return;
    }
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

// --- CSRF Token Generation (for GET requests) ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    send_json_response(true, 'CSRF token generated.', ['csrf_token' => $_SESSION['csrf_token']]);
}

// --- Request Validation ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_response(false, 'Invalid request method.');
}

// --- CSRF Token Validation ---
if (empty($_POST['csrf_token']) || empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
    send_json_response(false, 'Invalid CSRF token.');
}

// --- Input Validation ---
$name = htmlspecialchars($_POST['name'] ?? '', ENT_QUOTES, 'UTF-8');
$email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
$country = htmlspecialchars($_POST['country'] ?? '', ENT_QUOTES, 'UTF-8');
$city = htmlspecialchars($_POST['city'] ?? '', ENT_QUOTES, 'UTF-8');
$address = htmlspecialchars($_POST['address'] ?? '', ENT_QUOTES, 'UTF-8');
$latitude = filter_input(INPUT_POST, 'latitude', FILTER_VALIDATE_FLOAT);
$longitude = filter_input(INPUT_POST, 'longitude', FILTER_VALIDATE_FLOAT);

if (!$name || !$email || !$country || !$city || !$address) {
    send_json_response(false, 'Please fill in all required fields.');
}

// --- File Upload Handling ---
if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    send_json_response(false, 'File upload error: ' . ($_FILES['photo']['error'] ?? 'Unknown error'));
}

if ($_FILES['photo']['size'] > MAX_FILE_SIZE) {
    send_json_response(false, 'File is too large.');
}

$image_info = getimagesize($_FILES['photo']['tmp_name']);
if ($image_info === false) {
    send_json_response(false, 'Invalid image file. Could not get image size.');
}

$mime_type = $image_info['mime'];
if (!in_array($mime_type, ALLOWED_MIME_TYPES)) {
    send_json_response(false, 'Invalid file type. Only JPEG and PNG are allowed. Detected: ' . $mime_type);
}

// --- Store the Uploaded File ---
$extension = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
$photo_filename = uniqid('user_') . '.' . $extension;
$photo_path = UPLOAD_DIR . '/' . $photo_filename;

if (!move_uploaded_file($_FILES['photo']['tmp_name'], $photo_path)) {
    send_json_response(false, 'Failed to store uploaded file. Check server permissions.');
}

// --- Database Interaction ---
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare(
        "INSERT INTO users_captured (name, email, country, city, address, photo_path, ip_address, latitude, longitude)
         VALUES (:name, :email, :country, :city, :address, :photo_path, :ip_address, :latitude, :longitude)"
    );

    $stmt->execute([
        ':name' => $name,
        ':email' => $email,
        ':country' => $country,
        ':city' => $city,
        ':address' => $address,
        ':photo_path' => $photo_path,
        ':ip_address' => $_SERVER['REMOTE_ADDR'],
        ':latitude' => $latitude,
        ':longitude' => $longitude,
    ]);

    send_json_response(true, 'Data submitted successfully.');

} catch (PDOException $e) {
    send_json_response(false, 'Database error: ' . $e->getMessage());
} catch (Throwable $t) {
    send_json_response(false, 'An unexpected server error occurred: ' . $t->getMessage());
}
?>
