const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AdminNotificationService {
    constructor() {
        this.adminEmail = 'manasalperen@gmail.com';
        
        // Gmail SMTP configuration
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER || 'manasalperen@gmail.com',
                pass: process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') : '' // Remove spaces from app password
            }
        });
        
        // Verify transporter
        this.transporter.verify((error, success) => {
            if (error) {
                console.error('[AdminNotification] Email transporter error:', error);
            } else {
                console.log('[AdminNotification] Email service ready');
            }
        });
    }
    
    /**
     * Send email to admin
     */
    async sendEmail(subject, html, text = null) {
        try {
            const mailOptions = {
                from: `"Zenith Trader" <${process.env.GMAIL_USER || 'manasalperen@gmail.com'}>`,
                to: this.adminEmail,
                subject: `[Zenith Trader] ${subject}`,
                html: html,
                text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
            };
            
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
        
        // Also send push notification if admin has it enabled
        await this.sendAdminPushNotification({
            title: '👤 New User',
            body: `${user.email} just signed up!`,
            tag: 'new-user'
        });
    }
    
    /**
     * Notify about position detection
     */
    async notifyPositionDetection(signal) {
        const subject = `Position Detected: ${signal.type} ${signal.token}`;
        const html = `
            <h2>${signal.type === 'BUY' ? '📈' : '📉'} Position Detected</h2>
            <p><strong>Wallet:</strong> ${signal.walletAddress}</p>
            <p><strong>Action:</strong> ${signal.type}</p>
            <p><strong>Token:</strong> ${signal.token}</p>
            <p><strong>Percentage:</strong> ${signal.percentage.toFixed(2)}%</p>
            <p><strong>Value:</strong> $${signal.value.toFixed(2)}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `;
        
        await this.sendEmail(subject, html);
        
        // Push notification
        await this.sendAdminPushNotification({
            title: `${signal.type === 'BUY' ? '📈' : '📉'} ${signal.token}`,
            body: `${signal.type} signal: ${signal.percentage.toFixed(2)}% of portfolio`,
            tag: 'position-signal'
        });
    }
    
    /**
     * Notify about signal execution status
     */
    async notifySignalExecution(signal, success, details) {
        const subject = success ? 
            `✅ Signal Executed: ${signal.token}` : 
            `❌ Signal Failed: ${signal.token}`;
            
        const html = `
            <h2>${success ? '✅ Signal Executed Successfully' : '❌ Signal Execution Failed'}</h2>
            <p><strong>Token:</strong> ${signal.token}</p>
            <p><strong>Type:</strong> ${signal.type}</p>
            <p><strong>Size:</strong> ${signal.sizeInUsdt?.toFixed(2)} USDT</p>
            ${success ? 
                `<p><strong>Order ID:</strong> ${details.orderId}</p>` :
                `<p><strong>Error:</strong> ${details.error}</p>`
            }
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <hr>
            <p><strong>Account Balance:</strong> ${details.balance?.toFixed(2)} USDT</p>
        `;
        
        await this.sendEmail(subject, html);
        
        // Push notification
        await this.sendAdminPushNotification({
            title: success ? '✅ Order Placed' : '❌ Order Failed',
            body: `${signal.token}: ${success ? 'Success' : details.error}`,
            tag: 'signal-execution'
        });
    }
    
    /**
     * Send push notification to admin
     */
    async sendAdminPushNotification(payload) {
        try {
            // Get admin's push subscriptions
            const adminUser = await prisma.user.findUnique({
                where: { email: this.adminEmail },
                include: { pushSubscriptions: { where: { isActive: true } } }
            });
            
            if (!adminUser || !adminUser.pushSubscriptions.length) {
                return;
            }
            
            const webpush = require('web-push');
            webpush.setVapidDetails(
                'mailto:admin@zenithtrader.com',
                process.env.VAPID_PUBLIC_KEY,
                process.env.VAPID_PRIVATE_KEY
            );
            
            for (const sub of adminUser.pushSubscriptions) {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth
                            }
                        },
                        JSON.stringify({
                            ...payload,
                            icon: '/pwa-192x192.png',
                            badge: '/pwa-96x96.svg',
                            requireInteraction: false
                        })
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
            
            // Get today's stats
            const newUsers = await prisma.user.count({
                where: { createdAt: { gte: today } }
            });
            
            const trades = await prisma.trade.count({
                where: { createdAt: { gte: today } }
            });
            
            const strategies = await prisma.strategy.findMany({
                where: { isActive: true },
                include: {
                    trades: {
                        where: { createdAt: { gte: today } }
                    }
                }
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
                    ${strategies.map(s => `
                        <li>${s.name}: ${s.trades.length} trades, PnL: $${s.currentPnL.toFixed(2)}</li>
                    `).join('')}
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
