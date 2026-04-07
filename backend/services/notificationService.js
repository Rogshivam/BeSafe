import nodemailer from 'nodemailer';
import twilio from 'twilio';

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.initializeServices();
  }

  initializeServices() {
    // Initialize email service
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }

    // Initialize Twilio service
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  async sendEmailNotification(to, subject, message, priority = 'Normal') {
    try {
      if (!this.emailTransporter) {
        console.log('Email service not configured');
        return false;
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject: this.getSubjectWithPriority(subject, priority),
        html: this.getEmailTemplate(message, priority)
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  async sendSMSNotification(to, message, priority = 'Normal') {
    try {
      if (!this.twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
        console.log('SMS service not configured');
        return false;
      }

      const formattedMessage = this.getFormattedMessage(message, priority);
      
      const result = await this.twilioClient.messages.create({
        body: formattedMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });

      console.log('SMS sent successfully:', result.sid);
      return true;
    } catch (error) {
      console.error('SMS send error:', error);
      return false;
    }
  }

  async sendEmergencyNotification(user, emergency, contacts) {
    const notifications = [];

    for (const contact of contacts) {
      const priority = contact.priority;
      const contactUser = contact.memberId;

      // Prepare emergency message
      const emergencyMessage = `
🚨 EMERGENCY ALERT 🚨
Name: ${user.name}
Status: ${emergency.severity} Emergency
Location: ${emergency.location.latitude}, ${emergency.location.longitude}
Triggered: ${emergency.triggeredBy}
Time: ${new Date().toLocaleString()}
${emergency.message ? `Message: ${emergency.message}` : ''}
      `;

      // Send email if enabled
      if (contactUser.notifications?.email && contactUser.email) {
        const emailSent = await this.sendEmailNotification(
          contactUser.email,
          `Emergency Alert - ${user.name}`,
          emergencyMessage,
          'Urgent'
        );
        notifications.push({
          type: 'email',
          contactId: contactUser._id,
          success: emailSent
        });
      }

      // Send SMS if enabled
      if (contactUser.notifications?.sms && contactUser.phone) {
        const smsSent = await this.sendSMSNotification(
          contactUser.phone,
          emergencyMessage,
          'Urgent'
        );
        notifications.push({
          type: 'sms',
          contactId: contactUser._id,
          success: smsSent
        });
      }
    }

    return notifications;
  }

  async sendLocationUpdateNotification(user, location, contacts) {
    const message = `
📍 Location Update
Name: ${user.name}
New Location: ${location.latitude}, ${location.longitude}
Time: ${new Date().toLocaleString()}
${location.address ? `Address: ${location.address}` : ''}
    `;

    const notifications = [];

    for (const contact of contacts) {
      if (contact.memberId.notifications?.email && contact.memberId.email) {
        const emailSent = await this.sendEmailNotification(
          contact.memberId.email,
          `Location Update - ${user.name}`,
          message,
          'Normal'
        );
        notifications.push({
          type: 'email',
          contactId: contact.memberId._id,
          success: emailSent
        });
      }
    }

    return notifications;
  }

  getSubjectWithPriority(subject, priority) {
    const prefixes = {
      'Low': '',
      'Normal': '',
      'High': '[IMPORTANT] ',
      'Urgent': '[URGENT] '
    };
    
    return `${prefixes[priority] || ''}${subject}`;
  }

  getFormattedMessage(message, priority) {
    const prefixes = {
      'Low': '',
      'Normal': '',
      'High': 'IMPORTANT: ',
      'Urgent': 'URGENT: '
    };
    
    return `${prefixes[priority] || ''}${message}`;
  }

  getEmailTemplate(message, priority) {
    const colors = {
      'Low': '#28a745',
      'Normal': '#007bff',
      'High': '#ffc107',
      'Urgent': '#dc3545'
    };

    const priorityColor = colors[priority] || colors['Normal'];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>VSafe Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background-color: ${priorityColor}; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">VSafe Notification</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Priority: ${priority}</p>
          </div>
          <div style="padding: 30px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; border-left: 4px solid ${priorityColor};">
              <pre style="margin: 0; white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${message}</pre>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
              <p>This is an automated message from VSafe Emergency Response System.</p>
              <p>Received: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async testEmailService() {
    if (!this.emailTransporter) {
      return { success: false, message: 'Email service not configured' };
    }

    try {
      await this.emailTransporter.verify();
      return { success: true, message: 'Email service is working' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async testSMSService() {
    if (!this.twilioClient) {
      return { success: false, message: 'SMS service not configured' };
    }

    try {
      const account = await this.twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      return { success: true, message: 'SMS service is working', account: account.friendlyName };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

export default new NotificationService();
