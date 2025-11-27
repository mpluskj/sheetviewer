// 모바일 디버깅 도구
window.onerror = function(message, source, lineno, colno, error) {
    alert('오류 발생: ' + message);
    console.error('JavaScript 오류:', {message, source, lineno, colno, error});
    return true;
};

// 앱 초기화 상태 추적
window.appState = {
    initialized: false,
    apiLoaded: false,
    spreadsheetLoaded: false,
    error: null,
    userName: localStorage.getItem('userName') || null
};


// 설정
const CONFIG = {
    API_KEY: 'AIzaSyA2NydJpV5ywSnDbXFlliIHs3Xp5aP_6sI',
    SPREADSHEET_ID: '1fn8eQ01APc3qCN_J3Hw7ykKr-0klMb8_WHDYCJNWVv0',
    DEFAULT_RANGE: 'KSL계획표', // 기본 시트 이름
    ALLOWED_SHEETS: ['KSL계획표', 'Ko계획표'], // 허용된 시트 목록
    DISPLAY_RANGES: {
        // 시트별 표시 범위 설정 (A1 표기법)
        'KSL계획표': 'A1:D180',  // KSL계획표는 A1부터 D180까지만 표시
        'Ko계획표': 'A1:D180'    // Ko계획표는 A1부터 D180까지만 표시
    }
};


// 전역 변수
let currentSheet = null;
let spreadsheetInfo = null;
let availableSheets = []; // 사용 가능한 시트 목록 저장
let cachedSheetData = {}; // 시트 데이터 캐시 저장소
let currentWeekIndex = 0; // 현재 표시 중인 주차 인덱스 (0부터 시작)
let allWeeksData = []; // 현재 시트의 모든 주차 데이터 저장
const weekRanges = [ // 각 주차의 시작/끝 행 정의 (0-indexed)
    { startRow: 0, endRow: 35 },  // 1주차 (1-36행)
    { startRow: 36, endRow: 71 },  // 2주차 (37-72행)
    { startRow: 72, endRow: 107 }, // 3주차 (73-108행)
    { startRow: 108, endRow: 143 },// 4주차 (109-144행)
    { startRow: 144, endRow: 179 } // 5주차 (145-180행)
];

/**
 * "MM월 DD-DD일" 형식의 문자열을 파싱하여 시작 및 종료 Date 객체를 반환합니다.
 * 현재 연도를 사용하여 Date 객체를 생성합니다.
 * @param {string} dateRangeString "MM월 DD-DD일" 형식의 주차 날짜 문자열
 * @returns {{startDate: Date, endDate: Date}|null} 파싱된 시작 및 종료 날짜 객체 또는 null
 */
function parseDateRange(dateRangeString) {
    if (!dateRangeString) return null;

    const currentYear = new Date().getFullYear();
    const parts = dateRangeString.match(/(\d{1,2})월 (\d{1,2})-(\d{1,2})일/);
    if (!parts || parts.length < 4) {
        return null;
    }

    const month = parseInt(parts[1], 10) - 1; // 월은 0-11
    const startDay = parseInt(parts[2], 10);
    const endDay = parseInt(parts[3], 10);

    const startDate = new Date(currentYear, month, startDay);
    const endDate = new Date(currentYear, month, endDay);
    
    // 연도 경계 처리 (예: 12월 25 - 1월 1일)
    // 시작 날짜가 종료 날짜보다 크면 (예: 12월 25일 - 1월 1일), 종료 날짜의 연도를 +1 해줌
    if (startDate > endDate) {
        endDate.setFullYear(currentYear + 1);
    }

    return { startDate, endDate };
}

/**
 * 현재 날짜와 일치하는 주차의 인덱스를 찾습니다.
 * @param {Array<object>} weeksData parseWeeklyData에서 반환된 주차 데이터 배열
 * @returns {number} 현재 날짜가 포함된 주차의 인덱스, 없으면 0을 반환
 */
function findMatchingWeekIndex(weeksData) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 시간 정보 제거하여 날짜만 비교

    for (let i = 0; i < weeksData.length; i++) {
        const week = weeksData[i];
        const dateRange = parseDateRange(week.weekDate);
        
        if (dateRange) {
            // 오늘 날짜가 주차의 시작일과 종료일 사이에 있는지 확인
            // 시작일 <= 오늘 <= 종료일
            if (today >= dateRange.startDate && today <= dateRange.endDate) {
                return i;
            }
        }
    }
    return 0; // 일치하는 주차를 찾지 못하면 첫 번째 주차 반환
}

