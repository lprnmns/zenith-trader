const { PrismaClient } = require('@prisma/client');
const webpush = require('web-push');

const prisma = new PrismaClient();

// Configure web-push
webpush.setVapidDetails(
    'mailto:admin@zenithtrader.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

class WalletNotificationService {
    /**
     * Subscribe a user to wallet notifications
     */
    async subscribeToWallet(userId, walletAddress, subscription) {
        try {
            console.log('[WalletNotification] Subscribing user', userId, 'to wallet', walletAddress);
            
            // Check if subscription already exists
            const existingSubscription = await prisma.walletSubscription.findFirst({
                where: {
                    userId,
                    walletAddress
                }
            });
            
            if (existingSubscription) {
                // Update existing subscription
                const walletSub = await prisma.walletSubscription.update({
                    where: { id: existingSubscription.id },
                    data: {
                        subscription: JSON.stringify(subscription),
                        isActive: true
                    }
                });
                console.log('[WalletNotification] Subscription updated with ID:', walletSub.id);
                return walletSub;
            }
            
            // Create new subscription
            const walletSub = await prisma.walletSubscription.create({
                data: {
                    userId,
                    walletAddress,
                    subscription: JSON.stringify(subscription),
                    isActive: true
                }
            });
            
            console.log('[WalletNotification] Subscription created with ID:', walletSub.id);
            
            // Send welcome notification only for push subscriptions (not browser fallbacks)
            const subObj = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
            if (subObj.endpoint !== 'browser-notification') {
                await this.sendNotification(subscription, {
                    title: '🔔 Wallet Tracking Active',
                    body: `You will receive notifications for wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
                    icon: '/pwa-192x192.png',
                    badge: '/pwa-96x96.svg',
                    data: { walletAddress }
                });
            }
            
            return walletSub;
        } catch (error) {
            console.error('[WalletNotification] Subscribe error:', error);
            throw error;
        }
    }
    
    /**
     * Unsubscribe from wallet notifications
     */
    async unsubscribeFromWallet(userId, walletAddress) {
        try {
            console.log('[WalletNotification] Unsubscribing user', userId, 'from wallet', walletAddress);
            
            await prisma.walletSubscription.updateMany({
                where: {
                    userId,
                    walletAddress
                },
                data: {
                    isActive: false
                }
            });
            
            console.log('[WalletNotification] Unsubscribed successfully');
            return true;
        } catch (error) {
            console.error('[WalletNotification] Unsubscribe error:', error);
            throw error;
        }
    }
    
    /**
     * Check if user is subscribed to a wallet
     */
    async isSubscribedToWallet(userId, walletAddress) {
        try {
            const subscription = await prisma.walletSubscription.findFirst({
                where: {
                    userId,
                    walletAddress,
                    isActive: true
                }
            });
            
            console.log('[WalletNotification] Subscription check:', !!subscription);
            return !!subscription;
        } catch (error) {
            console.error('[WalletNotification] Check subscription error:', error);
            return false;
        }
    }
    
    /**
     * Get user's wallet subscriptions
     */
    async getUserSubscriptions(userId) {
        try {
            const subscriptions = await prisma.walletSubscription.findMany({
                where: {
                    userId,
                    isActive: true
                },
                select: {
                    id: true,
                    walletAddress: true,
                    createdAt: true
                }
            });
            
            return subscriptions;
        } catch (error) {
            console.error('[WalletNotification] Get subscriptions error:', error);
            throw error;
        }
    }
    
    /**
     * Send notification to a subscription
     */
    async sendNotification(subscription, payload) {
        try {
            const sub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
            
            // Skip browser notification fallbacks (they're handled by the frontend)
            if (sub.endpoint === 'browser-notification') {
                console.log('[WalletNotification] Skipping browser notification fallback - handled by frontend');
                return true;
            }
            
            await webpush.sendNotification(sub, JSON.stringify(payload));
            return true;
        } catch (error) {
            console.error('[WalletNotification] Send notification error:', error);
            if (error.statusCode === 410) {
                // Subscription expired, remove it
                console.log('[WalletNotification] Subscription expired, removing...');
                // Handle expired subscription
            }
            return false;
        }
    }
    
    /**
     * Notify about wallet activity
     */
    async notifyWalletActivity(walletAddress, activity) {
        try {
            // Get all active subscriptions for this wallet
            const subscriptions = await prisma.walletSubscription.findMany({
                where: {
                    walletAddress,
                    isActive: true
                }
            });
            
            console.log(`[WalletNotification] Sending notifications for wallet ${walletAddress} to ${subscriptions.length} subscribers`);
            
            for (const sub of subscriptions) {
                const payload = {
                    title: `🚀 Wallet Activity`,
                    body: this.formatActivityMessage(activity),
                    icon: '/pwa-192x192.png',
                    badge: '/pwa-96x96.svg',
                    data: {
                        walletAddress,
                        activity
                    },
                    tag: `wallet-${walletAddress}`,
                    renotify: true,
                    requireInteraction: false,
                    actions: [
                        {
                            action: 'view',
                            title: 'View Details'
                        }
                    ]
                };
                
                await this.sendNotification(sub.subscription, payload);
            }
            
            return subscriptions.length;
        } catch (error) {
            console.error('[WalletNotification] Notify activity error:', error);
            throw error;
        }
    }
    
    /**
     * Format activity message for notification
     */
    formatActivityMessage(activity) {
        const { type, token, amount, percentage, action } = activity;
        
        if (type === 'BUY') {
            return `📈 Bought ${token}: ${percentage.toFixed(2)}% of portfolio`;
        } else if (type === 'SELL') {
            return `📉 Sold ${token}: ${percentage.toFixed(2)}% of portfolio`;
        } else if (type === 'SWAP') {
            return `🔄 Swapped ${activity.fromToken} to ${activity.toToken}`;
        } else {
            return `Activity detected on tracked wallet`;
        }
    }
}

module.exports = new WalletNotificationService();