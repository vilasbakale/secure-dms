import { query } from "../config/database";

export interface Client {
  id: number;
  name: string;
  contact_person: string;
  contact_email?: string;
  contact_phone?: string;
  folder_path: string;
  notes?: string;
  created_at: Date;
}

export const createClient = async (
  name: string,
  contactPerson: string,
  contactEmail: string | null,
  contactPhone: string | null,
  folderPath: string,
  notes: string | null
): Promise<Client> => {
  const result = await query(
    `INSERT INTO clients 
      (name, contact_person, contact_email, contact_phone, folder_path, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, contactPerson, contactEmail, contactPhone, folderPath, notes]
  );

  return result.rows[0];
};

export const getClients = async (): Promise<Client[]> => {
  const result = await query(
    `SELECT id, name, contact_person, folder_path, created_at 
     FROM clients 
     ORDER BY created_at DESC`
  );
  return result.rows;
};

export const getClientById = async (id: number): Promise<Client | null> => {
  const result = await query(
    "SELECT * FROM clients WHERE id = $1",
    [id]
  );

  return result.rows[0] || null;
};
