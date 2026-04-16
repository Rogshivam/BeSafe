import nodemailer from "nodemailer";
import dotenv from "dotenv";
import User from '../models/User.js';
dotenv.config();

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.initialize();
  }

  initialize() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("EMAIL_USER / EMAIL_PASS not set; email service disabled");
      return;
    }

    this.emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendPasswordResetEmail(email, resetToken) {
    if (!this.emailTransporter || !process.env.EMAIL_USER) {
      console.log("Email service not configured");
      return false;
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetLink = `${clientUrl}/reset-password/${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; padding: 20px; background:#f9fafb;">
        <div style="max-width:560px;margin:auto;background:#fff;border-radius:8px;padding:20px;">
          <h2>Password Reset</h2>
          <p>Click below to reset your password:</p>

          <a href="${resetLink}" 
             style="display:inline-block;padding:10px 16px;background:#059669;color:#fff;border-radius:6px;text-decoration:none;">
            Reset Password
          </a>

          <p style="margin-top:20px;">Or copy link:</p>
          <pre>${resetLink}</pre>

          <p style="font-size:12px;color:gray;">Expires in 10 minutes</p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Be-Safe Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Be-Safe – Password Reset",
      html,
    };

    try {
      const info = await this.emailTransporter.sendMail(mailOptions);
      console.log("Email sent:", info.messageId);
      return true;
    } catch (error) {
      console.error("Email send error:", error);
      return false;
    }
  }

  async sendRelationshipNotification({ userId, type, message, data }) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const notification = {
        type: 'relationship',
        subtype: type,
        message,
        data,
        timestamp: new Date()
      };

      // Send email notification
      if (user.email && user.preferences?.emailNotifications) {
        const html = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: sans-serif; padding: 20px; background:#f9fafb;">
            <div style="max-width:560px;margin:auto;background:#fff;border-radius:8px;padding:20px;">
              <h2>Relationship ${type.replace('_', ' ').toUpperCase()}</h2>
              <p>${message}</p>
              <p style="margin-top:20px;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" 
                   style="display:inline-block;padding:10px 16px;background:#059669;color:#fff;border-radius:6px;text-decoration:none;">
                  View in BeSafe
                </a>
              </p>
            </div>
          </body>
          </html>
        `;

        const mailOptions = {
          from: `"Be-Safe Support" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: `BeSafe - ${type.replace('_', ' ').toUpperCase()}`,
          html,
        };

        if (this.emailTransporter) {
          await this.emailTransporter.sendMail(mailOptions);
        }
      }

      // Store notification in database (you might want to create a Notification model)
      console.log('Relationship notification:', notification);

    } catch (error) {
      console.error('Error sending relationship notification:', error);
    }
  }
}

export { NotificationService };
export default new NotificationService();