const defaultUrl = typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.SUPABASE_URL : 'https://sppgggjhslaxecoopnfn.supabase.co';
const defaultKey = typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.SUPABASE_KEY : 'sb_publishable_wxGXxpaOyrmaD9r19E7rTw_4Beazi_A';

let defaultSupabaseClient = null;
if (window.supabase) {
    defaultSupabaseClient = window.supabase.createClient(defaultUrl, defaultKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sb_default_auth' }
    });
}

const CUSTOM_SUPABASE_URL = localStorage.getItem('CUSTOM_SUPABASE_URL') || sessionStorage.getItem('SESSION_SUPABASE_URL');
const CUSTOM_SUPABASE_KEY = localStorage.getItem('CUSTOM_SUPABASE_KEY') || sessionStorage.getItem('SESSION_SUPABASE_KEY');

const APP_CONFIG = {
    SUPABASE_URL: CUSTOM_SUPABASE_URL || defaultUrl,
    SUPABASE_KEY: CUSTOM_SUPABASE_KEY || defaultKey,
    DEFAULT_RANGE: '평일집회',
    ALLOWED_SHEETS: ['평일집회', 'Ko계획표']
};

let supabaseClient = null;
if (window.supabase) {
    if (APP_CONFIG.SUPABASE_URL === defaultUrl && APP_CONFIG.SUPABASE_KEY === defaultKey && defaultSupabaseClient) {
        supabaseClient = defaultSupabaseClient;
    } else {
        supabaseClient = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sb_active_auth' }
        });
    }
}

// 회중 기본 항목/기초 데이터 기본값
const DEFAULT_MASTER_ITEMS = {
    weekday_categories: [
        { key: 'top', label: '시작 및 기도' },
        { key: 'treasures', label: '보물 탐구' },
        { key: 'ministry', label: '야외 봉사 전념' },
        { key: 'living', label: '그리스도인 생활' }
    ],
    task_types: [
        { key: 'chairman', label: '집회 사회' },
        { key: 'reading', label: '성경 낭독' },
        { key: 'speaker', label: '공개 강연' },
        { key: 'interpreter', label: '수어 통역' },
        { key: 'prayer', label: '기도' }
    ],
    interpretation_grades: ['A', 'B', 'C', 'D']
};

// 헬퍼 함수: URL 파라미터 또는 세션 저장소를 확인하여 custom database 연결 정보 적용
async function checkAndApplyCustomDatabase() {
    const urlParams = new URLSearchParams(window.location.search);
    const dbParam = urlParams.get('db') || urlParams.get('cong');
    
    if (dbParam && defaultSupabaseClient) {
        try {
            console.log('[CustomDB] URL 파라미터 감지:', dbParam);
            const { data, error } = await defaultSupabaseClient
                .from('database_connections')
                .select('supabase_url, supabase_key')
                .eq('username', dbParam.trim())
                .maybeSingle();
                
            if (error) {
                console.error('[CustomDB] 연결 정보 조회 중 오류 발생:', error);
            }
                
            if (data && data.supabase_url && data.supabase_key) {
                console.log('[CustomDB] 커스텀 DB 연결 정보 발견:', data.supabase_url);
                // Active 클라이언트 재설정
                supabaseClient = window.supabase.createClient(data.supabase_url, data.supabase_key, {
                    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
                });
                APP_CONFIG.SUPABASE_URL = data.supabase_url;
                APP_CONFIG.SUPABASE_KEY = data.supabase_key;
                
                // 세션에 저장하여 세션 유지
                sessionStorage.setItem('SESSION_SUPABASE_URL', data.supabase_url);
                sessionStorage.setItem('SESSION_SUPABASE_KEY', data.supabase_key);
            } else {
                console.warn('[CustomDB] 지정된 ID에 해당하는 커스텀 DB를 찾을 수 없습니다:', dbParam);
            }
        } catch (e) {
            console.error('[CustomDB] 커스텀 DB 적용 중 오류:', e);
        }
    }
}

// HTML 이스케이프 처리 (XSS 방지)
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

/**
 * 주차 문자열(예: '2027년 1월 4-10일', '27년 1월 4-10일', '5월 4-10일', '5/11-17일', '2027-01-04 - 2027-01-10')을 시작일과 종료일 객체로 변환
 */
