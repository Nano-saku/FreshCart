export const validate = {
  fullName: (s: string) => s.trim().length >= 2 && s.length <= 80,
  email: (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254,
  phone: (s: string) => /^(\+?63|0)9\d{9}$/.test(s.replace(/\s/g, '')),
  password: (s: string) => s.length >= 6 && s.length <= 128,
  address: (s: string) => s.trim().length >= 5 && s.length <= 300,
  notes: (s: string) => s.length <= 500,
  code: (s: string) => s.trim().length === 6 && /^\d+$/.test(s.trim()),
};
