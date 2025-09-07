const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

class AuditLogService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new audit log entry
   */
  async createAuditLog(auditData) {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          ...auditData,
          timestamp: new Date()
        }
      });

      logger.info(`Created audit log for ${auditData.entityType} ${auditData.entityId}`, 'audit-service');
      return auditLog;
    } catch (error) {
      logger.error(`Error creating audit log: ${error.message}`, 'audit-service');
      throw error;
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filters = {}, limit = 50, offset = 0) {
    try {
      const where = {};

      // Build where clause based on filters
      if (filters.entityType) {
        where.entityType = filters.entityType;
      }
      
      if (filters.entityId) {
        where.entityId = parseInt(filters.entityId);
      }
      
      if (filters.action) {
        where.action = filters.action;
      }
      
      if (filters.userId) {
        where.userId = parseInt(filters.userId);
      }
      
      if (filters.userRole) {
        where.userRole = filters.userRole;
      }
      
      if (filters.status) {
        where.status = filters.status;
      }
      
      if (filters.dateFrom) {
        where.timestamp = {
          gte: new Date(filters.dateFrom)
        };
      }
      
      if (filters.dateTo) {
        where.timestamp = {
          ...where.timestamp,
          lte: new Date(filters.dateTo)
        };
      }

      const [auditLogs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset),
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true
              }
            }
          }
        }),
        this.prisma.auditLog.count({ where })
      ]);

      logger.info(`Retrieved ${auditLogs.length} audit logs`, 'audit-service');
      return {
        auditLogs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > parseInt(offset) + parseInt(limit)
        }
      };
    } catch (error) {
      logger.error(`Error getting audit logs: ${error.message}`, 'audit-service');
      throw error;
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityAuditLogs(entityType, entityId, limit = 20, offset = 0) {
    try {
      const [auditLogs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where: {
            entityType,
            entityId: parseInt(entityId)
          },
          orderBy: { timestamp: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset),
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true
              }
            }
          }
        }),
        this.prisma.auditLog.count({
          where: {
            entityType,
            entityId: parseInt(entityId)
          }
        })
      ]);

      logger.info(`Retrieved ${auditLogs.length} audit logs for ${entityType} ${entityId}`, 'audit-service');
      return {
        auditLogs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > parseInt(offset) + parseInt(limit)
        }
      };
    } catch (error) {
      logger.error(`Error getting entity audit logs: ${error.message}`, 'audit-service');
      throw error;
    }
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(userId, limit = 50, offset = 0) {
    try {
      const [auditLogs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where: {
            userId: parseInt(userId)
          },
          orderBy: { timestamp: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        this.prisma.auditLog.count({
          where: {
            userId: parseInt(userId)
          }
        })
      ]);

      logger.info(`Retrieved ${auditLogs.length} audit logs for user ${userId}`, 'audit-service');
      return {
        auditLogs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > parseInt(offset) + parseInt(limit)
        }
      };
    } catch (error) {
      logger.error(`Error getting user audit logs: ${error.message}`, 'audit-service');
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(filters = {}) {
    try {
      const where = {};

      // Apply same filters as getAuditLogs
      if (filters.entityType) where.entityType = filters.entityType;
      if (filters.userId) where.userId = parseInt(filters.userId);
      if (filters.userRole) where.userRole = filters.userRole;
      if (filters.status) where.status = filters.status;
      
      if (filters.dateFrom || filters.dateTo) {
        where.timestamp = {};
        if (filters.dateFrom) where.timestamp.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.timestamp.lte = new Date(filters.dateTo);
      }

      const [total, byStatus, byAction, byEntityType, byUser] = await Promise.all([
        this.prisma.auditLog.count({ where }),
        
        this.prisma.auditLog.groupBy({
          by: ['status'],
          where,
          _count: { status: true }
        }),
        
        this.prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: { action: true }
        }),
        
        this.prisma.auditLog.groupBy({
          by: ['entityType'],
          where,
          _count: { entityType: true }
        }),
        
        this.prisma.auditLog.groupBy({
          by: ['userId'],
          where,
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 10
        })
      ]);

      // Get user details for top users
      const topUserIds = byUser.map(u => u.userId);
      const userDetails = await this.prisma.user.findMany({
        where: {
          id: { in: topUserIds }
        },
        select: {
          id: true,
          email: true,
          role: true
        }
      });

      const topUsers = byUser.map(userStat => {
        const user = userDetails.find(u => u.id === userStat.userId);
        return {
          user: user || { id: userStat.userId, email: 'Unknown', role: 'Unknown' },
          count: userStat._count.userId
        };
      });

      const stats = {
        total,
        byStatus: byStatus.reduce((acc, stat) => {
          acc[stat.status] = stat._count.status;
          return acc;
        }, {}),
        byAction: byAction.reduce((acc, stat) => {
          acc[stat.action] = stat._count.action;
          return acc;
        }, {}),
        byEntityType: byEntityType.reduce((acc, stat) => {
          acc[stat.entityType] = stat._count.entityType;
          return acc;
        }, {}),
        topUsers
      };

      logger.info('Retrieved audit statistics', 'audit-service');
      return stats;
    } catch (error) {
      logger.error(`Error getting audit stats: ${error.message}`, 'audit-service');
      throw error;
    }
  }

  /**
   * Log strategy action
   */
  async logStrategyAction(strategyId, action, userId, userRole, additionalData = {}) {
    try {
      const strategy = await this.prisma.strategy.findUnique({
        where: { id: parseInt(strategyId) },
        select: {
          name: true,
          walletAddress: true,
          exchange: true,
          copyMode: true
        }
      });

      if (!strategy) {
        throw new Error('Strategy not found');
      }

      const auditData = {
        entityType: 'Strategy',
        entityId: parseInt(strategyId),
        action,
        userId,
        userRole,
        oldValues: additionalData.oldValues,
        newValues: additionalData.newValues,
        status: additionalData.status || 'SUCCESS',
        description: additionalData.description || `${action} strategy: ${strategy.name}`,
        metadata: additionalData.metadata
      };

      return await this.createAuditLog(auditData);
    } catch (error) {
      logger.error(`Error logging strategy action: ${error.message}`, 'audit-service');
      throw error;
    }
  }

  /**
   * Log user action
   */
  async logUserAction(userId, action, userRole, additionalData = {}) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: {
          email: true,
          role: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const auditData = {
        entityType: 'User',
        entityId: parseInt(userId),
        action,
        userId,
        userRole,
        oldValues: additionalData.oldValues,
        newValues: additionalData.newValues,
        ipAddress: additionalData.ipAddress,
        userAgent: additionalData.userAgent,
        sessionId: additionalData.sessionId,
        status: additionalData.status || 'SUCCESS',
        description: additionalData.description || `${action} user: ${user.email}`,
        metadata: additionalData.metadata
      };

      return await this.createAuditLog(auditData);
    } catch (error) {
      logger.error(`Error logging user action: ${error.message}`, 'audit-service');
      throw error;
    }
  }

  /**
   * Log system action
   */
  async logSystemAction(action, additionalData = {}) {
    try {
      const auditData = {
        entityType: 'Configuration',
        entityId: 0, // System entity
        action,
        status: additionalData.status || 'SUCCESS',
        description: additionalData.description || `System action: ${action}`,
        metadata: additionalData.metadata
      };

      return await this.createAuditLog(auditData);
    } catch (error) {
      logger.error(`Error logging system action: ${error.message}`, 'audit-service');
      throw error;
    }
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 20) {
    try {
      const activities = await this.prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit),
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

      logger.info(`Retrieved ${activities.length} recent activities`, 'audit-service');
      return activities;
    } catch (error) {
      logger.error(`Error getting recent activity: ${error.message}`, 'audit-service');
      throw error;
    }
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(filters = {}, format = 'json') {
    try {
      const where = {};

      // Apply filters
      if (filters.entityType) where.entityType = filters.entityType;
      if (filters.userId) where.userId = parseInt(filters.userId);
      if (filters.userRole) where.userRole = filters.userRole;
      if (filters.status) where.status = filters.status;
      
      if (filters.dateFrom || filters.dateTo) {
        where.timestamp = {};
        if (filters.dateFrom) where.timestamp.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.timestamp.lte = new Date(filters.dateTo);
      }

      const auditLogs = await this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
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

      if (format === 'csv') {
        return this.convertToCSV(auditLogs);
      }

      return auditLogs;
    } catch (error) {
      logger.error(`Error exporting audit logs: ${error.message}`, 'audit-service');
      throw error;
    }
  }

  /**
   * Convert audit logs to CSV format
   */
  convertToCSV(auditLogs) {
    const headers = [
      'Timestamp',
      'Entity Type',
      'Entity ID',
      'Action',
      'User ID',
      'User Email',
      'User Role',
      'Status',
      'Description',
      'IP Address',
      'User Agent'
    ];

    const rows = auditLogs.map(log => [
      log.timestamp,
      log.entityType,
      log.entityId,
      log.action,
      log.userId,
      log.user?.email || '',
      log.user?.role || '',
      log.status,
      log.description || '',
      log.ipAddress || '',
      log.userAgent || ''
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
  }

  /**
   * Health check for audit service
   */
  async healthCheck() {
    try {
      await this.prisma.auditLog.count();
      return { status: 'healthy', message: 'Audit service is running' };
    } catch (error) {
      logger.error(`Audit service health check failed: ${error.message}`, 'audit-service');
      return { status: 'unhealthy', message: 'Audit service is not responding' };
    }
  }

  /**
   * Clean up resources
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = AuditLogService;