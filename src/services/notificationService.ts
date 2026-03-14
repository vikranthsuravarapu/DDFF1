import twilio from 'twilio';

let twilioClient: any = null;

export async function sendWhatsAppNotification(phone: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    console.warn('Twilio is not configured. Skipping WhatsApp notification.');
    return;
  }

  try {
    if (!twilioClient) {
      twilioClient = twilio(accountSid, authToken);
    }

    // Ensure phone number is in correct format for WhatsApp
    // Twilio WhatsApp numbers must start with 'whatsapp:'
    // Also handle 10-digit numbers by prepending +91 (common for this app's context)
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+') && !formattedPhone.startsWith('whatsapp:')) {
      if (formattedPhone.length === 10) {
        formattedPhone = `+91${formattedPhone}`;
      } else if (!formattedPhone.startsWith('+')) {
        // If it's not 10 digits but doesn't have a +, we might still want to add one if it's just numbers
        if (/^\d+$/.test(formattedPhone)) {
          formattedPhone = `+${formattedPhone}`;
        }
      }
    }

    const to = formattedPhone.startsWith('whatsapp:') ? formattedPhone : `whatsapp:${formattedPhone}`;
    const fromFormatted = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;

    await twilioClient.messages.create({
      body: message,
      from: fromFormatted,
      to: to
    });

    console.log(`WhatsApp notification sent to ${to}`);
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
  }
}