// 스와이프 감지를 위한 변수
let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 100; // 스와이프로 인식할 최소 거리 (픽셀)

// 로딩 타임아웃 설정
let loadingTimeout;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initializeApp);

// 사용자 이름 변경 버튼 이벤트 핸들러
function setupNameChangeButton() {
    // 기존 버튼 제거 (중복 방지)
    const existingBtn = document.getElementById('change-name-btn');
    if (existingBtn) existingBtn.remove();
    
    const changeNameBtn = document.createElement('button');
    changeNameBtn.id = 'change-name-btn';
    changeNameBtn.className = 'name-change-btn';
    changeNameBtn.innerHTML = '<i class="fas fa-user-edit"></i>';
    changeNameBtn.title = '이름 변경';
    changeNameBtn.style.display = 'flex';
    changeNameBtn.style.alignItems = 'center';
    changeNameBtn.style.justifyContent = 'center';
    changeNameBtn.style.width = '32px';
    changeNameBtn.style.height = '32px';
    changeNameBtn.style.margin = '0 auto';
    changeNameBtn.style.borderRadius = '50%';
    changeNameBtn.style.backgroundColor = '#f0f0f0';
    
    // 클릭 이벤트 핸들러
    changeNameBtn.onclick = function() {
        const newName = prompt('새로운 이름을 입력하세요:', window.appState.userName || '');
        if (newName !== null) {
            window.appState.userName = newName;
            localStorage.setItem('userName', newName);
            // 화면 새로고침
            location.reload();
        }
    };
    
    // 헤더 영역 우측에 버튼 추가
    const header = document.querySelector('header');
    if (header) {
        changeNameBtn.style.position = 'fixed';
        changeNameBtn.style.top = '10px';
        changeNameBtn.style.right = '10px';
        changeNameBtn.style.margin = '0';
        changeNameBtn.style.zIndex = '1000';
        header.appendChild(changeNameBtn);
    } else {
        // 헤더가 없으면 body에 직접 추가
        changeNameBtn.style.position = 'fixed';
        changeNameBtn.style.top = '10px';
        changeNameBtn.style.right = '10px';
        changeNameBtn.style.margin = '0';
        changeNameBtn.style.zIndex = '1000';
        document.body.appendChild(changeNameBtn);
    }
}

// 이름 변경 버튼 설정
document.addEventListener('DOMContentLoaded', setupNameChangeButton);

// 로딩 메시지 관리를 위한 유틸리티 함수 추가
function updateLoadingMessage(message) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
                <div class="loading-time">로딩 중... (약 2초 소요 예정)</div>
            </div>
        `;
    }
}

// 로딩 표시/숨김 함수
function showLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'block';
        loadingElement.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">데이터를 불러오는 중...</div>
        `;
    }
}

function hideLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

// 모바일 화면 최적화
function optimizeForMobile() {
    const isMobile = window.innerWidth < 768;
    const isSmallMobile = window.innerWidth < 375;
    
    if (isMobile) {
        // 모바일에서 테이블 최적화
        document.body.classList.add('mobile-view');
        
        if (isSmallMobile) {
            document.body.classList.add('small-mobile-view');
        }
        
        // 모바일에서 폰트 크기 최적화 (선택적)
        const mobileStyle = document.createElement('style');
        mobileStyle.textContent = `
            .sheet-table td {
                font-size: ${isSmallMobile ? '0.85em' : '0.9em'};
                padding: ${isSmallMobile ? '3px 4px' : '4px 6px'};
            }
        `;
        document.head.appendChild(mobileStyle);
    }
}

