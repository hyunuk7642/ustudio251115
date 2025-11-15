import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Test API called');
    
    // Import 테스트
    try {
      const { searchJobs } = await import('@/lib/careernet');
      console.log('searchJobs imported successfully');
    } catch (importErr) {
      console.error('Import error:', importErr);
      return NextResponse.json(
        {
          success: false,
          error: 'Import error',
          details: importErr instanceof Error ? importErr.message : String(importErr),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test API working',
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test API error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
