// 설정 - 실제 값으로 변경 필요
const CONFIG = {
    API_KEY: 'AIzaSyA2NydJpV5ywSnDbXFlliIHs3Xp5aP_6sI',
    SPREADSHEET_ID: '1bTcma87DpDjfZyUvAgVw9wzXBH8ZXui_yVodTblHzmM',
    RANGE: 'KSL계획표!A1:D180'  // 데이터 범위 조정 가능
};

// 전역 변수
let currentSheet = null;
let spreadsheetInfo = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    // 버튼 이벤트 리스너 설정
    document.getElementById('refreshBtn').addEventListener('click', refreshData);
    document.getElementById('sheetSelector').addEventListener('change', handleSheetChange);
    
    // Google API 클라이언트 로드
    gapi.load('client', initClient);
}

// API 클라이언트 초기화
function initClient() {
    gapi.client.init({
        apiKey: CONFIG.API_KEY,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    }).then(() => {
        // 스프레드시트 정보 가져오기
        getSpreadsheetInfo().then(() => {
            // 시트 목록 표시
            populateSheetSelector();
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
        spreadsheetId: CONFIG.SPREADSHEET_ID
    }).then(response => {
        spreadsheetInfo = response.result;
        return spreadsheetInfo;
    }).catch(error => {
        handleErrors(error);
        return null;
    });
}

// 시트 선택기 채우기
function populateSheetSelector() {
    if (!spreadsheetInfo || !spreadsheetInfo.sheets) return;
    
    const selector = document.getElementById('sheetSelector');
    // 기존 옵션 초기화 (첫 번째 옵션 제외)
    selector.innerHTML = '<option value="">시트 선택...</option>';
    
    // 시트 목록 추가
    spreadsheetInfo.sheets.forEach((sheet, index) => {
        const option = document.createElement('option');
        option.value = sheet.properties.title;
        option.textContent = sheet.properties.title;
        selector.appendChild(option);
        
        // 첫 번째 시트를 기본값으로 설정
        if (index === 0) {
            option.selected = true;
            currentSheet = sheet.properties.title;
        }
    });
}

// 시트 변경 처리
function handleSheetChange(event) {
    const sheetName = event.target.value;
    if (sheetName) {
        currentSheet = sheetName;
        getSheetWithFormatting();
    }
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
        
        // 데이터와 서식 정보 함께 처리
        displayFormattedData(gridData, merges, sheet.properties);
        
    }).catch(error => {
        // 로딩 숨기기
        document.getElementById('loading').style.display = 'none';
        handleErrors(error);
    });
}

// 서식이 적용된 데이터 표시
function displayFormattedData(gridData, merges, sheetProperties) {
    const content = document.getElementById('content');
    
    if (!gridData.rowData || gridData.rowData.length === 0) {
        content.innerHTML = '<p>시트에 데이터가 없습니다.</p>';
        return;
    }
    
    // 서식 핸들러 호출
    const html = formatHandler.createFormattedTable(gridData, merges, sheetProperties);
    content.innerHTML = html;
    
    // 병합 셀 적용
    if (merges && merges.length > 0) {
        formatHandler.applyMerges(merges);
    }
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
