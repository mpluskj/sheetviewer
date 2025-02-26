// 설정 - 실제 값으로 변경 필요
const CONFIG = {
    API_KEY: 'AIzaSyA2NydJpV5ywSnDbXFlliIHs3Xp5aP_6sI',
    SPREADSHEET_ID: '1bTcma87DpDjfZyUvAgVw9wzXBH8ZXui_yVodTblHzmM',
    RANGE: 'Sheet1!A1:D180'  // 데이터 범위 조정 가능
};

// 페이지 로드 시 API 초기화
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    // Google API 클라이언트 로드
    gapi.load('client', initClient);
}

// API 클라이언트 초기화
function initClient() {
    gapi.client.init({
        apiKey: CONFIG.API_KEY,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    }).then(() => {
        // 초기화 성공, 데이터 가져오기
        getSheetData();
    }).catch(error => {
        handleErrors(error);
    });
}

// 스프레드시트 데이터 가져오기
function getSheetData() {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        range: CONFIG.RANGE
    }).then(response => {
        // 로딩 메시지 숨기기
        document.getElementById('loading').style.display = 'none';
        
        const range = response.result;
        if (range.values && range.values.length > 0) {
            displayData(range.values);
        } else {
            document.getElementById('content').innerHTML = 
                '<p>스프레드시트에 데이터가 없습니다.</p>';
        }
    }).catch(error => {
        handleErrors(error);
    });
}

// 데이터 표시 함수
function displayData(values) {
    const content = document.getElementById('content');
    
    // 테이블 생성
    let html = '<table><thead><tr>';
    
    // 헤더 행 처리
    values[0].forEach(header => {
        html += `<th>${escapeHtml(header)}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // 데이터 행 처리
    for (let i = 1; i < values.length; i++) {
        html += '<tr>';
        
        // 모든 열에 대해 셀 생성
        for (let j = 0; j < values[0].length; j++) {
            // 데이터가 없는 셀은 빈칸으로 처리
            const cellValue = j < values[i].length ? values[i][j] : '';
            html += `<td>${escapeHtml(cellValue)}</td>`;
        }
        
        html += '</tr>';
    }
    
    html += '</tbody></table>';
    content.innerHTML = html;
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

// 에러 처리 함수
function handleErrors(error) {
    console.error('Error:', error);
    
    // 로딩 메시지 숨기기
    document.getElementById('loading').style.display = 'none';
    
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
