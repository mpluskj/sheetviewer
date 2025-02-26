// ���� - ���� ������ ���� �ʿ�
const CONFIG = {
    API_KEY: 'AIzaSyA2NydJpV5ywSnDbXFlliIHs3Xp5aP_6sI',
    SPREADSHEET_ID: '1bTcma87DpDjfZyUvAgVw9wzXBH8ZXui_yVodTblHzmM',
    RANGE: 'Sheet1!A1:D180'  // ������ ���� ���� ����
};

// ������ �ε� �� API �ʱ�ȭ
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    // Google API Ŭ���̾�Ʈ �ε�
    gapi.load('client', initClient);
}

// API Ŭ���̾�Ʈ �ʱ�ȭ
function initClient() {
    gapi.client.init({
        apiKey: CONFIG.API_KEY,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    }).then(() => {
        // �ʱ�ȭ ����, ������ ��������
        getSheetData();
    }).catch(error => {
        handleErrors(error);
    });
}

// ���������Ʈ ������ ��������
function getSheetData() {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        range: CONFIG.RANGE
    }).then(response => {
        // �ε� �޽��� �����
        document.getElementById('loading').style.display = 'none';
        
        const range = response.result;
        if (range.values && range.values.length > 0) {
            displayData(range.values);
        } else {
            document.getElementById('content').innerHTML = 
                '<p>���������Ʈ�� �����Ͱ� �����ϴ�.</p>';
        }
    }).catch(error => {
        handleErrors(error);
    });
}

// ������ ǥ�� �Լ�
function displayData(values) {
    const content = document.getElementById('content');
    
    // ���̺� ����
    let html = '<table><thead><tr>';
    
    // ��� �� ó��
    values[0].forEach(header => {
        html += `<th>${escapeHtml(header)}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // ������ �� ó��
    for (let i = 1; i < values.length; i++) {
        html += '<tr>';
        
        // ��� ���� ���� �� ����
        for (let j = 0; j < values[0].length; j++) {
            // �����Ͱ� ���� ���� ��ĭ���� ó��
            const cellValue = j < values[i].length ? values[i][j] : '';
            html += `<td>${escapeHtml(cellValue)}</td>`;
        }
        
        html += '</tr>';
    }
    
    html += '</tbody></table>';
    content.innerHTML = html;
}

// HTML �̽������� ó�� (XSS ����)
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

// ���� ó�� �Լ�
function handleErrors(error) {
    console.error('Error:', error);
    
    // �ε� �޽��� �����
    document.getElementById('loading').style.display = 'none';
    
    // ����� ģȭ���� ���� �޽��� ǥ��
    let errorMessage = '�����͸� �������� �� ������ �߻��߽��ϴ�.';
    
    if (error.result && error.result.error) {
        errorMessage += ` (${error.result.error.message})`;
    } else if (error.message) {
        errorMessage += ` (${error.message})`;
    }
    
    document.getElementById('content').innerHTML = 
        `<div class="error-message">${errorMessage}</div>`;
}
