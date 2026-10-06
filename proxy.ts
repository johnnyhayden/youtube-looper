import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Require Google login for every page and API route except the auth flow itself
export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isSignInPage = pathname === '/signin';

  if (req.auth) {
    if (isSignInPage) {
      return NextResponse.redirect(new URL('/', req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  if (isSignInPage) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const signInUrl = new URL('/signin', req.nextUrl.origin);
  signInUrl.searchParams.set('callbackUrl', pathname + search);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg|.*\\.svg$).*)'],
};
