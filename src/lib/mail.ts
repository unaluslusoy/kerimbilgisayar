import nodemailer from 'nodemailer';
import { db } from '../db/index';
import { settings } from '../db/schema';
import { eq } from 'drizzle-orm';

async function getSmtpSettings() {
  const allSettings = await db.select().from(settings);
  const map: Record<string, string> = {};
  allSettings.forEach(s => {
    if (s.value) map[s.key] = s.value;
  });
  return map;
}

export async function sendTicketEmail(to: string, subject: string, html: string) {
  try {
    const config = await getSmtpSettings();
    
    if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
      console.warn('SMTP settings are incomplete. Skipping email to:', to);
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port || '587'),
      secure: config.smtp_port === '465', 
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass,
      },
    });

    const fromName = config.smtp_from_name || 'Kerim Bilgisayar';
    const fromAddress = config.smtp_user;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      html,
    });

    console.log('Email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export function getStatusEmailTemplate(customerName: string, ticketNumber: string, deviceName: string, statusText: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #16a34a; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0;">Kerim Bilgisayar Teknik Servis</h2>
      </div>
      <div style="padding: 30px; background-color: #ffffff; color: #374151;">
        <p style="font-size: 16px;">Sayın <strong>${customerName}</strong>,</p>
        <p style="font-size: 16px;"><strong>${deviceName}</strong> cihazınıza ait servis kaydınızın durumu güncellenmiştir.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Kayıt Numarası:</p>
          <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold; color: #111827;">${ticketNumber}</p>
          
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Yeni Durum:</p>
          <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #16a34a;">${statusText}</p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; line-height: 1.5;">Detaylı bilgi ve servis takibi için müşteri panelinize giriş yapabilirsiniz. Bizi tercih ettiğiniz için teşekkür ederiz.</p>
      </div>
      <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
        © ${new Date().getFullYear()} Kerim Bilgisayar - Tüm Hakları Saklıdır.
      </div>
    </div>
  `;
}
