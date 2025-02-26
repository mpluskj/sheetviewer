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
    }
};
