// 앱 상태
window.appState = {
    userName: localStorage.getItem('userName') || null
};

// 설정
const CONFIG = {
    API_KEY: 'AIzaSyA2NydJpV5ywSnDbXFlliIHs3Xp5aP_6sI',
    SPREADSHEET_ID: '1fn8eQ01APc3qCN_J3Hw7ykKr-0klMb8_WHDYCJNWVv0',
    DATA_RANGE: 'A3:O48' 
};

// 전역 상태 변수
let currentSource = 'KSL_Data';
let allWeeks = [];
let currentWeekIndex = 0;

// 스와이프 감지 변수
let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 100;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initializeApp);

function toggleSheetStyles(enabled) {
    const sheetStyles = document.querySelector('link[href="sheet-styles.css"]');
    if (sheetStyles) {
        sheetStyles.disabled = !enabled;
    }
}

function initializeApp() {
    if (!window.appState.userName) {
        const userName = prompt('사용자 이름을 입력해주세요:', '');
        if (userName) {
            window.appState.userName = userName;
            localStorage.setItem('userName', userName);
        }
    }
    
    setupEventListeners();
    gapi.load('client', initClient);
}

// 이벤트 리스너 설정
function setupEventListeners() {
    document.getElementById('ksl-btn').addEventListener('click', () => switchSource('KSL_Data'));
    document.getElementById('ko-btn').addEventListener('click', () => switchSource('Ko_Data'));
    document.getElementById('prev-week-btn').addEventListener('click', navigateToPreviousWeek);
    document.getElementById('next-week-btn').addEventListener('click', navigateToNextWeek);

    const contentArea = document.getElementById('content');
    contentArea.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    contentArea.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') navigateToPreviousWeek();
        else if (e.key === 'ArrowRight') navigateToNextWeek();
    });

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

function handleSwipe() {
    if (currentSource === 'KSL_Data') return; // Do not swipe on full sheet view
    if (touchEndX < touchStartX - swipeThreshold) navigateToNextWeek();
    if (touchEndX > touchStartX + swipeThreshold) navigateToPreviousWeek();
}

function navigateToPreviousWeek() {
    if (currentWeekIndex > 0) {
        currentWeekIndex--;
        renderCurrentWeek();
    }
}

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
    }).then(() => loadDataAndRender(currentSource)).catch(handleErrors);
}

// 최종 수정 시간을 가져오는 함수
function getModifiedTime() {
    return gapi.client.sheets.spreadsheets.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        fields: 'properties.modifiedTime'
    }).then(res => res.result.properties.modifiedTime)
      .catch(err => {
        console.error("최종 수정 시간을 가져오는 중 오류 발생:", err);
        return null;
    });
}

