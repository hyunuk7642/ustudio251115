'use client';

import { useState } from 'react';

interface Job {
  id: string;
  title: string;
  company: string;
  category: string;
  description: string;
}

export default function Home() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword && !category) {
      setError('키워드 또는 카테고리를 입력해주세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (category) params.append('category', category);

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '검색 중 오류가 발생했습니다');
        return;
      }

      setJobs(data.data || []);
    } catch (err) {
      setError('네트워크 오류가 발생했습니다');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-indigo-600">CareerNet</h1>
          <p className="text-gray-600 mt-2">당신의 꿈의 직업을 찾아보세요</p>
        </div>
      </header>

      {/* Search Section */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">직업 검색</h2>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
                  직업명 검색
                </label>
                <input
                  id="keyword"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 개발자, 디자이너"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">모든 카테고리</option>
                  <option value="IT">IT</option>
                  <option value="Finance">금융</option>
                  <option value="Healthcare">의료</option>
                  <option value="Education">교육</option>
                  <option value="Sales">영업</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
            >
              {loading ? '검색 중...' : '검색'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        {jobs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              검색 결과 ({jobs.length}개)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white rounded-lg shadow hover:shadow-lg transition duration-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{job.title}</h3>
                  <p className="text-indigo-600 font-semibold mb-2">{job.company}</p>
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded mb-4">
                    {job.category}
                  </span>
                  <p className="text-gray-600 text-sm line-clamp-3">{job.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {jobs.length === 0 && !loading && keyword === '' && category === '' && (
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-lg">위에서 검색을 시작하세요</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center py-6 mt-12">
        <p>&copy; 2025 CareerNet. All rights reserved.</p>
      </footer>
    </div>
  );
}
