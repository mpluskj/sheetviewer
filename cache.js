// 캐시 설정
const CACHE_DURATION = 5 * 60 * 1000; // 5분 (밀리초 단위)

// 데이터 캐시 가져오기
function getCachedData(key) {
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) {
        return null;
    }

    try {
        const { timestamp, data } = JSON.parse(cachedItem);
        const now = new Date().getTime();

        // 유효기간 만료 확인
        if (now - timestamp > CACHE_DURATION) {
            localStorage.removeItem(key);
            return null;
        }

        return data;
    } catch (e) {
        console.error('캐시 파싱 오류:', e);
        localStorage.removeItem(key);
        return null;
    }
}

// 데이터 캐시 저장
function setCachedData(key, data) {
    try {
        const timestamp = new Date().getTime();
        const cachedItem = {
            timestamp,
            data
        };
        localStorage.setItem(key, JSON.stringify(cachedItem));
    } catch (e) {
        console.error('캐시 저장 오류 (용량 초과 등):', e);
        // 저장 공간이 부족할 경우 오래된 캐시를 비우는 등의 처리가 필요할 수 있음
        try {
            localStorage.clear(); // 간단하게 전체 삭제 후 재시도
            localStorage.setItem(key, JSON.stringify({ timestamp: new Date().getTime(), data }));
        } catch (retryError) {
            console.error('캐시 재저장 실패:', retryError);
        }
    }
}
