// 설정
const CONFIG = {
    API_KEY: 'AIzaSyA2NydJpV5ywSnDbXFlliIHs3Xp5aP_6sI',
    SPREADSHEET_ID: '1bTcma87DpDjfZyUvAgVw9wzXBH8ZXui_yVodTblHzmM',
    DEFAULT_RANGE: 'KSL계획표', // 기본 시트 이름
    DISPLAY_RANGES: {
        // 시트별 표시 범위 설정 (A1 표기법)
        'KSL계획표': 'B1:C179',  // KSL계획표는 B1부터 C179까지만 표시
        'Ko계획표': 'B1:C179'    // Ko계획표는 B1부터 C179까지만 표시
    }
};

// 전역 변수
let currentSheet = null;
let spreadsheetInfo = null;
let availableSheets = []; // 사용 가능한 시트 목록 저장

// 스와이프 감지를 위한 변수
let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 100; // 스와이프로 인식할 최소 거리 (픽셀)

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    // 버튼 이벤트 리스너 설정
    document.getElementById('refreshBtn').addEventListener('click', refreshData);
    
    // 스와이프 이벤트 리스너 설정
    setupSwipeListeners();
    
    // 키보드 이벤트 리스너 설정
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            navigateToPreviousSheet();
        } else if (e.key === 'ArrowRight') {
            navigateToNextSheet();
        }
    });
    
    // Google API 클라이언트 로드
    gapi.load('client', initClient);
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
            // 오른쪽으로 스와이프 - 이전 시트로 이동
            navigateToPreviousSheet();
        } else {
            // 왼쪽으로 스와이프 - 다음 시트로 이동
            navigateToNextSheet();
        }
    }
}

// API 클라이언트 초기화
function initClient() {
    gapi.client.init({
        apiKey: CONFIG.API_KEY,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    }).then(() => {
        // 스프레드시트 정보 가져오기
        getSpreadsheetInfo().then(() => {
            // 시트 목록 설정 및 네비게이션 버튼 초기화
            setupSheets();
            // 기본 시트 데이터 가져오기
            getSheetWithFormatting();
        });
    }).catch(error => {
        handleErrors(error);
    });
}

// 스프레드시트 정보 가져오기
function getSpreadsheetInfo() {
    return gapi.client.sheets.spreadsheets.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        includeGridData: false
    }).then(response => {
        spreadsheetInfo = response.result;
        return spreadsheetInfo;
    }).catch(error => {
        handleErrors(error);
        return null;
    });
}

