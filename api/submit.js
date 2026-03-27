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

    // Optional: Keep forwarding to Google Sheets for database purposes
    if (googleAppScriptUrl) {
      const sheetData = new URLSearchParams();
      sheetData.append('rsvp_status', body.rsvp_status || '');
      sheetData.append('first_name', body.first_name || '');
      sheetData.append('last_name', body.last_name || '');
      sheetData.append('company', body.company_name || '');
      sheetData.append('designation', body.designation || '');
      sheetData.append('industry', body.industry || '');
      sheetData.append('email', body.email || '');
      sheetData.append('phone', body.phone || '');
      sheetData.append('date', new Date().toISOString().replace('T', ' ').substring(0, 19));

      try {
        await fetch(googleAppScriptUrl, {
          method: 'POST',
          body: sheetData,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      } catch (err) {
        console.error('Silent Google Sheet failure:', err);
      }
    }

    // ==========================================
    // Send Emails DIRECTLY from the Vercel API
    // ==========================================
    const nodemailer = require('nodemailer');
    
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail', // or 'smtp.office365.com', etc. Ensure service matches your new email provider.
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Email 1: Confirmation to the Registrant
      if (body.rsvp_status === 'Attending') {
        const userMessage = `Dear ${body.first_name},\n\n` +
          `Thank you for confirming your attendance at the CISO Roundtable 2026. We are delighted to have you join us for this exclusive session.\n\n` +
          `Event Details:\n` +
          `Date: 21 May 2026\n` +
          `Time: 9:00 AM – 2:00 PM\n` +
          `Venue: Le Méridien Kuala Lumpur\n\n` +
          `We look forward to welcoming you at the event.\n\n` +
          `Best regards,\n` +
          `Ssquad. Global Events Team`;

        await transporter.sendMail({
          from: `"Ssquad. Global Events Team" <${process.env.SMTP_USER}>`,
          to: body.email,
          subject: 'Registration Confirmed - CISO Roundtable 2026',
          text: userMessage
        });
      }

      // Email 2: Alert Notification to the Company
      const alertEmail = process.env.COMPANY_ALERT_EMAIL || 'sales@ssquad.com';
      const companyMessage = `A new ${body.rsvp_status} RSVP has been received for the CISO Roundtable 2026.\n\n` +
        `Details:\n` +
        `---------------------------------\n` +
        `Name: ${body.first_name} ${body.last_name}\n` +
        `Company: ${body.company_name}\n` +
        `Designation: ${body.designation}\n` +
        `Industry: ${body.industry}\n` +
        `Email: ${body.email}\n` +
        `Phone: ${body.phone}\n` +
        `Status: ${body.rsvp_status}\n` +
        `---------------------------------`;

      await transporter.sendMail({
        from: `"CISO System Alert" <${process.env.SMTP_USER}>`,
        to: alertEmail,
        subject: `New RSVP Alert: ${body.first_name} ${body.last_name} (${body.rsvp_status})`,
        text: companyMessage
      });
      
    } else {
      console.warn('SMTP_USER and SMTP_PASS environment variables are missing. Emails were not sent.');
    }

    return res.status(200).json({ status: 'success', message: 'Registration successfully processed.' });
  } catch (error) {
    console.error('Submission Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
}
