<?php
// config.php
// IMPORTANT: Secure this file! Do not expose it to the web.
// It's recommended to store this file outside of the web root directory.

// --- Database Configuration ---
define('DB_HOST', 'localhost');
define('DB_NAME', 'user_consent_demo');
define('DB_USER', 'root');
define('DB_PASS', '');

// --- Upload Configuration ---
// Maximum file size for uploads in bytes (e.g., 5MB)
define('MAX_FILE_SIZE', 5 * 1024 * 1024);
// Allowed MIME types for image uploads
define('ALLOWED_MIME_TYPES', ['image/jpeg', 'image/png']);
// Directory to store uploaded images
define('UPLOAD_DIR', 'uploads');

// --- Security Configuration ---
// A secret key for generating CSRF tokens.
// Replace this with a long, random string.
define('CSRF_SECRET', 'your-super-secret-key');
// An admin token for deleting records.
// Replace this with a long, random string.
define('ADMIN_TOKEN', 'your-super-secret-admin-token');

// --- Geolocation Configuration ---
// Set to true to enable geolocation capture
define('GEOLOCATION_ENABLED', true);

?>
