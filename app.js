// 앱 상태
window.appState = {
    userName: localStorage.getItem('userName') || null
};

// 설정
const CONFIG = {
    API_KEY: 'AIzaSyA2NydJpV5ywSnDbXFlliIHs3Xp5aP_6sI',
    SPREADSHEET_ID: '1fn8eQ01APc3qCN_J3Hw7ykKr-0klMb8_WHDYCJNWVv0'
};

// 전역 상태 변수
let currentSource = 'KSL_Data'; // Default to KSL_Data initially

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    if (!window.appState.userName) {
        const userName = prompt('사용자 이름을 입력해주세요:', '');
        if (userName) {
            window.appState.userName = userName;
            localStorage.setItem('userName', userName);
        }
    }
    
    setupEventListeners(); // Reintroduce event listeners
    gapi.load('client', initClient);
}

// 이벤트 리스너 설정
function setupEventListeners() {
    document.getElementById('ksl-btn').addEventListener('click', () => switchSource('KSL_Data'));
    document.getElementById('ko-btn').addEventListener('click', () => switchSource('Ko_Data'));

    // Removed: touch/swipe listeners, keydown listeners, week navigation listeners
}

// 데이터 소스 전환
function switchSource(sourceName) {
    if (currentSource === sourceName) return;
    currentSource = sourceName;
    document.getElementById('ksl-btn').classList.toggle('active', sourceName === 'KSL_Data');
    document.getElementById('ko-btn').classList.toggle('active', sourceName === 'Ko_Data');
    loadDataAndRender(sourceName); // Load data for the switched source
}

// API 클라이언트 초기화
function initClient() {
    gapi.client.init({
        apiKey: CONFIG.API_KEY,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    }).then(() => loadDataAndRender(currentSource)).catch(handleErrors); // Load initial sheet
}

// 최종 수정 시간을 가져오는 함수 (Still used)
function getModifiedTime() {
    return gapi.client.sheets.spreadsheets.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        fields: 'properties.modifiedTime'
    }).then(res => res.result.properties.modifiedTime)
      .catch(err => {
        console.error("Error fetching last modified time:", err);
        return null;
    });
}

// 데이터 로드 및 렌더링 (Universal for any sheetName)
async function loadDataAndRender(sheetName) {
    showLoading();
    const modifiedTime = await getModifiedTime();
    const cacheKey = `sheetData_${sheetName}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData && modifiedTime && cache.get('spreadsheetModifiedTime') === modifiedTime) {
        console.log('Loading data from cache for:', sheetName);
        processAndRenderSheet(cachedData);
        return;
    }
    
    console.log('Fetching new data from server for:', sheetName);
    
    // Always fetch full sheet data with optimized fields
    gapi.client.sheets.spreadsheets.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        includeGridData: true,
        fields: 'sheets.properties,sheets.data.rowData.values(formattedValue,effectiveFormat),sheets.merges,sheets.data.columnMetadata'
    }).then(response => {
        const allSheets = response.result.sheets;
        const targetSheetData = allSheets.find(sheet => sheet.properties.title === sheetName);
        if (!targetSheetData) {
            handleErrors({ message: `Sheet ${sheetName} not found.` });
            return;
        }
        cache.set(cacheKey, targetSheetData);
        if (modifiedTime) cache.set('spreadsheetModifiedTime', modifiedTime);
        processAndRenderSheet(targetSheetData);
    }).catch(handleErrors);
}

// Process and render the entire sheet content
function processAndRenderSheet(sheetData) {
    document.getElementById('content').style.overflowX = 'auto'; // Ensure content is scrollable

    const gridData = sheetData.data[0]; // Assuming the first data entry for the sheet
    const merges = sheetData.merges || []; // Merges are directly under sheetData
    const tableHtml = formatHandler.createTableFromGridData(gridData, merges);
    document.getElementById('content').innerHTML = tableHtml;
    hideLoading();
    setupNameChangeButton(); // Setup name change button after content is loaded
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
    const btnId = 'change-name-btn';
    let btn = document.getElementById(btnId);
    if (!btn) {
        btn = document.createElement('button');
        btn.id = btnId;
        btn.className = 'name-change-btn';
        btn.innerHTML = '<i class="fas fa-user-edit"></i>';
        btn.title = '이름 변경';
        const header = document.querySelector('.header-container');
        if (header) {
            header.style.position = 'relative'; // Ensure header is positioned for absolute button
            btn.style.position = 'absolute';
            btn.style.top = '10px';
            btn.style.right = '10px';
            header.appendChild(btn);
        }
    }
    
    btn.onclick = () => {
        const newName = prompt('새로운 이름을 입력하세요:', window.appState.userName || '');
        if (newName !== null) {
            window.appState.userName = newName;
            localStorage.setItem('userName', newName);
            // Re-render the current sheet to update highlights with new name
            loadDataAndRender(currentSource);
        }
    };
}