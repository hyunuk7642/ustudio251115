/**
 * CareerNet API 통합
 * 
 * CareerNet은 한국의 직업 정보 포털(career.go.kr)에서 제공하는 API입니다.
 * 이 파일은 CareerNet API와의 통신을 관리합니다.
 */

import axios from 'axios';

// CareerNet API Base URL
// 실제 API를 사용하려면 career.go.kr에서 API Key를 발급받아야 합니다.
const CAREERNET_API_BASE = 'https://api.career.go.kr'; // 예시 URL
const API_KEY = process.env.CAREERNET_API_KEY || 'demo';

/**
 * 직업 검색 결과 타입
 */
export interface CareerNetJob {
  code: string;
  name: string;
  category: string;
  description: string;
  averageSalary?: string;
  employmentRate?: string;
  mainTasks?: string;
  requiredSkills?: string;
  careerPath?: string;
  workEnvironment?: string;
  workingHours?: string;
}

/**
 * CareerNet API 클라이언트
 */
class CareerNetClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = CAREERNET_API_BASE, apiKey: string = API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * 키워드로 직업 검색
   * @param keyword 검색 키워드 (예: "개발자", "프로그래머")
   * @param limit 최대 결과 수 (기본값: 10)
   */
  async searchJobsByKeyword(keyword: string, limit: number = 10): Promise<CareerNetJob[]> {
    try {
      // 실제 API 호출
      // const response = await axios.get(`${this.baseUrl}/jobs/search`, {
      //   params: {
      //     keyword,
      //     apiKey: this.apiKey,
      //     limit,
      //   },
      // });
      //
      // return response.data.jobs || [];

      // 프로토타입용 모의 데이터
      return this.getMockJobsForKeyword(keyword, limit);
    } catch (error) {
      console.error('CareerNet API 검색 오류:', error);
      return this.getMockJobsForKeyword(keyword, limit);
    }
  }

  /**
   * 직업 카테고리별 검색
   * @param category 카테고리 (예: "IT", "보건", "교육")
   * @param limit 최대 결과 수
   */
  async searchJobsByCategory(category: string, limit: number = 10): Promise<CareerNetJob[]> {
    try {
      // const response = await axios.get(`${this.baseUrl}/jobs/category`, {
      //   params: {
      //     category,
      //     apiKey: this.apiKey,
      //     limit,
      //   },
      // });
      //
      // return response.data.jobs || [];

      return this.getMockJobsByCategory(category, limit);
    } catch (error) {
      console.error('CareerNet API 카테고리 검색 오류:', error);
      return this.getMockJobsByCategory(category, limit);
    }
  }

  /**
   * 특정 직업 상세 정보 조회
   * @param jobCode 직업 코드
   */
  async getJobDetail(jobCode: string): Promise<CareerNetJob | null> {
    try {
      // const response = await axios.get(`${this.baseUrl}/jobs/${jobCode}`, {
      //   params: {
      //     apiKey: this.apiKey,
      //   },
      // });
      //
      // return response.data.job || null;

      return this.getMockJobDetail(jobCode);
    } catch (error) {
      console.error('CareerNet API 상세 조회 오류:', error);
      return this.getMockJobDetail(jobCode);
    }
  }

  /**
   * 모의 데이터: 키워드로 직업 검색
   */
  private getMockJobsForKeyword(keyword: string, limit: number): CareerNetJob[] {
    const mockJobs: Record<string, CareerNetJob[]> = {
      개발자: [
        {
          code: 'JOB001',
          name: '소프트웨어 개발자',
          category: 'IT',
          description: '컴퓨터 프로그래밍을 통해 소프트웨어를 개발하는 직업',
          averageSalary: '3,500~5,000만원',
          employmentRate: '85%',
          mainTasks: '요구사항 분석, 코딩, 테스팅, 유지보수',
          requiredSkills: 'Java, Python, JavaScript, SQL',
          careerPath: '주니어 개발자 → 시니어 개발자 → 리드 개발자',
          workEnvironment: '사무실, IT 회사',
          workingHours: '주 40시간 (야근 가능)',
        },
        {
          code: 'JOB002',
          name: '웹 개발자',
          category: 'IT',
          description: '웹 애플리케이션을 개발하고 유지보수하는 직업',
          averageSalary: '3,000~4,500만원',
          employmentRate: '88%',
          mainTasks: '웹사이트 개발, 프론트엔드/백엔드 구현',
          requiredSkills: 'HTML, CSS, JavaScript, React, Node.js',
          careerPath: '웹 개발자 → 웹 아키텍트',
          workEnvironment: '사무실, 스타트업, IT회사',
          workingHours: '주 40시간',
        },
        {
          code: 'JOB003',
          name: '모바일 앱 개발자',
          category: 'IT',
          description: '스마트폰 앱을 개발하는 직업',
          averageSalary: '3,200~4,800만원',
          employmentRate: '82%',
          mainTasks: '모바일 앱 개발, iOS/Android 개발',
          requiredSkills: 'Swift, Kotlin, React Native, Flutter',
          careerPath: '모바일 개발자 → 테크 리드',
          workEnvironment: '사무실, 모바일 회사',
          workingHours: '주 40시간',
        },
      ],
      디자이너: [
        {
          code: 'JOB004',
          name: 'UI/UX 디자이너',
          category: ' 디자인',
          description: '사용자 경험을 고려한 인터페이스 디자인',
          averageSalary: '2,800~4,200만원',
          employmentRate: '79%',
          mainTasks: '프로토타이핑, 사용성 테스트, 디자인 검증',
          requiredSkills: 'Figma, Adobe XD, Sketch, User Research',
          careerPath: 'UI/UX 디자이너 → 디자인 리드 → 크리에이티브 디렉터',
          workEnvironment: '사무실, IT회사, 디자인 스튜디오',
          workingHours: '주 40시간',
        },
      ],
      경영: [
        {
          code: 'JOB005',
          name: '기업 경영자',
          category: '경영',
          description: '기업의 전반적인 경영을 담당',
          averageSalary: '4,500~8,000만원',
          employmentRate: '75%',
          mainTasks: '경영 전략 수립, 조직 관리, 실적 분석',
          requiredSkills: '리더십, 재무분석, 전략 기획',
          careerPath: '과장 → 부장 → 임원 → 회장',
          workEnvironment: '사무실, 기업',
          workingHours: '주 40~50시간',
        },
      ],
    };

    // 키워드와 일치하는 직업 찾기
    const lowerKeyword = keyword.toLowerCase();
    let results: CareerNetJob[] = [];

    for (const [key, jobs] of Object.entries(mockJobs)) {
      if (key.includes(lowerKeyword) || lowerKeyword.includes(key)) {
        results = jobs;
        break;
      }
      // 직업 이름으로도 검색
      const matchingJobs = jobs.filter(
        (job) =>
          job.name.includes(keyword) ||
          job.description.includes(keyword)
      );
      if (matchingJobs.length > 0) {
        results = matchingJobs;
        break;
      }
    }

    // 모든 카테고리에서 일치하는 항목 찾기
    if (results.length === 0) {
      for (const jobs of Object.values(mockJobs)) {
        const matchingJobs = jobs.filter(
          (job) =>
            job.name.includes(keyword) ||
            job.description.includes(keyword) ||
            (job.requiredSkills && job.requiredSkills.includes(keyword))
        );
        results.push(...matchingJobs);
      }
    }

    return results.slice(0, limit);
  }

  /**
   * 모의 데이터: 카테고리별 검색
   */
  private getMockJobsByCategory(category: string, limit: number): CareerNetJob[] {
    const categoryMap: Record<string, CareerNetJob[]> = {
      IT: [
        {
          code: 'JOB001',
          name: '소프트웨어 개발자',
          category: 'IT',
          description: '컴퓨터 프로그래밍을 통해 소프트웨어를 개발',
          averageSalary: '3,500~5,000만원',
          employmentRate: '85%',
          mainTasks: '요구사항 분석, 코딩, 테스팅',
          requiredSkills: 'Java, Python, JavaScript',
          careerPath: '주니어 → 시니어 → 리드',
        },
      ],
      디자인: [
        {
          code: 'JOB004',
          name: 'UI/UX 디자이너',
          category: '디자인',
          description: '사용자 경험을 고려한 인터페이스 디자인',
          averageSalary: '2,800~4,200만원',
          employmentRate: '79%',
          mainTasks: '프로토타이핑, 사용성 테스트',
          requiredSkills: 'Figma, Adobe XD',
          careerPath: '디자이너 → 리드 → 디렉터',
        },
      ],
    };

    return categoryMap[category] || [];
  }

  /**
   * 모의 데이터: 직업 상세 정보
   */
  private getMockJobDetail(jobCode: string): CareerNetJob | null {
    const mockJobDetails: Record<string, CareerNetJob> = {
      JOB001: {
        code: 'JOB001',
        name: '소프트웨어 개발자',
        category: 'IT',
        description: '컴퓨터 프로그래밍을 통해 소프트웨어를 개발하는 직업',
        averageSalary: '3,500~5,000만원',
        employmentRate: '85%',
        mainTasks:
          '요구사항 분석, 코딩, 테스팅, 유지보수, 버그 수정, 성능 최적화',
        requiredSkills:
          'Java, Python, JavaScript, SQL, Git, REST API',
        careerPath: '주니어 개발자 → 시니어 개발자 → 리드 개발자 → 아키텍트',
        workEnvironment: '사무실, IT 회사, 스타트업',
        workingHours: '주 40시간 (프로젝트 시 야근 가능)',
      },
    };

    return mockJobDetails[jobCode] || null;
  }
}

/**
 * CareerNet API 클라이언트 인스턴스
 */
export const careernetClient = new CareerNetClient();

/**
 * 직업 검색 헬퍼 함수
 */
export async function searchJobs(keyword: string, limit?: number) {
  return careernetClient.searchJobsByKeyword(keyword, limit);
}

/**
 * 카테고리별 검색 헬퍼 함수
 */
export async function searchJobsByCategory(
  category: string,
  limit?: number
) {
  return careernetClient.searchJobsByCategory(category, limit);
}

/**
 * 직업 상세 정보 조회 헬퍼 함수
 */
export async function getJobDetail(jobCode: string) {
  return careernetClient.getJobDetail(jobCode);
}

export default careernetClient;