// 데이터 로드 및 렌더링
async function loadDataAndRender(sheetName) {
    showLoading();
    const modifiedTime = await getModifiedTime();
    const cacheKey = `sheetData_${sheetName}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData && modifiedTime && cache.get('spreadsheetModifiedTime') === modifiedTime) {
        console.log('캐시에서 데이터를 로드합니다.');
        if (sheetName === 'KSL_Data') {
            processFullSheetData(cachedData);
        } else {
            processData(cachedData, sheetName);
        }
        return;
    }
    
    console.log('서버에서 새로운 데이터를 가져옵니다.');
    
    if (sheetName === 'KSL_Data') {
        gapi.client.sheets.spreadsheets.get({
            spreadsheetId: CONFIG.SPREADSHEET_ID,
            includeGridData: true,
            fields: 'sheets(properties,data(rowData(values(formattedValue,effectiveFormat)),rowMetadata,columnMetadata,merges))'
        }).then(response => {
            const allSheets = response.result.sheets;
            const kslSheetData = allSheets.find(sheet => sheet.properties.title === sheetName);
            if (!kslSheetData) {
                handleErrors({ message: `Sheet ${sheetName} not found.` });
                return;
            }
            cache.set(cacheKey, kslSheetData);
            if (modifiedTime) cache.set('spreadsheetModifiedTime', modifiedTime);
            processFullSheetData(kslSheetData);
        }).catch(handleErrors);
    } else {
        const range = `${sheetName}!${CONFIG.DATA_RANGE}`;
        gapi.client.sheets.spreadsheets.get({
            spreadsheetId: CONFIG.SPREADSHEET_ID,
            ranges: [range],
            fields: 'sheets/data/rowData/values/formattedValue'
        }).then(response => {
            const sheetData = response.result;
            cache.set(cacheKey, sheetData);
            if (modifiedTime) cache.set('spreadsheetModifiedTime', modifiedTime);
            processData(sheetData, sheetName);
        }).catch(handleErrors);
    }
}

function processFullSheetData(sheetData) {
    document.getElementById('week-navigation').style.display = 'none';
    toggleSheetStyles(false);
    document.getElementById('content').style.overflowX = 'auto';

    const gridData = sheetData.data[0];
    const merges = gridData.merges || [];
    const tableHtml = formatHandler.createTableFromGridData(gridData, merges);
    document.getElementById('content').innerHTML = tableHtml;
    hideLoading();
}

function processData(sheetData, sheetName) {
    document.getElementById('week-navigation').style.display = 'flex';
    toggleSheetStyles(true);
    document.getElementById('content').style.overflowX = 'hidden';

    if (!sheetData.sheets || sheetData.sheets.length === 0) {
        handleErrors({ message: '시트 데이터를 찾을 수 없습니다.' });
        return;
    }
    const gridData = sheetData.sheets[0].data[0];
    allWeeks = formatHandler.parseDataIntoWeeks(gridData, sheetName);

    if (allWeeks.length === 0) {
        document.getElementById('content').innerHTML = '<p style="text-align: center; padding: 20px;">표시할 주 데이터가 없습니다.</p>';
        hideLoading();
        return;
    }

    findInitialWeek();
    renderCurrentWeek();
    hideLoading();
}

function findInitialWeek() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const check = (year) => {
        return allWeeks.findIndex(week => {
            if (!week.startDate || !week.endDate) return false;
            let start = new Date(year, week.startDate.month - 1, week.startDate.day);
            let end = new Date(year, week.endDate.month - 1, week.endDate.day);
            if (end < start) {
                end.setFullYear(year + 1);
            }
            end.setHours(23, 59, 59, 999);
            return today >= start && today <= end;
        });
    }

    let foundIndex = check(today.getFullYear());
    if (foundIndex === -1) {
        foundIndex = check(today.getFullYear() - 1);
    }

    currentWeekIndex = (foundIndex !== -1) ? foundIndex : 0;
}

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
        return value || '';
    };

    let tableHtml = '<table class="sheet-table" id="schedule-table"><tbody>';
    const rowCount = 46;
    for (let r = 0; r < rowCount; r++) {
        const rowData = weekData[r] || ['', ''];
        tableHtml += `<tr>`;
        tableHtml += `<td>${highlight(rowData[0])}</td>`;
        tableHtml += `<td>${highlight(rowData[1])}</td>`;
        tableHtml += `</tr>`;
    }
    tableHtml += '</tbody></table>';
    
    document.getElementById('content').innerHTML = tableHtml;
}

function updateWeekDisplay(week) {
    const display = document.getElementById('current-week-display');
    if (week.startDate && week.endDate) {
        const startStr = `${week.startDate.month}월 ${week.startDate.day}일`;
        const endStr = `${week.endDate.month}월 ${week.endDate.day}일`;
        display.textContent = `${startStr} ~ ${endStr}`;
    } else {
        display.textContent = `주 ${currentWeekIndex + 1}`;
    }
}

function updateNavButtons() {
    document.getElementById('prev-week-btn').disabled = currentWeekIndex === 0;
    document.getElementById('next-week-btn').disabled = currentWeekIndex === allWeeks.length - 1;
}

function showLoading() { document.getElementById('loading').style.display = 'block'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

function handleErrors(error) {
    console.error('Error:', error);
    let msg = '데이터를 가져오는 중 오류가 발생했습니다.';
    if (error.result?.error) msg += ` (${error.result.error.message})`;
    else if (error.message) msg += ` (${error.message})`;
    document.getElementById('content').innerHTML = `<div class="error-message">${msg}<p><button onclick="location.reload()" class="retry-button">다시 시도</button></p></div>`;
    hideLoading();
}

function setupNameChangeButton() {
    const btn = document.createElement('button');
    btn.id = 'change-name-btn';
    btn.className = 'name-change-btn';
    btn.innerHTML = '<i class="fas fa-user-edit"></i>';
    btn.title = '이름 변경';
    btn.onclick = () => {
        const newName = prompt('새로운 이름을 입력하세요:', window.appState.userName || '');
        if (newName !== null) {
            window.appState.userName = newName;
            localStorage.setItem('userName', newName);
            if (currentSource === 'KSL_Data') {
                // Re-render full sheet to update highlights
                loadDataAndRender('KSL_Data');
            } else {
                renderCurrentWeek();
            }
        }
    };
    const header = document.querySelector('.header-container');
    if (header) {
        btn.style.position = 'absolute';
        btn.style.top = '10px';
        btn.style.right = '10px';
        header.appendChild(btn);
    }
}