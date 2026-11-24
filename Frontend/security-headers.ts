/**
 * HTTP security headers for the website's pages (Stage 8).
 *
 * The API sets its own headers (helmet, Backend/src/app.ts). These are for
 * the HTML, scripts, styles, fonts and images of the website itself.
 *
 * - PRODUCTION_SECURITY_HEADERS: for the built site (`vite build`). Served by
 *   `vite preview`, and the SAME list must be configured on the production
 *   host in Stage 9 (headers can't be set from inside the page itself).
 * - DEVELOPMENT_SECURITY_HEADERS: for `vite` (dev server). Vite's live reload
 *   injects inline scripts and uses a WebSocket, so the strict script policy
 *   can't apply in development; everything else does.
 */

/**
 * Content-Security-Policy for the built site. Everything comes from the site
 * itself: no inline scripts, no third-party scripts, styles, fonts or images.
 * (React and the animation library set styles through the CSSOM, which
 * style-src does not restrict.)
 *
 * @param apiOrigin extra origin the browser may call, when VITE_API_BASE_URL
 *   points the website at an API on another address.
 */
export function contentSecurityPolicy(apiOrigin?: string) {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // No other website may show these pages in a frame (clickjacking).
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Headers that apply everywhere, development included. */
const COMMON: Record<string, string> = {
  // Old-browser equivalent of frame-ancestors 'none'.
  'X-Frame-Options': 'DENY',
  // Don't let browsers guess file types (e.g. treat an upload as a script).
  'X-Content-Type-Options': 'nosniff',
  // Send only the site's origin to other websites, never full URLs (which can
  // contain admin search terms such as customer names).
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // The site uses none of these browser features; nothing embedded may either.
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  // Pages opened from this site can't reach back into it via window.opener.
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export function productionSecurityHeaders(apiOrigin?: string): Record<string, string> {
  return { ...COMMON, 'Content-Security-Policy': contentSecurityPolicy(apiOrigin) };
}

export const DEVELOPMENT_SECURITY_HEADERS: Record<string, string> = {
  ...COMMON,
  'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
};
