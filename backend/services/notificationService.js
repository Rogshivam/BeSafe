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
    console.log('Initializing email service...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST || 'smtp.gmail.com');
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT || '587');

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

    console.log('Email transporter created successfully');
  }

  async sendPasswordResetEmail(email, resetToken) {
    console.log('sendPasswordResetEmail called for:', email);
    
    if (!this.emailTransporter || !process.env.EMAIL_USER) {
      console.log("Email service not configured");
      return false;
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetLink = `${clientUrl}/reset-password/${resetToken}`;
    console.log('Reset link:', resetLink);

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
        console.log('📧 Sending relationship notification email to:', user.email);
        console.log('📧 Email transporter available:', !!this.emailTransporter);
        console.log('📧 EMAIL_USER configured:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
        
        if (!this.emailTransporter) {
          console.error('❌ Email transporter not initialized - skipping email send');
          return false;
        }
        
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
          // Send email asynchronously without blocking
          this.emailTransporter.sendMail(mailOptions)
            .then(info => {
              console.log(`Relationship notification email sent to ${user.email}:`, info.messageId);
            })
            .catch(error => {
              console.error('Error sending relationship notification email:', error);
            });
        }
      }

      // Store notification in database (you might want to create a Notification model)
      // console.log('Relationship notification:', notification);

    } catch (error) {
      console.error('Error sending relationship notification:', error);
    }
  }

  async sendSOSEmergencyNotification({ childId, childName, childLocation, parentEmail, severity = 'Emergency' }) {
    try {
      // Debug logging
      // console.log('sendSOSEmergencyNotification called with:', {
      //   childId,
      //   childName,
      //   parentEmail,
      //   parentEmailType: typeof parentEmail,
      //   hasLocation: !!childLocation,
      //   severity
      // });

      // Validate required parameters
      if (!parentEmail) {
        console.error('Parent email is required for SOS notification');
        return false;
      }

      if (!childLocation || !childLocation.latitude || !childLocation.longitude) {
        console.error('Child location is required for SOS notification');
        return false;
      }

      // console.log('Sending SOS notification:', {
      //   childId,
      //   childName,
      //   parentEmail,
      //   hasLocation: !!childLocation,
      //   severity
      // });

      // Get parent user details (optional - just for logging)
      const parent = await User.findOne({ email: parentEmail });
      if (!parent) {
        console.warn('Parent not found for email:', parentEmail, '- but will still send email');
      }

      // Create location links for different map services
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${childLocation.latitude},${childLocation.longitude}`;
      const appleMapsUrl = `https://maps.apple.com/?ll=${childLocation.latitude},${childLocation.longitude}`;
      const locationLinks = `
        <div style="margin: 15px 0;">
          <a href="${googleMapsUrl}" 
             style="display:inline-block;padding:8px 12px;background:#4285f4;color:#fff;border-radius:4px;text-decoration:none;margin-right:10px;" 
             target="_blank">
            📍 View on Google Maps
          </a>
          <a href="${appleMapsUrl}" 
             style="display:inline-block;padding:8px 12px;background:#000000;color:#fff;border-radius:4px;text-decoration:none;" 
             target="_blank">
            🍎 View on Apple Maps
          </a>
        </div>
      `;

      const html = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: sans-serif; padding: 20px; background:#fef2f2; border: 2px solid #ef4444;">
            <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;padding:30px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
              <!-- Emergency Header -->
              <div style="text-align:center; margin-bottom:25px;">
                <div style="display:inline-block; background:#ef4444;color:#fff;padding:10px 20px;border-radius:50px;width:60px;height:60px;line-height:60px;text-align:center;font-size:24px;">
                  🚨
                </div>
                <h1 style="color:#ef4444;margin:10px 0;font-size:28px;font-weight:bold;">SOS EMERGENCY ALERT</h1>
                <div style="color:#7f1d1d;font-size:14px;margin-top:5px;">
                  ${severity.toUpperCase()} PRIORITY
                </div>
              </div>

              <!-- Child Information -->
              <div style="background:#f8fafc;border-left:4px solid #ef4444;padding:20px;margin:20px 0;">
                <h2 style="color:#dc2626;margin:0 0 15px;">👤 Child Information</h2>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                  <div>
                    <strong style="color:#374151;">Name:</strong>
                    <span style="color:#6b7280;">${childName}</span>
                  </div>
                  <div>
                    <strong style="color:#374151;">Status:</strong>
                    <span style="color:#ef4444;font-weight:bold;">${severity.toUpperCase()}</span>
                  </div>
                  <div>
                    <strong style="color:#374151;">Time:</strong>
                    <span style="color:#6b7280;">${new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <!-- Location Information -->
              <div style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:20px;margin:20px 0;">
                <h2 style="color:#1e40af;margin:0 0 15px;">📍 Location Information</h2>
                <div style="color:#374151;">
                  <p><strong>Last Known Location:</strong></p>
                  <p style="color:#6b7280;">${childLocation.address || 'Unknown Location'}</p>
                  <p style="color:#6b7280;">Coordinates: ${childLocation.latitude.toFixed(6)}, ${childLocation.longitude.toFixed(6)}</p>
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="text-align:center;padding:25px;background:#f9fafb;">
                ${locationLinks}
              </div>

              <!-- Footer -->
              <div style="text-align:center;padding-top:20px;color:#6b7280;font-size:12px;">
                <p>This is an automated emergency alert from BeSafe System.</p>
                <p>Please check on your child immediately and contact them if needed.</p>
                <p style="font-size:11px;color:#9ca3af;">Sent via BeSafe Child Tracking System</p>
              </div>
            </div>
          </body>
          </html>
      `;

      const mailOptions = {
        from: `"Be-Safe Support" <${process.env.EMAIL_USER}>`,
        to: parentEmail,
        subject: `🚨 URGENT: SOS Alert - ${childName}`,
        html,
        priority: 'high'
      };

      if (this.emailTransporter) {
        // Send email without blocking emergency response
        this.emailTransporter.sendMail(mailOptions)
          .then(info => {
            console.log(`SOS emergency email sent to ${parentEmail}:`, info.messageId);
          })
          .catch(error => {
            console.error('Error sending SOS email:', error);
          });
        return true; // Return immediately, don't wait for email
      }

      return false;

    } catch (error) {
      console.error('Error sending SOS emergency notification:', error);
      return false;
    }
  }

  // Test email function for debugging
  async sendTestEmail(toEmail = process.env.EMAIL_USER) {
    console.log('🧪 Sending test email to:', toEmail);
    
    if (!this.emailTransporter) {
      console.error('❌ Email transporter not initialized');
      return false;
    }

    const testMailOptions = {
      from: `"Be-Safe Test" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: '🧪 BeSafe Email Service Test',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background:#f0f9ff;">
          <h2>🧪 Email Service Test</h2>
          <p>This is a test email from BeSafe application.</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
          <p>If you receive this email, the email service is working correctly.</p>
        </div>
      `,
    };

    try {
      const info = await this.emailTransporter.sendMail(testMailOptions);
      console.log('✅ Test email sent successfully:', info.messageId);
      console.log('✅ Preview URL:', nodemailer.getTestMessageUrl(info));
      return true;
    } catch (error) {
      console.error('❌ Test email failed:', error);
      console.error('❌ Error details:', {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      });
      return false;
    }
  }
}

export { NotificationService };
export default new NotificationService();