// 모바일 디버깅 도구
window.onerror = function(message, source, lineno, colno, error) {
    // alert('오류 발생: ' + message);
    console.error('JavaScript 오류:', {message, source, lineno, colno, error});
    return true;
};

// 앱 상태
window.appState = {
    userName: localStorage.getItem('userName') || null
};

// 설정
const CONFIG = {
    API_KEY: 'AIzaSyA2NydJpV5ywSnDbXFlliIHs3Xp5aP_6sI',
    SPREADSHEET_ID: '1fn8eQ01APc3qCN_J3Hw7ykKr-0klMb8_WHDYCJNWVv0',
    // KSL/Ko 데이터 시트의 데이터가 포함된 넓은 범위
    DATA_RANGE: 'A3:O48' 
};

// 전역 상태 변수
let currentSource = 'KSL_Data'; // 현재 데이터 소스
let allWeeks = []; // 파싱된 모든 주 데이터
let currentWeekIndex = 0; // 현재 표시 중인 주의 인덱스

// 스와이프 감지 변수
let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 100;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    // 사용자 이름 확인
    if (!window.appState.userName) {
        const userName = prompt('사용자 이름을 입력해주세요:', '');
        if (userName) {
            localStorage.setItem('userName', userName);
            window.appState.userName = userName;
        }
    }
    
    setupEventListeners();
    
    // Google API 클라이언트 로드
    gapi.load('client', initClient);
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 데이터 소스 선택 버튼
    document.getElementById('ksl-btn').addEventListener('click', () => switchSource('KSL_Data'));
    document.getElementById('ko-btn').addEventListener('click', () => switchSource('Ko_Data'));

    // 주 단위 네비게이션 버튼
    document.getElementById('prev-week-btn').addEventListener('click', navigateToPreviousWeek);
    document.getElementById('next-week-btn').addEventListener('click', navigateToNextWeek);

    // 스와이프 이벤트
    const contentArea = document.getElementById('content');
    contentArea.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    contentArea.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    // 키보드 이벤트
    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') navigateToPreviousWeek();
        else if (e.key === 'ArrowRight') navigateToNextWeek();
    });

    // 이름 변경 버튼
    setupNameChangeButton();
}

// 데이터 소스 전환
function switchSource(sourceName) {
    if (currentSource === sourceName) return;

    currentSource = sourceName;
    document.getElementById('ksl-btn').classList.toggle('active', sourceName === 'KSL_Data');
    document.getElementById('ko-btn').classList.toggle('active', sourceName === 'Ko_Data');
    
    loadDataAndRender(currentSource);
}

// 스와이프 처리
function handleSwipe() {
    const swipeDistance = touchEndX - touchStartX;
    if (Math.abs(swipeDistance) >= swipeThreshold) {
        if (swipeDistance > 0) navigateToPreviousWeek();
        else navigateToNextWeek();
    }
}

// 이전 주로 이동
function navigateToPreviousWeek() {
    if (currentWeekIndex > 0) {
        currentWeekIndex--;
        renderCurrentWeek();
    }
}

// 다음 주로 이동
function navigateToNextWeek() {
    if (currentWeekIndex < allWeeks.length - 1) {
        currentWeekIndex++;
        renderCurrentWeek();
    }
}

// API 클라이언트 초기화
function initClient() {
    gapi.client.init({
        apiKey: CONFIG.API_KEY,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    }).then(() => {
        loadDataAndRender(currentSource);
    }).catch(handleErrors);
}

// 최종 수정 시간을 가져오는 함수
function getModifiedTime() {
    return gapi.client.sheets.spreadsheets.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        fields: 'properties' // 'properties.modifiedTime' 대신 'properties' 전체를 요청
    }).then(response => {
        // 전체 속성 중 modifiedTime을 반환
        return response.result.properties.modifiedTime;
    }).catch(error => {
        console.error("최종 수정 시간을 가져오는 중 오류 발생:", error);
        return null;
    });
}

// 데이터 로드 및 렌더링
async function loadDataAndRender(sheetName) {
    showLoading();

    const modifiedTime = await getModifiedTime();
    const cachedTime = cache.get('spreadsheetModifiedTime');
    const cachedData = cache.get(`sheetData_${sheetName}`);

    if (cachedData && modifiedTime && cachedTime && modifiedTime === cachedTime) {
        console.log('캐시에서 데이터를 로드합니다 (수정 시간 일치).');
        processData(cachedData, sheetName);
        return;
    }
    
    console.log('서버에서 새로운 데이터를 가져옵니다.');
    const range = `${sheetName}!${CONFIG.DATA_RANGE}`;

    gapi.client.sheets.spreadsheets.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        ranges: [range],
        fields: 'sheets/data/rowData/values/formattedValue' // 데이터 값만 요청
    }).then(response => {
        const sheetData = response.result;
        cache.set(`sheetData_${sheetName}`, sheetData);
        if (modifiedTime) {
            cache.set('spreadsheetModifiedTime', modifiedTime);
        }
        processData(sheetData, sheetName);
    }).catch(handleErrors);
}

