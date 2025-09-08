const { PrismaClient } = require('@prisma/client');
const adminNotificationService = require('./adminNotificationService');

const prisma = new PrismaClient();

class UpgradeRequestService {
    /**
     * Create a new upgrade request
     */
    async createUpgradeRequest(userId, requestData) {
        try {
            console.log('[UpgradeRequest] Creating upgrade request for user:', userId);

            // Check if user already has a pending request
            const existingRequest = await prisma.upgradeRequest.findFirst({
                where: {
                    userId,
                    status: 'PENDING'
                }
            });

            if (existingRequest) {
                throw new Error('You already have a pending upgrade request. Please wait for it to be processed.');
            }

            // Get user details
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Create upgrade request
            const upgradeRequest = await prisma.upgradeRequest.create({
                data: {
                    userId,
                    email: requestData.email || user.email,
                    contactInfo: requestData.contactInfo,
                    message: requestData.message,
                    status: 'PENDING'
                }
            });

            console.log('[UpgradeRequest] Request created with ID:', upgradeRequest.id);

            // Send email notification to admin
            await this.sendUpgradeRequestEmail(upgradeRequest, user);

            return upgradeRequest;
        } catch (error) {
            console.error('[UpgradeRequest] Create error:', error);
            throw error;
        }
    }

