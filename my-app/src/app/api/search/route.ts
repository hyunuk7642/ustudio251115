/**
 * API Route: /api/search
 * 
 * 직업 검색을 처리하는 API 엔드포인트
 * 
 * 요청:
 * - GET /api/search?keyword=개발자
 * - GET /api/search?category=IT
 * - POST /api/search (JSON body with keyword/category)
 * 
 * 응답:
 * {
 *   "success": boolean,
 *   "data": CareerNetJob[],
 *   "error": string | null
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchJobs, searchJobsByCategory, CareerNetJob } from '@/lib/careernet';
import { supabase, logSearch } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');
    const category = searchParams.get('category');
    const sessionId = searchParams.get('session_id');

    if (!keyword && !category) {
      return NextResponse.json(
        {
          success: false,
          error: '키워드 또는 카테고리를 입력해주세요',
        },
        { status: 400 }
      );
    }

    let results: CareerNetJob[] = [];

    if (keyword) {
      results = await searchJobs(keyword);
      
      // 세션이 제공되면 검색 기록 저장
      if (sessionId) {
        try {
          await logSearch(sessionId, keyword, results.length);
        } catch (err) {
          console.error('Failed to log search:', err);
          // 검색은 계속 진행
        }
      }
    } else if (category) {
      results = await searchJobsByCategory(category);
      
      // 세션이 제공되면 검색 기록 저장
      if (sessionId) {
        try {
          await logSearch(sessionId, `category:${category}`, results.length);
        } catch (err) {
          console.error('Failed to log search:', err);
          // 검색은 계속 진행
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '검색 중 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, category, session_id } = body;

    if (!keyword && !category) {
      return NextResponse.json(
        {
          success: false,
          error: '키워드 또는 카테고리를 입력해주세요',
        },
        { status: 400 }
      );
    }

    let results: CareerNetJob[] = [];

    if (keyword) {
      results = await searchJobs(keyword);
      
      // 세션이 제공되면 검색 기록 저장
      if (session_id) {
        try {
          await logSearch(session_id, keyword, results.length);
        } catch (err) {
          console.error('Failed to log search:', err);
        }
      }
    } else if (category) {
      results = await searchJobsByCategory(category);
      
      // 세션이 제공되면 검색 기록 저장
      if (session_id) {
        try {
          await logSearch(session_id, `category:${category}`, results.length);
        } catch (err) {
          console.error('Failed to log search:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '검색 중 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
