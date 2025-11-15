import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing Supabase connection...');
    
    // 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Supabase environment variables',
          details: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
          },
        },
        { status: 500 }
      );
    }

    // Supabase 클라이언트 import
    try {
      const { supabase } = await import('@/lib/supabase');
      
      // 간단한 쿼리 실행 - 테이블 존재 여부 확인
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Supabase query failed',
            details: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Supabase connection OK',
        environment: {
          supabaseUrl: supabaseUrl.substring(0, 30) + '...',
          keyPrefix: supabaseKey.substring(0, 20) + '...',
        },
        queryResult: data,
      });
    } catch (importErr) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to import Supabase client',
          details: importErr instanceof Error ? importErr.message : String(importErr),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Connection test failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
