import { query } from '../config/database';

export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  details?: any;
  ip_address?: string;
  created_at: Date;
}

export const createAuditLog = async (
  userId: number,
  action: string,
  entityType: string,
  entityId?: number,
  details?: any,
  ipAddress?: string
): Promise<AuditLog> => {
  const result = await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, action, entityType, entityId, details, ipAddress]
  );
  
  return result.rows[0];
};

export const getAuditLogs = async (limit: number = 100): Promise<AuditLog[]> => {
  const result = await query(
    `SELECT al.*, u.email, u.full_name 
     FROM audit_logs al 
     LEFT JOIN users u ON al.user_id = u.id 
     ORDER BY al.created_at DESC 
     LIMIT $1`,
    [limit]
  );
  
  return result.rows;
};