function initializeApp() {
    window.appState.initialized = true;
    
    // 사용자 이름 확인 및 입력 요청
    if (!window.appState.userName) {
        const userName = prompt('사용자 이름을 입력해주세요:', '');
        if (userName) {
            localStorage.setItem('userName', userName);
            window.appState.userName = userName;
        }
    }
    
    // 모바일 최적화
    optimizeForMobile();
    
    // 새로고침 버튼 제거
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.parentNode.removeChild(refreshBtn);
    }
    
    // 시트 선택 버튼 이벤트 리스너
    document.getElementById('ksl-sheet-btn').addEventListener('click', () => switchToSheet('KSL계획표'));
    document.getElementById('ko-sheet-btn').addEventListener('click', () => switchToSheet('Ko계획표'));

    // 주차 네비게이션 버튼 이벤트 리스너
    document.getElementById('prev-week-btn').addEventListener('click', navigateToPreviousWeek);
    document.getElementById('next-week-btn').addEventListener('click', navigateToNextWeek);
    
    // 스와이프 이벤트 리스너 설정
    setupSwipeListeners();
    
    // 키보드 이벤트 리스너 설정
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            navigateToPreviousWeek();
        } else if (e.key === 'ArrowRight') {
            navigateToNextWeek();
        }
    });
    
    // 로딩 타임아웃 설정 (15초)
    loadingTimeout = setTimeout(handleLoadingTimeout, 15000);
    
    // 로딩 표시
    showLoading();
    
    // Google API 클라이언트 로드
    try {
        gapi.load('client', initClient);
    } catch (error) {
        console.error('GAPI 로드 오류:', error);
        window.appState.error = error;
        handleLoadingTimeout();
    }
}

// 로딩 타임아웃 처리
function handleLoadingTimeout() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement && loadingElement.style.display !== 'none') {
        loadingElement.innerHTML = `
            <p>데이터를 불러오는 중 시간이 오래 걸리고 있습니다.</p>
            <button id="retryBtn" class="retry-button">다시 시도</button>
        `;
        
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', function() {
                location.reload();
            });
        }
    }
}

// 스와이프 이벤트 리스너 설정
function setupSwipeListeners() {
    const contentArea = document.getElementById('content');
    
    // 터치 시작 이벤트
    contentArea.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    // 터치 종료 이벤트
    contentArea.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

// 스와이프 처리
function handleSwipe() {
    // 스와이프 거리 계산
    const swipeDistance = touchEndX - touchStartX;
    
    // 스와이프 임계값보다 크면 처리
    if (Math.abs(swipeDistance) >= swipeThreshold) {
        if (swipeDistance > 0) {
            // 오른쪽으로 스와이프 - 이전 주로 이동
            navigateToPreviousWeek();
        } else {
            // 왼쪽으로 스와이프 - 다음 주로 이동
            navigateToNextWeek();
        }
    }
}

// API 클라이언트 초기화
function initClient() {
    console.log('API 클라이언트 초기화 시작');
    
    gapi.client.init({
        apiKey: CONFIG.API_KEY,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    }).then(() => {
        // 타임아웃 제거
        clearTimeout(loadingTimeout);
        
        window.appState.apiLoaded = true;
        console.log('API 클라이언트 초기화 완료');
        
        // 스프레드시트 정보 가져오기
        return getSpreadsheetInfo();
    }).then(() => {
        console.log('스프레드시트 정보 가져오기 완료');
        
        // 시트 목록 설정 및 네비게이션 버튼 초기화
        setupSheets();
        // 기본 시트 데이터 가져오기
        getSheetWithFormatting();
    }).catch(error => {
        // 타임아웃 제거
        clearTimeout(loadingTimeout);
        
        window.appState.error = error;
        console.error('API 초기화 오류:', error);
        handleErrors(error);
    });
}

// 스프레드시트 정보 가져오기
function getSpreadsheetInfo() {
    console.log('스프레드시트 정보 요청 중');
    
    // 캐시된 데이터가 있으면 사용
    const cachedInfo = getCachedData('spreadsheetInfo');
    if (cachedInfo) {
        return Promise.resolve(cachedInfo);
    }
    
    return gapi.client.sheets.spreadsheets.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        includeGridData: false
    }).then(response => {
        window.appState.spreadsheetLoaded = true;
        console.log('스프레드시트 정보 수신 완료');
        spreadsheetInfo = response.result;
        return spreadsheetInfo;
    }).catch(error => {
        window.appState.error = error;
        console.error('스프레드시트 정보 가져오기 오류:', error);
        handleErrors(error);
        return null;
    });
}