// 시트 설정 및 네비게이션 버튼 초기화
function setupSheets() {
    if (!spreadsheetInfo || !spreadsheetInfo.sheets) return;
    
    // 숨겨지지 않은 시트만 필터링 (여러 조건 조합)
    availableSheets = spreadsheetInfo.sheets.filter(sheet => {
        // 1. API에서 제공하는 숨김 상태 확인
        const isHiddenByApi = sheet.properties.hidden === true;
        
        // 2. 시트 이름 기반 필터링 (선택적)
        const isHiddenByName = sheet.properties.title.startsWith('_') || 
                              sheet.properties.title.startsWith('hidden_');
        
        // 3. 기타 숨김 관련 속성 확인
        const hasOtherHiddenProps = sheet.properties.hideGridlines === true;
        
        // 모든 조건을 고려하여 보이는 시트만 반환
        return !isHiddenByApi && !isHiddenByName && !hasOtherHiddenProps;
    });
    
    // 시트가 없으면 메시지 표시
    if (availableSheets.length === 0) {
        document.getElementById('content').innerHTML = '<p>표시할 시트가 없습니다.</p>';
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
    
    // 네비게이션 버튼 설정
    setupNavigationButtons();
}

// 네비게이션 버튼 설정
function setupNavigationButtons() {
    // 네비게이션 컨테이너 생성
    const navContainer = document.createElement('div');
    navContainer.id = 'nav-container';
    navContainer.className = 'navigation-buttons';
    
    // 이전 버튼 생성
    const prevButton = document.createElement('button');
    prevButton.id = 'prev-sheet-btn';
    prevButton.className = 'nav-button';
    prevButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
    prevButton.title = '이전 시트';
    prevButton.addEventListener('click', navigateToPreviousSheet);
    
    // 다음 버튼 생성
    const nextButton = document.createElement('button');
    nextButton.id = 'next-sheet-btn';
    nextButton.className = 'nav-button';
    nextButton.innerHTML = '<i class="fas fa-arrow-right"></i>';
    nextButton.title = '다음 시트';
    nextButton.addEventListener('click', navigateToNextSheet);
    
    // 버튼을 컨테이너에 추가
    navContainer.appendChild(prevButton);
    navContainer.appendChild(nextButton);
    
    // 컨테이너를 controls 요소에 추가
    document.querySelector('.controls').appendChild(navContainer);
    
    // 시트가 1개만 있으면 네비게이션 버튼 숨김
    if (availableSheets.length <= 1) {
        navContainer.style.display = 'none';
    }
}

// 이전 시트로 이동
function navigateToPreviousSheet() {
    if (availableSheets.length <= 1) return; // 시트가 1개 이하면 무시
    
    const currentIndex = availableSheets.findIndex(sheet => sheet.properties.title === currentSheet);
    if (currentIndex > 0) {
        // 이전 시트로 이동
        const prevSheet = availableSheets[currentIndex - 1].properties.title;
        switchToSheet(prevSheet);
    } else {
        // 첫 번째 시트면 마지막 시트로 순환
        const lastSheet = availableSheets[availableSheets.length - 1].properties.title;
        switchToSheet(lastSheet);
    }
}

// 다음 시트로 이동
function navigateToNextSheet() {
    if (availableSheets.length <= 1) return; // 시트가 1개 이하면 무시
    
    const currentIndex = availableSheets.findIndex(sheet => sheet.properties.title === currentSheet);
    if (currentIndex < availableSheets.length - 1) {
        // 다음 시트로 이동
        const nextSheet = availableSheets[currentIndex + 1].properties.title;
        switchToSheet(nextSheet);
    } else {
        // 마지막 시트면 첫 번째 시트로 순환
        const firstSheet = availableSheets[0].properties.title;
        switchToSheet(firstSheet);
    }
}

// 특정 시트로 전환
function switchToSheet(sheetName) {
    // 시트 변경 처리
    currentSheet = sheetName;
    
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

// 데이터 새로고침
function refreshData() {
    getSheetWithFormatting();
}

// 스프레드시트 데이터와 서식 가져오기
function getSheetWithFormatting() {
    // 로딩 표시
    document.getElementById('loading').style.display = 'block';
    document.getElementById('content').innerHTML = '';
    
    // 사용할 시트 이름 결정
    const sheetName = currentSheet || CONFIG.DEFAULT_RANGE;
    
    // 표시할 범위 결정
    const displayRange = CONFIG.DISPLAY_RANGES[sheetName] || null;
    
    // 스프레드시트 정보 가져오기 (데이터 + 서식)
    gapi.client.sheets.spreadsheets.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        ranges: [`${sheetName}`],
        includeGridData: true  // 서식 정보 포함
    }).then(response => {
        // 로딩 숨기기
        document.getElementById('loading').style.display = 'none';
        
        if (!response.result.sheets || response.result.sheets.length === 0) {
            document.getElementById('content').innerHTML = '<p>데이터를 찾을 수 없습니다.</p>';
            return;
        }
        
        const sheet = response.result.sheets[0];
        const gridData = sheet.data[0];
        
        // 병합 셀 정보 가져오기
        const merges = sheet.merges || [];
        
        // 데이터와 서식 정보 함께 처리 (표시 범위 전달)
        displayFormattedData(gridData, merges, sheet.properties, displayRange);
        
        // 네비게이션 버튼 및 인디케이터 업데이트
        updateNavigationButtons();
        updateSheetIndicator();
        
        // 현재 시트 이름 표시
        updateCurrentSheetName();
        
    }).catch(error => {
        // 로딩 숨기기
        document.getElementById('loading').style.display = 'none';
        handleErrors(error);
    });
}

// 현재 시트 이름 업데이트
function updateCurrentSheetName() {
    const sheetNameDisplay = document.getElementById('current-sheet-name');
    if (sheetNameDisplay) {
        sheetNameDisplay.textContent = currentSheet;
    }
}

