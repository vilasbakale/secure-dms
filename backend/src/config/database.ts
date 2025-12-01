import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Checks if a specific table exists
const tableExists = async (tableName: string) => {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables 
       WHERE table_schema='public' AND table_name=$1
     )`,
    [tableName]
  );

  return result.rows[0].exists;
};

export const initDatabase = async () => {
  try {
    const client = await pool.connect();

    // Check if a key table exists (example: users)
    const usersTable = await tableExists("users");

    if (!usersTable) {
      console.log("⛔ No users table found — running migrations...");

      const sqlPath = path.join(__dirname, '../../migrations/init.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');

      await client.query(sql);
      console.log('✅ Database initialized (first-time migration)');
    } else {
      console.log('✅ Database already initialized — skipping migrations');
    }

    client.release();
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;