// 시트 설정 및 네비게이션 버튼 초기화
function setupSheets() {
    if (!spreadsheetInfo || !spreadsheetInfo.sheets) {
        console.error('스프레드시트 정보가 없습니다');
        return;
    }

    // 허용된 시트 목록 정의
    const allowedSheets = ['KSL계획표', 'Ko계획표'];
    
    // 허용된 시트만 필터링
    availableSheets = spreadsheetInfo.sheets.filter(sheet => {
        const sheetName = sheet.properties.title;
        
        // 1. 허용된 시트 목록에 있는지 확인
        const isAllowed = allowedSheets.includes(sheetName);
        
        // 2. API에서 제공하는 숨김 상태 확인
        const isHiddenByApi = sheet.properties.hidden === true;
        
        // 허용된 시트이면서 숨겨지지 않은 시트만 반환
        return isAllowed && !isHiddenByApi;
    });
    
    console.log('사용 가능한 시트:', availableSheets.map(s => s.properties.title));
    
    // 시트가 없으면 메시지 표시
    if (availableSheets.length === 0) {
        document.getElementById('content').innerHTML = '<p>표시할 시트가 없습니다.</p>';
        hideLoading();
        return;
    }
    
    // 기본 시트 설정
    let defaultSheetSet = false;
    
    // 기본 시트가 있으면 선택
    availableSheets.forEach((sheet) => {
        if (sheet.properties.title === CONFIG.DEFAULT_RANGE) {
            currentSheet = sheet.properties.title;
            defaultSheetSet = true;
        }
    });
    
    // 기본 시트가 없으면 첫 번째 시트 선택
    if (!defaultSheetSet && availableSheets.length > 0) {
        currentSheet = availableSheets[0].properties.title;
    }
    
    console.log('현재 선택된 시트:', currentSheet);
    
    // 네비게이션 버튼 설정
    setupNavigationButtons();
    
    // 현재 시트 이름 표시 (새로운 UI)
    updateCurrentSheetDisplayName();
}

// 현재 시트 이름을 UI에 표시
function updateCurrentSheetDisplayName() {
    const sheetNameDisplay = document.getElementById('current-sheet-display');
    if (sheetNameDisplay) {
        sheetNameDisplay.textContent = currentSheet;
    }
}

/**
 * 전체 시트 데이터에서 주차별 데이터를 분리하고 주차별 날짜를 추출합니다.
 * @param {object} fullSheetData API 응답으로 받은 전체 시트 데이터 (response.result)
 * @param {object} sheetProperties 시트 속성 정보 (sheet.properties)
 * @returns {Array<object>} 각 주차별 데이터를 담은 배열
 */
function parseWeeklyData(fullSheetData, sheetProperties) {
    const weeks = [];
    const fullGridData = fullSheetData.sheets[0].data[0];
    const fullMerges = fullSheetData.sheets[0].merges || [];
    
    weekRanges.forEach((range, index) => {
        const weekGridData = {
            ...fullGridData, // 기존 gridData의 다른 속성 유지
            rowData: [],
            rowMetadata: [],
            columnMetadata: fullGridData.columnMetadata // 열 메타데이터는 전체에서 가져옴
        };

        // 해당 주차의 rowData 추출
        for (let i = range.startRow; i <= range.endRow; i++) {
            if (fullGridData.rowData[i]) {
                weekGridData.rowData.push(fullGridData.rowData[i]);
            } else {
                // 빈 행일 경우에도 push (데이터가 없는 셀 처리)
                weekGridData.rowData.push({}); 
            }
            if (fullGridData.rowMetadata && fullGridData.rowMetadata[i]) {
                weekGridData.rowMetadata.push(fullGridData.rowMetadata[i]);
            }
        }

        // 해당 주차에 해당하는 병합 셀 정보만 필터링 및 조정
        const weekMerges = fullMerges.map(merge => {
            // 병합된 셀이 현재 주차 범위 내에 있는지 확인
            const startRowInWeek = merge.range.startRowIndex - range.startRow;
            const endRowInWeek = merge.range.endRowIndex - range.startRow - 1; // endRowIndex는 exclusive이므로 -1

            if (merge.range.startRowIndex >= range.startRow && merge.range.endRowIndex <= range.endRow + 1) {
                // 병합된 셀이 현재 주차에 완전히 포함되면, 인덱스를 주차 시작 기준으로 조정
                return {
                    ...merge,
                    range: {
                        ...merge.range,
                        startRowIndex: startRowInWeek,
                        endRowIndex: endRowInWeek + 1 // 다시 exclusive로 복원
                    }
                };
            } else if (merge.range.startRowIndex < range.startRow && merge.range.endRowIndex > range.startRow) {
                // 병합된 셀이 현재 주차 위에서 시작하지만 주차 안으로 확장되는 경우
                return {
                    ...merge,
                    range: {
                        ...merge.range,
                        startRowIndex: 0, // 주차의 첫 행부터 시작
                        endRowIndex: Math.min(endRowInWeek + 1, range.endRow - range.startRow + 1)
                    }
                }
            } else if (merge.range.startRowIndex < range.endRow + 1 && merge.range.endRowIndex > range.endRow + 1) {
                // 병합된 셀이 현재 주차 안에서 시작하지만 주차 아래로 확장되는 경우
                return {
                    ...merge,
                    range: {
                        ...merge.range,
                        startRowIndex: startRowInWeek,
                        endRowIndex: weekGridData.rowData.length // 주차의 마지막 행까지 확장
                    }
                }
            }
            return null; // 현재 주차에 해당하지 않는 병합 셀
        }).filter(merge => merge !== null);

        // "주날짜" (B2 셀) 추출
        let weekDate = '';
        if (weekGridData.rowData[1] && weekGridData.rowData[1].values && weekGridData.rowData[1].values[1]) {
            weekDate = weekGridData.rowData[1].values[1].formattedValue || '';
        }

        weeks.push({
            gridData: weekGridData,
            merges: weekMerges,
            sheetProperties: sheetProperties,
            weekDate: weekDate,
            originalStartRow: range.startRow // 원래 시트에서의 시작 행 저장
        });
    });

    return weeks;
}



