const sendEmails = require('./../utils/email');

/**
 * Function to send test emails to multiple recipients with rate limiting
 * @param {Array<string>} emailList - Array of recipient email addresses
 * @param {number} totalEmails - Number of test emails to send to each recipient
 * @param {number} emailsPerMinute - Rate limit for emails per minute
 */
async function sendTestEmails(emailList, totalEmails = 10, emailsPerMinute = 100) {
  // Validate inputs
  if (!Array.isArray(emailList) || emailList.length === 0) {
    console.error('Email list must be a non-empty array');
    return;
  }

  console.log(`Starting email test to ${emailList.length} recipients...`);
  console.log(`Will send ${totalEmails} test emails at a rate of ${emailsPerMinute} per minute`);

  // Calculate delay between email batches
  const delayBetweenBatches = 60000 / emailsPerMinute; // in milliseconds
  
  let sentCount = 0;
  let errorCount = 0;
  
  // Create array of all email tasks
  const allEmailTasks = [];
  
  for (let i = 0; i < totalEmails; i++) {
    for (const recipientEmail of emailList) {
      allEmailTasks.push({ 
        recipient: recipientEmail, 
        emailNumber: i + 1 
      });
    }
  }
  
  // Process emails in batches to respect rate limits
  for (let i = 0; i < allEmailTasks.length; i += emailsPerMinute) {
    const batch = allEmailTasks.slice(i, i + emailsPerMinute);
    
    console.log(`Processing batch ${Math.floor(i/emailsPerMinute) + 1} of ${Math.ceil(allEmailTasks.length/emailsPerMinute)}`);
    
    // Process current batch concurrently
    const batchPromises = batch.map(task => {
      return sendTestEmail(task.recipient, task.emailNumber)
        .then(() => {
          sentCount++;
          console.log(`✓ Email ${task.emailNumber} sent to ${task.recipient}`);
        })
        .catch(err => {
          errorCount++;
          console.error(`✗ Failed to send email ${task.emailNumber} to ${task.recipient}:`, err.message);
        });
    });
    
    // Wait for all emails in current batch to be processed
    await Promise.all(batchPromises);
    
    // If there are more batches to process, wait before continuing
    if (i + emailsPerMinute < allEmailTasks.length) {
      console.log(`Rate limiting: Waiting ${delayBetweenBatches}ms before sending next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  console.log(`\nEmail test completed!`);
  console.log(`Successfully sent: ${sentCount}`);
  console.log(`Failed: ${errorCount}`);
}

/**
 * Function to send a single test email
 * @param {string} recipientEmail - Email address of the recipient
 * @param {number} emailNumber - Sequence number for the test email
 */
async function sendTestEmail(recipientEmail, emailNumber) {
  const timestamp = new Date().toLocaleTimeString();
  
  const emailOptions = {
    email: recipientEmail,
    subject: `Test Email #${emailNumber} - ${timestamp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #4a86e8;">PrepZer0 Test Email</h2>
        <p>This is test email #${emailNumber} sent at ${timestamp}.</p>
        <p>This email was sent as part of an email delivery test. If you've received this message, it means our email system is working correctly.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #777; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `
  };
  
  return sendEmails(emailOptions);
}

// Example usage:
// Replace this array with your actual recipient list
const recipients = [
  'avigupta2001ad@gmail.com',
  'reversehack127.0.0.1@gmail.com',
  'thevaincode@gmail.com',
  'earthlingaidtech@gmail.com',
  'debismandal4234@gmail.com',
  'daybeast10@gmail.com',
  'speakercharan12@gmail.com',
  '1by22is043@bmsit.in',
  'gamingdm03@gmail.com',
  'ayush.ims.24879@gmail.com',

  // Add more email addresses as needed
];

// Send 10 test emails to each recipient at a rate of 10 emails per minute
sendTestEmails(recipients, 10, 10)
  .catch(err => console.error('Error in email test:', err));