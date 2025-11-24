/**
 * Auth Debugging Utility
 * Run this to diagnose Google OAuth issues
 */

import { supabase } from './supabase';

export async function debugGoogleAuth() {
  console.group('🔍 Google OAuth Debug Info');

  // 1. Check current session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  console.log('Current Session:', sessionData.session ? 'Active' : 'None');
  if (sessionError) console.error('Session Error:', sessionError);

  // 2. Check Supabase URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  console.log('Supabase URL:', supabaseUrl);

  // 3. Check redirect URL
  const redirectUrl = `${window.location.origin}/auth/callback`;
  console.log('Redirect URL:', redirectUrl);
  console.log('Current Origin:', window.location.origin);

  // 4. Test OAuth flow (without actually initiating)
  console.log('\n📋 Configuration Checklist:');
  console.log('1. Supabase → Auth → URL Configuration');
  console.log('   Site URL:', window.location.origin);
  console.log('   Redirect URLs should include:', redirectUrl);

  console.log('\n2. Supabase → Auth → Providers → Google');
  console.log('   - Enabled: Check if toggled ON');
  console.log('   - Client ID: Should be set');
  console.log('   - Client Secret: Should be set');

  console.log('\n3. Google Cloud Console → Credentials');
  console.log('   Authorized redirect URIs should include:');
  console.log('   - https://[your-supabase-project].supabase.co/auth/v1/callback');

  console.log('\n4. Google Cloud Console → OAuth Consent Screen');
  console.log('   - Status: Published or Testing (with your email added)');

  // 5. Attempt to get OAuth URL (without redirecting)
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true, // Don't actually redirect
      },
    });

    if (error) {
      console.error('\n❌ OAuth Error:', error);
      console.log('Error Details:', {
        message: error.message,
        status: (error as any).status,
      });
    } else {
      console.log('\n✅ OAuth URL generated successfully');
      console.log('Provider:', data.provider);
      console.log('URL:', data.url);
    }
  } catch (err) {
    console.error('\n❌ Unexpected Error:', err);
  }

  console.groupEnd();
}

// Export for console use
if (typeof window !== 'undefined') {
  (window as any).debugGoogleAuth = debugGoogleAuth;
}