// 특정 시트로 전환
function switchToSheet(sheetName) {
    // 시트 변경 처리
    currentSheet = sheetName;
    
    // 로딩 표시
    showLoading();
    
    // 시트 데이터 로드 (애니메이션 효과 추가)
    document.getElementById('content').classList.add('sheet-transition');
    
    // 시트 전환 방향에 따른 애니메이션 클래스 추가
    setTimeout(() => {
        getSheetWithFormatting();
        setTimeout(() => {
            document.getElementById('content').classList.remove('sheet-transition');
        }, 300);
    }, 50);
}

/**
 * 특정 주차의 데이터를 화면에 표시합니다.
 * @param {number} weekIndex 표시할 주차의 인덱스
 */
function displayWeek(weekIndex) {
    if (weekIndex < 0 || weekIndex >= allWeeksData.length) {
        console.error('유효하지 않은 주차 인덱스:', weekIndex);
        return;
    }
    
    currentWeekIndex = weekIndex;
    const currentWeek = allWeeksData[currentWeekIndex];
    const sheetName = currentSheet || CONFIG.DEFAULT_RANGE;
    const displayRange = CONFIG.DISPLAY_RANGES[sheetName] || null;

    displayFormattedData(currentWeek.gridData, currentWeek.merges, currentWeek.sheetProperties);
    updateWeekDisplay(); // 주차 표시 업데이트
}

// 이전 주로 이동
function navigateToPreviousWeek() {
    if (allWeeksData.length === 0) return;
    
    let newIndex = currentWeekIndex - 1;
    if (newIndex < 0) {
        newIndex = allWeeksData.length - 1; // 마지막 주로 순환
    }
    displayWeek(newIndex);
}

// 다음 주로 이동
function navigateToNextWeek() {
    if (allWeeksData.length === 0) return;

    let newIndex = currentWeekIndex + 1;
    if (newIndex >= allWeeksData.length) {
        newIndex = 0; // 첫 번째 주로 순환
    }
    displayWeek(newIndex);
}

/**
 * 현재 주차의 "주날짜" 정보를 UI에 표시합니다.
 */
function updateWeekDisplay() {
    const weekDisplay = document.getElementById('current-week-display');
    if (weekDisplay && allWeeksData[currentWeekIndex]) {
        weekDisplay.textContent = allWeeksData[currentWeekIndex].weekDate;
    }
}

