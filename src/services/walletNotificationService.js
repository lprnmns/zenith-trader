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
            
            // Create or update wallet notification record
            const walletSub = await prisma.userWalletNotification.upsert({
                where: {
                    userId_walletAddress: {
                        userId,
                        walletAddress
                    }
                },
                update: {
                    isActive: true
                },
                create: {
                    userId,
                    walletAddress,
                    isActive: true
                }
            });
            
            console.log('[WalletNotification] Wallet notification record created/updated with ID:', walletSub.id);
            
            // For push subscriptions, also create/update push subscription record
            const subObj = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
            if (subObj.endpoint !== 'browser-notification') {
                // Create push subscription
                await prisma.pushSubscription.upsert({
                    where: {
                        endpoint: subObj.endpoint
                    },
                    update: {
                        p256dh: subObj.keys.p256dh,
                        auth: subObj.keys.auth,
                        keys: subObj.keys,
                        isActive: true,
                        lastUsed: new Date()
                    },
                    create: {
                        userId,
                        endpoint: subObj.endpoint,
                        p256dh: subObj.keys.p256dh,
                        auth: subObj.keys.auth,
                        keys: subObj.keys,
                        isActive: true,
                        userAgent: 'Unknown' // navigator is not available in backend
                    }
                });
                
                console.log('[WalletNotification] Push subscription created/updated');
                
                // Send welcome notification
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
            
            await prisma.userWalletNotification.updateMany({
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
            const subscription = await prisma.userWalletNotification.findFirst({
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
            const subscriptions = await prisma.userWalletNotification.findMany({
                where: {
                    userId,
                    isActive: true
                },
                orderBy: {
                    createdAt: 'desc'
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
            // Get all active wallet notifications for this wallet
            const walletNotifications = await prisma.userWalletNotification.findMany({
                where: {
                    walletAddress,
                    isActive: true
                },
                include: {
                    user: {
                        include: {
                            pushSubscriptions: {
                                where: {
                                    isActive: true
                                }
                            }
                        }
                    }
                }
            });
            
            console.log(`[WalletNotification] Sending notifications for wallet ${walletAddress} to ${walletNotifications.length} subscribers`);
            
            let notificationCount = 0;
            
            for (const walletNotif of walletNotifications) {
                // Send to all active push subscriptions for this user
                for (const pushSub of walletNotif.user.pushSubscriptions) {
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
                    
                    const subscription = {
                        endpoint: pushSub.endpoint,
                        keys: {
                            auth: pushSub.auth,
                            p256dh: pushSub.p256dh
                        }
                    };
                    
                    await this.sendNotification(subscription, payload);
                    notificationCount++;
                }
            }
            
            // Update notification tracking for all notified users
            for (const walletNotif of walletNotifications) {
                await prisma.userWalletNotification.update({
                    where: { id: walletNotif.id },
                    data: {
                        lastNotificationAt: new Date(),
                        notificationCount: {
                            increment: 1
                        }
                    }
                });
            }
            
            console.log(`[WalletNotification] Sent ${notificationCount} push notifications and updated tracking`);
            return notificationCount;
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