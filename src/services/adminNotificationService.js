const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AdminNotificationService {
  constructor() {
    // Resolve SMTP configuration with flexible ENV support
    const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465', 10);
    const smtpSecure = String(process.env.SMTP_SECURE || process.env.EMAIL_SECURE || (smtpPort === 465 ? 'true' : 'false'))
      .toLowerCase() === 'true';
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER || 'manasalperen@gmail.com';
    const smtpPassRaw = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '';
    const smtpPass = typeof smtpPassRaw === 'string' ? smtpPassRaw.replace(/\s/g, '') : '';

    this.adminEmail = process.env.ADMIN_EMAIL || process.env.VAPID_CONTACT_EMAIL || smtpUser;
    this.fromAddress = process.env.EMAIL_FROM || `"Zenith Trader" <${smtpUser}>`;

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Verify transporter once at startup
    this.transporter.verify((error) => {
      if (error) {
        console.error('[AdminNotification] Email transporter error:', error);
      } else {
        console.log('[AdminNotification] Email service ready');
      }
    });
  }

  // Helpers
  static stripHtml(input) {
    const s = typeof input === 'string' ? input : String(input ?? '');
    return s.replace(/<[^>]*>/g, '');
  }

  /**
   * Send email
   * Supports two call signatures:
   *  - sendEmail(subject, html, text?)
   *  - sendEmail({ from, to, subject, html, text })
   */
  async sendEmail(arg1, arg2, arg3) {
    try {
      let mailOptions;
      if (typeof arg1 === 'object' && arg1 !== null) {
        const { from, to, subject, html, text } = arg1;
        mailOptions = {
          from: from || this.fromAddress,
          to: to || this.adminEmail,
          subject: subject || '[Zenith Trader] Notification',
          html: typeof html === 'string' ? html : undefined,
          text: typeof text === 'string' ? text : (typeof html === 'string' ? AdminNotificationService.stripHtml(html) : ''),
        };
      } else {
        const subject = String(arg1 ?? 'Notification');
        const html = typeof arg2 === 'string' ? arg2 : '';
        const text = typeof arg3 === 'string' ? arg3 : (html ? AdminNotificationService.stripHtml(html) : '');
        mailOptions = {
          from: this.fromAddress,
          to: this.adminEmail,
          subject: `[Zenith Trader] ${subject}`,
          html,
          text,
        };
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[AdminNotification] Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('[AdminNotification] Email send error:', error);
      return false;
    }
  }

  /**
   * Notify about new user registration
   */
  async notifyNewUser(user) {
    const subject = 'New User Registration';
    const html = `
      <h2>🎉 New User Registered</h2>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Role:</strong> ${user.role}</p>
      <p><strong>Registration Type:</strong> ${user.googleId ? 'Google OAuth' : 'Email/Password'}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <hr>
      <p>Total users: ${await prisma.user.count()}</p>
    `;

    await this.sendEmail(subject, html);

    await this.sendAdminPushNotification({
      title: '👤 New User',
      body: `${user.email} just signed up!`,
      tag: 'new-user',
    });
  }

  /**
   * Notify about position detection
   */
  async notifyPositionDetection(signal) {
    const subject = `Position Detected: ${signal.type} ${signal.token}`;
    const value = signal.value || 0;
    const percentage = signal.percentage || 0;

    const html = `
      <h2>${signal.type === 'BUY' ? '📈' : '📉'} Position Detected</h2>
      <p><strong>Wallet:</strong> ${signal.walletAddress}</p>
      <p><strong>Action:</strong> ${signal.type}</p>
      <p><strong>Token:</strong> ${signal.token}</p>
      <p><strong>Percentage:</strong> ${percentage.toFixed(2)}%</p>
      <p><strong>Value:</strong> $${value.toFixed(2)}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    `;

    await this.sendEmail(subject, html);

    await this.sendAdminPushNotification({
      title: `${signal.type === 'BUY' ? '📈' : '📉'} ${signal.token}`,
      body: `${signal.type} signal: ${percentage.toFixed(2)}% of portfolio`,
      tag: 'position-signal',
    });
  }

  /**
   * Notify about signal execution status
   */
  async notifySignalExecution(signal, success, details) {
    const subject = success ? `✅ Signal Executed: ${signal.token}` : `❌ Signal Failed: ${signal.token}`;

    const sizeInUsdt = signal.sizeInUsdt || 0;
    const balance = details?.balance || 0;

    const html = `
      <h2>${success ? '✅ Signal Executed Successfully' : '❌ Signal Execution Failed'}</h2>
      <p><strong>Token:</strong> ${signal.token}</p>
      <p><strong>Type:</strong> ${signal.type}</p>
      <p><strong>Size:</strong> ${sizeInUsdt.toFixed(2)} USDT</p>
      ${success ? `<p><strong>Order ID:</strong> ${details.orderId || 'N/A'}</p>` : `<p><strong>Error:</strong> ${details.error || 'Unknown error'}</p>`}
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <hr>
      <p><strong>Account Balance:</strong> ${balance.toFixed(2)} USDT</p>
    `;

    await this.sendEmail(subject, html);

    await this.sendAdminPushNotification({
      title: success ? '✅ Order Placed' : '❌ Order Failed',
      body: `${signal.token}: ${success ? 'Success' : (details.error || 'Unknown error')}`,
      tag: 'signal-execution',
    });
  }

  /**
   * Send push notification to admin
   */
  async sendAdminPushNotification(payload) {
    try {
      const adminUser = await prisma.user.findUnique({
        where: { email: this.adminEmail },
        include: { pushSubscriptions: { where: { isActive: true } } },
      });

      if (!adminUser || !adminUser.pushSubscriptions.length) return;

      const webpush = require('web-push');
      webpush.setVapidDetails(
        'mailto:admin@zenithtrader.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );

      for (const sub of adminUser.pushSubscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
              ...payload,
              icon: '/pwa-192x192.png',
              badge: '/pwa-96x96.svg',
              requireInteraction: false,
            }),
          );
        } catch (error) {
          console.error('[AdminNotification] Push error:', error);
        }
      }
    } catch (error) {
      console.error('[AdminNotification] Push notification error:', error);
    }
  }

  /**
   * Daily summary email
   */
  async sendDailySummary() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newUsers = await prisma.user.count({ where: { createdAt: { gte: today } } });
      const trades = await prisma.trade.count({ where: { createdAt: { gte: today } } });
      const strategies = await prisma.strategy.findMany({
        where: { isActive: true },
        include: { trades: { where: { createdAt: { gte: today } } } },
      });

      const html = `
        <h2>📊 Daily Summary - ${today.toLocaleDateString()}</h2>
        <h3>📈 Statistics</h3>
        <ul>
          <li>New Users: ${newUsers}</li>
          <li>Total Trades: ${trades}</li>
          <li>Active Strategies: ${strategies.length}</li>
        </ul>
        <h3>🎯 Strategy Performance</h3>
        <ul>
          ${strategies.map(s => `<li>${s.name}: ${s.trades.length} trades, PnL: $${(s.currentPnL || 0).toFixed(2)}</li>`).join('')}
        </ul>
        <hr>
        <p><em>Automated daily report from Zenith Trader</em></p>
      `;

      await this.sendEmail('Daily Summary', html);
    } catch (error) {
      console.error('[AdminNotification] Daily summary error:', error);
    }
  }
}

module.exports = new AdminNotificationService();
