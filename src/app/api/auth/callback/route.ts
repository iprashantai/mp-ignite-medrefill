import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth callback handler
 * Medplum redirects here after successful authentication
 * We pass the code to the client-side to complete the OAuth flow
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  // Redirect to callback page with code
  // The client-side will handle exchanging the code for tokens
  if (code) {
    return NextResponse.redirect(
      new URL(`/callback?code=${code}`, request.url)
    );
  }

  // No code or error - redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}
