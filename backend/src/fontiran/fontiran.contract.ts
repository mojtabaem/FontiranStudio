/**
 * Fontiran.com ↔ Fontiran Studio API contract.
 *
 * Studio implements this as a provider interface.
 * Current runtime uses MockFontiranProvider.
 * When Fontiran.com is ready, implement RealFontiranProvider against these shapes.
 */

/** User identity returned by Fontiran after OAuth / SSO. */
export interface FontiranUserDto {
  id: string;
  phone?: string;
  email?: string;
}

/** A font product the user has purchased / is entitled to use. */
export interface FontiranFontEntitlementDto {
  /** Stable ID on Fontiran.com — Studio maps this to a local FontFamily.fontiranId */
  fontiranId: string;
  /** Display name (Persian), e.g. "ایران سنس" */
  name: string;
}

/**
 * Expected response after a successful Fontiran login callback.
 * Fontiran redirects the browser to Studio with a one-time `code`;
 * Studio backend exchanges it (server-to-server) and receives this payload.
 *
 * Suggested Fontiran endpoint (to implement later):
 *   POST https://fontiran.com/api/studio/auth/exchange
 *   Body: { code: string, clientId: string, clientSecret: string }
 *   Response: FontiranAuthResultDto
 */
export interface FontiranAuthResultDto {
  user: FontiranUserDto;
  fonts: FontiranFontEntitlementDto[];
}

/**
 * Optional future sync: Fontiran pushes font catalog metadata (NOT binary files).
 * Studio still stores/serves the actual font files itself.
 *
 * Suggested endpoint:
 *   GET https://fontiran.com/api/studio/fonts
 *   Response: FontiranFontCatalogItemDto[]
 */
export interface FontiranFontCatalogItemDto {
  fontiranId: string;
  name: string;
  nameEn?: string;
  isVariable?: boolean;
  /** Package tier label shown in profile, e.g. "بسته حرفه‌ای" */
  packageLabel?: string;
  productUrl?: string;
}