// 데이터 처리
function processData(sheetData, sheetName) {
    if (!sheetData.sheets || sheetData.sheets.length === 0) {
        handleErrors({ message: '시트 데이터를 찾을 수 없습니다.' });
        return;
    }
    const gridData = sheetData.sheets[0].data[0];
    allWeeks = formatHandler.parseDataIntoWeeks(gridData, sheetName);

    if (allWeeks.length === 0) {
        // 에러 메시지를 content div에 직접 삽입
        const contentDiv = document.getElementById('content');
        if (contentDiv) {
            contentDiv.innerHTML = '<p style="text-align: center; padding: 20px;">표시할 주 데이터가 없습니다.</p>';
        }
        hideLoading();
        return;
    }

    findInitialWeek();
    renderCurrentWeek();
    hideLoading();
}

// 초기 표시 주 찾기
function findInitialWeek() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 시간 정보를 제거하여 날짜만 비교

    const foundIndex = allWeeks.findIndex(week => 
        week.startDate && week.endDate && today >= week.startDate && today <= week.endDate
    );

    currentWeekIndex = (foundIndex !== -1) ? foundIndex : 0;
}

// 현재 주 렌더링 (테이블 내용 채우기)
function renderCurrentWeek() {
    if (allWeeks.length === 0) return;
    const week = allWeeks[currentWeekIndex];
    populateTable(week.data);
    updateWeekDisplay(week);
    updateNavButtons();
}

function populateTable(weekData) {
    const userName = window.appState.userName;
    const highlight = (value) => {
        if (userName && value && value.includes(userName)) {
            return value.replace(new RegExp(userName, 'g'), `<span class="highlight">${userName}</span>`);
        }
        return value || ''; // null이나 undefined일 경우 빈 문자열 반환
    };

    const rowCount = 46; // 고정된 행 수
    for (let r = 0; r < rowCount; r++) {
        const rowData = weekData[r] || ['', ''];
        const cell1 = document.getElementById(`cell-r${r}-c0`);
        const cell2 = document.getElementById(`cell-r${r}-c1`);
        if (cell1) cell1.innerHTML = highlight(rowData[0]);
        if (cell2) cell2.innerHTML = highlight(rowData[1]);
    }
}

// 주 날짜 표시 업데이트
function updateWeekDisplay(week) {
    const display = document.getElementById('current-week-display');
    if (week.startDate && week.endDate) {
        const options = { month: 'long', day: 'numeric' };
        const start = week.startDate.toLocaleDateString('ko-KR', options);
        const end = week.endDate.toLocaleDateString('ko-KR', options);
        display.textContent = `${start} ~ ${end}`;
    } else {
        display.textContent = `주 ${currentWeekIndex + 1}`;
    }
}

// 네비게이션 버튼 상태 업데이트
function updateNavButtons() {
    document.getElementById('prev-week-btn').disabled = currentWeekIndex === 0;
    document.getElementById('next-week-btn').disabled = currentWeekIndex === allWeeks.length - 1;
}

// 로딩 표시
function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// 에러 처리
function handleErrors(error) {
    console.error('Error:', error);
    let errorMessage = '데이터를 가져오는 중 오류가 발생했습니다.';
    if (error.result && error.result.error) {
        errorMessage += ` (${error.result.error.message})`;
    } else if (error.message) {
        errorMessage += ` (${error.message})`;
    }
    document.getElementById('content').innerHTML = `<div class="error-message">${errorMessage}<p><button onclick="location.reload()" class="retry-button">다시 시도</button></p></div>`;
    hideLoading();
}

// 이름 변경 버튼 설정
function setupNameChangeButton() {
    const btn = document.createElement('button');
    btn.id = 'change-name-btn';
    btn.className = 'name-change-btn';
    btn.innerHTML = '<i class="fas fa-user-edit"></i>';
    btn.title = '이름 변경';
    btn.onclick = function() {
        const newName = prompt('새로운 이름을 입력하세요:', window.appState.userName || '');
        if (newName !== null) {
            window.appState.userName = newName;
            localStorage.setItem('userName', newName);
            renderCurrentWeek(); // 이름 변경 후 현재 뷰만 다시 렌더링
        }
    };
    
    // 헤더 우측에 버튼 추가
    const header = document.querySelector('.header-container');
    if (header) {
        btn.style.position = 'absolute';
        btn.style.top = '10px';
        btn.style.right = '10px';
        header.appendChild(btn);
    }
}
