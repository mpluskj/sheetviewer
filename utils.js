// HTML 이스케이프 처리 (XSS 방지)
// 데이터 캐시 저장소 (최적화 버전)
const dataCache = new Map();
const CACHE_TTL = 300000; // 5분 캐시 유효시간
const LARGE_DATA_THRESHOLD = 100; // 큰 데이터 기준 (행 수)

function escapeHtml(text) {
    if (text === undefined || text === null) return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// 디바운스 함수 (성능 최적화)
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// 캐시된 데이터 가져오기 (최적화 버전)
function getCachedData(key) {
    const cached = dataCache.get(key);
    if (!cached) return null;
    
    // 캐시 유효시간 검사 (성능 최적화 버전)
    if (Date.now() - cached.timestamp > CACHE_TTL) {
        // 지연 삭제로 성능 향상
        setTimeout(() => dataCache.delete(key), 0);
        return null;
    }
    return cached.data;
}

// 데이터 캐시에 저장 (데이터 크기별 전략 적용)
function setCachedData(key, data) {
    // 데이터 크기 측정 (간단한 행 수 기준)
    const isLargeData = data?.sheets?.[0]?.data?.[0]?.rowData?.length > LARGE_DATA_THRESHOLD;
    
    // 큰 데이터는 짧은 캐시 시간 적용
    const cacheItem = {
        data: data,
        timestamp: Date.now(),
        ttl: isLargeData ? CACHE_TTL / 2 : CACHE_TTL
    };
    
    dataCache.set(key, cacheItem);
}

// 캐시 초기화
function clearCache() {
    dataCache.clear();
}

// 날짜 포맷 변환
function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    } catch (e) {
        return dateString;
    }
}

// 숫자 포맷 변환
function formatNumber(num, format) {
    if (num === undefined || num === null) return '';
    
    try {
        return new Intl.NumberFormat('ko-KR', format).format(num);
    } catch (e) {
        return num.toString();
    }
}

// URL 파라미터 가져오기
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 로컬 스토리지 래퍼
const storage = {
    set: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('로컬 스토리지 저장 오류:', e);
        }
    },
    get: function(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('로컬 스토리지 읽기 오류:', e);
            return null;
        }
    },
    remove: function(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('로컬 스토리지 삭제 오류:', e);
        }
    },
    // 시트 데이터 캐싱 함수 추가
    cacheSheetData: function(spreadsheetId, range, data) {
        const cacheKey = `sheet_cache_${spreadsheetId}_${range}`;
        const cacheData = {
            data: data,
            timestamp: new Date().getTime()
        };
        this.set(cacheKey, cacheData);
    },
    getCachedSheetData: function(spreadsheetId, range, maxAge = 3600000) {
        const cacheKey = `sheet_cache_${spreadsheetId}_${range}`;
        const cached = this.get(cacheKey);
        if (!cached) return null;
        
        const now = new Date().getTime();
        if (now - cached.timestamp > maxAge) {
            this.remove(cacheKey);
            return null;
        }
        return cached.data;
    }
};
