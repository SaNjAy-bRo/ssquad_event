<?php
// submit.php
header('Content-Type: application/json');

// 1. configuration
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
} else {
    // Fallback default config if file is missing
    $config = [
        'google_script_web_app_url' => 'https://script.google.com/macros/s/AKfycbwi7Zhr2xWyG3dfAzeSoaokhqvmfiWCr2ekYSdskyeQrfbUP1bJHAW_cCxWITXs1X9g/exec',
        'forward_to_sheets' => true,
        'sender_email' => 'sales@ssquad.com',
        'reply_to_email' => 'sales@ssquad.com'
    ];
}

$google_script_web_app_url = $config['google_script_web_app_url'];
$forward_to_sheets = $config['forward_to_sheets'];
$sender_email = $config['sender_email'];
$reply_to_email = $config['reply_to_email'];

// Only process POST requests
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Collect and sanitize input
    $rsvp_status  = htmlspecialchars(strip_tags($_POST['rsvp_status'] ?? ''));
    $first_name   = htmlspecialchars(strip_tags($_POST['first_name'] ?? ''));
    $last_name    = htmlspecialchars(strip_tags($_POST['last_name'] ?? ''));
    $company      = htmlspecialchars(strip_tags($_POST['company_name'] ?? ''));
    $designation  = htmlspecialchars(strip_tags($_POST['designation'] ?? ''));
    $industry     = htmlspecialchars(strip_tags($_POST['industry'] ?? ''));
    $email        = filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL);
    $phone        = htmlspecialchars(strip_tags($_POST['phone'] ?? ''));

    // Basic Validation
    if (empty($first_name) || empty($last_name) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid input data.']);
        exit;
    }

    // 2. Forward to Google Sheets (Web App)
    if ($forward_to_sheets) {
        $ch = curl_init($google_script_web_app_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // REQUIRED for Google Apps Script redirects
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Fix for local Windows PHP SSL certificate issues
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'rsvp_status' => $rsvp_status,
            'first_name'  => $first_name,
            'last_name'   => $last_name,
            'company'     => $company,
            'designation' => $designation,
            'industry'    => $industry,
            'email'       => $email,
            'phone'       => $phone,
            'date'        => date('Y-m-d H:i:s')
        ]));
        // Execute curl and close
        $response = curl_exec($ch);
        curl_close($ch);
    }

    // 3. Send Auto-Reply Confirmation Email
    if ($rsvp_status === 'Attending') {
        $to = $email;
        $subject = "CISO Roundtable 2026 - Registration Confirmation";
        $headers = "From: {$sender_email}\r\n"; // Replace with your actual sender email
        $headers .= "Reply-To: {$reply_to_email}\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

        // Template provided by user
        $message = "Dear {$first_name},\n\n";
        $message .= "Thank you for confirming your attendance at the CISO Roundtable 2026. We are delighted to have you join us for this session.\n\n";
        $message .= "Event Details:\n";
        $message .= "Date: 21 May 2026\n";
        $message .= "Time: 9:00 AM – 2:00 PM\n";
        $message .= "Venue: Le Méridien Kuala Lumpur\n\n";
        $message .= "We look forward to welcoming you at the event.\n\n";
        $message .= "Best regards,\n";
        $message .= "Ssquad. Global Events Team";

        // Send email
        @mail($to, $subject, $message, $headers);
    } else {
        // Optional: Email template for non-attendees
        $to = $email;
        $subject = "CISO Roundtable 2026 - RSVP Received";
        $headers = "From: {$sender_email}\r\n";
        $headers .= "Reply-To: {$reply_to_email}\r\n";

        $message = "Dear {$first_name},\n\n";
        $message .= "Thank you for letting us know that you will not be able to attend the CISO Roundtable 2026.\n\n";
        $message .= "We hope to see you at future events.\n\n";
        $message .= "Best regards,\n";
        $message .= "Ssquad. Global Events Team";

        @mail($to, $subject, $message, $headers);
    }

    // 4. Return Success Response
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Registration successfully processed.']);

} else {
    // Only accept POST
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);
}
?>