// 현재 시트에 따라 네비게이션 버튼 업데이트
function updateNavigationButtons() {
    if (availableSheets.length <= 1) return; // 시트가 1개 이하면 무시
    
    const currentIndex = availableSheets.findIndex(sheet => sheet.properties.title === currentSheet);
    const prevButton = document.getElementById('prev-sheet-btn');
    const nextButton = document.getElementById('next-sheet-btn');
    
    // 첫 번째 시트인 경우 이전 버튼 숨김 (옵션)
    if (prevButton) {
        prevButton.style.visibility = currentIndex === 0 ? 'hidden' : 'visible';
    }
    
    // 마지막 시트인 경우 다음 버튼 숨김 (옵션)
    if (nextButton) {
        nextButton.style.visibility = currentIndex === availableSheets.length - 1 ? 'hidden' : 'visible';
    }
}

// 시트 인디케이터 업데이트 - 클릭 기능 추가
function updateSheetIndicator() {
    // 시트 인디케이터 요소가 없으면 생성
    let indicator = document.getElementById('sheet-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'sheet-indicator';
        document.getElementById('content').insertAdjacentElement('afterend', indicator);
    }
    
    // 인디케이터 내용 생성
    let dots = '';
    availableSheets.forEach((sheet, index) => {
        const isActive = sheet.properties.title === currentSheet;
        dots += `<span class="indicator-dot ${isActive ? 'active' : ''}" 
                      data-sheet="${sheet.properties.title}" 
                      title="${sheet.properties.title}"></span>`;
    });
    
    // 인디케이터 업데이트
    indicator.innerHTML = dots;
    
    // 인디케이터 클릭 이벤트 추가
    const dotElements = indicator.querySelectorAll('.indicator-dot');
    dotElements.forEach(dot => {
        dot.addEventListener('click', function() {
            const sheetName = this.getAttribute('data-sheet');
            if (sheetName !== currentSheet) {
                switchToSheet(sheetName);
            }
        });
    });
}

// 서식이 적용된 데이터 표시
function displayFormattedData(gridData, merges, sheetProperties, displayRange) {
    const content = document.getElementById('content');
    
    if (!gridData.rowData || gridData.rowData.length === 0) {
        content.innerHTML = '<p>시트에 데이터가 없습니다.</p>';
        return;
    }
    
    // 서식 핸들러 호출
    const html = formatHandler.createFormattedTable(gridData, merges, sheetProperties, displayRange);
    content.innerHTML = html;
    
    // 병합 셀 적용
    if (merges && merges.length > 0) {
        formatHandler.applyMerges(merges);
    }
    
    // 열 너비 자동 조정
    adjustColumnWidths();
}

// 열 너비 자동 조정 함수
function adjustColumnWidths() {
    const table = document.querySelector('.sheet-table');
    if (!table) return;
    
    // 테이블 내 모든 행
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return;
    
    // 첫 번째 행의 셀 수를 기준으로 열 너비 배열 초기화
    const firstRow = rows[0];
    const cellCount = firstRow.cells.length;
    let colWidths = new Array(cellCount).fill(0);
    
    // 각 셀의 내용에 따라 필요한 너비 계산
    rows.forEach(row => {
        Array.from(row.cells).forEach((cell, index) => {
            if (index >= colWidths.length) return;
            
            // 셀 내용의 길이에 따라 너비 결정
            const contentLength = cell.textContent.length;
            const cellWidth = Math.max(contentLength * 10, 80); // 글자당 10px, 최소 80px
            
            // colspan 고려
            const colspan = cell.colSpan || 1;
            if (colspan === 1) {
                colWidths[index] = Math.max(colWidths[index], cellWidth);
            }
        });
    });
    
    // 계산된 너비 적용
    const styleSheet = document.createElement('style');
    let styleRules = '';
    
    colWidths.forEach((width, index) => {
        styleRules += `.sheet-table td:nth-child(${index + 1}) { min-width: ${width}px; }\n`;
    });
    
    styleSheet.textContent = styleRules;
    document.head.appendChild(styleSheet);
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
        `<div class="error-message">${errorMessage}</div>`;
}
