import { query } from "../config/database";
import bcrypt from "bcryptjs";

export interface User {
  id: number;
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "manager" | "user";
  created_at: Date;
  updated_at: Date;
}

export const createUser = async (
  email: string,
  password: string,
  full_name: string,
  role: string
): Promise<User> => {
  const hashed = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO users (email, password, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role, created_at, updated_at`,
    [email, hashed, full_name, role]
  );

  return result.rows[0];
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await query(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
};

export const findUserById = async (id: number): Promise<User | null> => {
  const result = await query(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
};

export const getAllUsers = async (): Promise<User[]> => {
  const result = await query(
    `SELECT id, email, full_name, role, created_at, updated_at
     FROM users
     ORDER BY created_at DESC`
  );
  return result.rows;
};

export const updateUserRole = async (
  id: number,
  role: string
): Promise<User | null> => {
  const result = await query(
    `UPDATE users
     SET role = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, full_name, role, created_at, updated_at`,
    [role, id]
  );
  return result.rows[0] || null;
};

export const deleteUser = async (id: number): Promise<boolean> => {
  const result = await query(`DELETE FROM users WHERE id = $1 RETURNING id`, [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
};

export const verifyPassword = async (
  plain: string,
  hashed: string
): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};
