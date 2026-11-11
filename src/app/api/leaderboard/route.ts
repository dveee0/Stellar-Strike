import { NextResponse } from 'next/server';

const defaultScores = [
  { player_name: "CYBER_ACE", score: 25400, wave: 12, wpm: 98, accuracy: 97, rank_title: "LEGENDA GALAKSI (Cyber Ace)", created_at: new Date().toISOString() },
  { player_name: "STAR_PILOT", score: 14200, wave: 7, wpm: 72, accuracy: 94, rank_title: "Komandan Armada (Commander)", created_at: new Date().toISOString() },
  { player_name: "NEO_VIPER", score: 8500, wave: 4, wpm: 55, accuracy: 91, rank_title: "Letnan Tempur (Interceptor)", created_at: new Date().toISOString() }
];

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-id')
  );

  if (isConfigured) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/leaderboard?select=*&order=score.desc&limit=20`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (err) {
      console.warn("Supabase fetch error in Next.js API:", err);
    }
  }

  return NextResponse.json({
    source: 'local',
    isConfigured,
    data: defaultScores
  });
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-id')
  );

  try {
    const body = await req.json();

    if (!body.player_name || typeof body.score !== 'number') {
      return NextResponse.json({ error: 'Data invalid' }, { status: 400 });
    }

    if (isConfigured) {
      const payload = [{
        player_name: String(body.player_name).substring(0, 32),
        score: Math.round(body.score),
        wave: Math.max(1, Math.round(body.wave || 1)),
        wpm: Math.max(0, Math.round(body.wpm || 0)),
        accuracy: Math.min(100, Math.max(0, Math.round(body.accuracy || 100))),
        rank_title: String(body.rank_title || 'Kadet Antariksa').substring(0, 64)
      }];

      const res = await fetch(`${supabaseUrl}/rest/v1/leaderboard`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        return NextResponse.json({ success: true, source: 'supabase', result });
      }
    }

    return NextResponse.json({ success: true, source: 'local' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
