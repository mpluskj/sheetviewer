// 앱 설정
const CONFIG = {
    API_KEY: 'AIzaSyA2NydJpV5ywSnDbXFlliIHs3Xp5aP_6sI',
    SPREADSHEET_ID: '1fn8eQ01APc3qCN_J3Hw7ykKr-0klMb8_WHDYCJNWVv0',
    SHEET_NAME: 'KSL계획표',
    RANGE: 'A1:D35',
    CACHE_KEY: 'sheetData_KSL',
    CACHE_EXPIRY: 3600000 // 1시간 (밀리초)
};

// 로딩 표시 함수
function showLoading() {
    console.log('Showing loading indicator');
    document.body.innerHTML += '<div id="loading" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;">데이터 로딩 중...</div>';
}

function hideLoading() {
    console.log('Hiding loading indicator');
    const loading = document.getElementById('loading');
    if (loading) loading.remove();
}

// 캐시 관리
function getCachedData() {
    console.log('Checking cache');
    const cached = localStorage.getItem(CONFIG.CACHE_KEY);
    if (cached) {
        const {data, timestamp} = JSON.parse(cached);
        if (Date.now() - timestamp < CONFIG.CACHE_EXPIRY) {
            return data;
        }
    }
    return null;
}

function setCachedData(data) {
    console.log('Setting cache');
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({data, timestamp: Date.now()}));
}

// 테이블 채우기
function populateTable(values) {
    console.log('Populating table with data:', values);
    for (let row = 0; row < values.length; row++) {
        for (let col = 0; col < values[row].length; col++) {
            const cellId = String.fromCharCode(65 + col) + (row + 1);
            const cell = document.getElementById(cellId);
            if (cell) {
                cell.innerText = values[row][col] || '';
            }
        }
    }
}

// 데이터 가져오기
async function fetchData() {
    console.log('Starting fetchData');
    showLoading();
    try {
        let values = getCachedData();
        if (!values) {
            console.log('No cache, fetching from API');
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.SHEET_NAME}!${CONFIG.RANGE}?key=${CONFIG.API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('API response:', data);
            values = data.values || [];
            setCachedData(values);
        } else {
            console.log('Using cached data');
        }
        populateTable(values);
    } catch (error) {
        console.error('데이터 가져오기 오류:', error);
        alert('데이터를 가져오는 중 오류가 발생했습니다: ' + error.message);
    } finally {
        hideLoading();
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting fetch');
    fetchData();
});