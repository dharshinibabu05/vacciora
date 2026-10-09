/**
 * whatsapp.js
 * Twilio WhatsApp sender supporting both Sandbox free-text and approved Content API templates.
 */

const twilio = require('twilio');

let twilioClient = null;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const whatsappContentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;

if (accountSid && authToken) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('[Twilio WhatsApp] Initialized with live credentials.');
  } catch (err) {
    console.error(`[Twilio WhatsApp Init Error] ${err.message}`);
  }
}

/**
 * Formats standard Vacciora vaccination reminder text.
 */
function formatReminderText(parentName, childName, vaccineName, dueDateStr) {
  return `Hello ${parentName},\n\nReminder: ${childName}'s ${vaccineName} vaccination is due on ${dueDateStr}.\n\nPlease visit your vaccination centre on the scheduled date.\n\n- Vacciora`;
}

/**
 * Sends a WhatsApp message via Twilio SDK.
 * 
 * @param {string} to - Destination phone number
 * @param {string|Object} messageOrParams - Free-text string OR template params object:
 *   { parentName, childName, vaccineName, dueDateStr }
 * @returns {Promise<{success: boolean, mode: 'live'|'mock'|'failed', sid: string, error?: string}>}
 */
async function sendWhatsApp(to, messageOrParams) {
  const cleanNumber = to.replace(/\D/g, '');
  const normalizedNumber = to.startsWith('+') ? to : `+91${cleanNumber}`;
  const whatsappRecipient = normalizedNumber.startsWith('whatsapp:') ? normalizedNumber : `whatsapp:${normalizedNumber}`;

  let bodyText = '';
  let contentVars = null;

  if (typeof messageOrParams === 'string') {
    bodyText = messageOrParams;
  } else {
    const { parentName = 'Parent', childName = 'Child', vaccineName = 'Vaccine', dueDateStr = 'soon' } = messageOrParams;
    bodyText = formatReminderText(parentName, childName, vaccineName, dueDateStr);
    contentVars = {
      "1": parentName,
      "2": childName,
      "3": vaccineName,
      "4": dueDateStr
    };
  }

  if (twilioClient && accountSid) {
    try {
      const payload = {
        from: whatsappFrom,
        to: whatsappRecipient
      };

      // If approved Twilio Content Template SID is provided, use Content API
      if (whatsappContentSid && contentVars) {
        payload.contentSid = whatsappContentSid;
        payload.contentVariables = JSON.stringify(contentVars);
      } else {
        payload.body = bodyText;
      }

      const res = await twilioClient.messages.create(payload);
      console.log(`[Twilio WhatsApp LIVE] Sent to ${whatsappRecipient}. SID: ${res.sid}`);
      return {
        success: true,
        mode: 'live',
        sid: res.sid
      };
    } catch (error) {
      console.error(`[Twilio WhatsApp FAILED] to ${whatsappRecipient}: ${error.message}`);
      return {
        success: false,
        mode: 'failed',
        sid: null,
        error: error.message
      };
    }
  }

  // Mock delivery for development
  const mockSid = `MOCK_WA_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  console.log(`[Twilio WhatsApp MOCK] to ${whatsappRecipient}: "${bodyText}" (Mock SID: ${mockSid})`);
  return {
    success: true,
    mode: 'mock',
    sid: mockSid
  };
}

function isLiveConfigured() {
  return Boolean(twilioClient && accountSid);
}

module.exports = {
  sendWhatsApp,
  formatReminderText,
  isLiveConfigured
};
