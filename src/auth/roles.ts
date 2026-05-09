export const ROLES = {
  ADMIN: "ADMIN",
  RECEPCIONISTA: "RECEPCIONISTA",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];