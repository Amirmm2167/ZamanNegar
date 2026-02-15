import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Read the auth cookie
  const authCookie = request.cookies.get('zaman-auth-cookie');
  
  const url = request.nextUrl.clone();
  const isAuthPage = url.pathname === '/login' || url.pathname === '/register';
  const isPublicAsset = url.pathname.includes('.'); // Simple check for files like icons/images

  let hasToken = false;

  if (authCookie) {
    try {
        // Zustand saves data as: { state: { token: "...", ... }, version: 0 }
        const parsed = JSON.parse(authCookie.value);
        if (parsed.state && parsed.state.token) {
            hasToken = true;
        }
    } catch (e) {
        // Invalid cookie, treat as logged out
    }
  }

  // 2. Redirect Logic
  // A. Protect App Routes
  if (!hasToken && !isAuthPage && !isPublicAsset) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // B. Redirect Logged-in Users away from Login
  if (hasToken && isAuthPage) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// 3. Configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/ (API routes)
     * 2. /_next/ (Next.js internals)
     * 3. /icons/, /fonts/ (Public assets)
     * 4. /manifest.json, /favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icons|fonts|manifest.json).*)',
  ],
};