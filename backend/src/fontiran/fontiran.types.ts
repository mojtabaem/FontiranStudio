export interface FontiranUser {
  id: string;
  phone?: string;
  email?: string;
}

export interface FontiranFontEntitlement {
  fontiranId: string;
  name: string;
}

export interface FontiranAuthResult {
  user: FontiranUser;
  fonts: FontiranFontEntitlement[];
}

export interface FontiranProvider {
  authenticateFromCallback(code: string): Promise<FontiranAuthResult>;
  getEntitlements(fontiranUserId: string): Promise<FontiranAuthResult>;
}

export const FONTIRAN_PROVIDER = 'FONTIRAN_PROVIDER';