// 스프레드시트 데이터와 서식 가져오기
function getSheetWithFormatting() {
    // 콘텐츠 영역 초기화
    document.getElementById('content').innerHTML = '';
    
    // 사용할 시트 이름 결정
    const sheetName = currentSheet || CONFIG.DEFAULT_RANGE;
    
    // 표시할 범위 결정
    const displayRange = CONFIG.DISPLAY_RANGES[sheetName] || null;
    
    console.log(`시트 데이터 요청 중: ${sheetName}, 범위: ${displayRange || '전체'}`);
    
    // 캐시에서 데이터 확인
    const cachedData = getCachedData(`sheetData_${sheetName}`);
    if (cachedData) {
        console.log('캐시에서 시트 데이터 로드 완료');
        
        // 로딩 숨기기
        hideLoading();
        
        if (!cachedData.sheets || cachedData.sheets.length === 0) {
            document.getElementById('content').innerHTML = '<p>데이터를 찾을 수 없습니다.</p>';
            return;
        }
        
        const sheet = cachedData.sheets[0];
        const gridData = sheet.data[0];
        const merges = sheet.merges || [];
        
        displayFormattedData(gridData, merges, sheet.properties);
        updateCurrentSheetDisplayName();
        updateWeekDisplay();
        return;
    }
    
    // 캐시에 없으면 API 호출
    gapi.client.sheets.spreadsheets.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        ranges: [`${sheetName}`],
        includeGridData: true,
        fields: '*' // 모든 필드 가져오기 (열 너비 정보 포함)
    }).then(response => {
        console.log('시트 데이터 수신 완료');
        
        // 캐시에 저장
        storage.cacheSheetData(CONFIG.SPREADSHEET_ID, sheetName, response.result);
        
        // 로딩 숨기기
        hideLoading();
        
        if (!response.result.sheets || response.result.sheets.length === 0) {
            document.getElementById('content').innerHTML = '<p>데이터를 찾을 수 없습니다.</p>';
            return;
        }
        
        const sheet = response.result.sheets[0];
        const sheetProperties = sheet.properties;
        
        // 전체 시트 데이터를 주차별로 분리
        allWeeksData = parseWeeklyData(response.result, sheetProperties);
        
        // 현재 날짜에 해당하는 주차 찾기
        currentWeekIndex = findMatchingWeekIndex(allWeeksData);
        
        // 현재 주차 데이터 가져오기
        const currentWeek = allWeeksData[currentWeekIndex];
        
        // 현재 주차 데이터 표시
        displayFormattedData(currentWeek.gridData, currentWeek.merges, currentWeek.sheetProperties);
        
        // 현재 시트 이름 및 주차 표시
        updateCurrentSheetDisplayName();
        updateWeekDisplay();
        
    }).catch(error => {
        console.error('시트 데이터 가져오기 오류:', error);
        window.appState.error = error;
        
        // 로딩 숨기기
        hideLoading();
        handleErrors(error);
    });
}






// 서식이 적용된 데이터 표시
function displayFormattedData(gridData, merges, sheetProperties) { // Removed displayRange parameter
    const content = document.getElementById('content');
    
    if (!gridData.rowData || gridData.rowData.length === 0) {
        content.innerHTML = '<p>시트에 데이터가 없습니다.</p>';
        return;
    }
    
    try {
        console.log('데이터 포맷팅 시작');
        
        // Dynamically create displayRange for formatHandler, assuming A-D columns
        const dynamicDisplayRange = `A1:D${gridData.rowData.length}`;
        
        // 서식 핸들러 호출
        const html = formatHandler.createFormattedTable(gridData, merges, sheetProperties, dynamicDisplayRange);
        content.innerHTML = html;
        
        console.log('병합 셀 적용 시작');
        
        // 병합 셀 적용
        if (merges && merges.length > 0) {
            formatHandler.applyMerges(merges);
        }
        
        console.log('열 너비 조정 시작');
        
        // 열 너비 자동 조정
        adjustColumnWidths();
        
        console.log('데이터 표시 완료');
    } catch (error) {
        console.error('데이터 표시 오류:', error);
        window.appState.error = error;
        content.innerHTML = `<p>데이터 표시 중 오류가 발생했습니다: ${error.message}</p>`;
    }
}

