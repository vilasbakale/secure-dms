import jwt from 'jsonwebtoken';

export const generateToken = (payload: any): string => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  return jwt.sign(payload, secret, { expiresIn: '24h' } as any);
};

export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  return jwt.verify(token, secret);
};
