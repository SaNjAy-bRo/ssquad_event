<?php
// Example Configuration File
// Copy this file to config.php and fill in your actual credentials.
// config.php is ignored by Git to keep your credentials secure.

$config = [
    // Replace this with your actual Google Apps Script Web App URL
    'google_script_web_app_url' => 'https://script.google.com/macros/s/AKfycby_PLACEHOLDER_REPLACE_ME/exec',
    
    // Set to true if you want to forward data to google sheets
    'forward_to_sheets' => false,

    // Your actual sender email
    'sender_email' => 'sales@ssquad.com',
    
    // Reply-To email
    'reply_to_email' => 'sales@ssquad.com'
];
?>