    /**
     * Get upgrade requests for a user
     */
    async getUserUpgradeRequests(userId) {
        try {
            const requests = await prisma.upgradeRequest.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            });
            return requests;
        } catch (error) {
            console.error('[UpgradeRequest] Get user requests error:', error);
            throw error;
        }
    }

    /**
     * Get all upgrade requests (admin only)
     */
    async getAllUpgradeRequests(status = null) {
        try {
            const where = status ? { status } : {};
            
            const requests = await prisma.upgradeRequest.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            role: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return requests;
        } catch (error) {
            console.error('[UpgradeRequest] Get all requests error:', error);
            throw error;
        }
    }

    /**
     * Update upgrade request status (admin only)
     */
    async updateUpgradeRequestStatus(requestId, status, adminNotes = null) {
        try {
            console.log('[UpgradeRequest] Updating request status:', requestId, 'to:', status);

            const upgradeRequest = await prisma.upgradeRequest.update({
                where: { id: requestId },
                data: {
                    status,
                    adminNotes,
                    updatedAt: new Date()
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            role: true
                        }
                    }
                }
            });

            console.log('[UpgradeRequest] Request status updated successfully');

            // If approved, update user role
            if (status === 'APPROVED') {
                await this.upgradeUserRole(upgradeRequest.userId);
            }

            // Send status update email to user
            await this.sendStatusUpdateEmail(upgradeRequest);

            return upgradeRequest;
        } catch (error) {
            console.error('[UpgradeRequest] Update status error:', error);
            throw error;
        }
    }

    /**
     * Upgrade user role to ADMIN
     */
    async upgradeUserRole(userId) {
        try {
            console.log('[UpgradeRequest] Upgrading user role for user:', userId);

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { role: 'ADMIN' }
            });

            console.log('[UpgradeRequest] User role upgraded to ADMIN');
            return updatedUser;
        } catch (error) {
            console.error('[UpgradeRequest] Upgrade user role error:', error);
            throw error;
        }
    }

    /**
     * Send upgrade request email to admin
     */
    async sendUpgradeRequestEmail(upgradeRequest, user) {
        try {
            const subject = `New Upgrade Request - ${user.email}`;
            
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #10b981; margin-bottom: 20px;">New Upgrade Request Received</h2>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 15px 0; color: #1f2937;">User Information</h3>
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
                        <p style="margin: 5px 0;"><strong>User ID:</strong> ${user.id}</p>
                        <p style="margin: 5px 0;"><strong>Current Role:</strong> ${user.role}</p>
                        <p style="margin: 5px 0;"><strong>Request Date:</strong> ${new Date(upgradeRequest.createdAt).toLocaleString()}</p>
                    </div>

                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 15px 0; color: #1f2937;">Request Details</h3>
                        <p style="margin: 5px 0;"><strong>Contact Info:</strong> ${upgradeRequest.contactInfo || 'Not provided'}</p>
                        <p style="margin: 5px 0;"><strong>Message:</strong></p>
                        <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #10b981;">
                            ${upgradeRequest.message || 'No additional message provided'}
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.ADMIN_URL || 'http://localhost:3001'}/admin/upgrade-requests" 
                           style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            View Request in Admin Panel
                        </a>
                    </div>
                </div>
            `;

            const success = await adminNotificationService.sendEmail(subject, html);
            
            if (success) {
                console.log('[UpgradeRequest] Upgrade request email sent to admin');
            } else {
                console.error('[UpgradeRequest] Failed to send upgrade request email');
            }
        } catch (error) {
            console.error('[UpgradeRequest] Send upgrade request email error:', error);
        }
    }

    /**
     * Send status update email to user
     */
    async sendStatusUpdateEmail(upgradeRequest) {
        try {
            const subject = `Your Upgrade Request Status Update`;
            
            const statusColors = {
                'APPROVED': '#10b981',
                'REJECTED': '#ef4444',
                'PENDING': '#f59e0b'
            };

            const statusMessages = {
                'APPROVED': 'Congratulations! Your upgrade request has been approved.',
                'REJECTED': 'We regret to inform you that your upgrade request has been rejected.',
                'PENDING': 'Your upgrade request is still under review.'
            };

            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: ${statusColors[upgradeRequest.status]}; margin-bottom: 20px;">
                        Upgrade Request Status Update
                    </h2>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 15px 0; color: #1f2937;">Request Status</h3>
                        <div style="font-size: 18px; font-weight: bold; color: ${statusColors[upgradeRequest.status]}; margin-bottom: 10px;">
                            ${upgradeRequest.status}
                        </div>
                        <p style="margin: 10px 0;">${statusMessages[upgradeRequest.status]}</p>
                        ${upgradeRequest.adminNotes ? `
                            <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #6b7280; margin-top: 15px;">
                                <strong>Admin Notes:</strong><br>
                                ${upgradeRequest.adminNotes}
                            </div>
                        ` : ''}
                    </div>

                    ${upgradeRequest.status === 'APPROVED' ? `
                        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #10b981;">
                            <h3 style="margin: 0 0 15px 0; color: #059669;">What's Next?</h3>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>You now have full access to all premium features</li>
                                <li>You can create and manage automated trading strategies</li>
                                <li>Access to advanced analytics and reporting</li>
                                <li>Priority support and future updates</li>
                            </ul>
                            <p style="margin: 15px 0 0 0;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
                                   style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                    Go to Dashboard
                                </a>
                            </p>
                        </div>
                    ` : ''}

                    <div style="text-align: center; margin-top: 30px; color: #6b7280;">
                        <p>Request ID: #${upgradeRequest.id}</p>
                        <p>Updated: ${new Date(upgradeRequest.updatedAt).toLocaleString()}</p>
                    </div>
                </div>
            `;

            const success = await adminNotificationService.sendEmail(subject, html, `Your upgrade request status has been updated to: ${upgradeRequest.status}`);
            
            if (success) {
                console.log('[UpgradeRequest] Status update email sent to user');
            } else {
                console.error('[UpgradeRequest] Failed to send status update email');
            }
        } catch (error) {
            console.error('[UpgradeRequest] Send status update email error:', error);
        }
    }

    /**
     * Get upgrade request statistics
     */
    async getStatistics() {
        try {
            const stats = await prisma.upgradeRequest.groupBy({
                by: ['status'],
                _count: {
                    id: true
                },
                orderBy: {
                    status: 'asc'
                }
            });

            const total = await prisma.upgradeRequest.count();

            return {
                byStatus: stats.reduce((acc, stat) => {
                    acc[stat.status] = stat._count.id;
                    return acc;
                }, {}),
                total
            };
        } catch (error) {
            console.error('[UpgradeRequest] Get statistics error:', error);
            throw error;
        }
    }
}

module.exports = new UpgradeRequestService();