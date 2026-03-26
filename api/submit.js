export default async function handler(req, res) {
  // CORS catching headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // Vercel parses application/x-www-form-urlencoded automatically into req.body
    const body = req.body;
    
    // Configuration via Environment Variables ONLY for security
    const googleAppScriptUrl = process.env.GOOGLE_SCRIPT_WEB_APP_URL;
    
    if (!googleAppScriptUrl) {
      console.error('SERVER ERROR: GOOGLE_SCRIPT_WEB_APP_URL environment variable is missing.');
      return res.status(500).json({ status: 'error', message: 'Server configuration error.' });
    }
    
    // Basic validation
    if (!body.first_name || !body.last_name || !body.email) {
      return res.status(400).json({ status: 'error', message: 'Invalid input data.' });
    }

    // Prepare data for Google Sheets
    const sheetData = new URLSearchParams();
    sheetData.append('rsvp_status', body.rsvp_status || '');
    sheetData.append('first_name', body.first_name || '');
    sheetData.append('last_name', body.last_name || '');
    sheetData.append('company', body.company_name || ''); // Note: frontend sends company_name
    sheetData.append('designation', body.designation || '');
    sheetData.append('industry', body.industry || '');
    sheetData.append('email', body.email || '');
    sheetData.append('phone', body.phone || '');
    sheetData.append('date', new Date().toISOString().replace('T', ' ').substring(0, 19));

    // Forward to Google Sheets Web App
    const sheetResponse = await fetch(googleAppScriptUrl, {
      method: 'POST',
      body: sheetData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!sheetResponse.ok) {
      console.error('Failed to forward to Google Sheets:', await sheetResponse.text());
    }

    // Optional: Email Notification 
    // Vercel does not support PHP's native mail(). You must integrate an API like Resend, SendGrid, or Nodemailer here.
    // Example:
    // if (process.env.RESEND_API_KEY) { 
    //   await resend.emails.send({ ... })
    // }

    return res.status(200).json({ status: 'success', message: 'Registration successfully processed.' });
  } catch (error) {
    console.error('Submission Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
}
