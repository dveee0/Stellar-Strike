import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-id')
  );

  return NextResponse.json({
    supabaseUrl: isConfigured ? supabaseUrl : '',
    supabaseAnonKey: isConfigured ? supabaseAnonKey : '',
    isConfigured
  });
}