function parseWeekDate(str) {
    if (!str || typeof str !== 'string') return null;
    try {
        const today = new Date();
        const currentYear = today.getFullYear();
        
        let clean = str.trim();

        // 1. 범위 구분자 분리 (대시, 물결표, en-dash, em-dash 등)
        let parts = [];
        if (clean.includes('~')) {
            parts = clean.split('~');
        } else if (clean.includes(' - ')) {
            parts = clean.split(' - ');
        } else if (clean.includes('–')) { // en-dash
            parts = clean.split('–');
        } else if (clean.includes('—')) { // em-dash
            parts = clean.split('—');
        } else {
            // ISO 단일 날짜(예: '2027-01-04')를 제외하고 마지막/적절한 '-' 기준 분리
            if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
                parts = [clean];
            } else {
                const match = clean.match(/^(.+?)\s*-\s*([^-]+)$/);
                if (match) {
                    parts = [match[1], match[2]];
                } else {
                    parts = [clean];
                }
            }
        }

        // 날짜 조각(문자열)에서 연도, 월, 일 정보를 추출하는 헬퍼 함수
        function extractDateInfo(partStr, defaultYear) {
            if (!partStr) return null;
            let text = partStr.trim();

            let year = defaultYear;
            let yearFound = false;

            // 4자리 연도 (예: 2027년, 2027., 2027- 등)
            const y4Match = text.match(/\b(20\d\d)\b/);
            if (y4Match) {
                year = parseInt(y4Match[1]);
                yearFound = true;
                text = text.replace(y4Match[0], '');
                text = text.replace(/^[년.\-\/\s]+/, '').trim();
            } else {
                // 2자리 연도 (예: 27년)
                const y2Match = text.match(/\b(\d{2})년/);
                if (y2Match) {
                    year = 2000 + parseInt(y2Match[1]);
                    yearFound = true;
                    text = text.replace(y2Match[0], '').trim();
                }
            }

            // /를 '월'로 치환, '일' 제거
            text = text.replace(/\//g, '월').replace(/일/g, '').trim();

            // 월과 일 추출 (예: '1월 4', '1. 4', '01-04')
            const mMatch = text.match(/(\d{1,2})\s*월\s*(\d{1,2})/);
            if (mMatch) {
                return {
                    year,
                    yearFound,
                    month: parseInt(mMatch[1]),
                    day: parseInt(mMatch[2])
                };
            }

            const dotMatch = text.match(/(\d{1,2})\s*[.\-]\s*(\d{1,2})/);
            if (dotMatch) {
                return {
                    year,
                    yearFound,
                    month: parseInt(dotMatch[1]),
                    day: parseInt(dotMatch[2])
                };
            }

            // 단일 숫자 (예: '10' -> 같은 월의 10일)
            const singleNum = text.match(/(\d{1,2})/);
            if (singleNum) {
                return {
                    year,
                    yearFound,
                    month: null,
                    day: parseInt(singleNum[1])
                };
            }

            return null;
        }

        const startPart = parts[0]?.trim();
        const endPart = parts[1]?.trim();

        const startInfo = extractDateInfo(startPart, currentYear);
        if (!startInfo || startInfo.month === null || !startInfo.day) return null;

        let startYear = startInfo.year;
        const startMonth = startInfo.month;
        const startDay = startInfo.day;

        // 연도가 명시되지 않은 경우(예: '1월 4-10일'):
        // 오늘 날짜의 월과 주차의 월을 비교하여 슬라이딩 윈도우(Sliding Window)로 연도 자동 추론
        // 예: 현재가 8~12월인데 1~4월 주차가 들어오면 다가오는 내년(currentYear + 1) 계획표로 추론
        if (!startInfo.yearFound) {
            const currentMonth = today.getMonth() + 1; // 1 ~ 12
            const monthDiff = startMonth - currentMonth;
            if (monthDiff < -5) {
                // 현재 월보다 6개월 이상 이전인 경우 (예: 10월에 1, 2, 3, 4월 주차) -> 내년으로 보정
                startYear = currentYear + 1;
            } else if (monthDiff > 6) {
                // 현재 월보다 7개월 이상 미래인 경우 (예: 1월에 11, 12월 주차) -> 작년으로 보정
                startYear = currentYear - 1;
            }
        }

        const startDate = new Date(startYear, startMonth - 1, startDay);

        let endDate;
        if (!endPart) {
            endDate = new Date(startYear, startMonth - 1, startDay);
        } else {
            const endInfo = extractDateInfo(endPart, startYear);
            if (!endInfo || !endInfo.day) {
                endDate = new Date(startYear, startMonth - 1, startDay);
            } else {
                let endYear = endInfo.yearFound ? endInfo.year : startYear;
                let endMonth = endInfo.month !== null ? endInfo.month : startMonth;
                let endDay = endInfo.day;

                // 연말/연초 걸침 처리 (12월에서 1월로 넘어갈 때 연도 +1)
                if (!endInfo.yearFound && startMonth === 12 && endMonth === 1) {
                    endYear = startYear + 1;
                }

                endDate = new Date(endYear, endMonth - 1, endDay);
            }
        }

        return { start: startDate, end: endDate };
    } catch (e) {
        console.error('Error parsing week date:', str, e);
        return null;
    }
}

// 글꼴 동적 로드 및 적용 유틸리티
function ensureFontLoaded(fontName) {
    if (fontName === 'Gowun Dodum') {
        if (!document.getElementById('font-link-gowun-dodum')) {
            const link = document.createElement('link');
            link.id = 'font-link-gowun-dodum';
            link.href = 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    } else if (fontName === 'Noto Sans KR') {
        if (!document.getElementById('font-link-noto-sans-kr')) {
            const link = document.createElement('link');
            link.id = 'font-link-noto-sans-kr';
            link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    } else if (fontName === 'Nanum Gothic') {
        if (!document.getElementById('font-link-nanum-gothic')) {
            const link = document.createElement('link');
            link.id = 'font-link-nanum-gothic';
            link.href = 'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    }
}

function applyFontToBody(fontName) {
    let fontFamily = "";
    if (fontName === 'Gowun Dodum') {
        fontFamily = "'Gowun Dodum', sans-serif";
    } else if (fontName === 'Noto Sans KR') {
        fontFamily = "'Noto Sans KR', sans-serif";
    } else if (fontName === 'Nanum Gothic') {
        fontFamily = "'Nanum Gothic', sans-serif";
    } else {
        fontFamily = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    }
    document.body.style.fontFamily = fontFamily;
}
