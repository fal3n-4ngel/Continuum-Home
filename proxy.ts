import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    if (request.nextUrl.searchParams.has('logout')) {
      const response = NextResponse.next();
      response.cookies.delete('continuum_logged_in');
      return response;
    }
    const isAuth = request.cookies.get('continuum_logged_in')?.value === '1';
    if (isAuth) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