// 열 너비 자동 조정 함수 - 원본 비율 유지, 줄바꿈 허용
function adjustColumnWidths() {
    const table = document.querySelector('.sheet-table');
    if (!table) return;
    
    // 테이블 내 모든 행
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return;
    
    // 컨테이너 너비 확인
    const container = document.querySelector('.container');
    const containerWidth = container.clientWidth;
    const availableWidth = containerWidth - 20; // 여백 고려
    
    // 첫 번째 행의 셀 수
    const firstRow = rows[0];
    const cellCount = firstRow.cells.length;
    
    // 기본 열 너비 설정
    let colWidths = new Array(cellCount).fill(100); // 기본값 100px
    
    // 1. 원본 시트의 열 너비 정보 가져오기 (가능한 경우)
    let originalWidths = [];
    let hasOriginalWidths = false;
    
    if (spreadsheetInfo && spreadsheetInfo.sheets && spreadsheetInfo.sheets.length > 0) {
        const currentSheetInfo = spreadsheetInfo.sheets.find(s => s.properties.title === currentSheet);
        if (currentSheetInfo && currentSheetInfo.properties && currentSheetInfo.properties.gridProperties) {
            // 원본 열 너비 정보 확인
            if (currentSheetInfo.data && currentSheetInfo.data[0] && currentSheetInfo.data[0].columnMetadata) {
                originalWidths = currentSheetInfo.data[0].columnMetadata.map(col => col.pixelSize || 100);
                hasOriginalWidths = true;
            } 
            // 다른 경로로 열 너비 정보 확인
            else if (currentSheetInfo.properties.gridProperties.columnMetadata) {
                originalWidths = currentSheetInfo.properties.gridProperties.columnMetadata.map(col => col.pixelSize || 100);
                hasOriginalWidths = true;
            }
        }
    }
    
    // 원본 열 너비 정보가 있으면 사용, 없으면 콘텐츠 기반 계산
    if (hasOriginalWidths && originalWidths.length >= cellCount) {
        console.log('원본 시트 열 너비 정보 사용:', originalWidths);
        colWidths = originalWidths.slice(0, cellCount);
    } else {
        // 2. 콘텐츠 기반 열 너비 계산
        let maxContentLengths = new Array(cellCount).fill(0);
        
        rows.forEach(row => {
            Array.from(row.cells).forEach((cell, index) => {
                if (index >= cellCount) return;
                
                // 셀 내용 길이
                const text = cell.textContent || '';
                const contentLength = text.length;
                
                // 콘텐츠 길이 업데이트
                maxContentLengths[index] = Math.max(maxContentLengths[index], contentLength);
            });
        });
        
        // 콘텐츠 길이에 따른 열 너비 계산
        colWidths = maxContentLengths.map(length => {
            if (length <= 5) return 60;      // 매우 짧은 텍스트
            if (length <= 10) return 100;    // 짧은 텍스트
            if (length <= 20) return 150;    // 중간 텍스트
            if (length <= 40) return 200;    // 긴 텍스트
            return 250;                      // 매우 긴 텍스트
        });
    }
    
    // 3. 원본 비율 계산
    const totalOriginalWidth = colWidths.reduce((sum, width) => sum + width, 0);
    const widthRatios = colWidths.map(width => width / totalOriginalWidth);
    
    console.log('열 너비 비율:', widthRatios);
    
    // 4. 반응형 적용 - 사용 가능한 너비에 비율 적용
    const finalWidths = widthRatios.map(ratio => Math.max(Math.floor(ratio * availableWidth), 40));
    
    // 5. CSS 적용 - 반응형을 위해 %로 설정
    const styleSheet = document.createElement('style');
    let styleRules = '';
    
    // 테이블 레이아웃 설정
    styleRules += `.sheet-table { table-layout: fixed; width: 100%; max-width: 100%; }\n`;
    
    // 각 열에 비율 적용
    finalWidths.forEach((width, index) => {
        const widthPercent = (widthRatios[index] * 100).toFixed(2);
        styleRules += `.sheet-table td:nth-child(${index + 1}), .sheet-table th:nth-child(${index + 1}) { 
            width: ${widthPercent}%; 
        }\n`;
    });
    
    // 모든 셀에 줄바꿈 허용
    styleRules += `
        .sheet-table td, .sheet-table th {
            white-space: normal;
            word-wrap: break-word;
            overflow-wrap: break-word;
            overflow: visible;
        }
    `;
    
    styleSheet.textContent = styleRules;
    document.head.appendChild(styleSheet);
    
    console.log('원본 비율 기반 열 너비 조정 완료 (줄바꿈 허용):', finalWidths);
}


// 에러 처리 함수
function handleErrors(error) {
    console.error('Error:', error);
    
    // 사용자 친화적인 에러 메시지 표시
    let errorMessage = '데이터를 가져오는 중 오류가 발생했습니다.';
    
    if (error.result && error.result.error) {
        errorMessage += ` (${error.result.error.message})`;
    } else if (error.message) {
        errorMessage += ` (${error.message})`;
    }
    
    document.getElementById('content').innerHTML = 
        `<div class="error-message">${errorMessage}
         <p><button onclick="location.reload()" class="retry-button">다시 시도</button></p>
        </div>`;
}