const formatHandler = (function() {
    //  ڸ ε ȯ
    function columnLetterToIndex(column) {
        let result = 0;
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 64);
        }
        return result - 1;
    }
    
    //  Ľ
    function parseRange(rangeString) {
        if (!rangeString) return null;
        
        const match = rangeString.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
        if (!match) return null;
        
        return {
            startCol: columnLetterToIndex(match[1]),
            startRow: parseInt(match[2]) - 1,
            endCol: columnLetterToIndex(match[3]),
            endRow: parseInt(match[4]) - 1
        };
    }
    
// ̺ 
function createFormattedTable(gridData, merges, sheetProperties, displayRange) {
    const rows = gridData.rowData || [];
    const range = parseRange(displayRange);
    // 항상 최신 사용자 이름을 가져오도록 수정
    // 사용자 이름 변경을 감지하기 위해 이벤트 리스너 추가
    let userName = localStorage.getItem('userName') || (window.appState ? window.appState.userName : '');
    window.addEventListener('storage', (e) => {
        if (e.key === 'userName') {
            userName = e.newValue || '';
        }
    });
    
    // ̺ ̾ƿ fixed Ͽ % ʺ  ǵ 
    let html = '<table class="sheet-table" style="border-collapse: collapse; width: 100%; table-layout: fixed;">';
    
    //   ó
    rows.forEach((row, rowIndex) => {
        //    ǳʶٱ
        if (range && (rowIndex < range.startRow || rowIndex > range.endRow)) {
            return;
        }
        
        html += `<tr data-row="${rowIndex}">`;
        
        //   ó
        if (row.values) {
            const startCol = range ? range.startCol : 0;
            const endCol = range ? range.endCol : row.values.length - 1;
            
            for (let colIndex = startCol; colIndex <= endCol; colIndex++) {
                const cell = colIndex < row.values.length ? row.values[colIndex] : null;
                
                //  Ÿ 
                let style = getStyleForCell(cell);
                
                //   
                let value = cell && cell.formattedValue ? cell.formattedValue : '';
                
                // 사용자 이름과 일치하는 텍스트 강조
                if (userName && value && value.includes(userName)) {
                    const highlightedValue = value.replace(new RegExp(userName, 'g'), 
                        `<span style="background-color: rgba(255, 255, 0, 0.3);">${userName}</span>`);
                    value = highlightedValue;
                }
                
                //   Ŀ ٹٲ  Ȯ
                const wrapText = cell && cell.effectiveFormat && cell.effectiveFormat.wrapStrategy === 'WRAP';
                
                // ׻ ٹٲ  (  )
                style += "white-space: normal; word-wrap: break-word; overflow-wrap: break-word;";
                
                //  
                html += `<td data-row="${rowIndex}" data-col="${colIndex}" style="${style}">${value}</td>`;
            }
        }
        
        html += '</tr>';
    });
    
    html += '</table>';
    return html;
}


    
    // ׵θ    Լ
    function getBorderColor(colorObj, defaultColor) {
        if (!colorObj) return defaultColor;
        
        //  ü  RGB ȯ
        if (colorObj.red !== undefined && colorObj.green !== undefined && colorObj.blue !== undefined) {
            return `rgb(${Math.round(colorObj.red*255)}, ${Math.round(colorObj.green*255)}, ${Math.round(colorObj.blue*255)})`;
        }
        
        return defaultColor;
    }
    
//  Ÿ 
function getStyleForCell(cell) {
    if (!cell) return 'border: 0px solid transparent; padding: 4px 6px; white-space: normal; word-wrap: break-word;';
    
    let style = '';
    
    //  ó
    let bgColor = 'transparent';
    if (cell.effectiveFormat && cell.effectiveFormat.backgroundColor) {
        const bg = cell.effectiveFormat.backgroundColor;
        bgColor = `rgb(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)})`;
        style += `background-color: ${bgColor};`;
    }
    
    // ׵θ ó - ⺻ , β 0px
    const defaultBorderColor = 'transparent';
    let hasBorder = false;
    
    if (cell.effectiveFormat && cell.effectiveFormat.borders) {
        const borders = cell.effectiveFormat.borders;
        
        //  ׵θ ⺰ ó
        if (borders.top && borders.top.style !== 'NONE') {
            const color = getBorderColor(borders.top.color, defaultBorderColor);
            const width = borders.top.style === 'THICK' ? '2px' : '1px';
            style += `border-top: ${width} solid ${color};`;
            hasBorder = true;
        } else {
            style += `border-top: 0px solid ${defaultBorderColor};`;
        }
        
        if (borders.right && borders.right.style !== 'NONE') {
            const color = getBorderColor(borders.right.color, defaultBorderColor);
            const width = borders.right.style === 'THICK' ? '2px' : '1px';
            style += `border-right: ${width} solid ${color};`;
            hasBorder = true;
        } else {
            style += `border-right: 0px solid ${defaultBorderColor};`;
        }
        
        if (borders.bottom && borders.bottom.style !== 'NONE') {
            const color = getBorderColor(borders.bottom.color, defaultBorderColor);
            const width = borders.bottom.style === 'THICK' ? '2px' : '1px';
            style += `border-bottom: ${width} solid ${color};`;
            hasBorder = true;
        } else {
            style += `border-bottom: 0px solid ${defaultBorderColor};`;
        }
        
        if (borders.left && borders.left.style !== 'NONE') {
            const color = getBorderColor(borders.left.color, defaultBorderColor);
            const width = borders.left.style === 'THICK' ? '2px' : '1px';
            style += `border-left: ${width} solid ${color};`;
            hasBorder = true;
        } else {
            style += `border-left: 0px solid ${defaultBorderColor};`;
        }
    }
    
    // ׵θ     ⿡ 0px  ׵θ 
    if (!hasBorder) {
        style += `
            border-top: 0px solid ${defaultBorderColor};
            border-right: 0px solid ${defaultBorderColor};
            border-bottom: 0px solid ${defaultBorderColor};
            border-left: 0px solid ${defaultBorderColor};
        `;
    }
    
    // ؽƮ 
    if (cell.effectiveFormat && cell.effectiveFormat.textFormat) {
        const textFormat = cell.effectiveFormat.textFormat;
        
        // ۲ ũ -  ũ 
        if (textFormat.fontSize) {
            style += `font-size: ${textFormat.fontSize}pt;`;
        }
        
        if (textFormat.bold) {
            style += 'font-weight: bold;';
        }
        
        if (textFormat.foregroundColor) {
            const fg = textFormat.foregroundColor;
            style += `color: rgb(${Math.round(fg.red*255)}, ${Math.round(fg.green*255)}, ${Math.round(fg.blue*255)});`;
        }
    }
    
    // ٹٲ  - ׻ 
    style += 'white-space: normal; word-wrap: break-word; overflow-wrap: break-word;';
    
    // 
    if (cell.effectiveFormat && cell.effectiveFormat.horizontalAlignment) {
        style += `text-align: ${cell.effectiveFormat.horizontalAlignment.toLowerCase()};`;
    }
    
    // е
    style += 'padding: 4px 8px;';
    
    return style;
}

    
    //   
    function applyMerges(merges) {
        if (!merges || !merges.length) return;
        
        merges.forEach(merge => {
            const startRow = merge.startRowIndex;
            const endRow = merge.endRowIndex;
            const startCol = merge.startColumnIndex;
            const endCol = merge.endColumnIndex;
            
            // ù °  ã
            const firstCell = document.querySelector(`table.sheet-table tr[data-row="${startRow}"] td[data-col="${startCol}"]`);
            if (!firstCell) return;
            
            // rowspan 
            if (endRow - startRow > 1) {
                firstCell.rowSpan = endRow - startRow;
            }
            
            // colspan 
            if (endCol - startCol > 1) {
                firstCell.colSpan = endCol - startCol;
            }
            
            // յ ٸ  
            for (let r = startRow; r < endRow; r++) {
                for (let c = startCol; c < endCol; c++) {
                    // ù °  ǳʶٱ
                    if (r === startRow && c === startCol) continue;
                    
                    const cell = document.querySelector(`table.sheet-table tr[data-row="${r}"] td[data-col="${c}"]`);
                    if (cell) cell.remove();
                }
            }
        });
    }
    
    // CSS 스타일 추가 - 폰트 적용 최적화 (글꼴 크기 조정 포함)
    function addGlobalStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap');
            body, body *, 
            .sheet-table, .sheet-table *, 
            .sheet-table td, .sheet-table th, 
            .sheet-table tr, .sheet-table thead, 
            .sheet-table tbody {
                font-family: 'Gowun Dodum', sans-serif !important;
                font-synthesis: none;
                text-rendering: optimizeLegibility;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            .sheet-table {
                border-collapse: collapse;
                border-spacing: 0;
                width: 100%;
                font-family: 'Gowun Dodum', sans-serif !important;
            }
            .sheet-table td, .sheet-table th {
                border: 0px solid transparent;
                margin: 0;
                padding: 4px 8px;
                font-family: 'Gowun Dodum', sans-serif !important;
            }
            body {
                font-family: 'Gowun Dodum', sans-serif !important;
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    // 공개 API
    return {
        createFormattedTable,
        parseRange,
        applyMerges,
        addGlobalStyles,
        parseDataIntoWeeks
    };
})();

/**
 * 시트 데이터를 주 단위로 파싱하는 함수.
 * 시트 이름에 따라 다른 파싱 규칙을 적용합니다.
 * @param {object} gridData - 구글 시트 API의 gridData 응답.
 * @param {string} sheetName - 파싱할 시트의 이름 ('KSL_Data' 또는 'Ko_Data').
 * @returns {Array} - 주별 데이터 객체의 배열. 예: [{ startDate, endDate, rows }]
 */
function parseDataIntoWeeks(gridData, sheetName) {
    if (!gridData || !gridData.rowData) return [];

    const weeks = [];
    const allRows = gridData.rowData;
    const numWeeks = 5; // 최대 5주까지 처리
    const weekRowCount = 46; // A3:C48 -> 46개 행

    const parseDateRange = (dateString) => {
        if (!dateString || !dateString.includes('-')) return { start: null, end: null };
        
        try {
            const currentYear = new Date().getFullYear();
            const parts = dateString.split('-').map(part => part.trim());
            const [startMonth, startDay] = parts[0].split('/').map(Number);
            const [endMonth, endDay] = parts[1].split('/').map(Number);
            
            const startDate = new Date(currentYear, startMonth - 1, startDay);
            // 날짜가 유효하지 않으면 null 반환
            if (isNaN(startDate.getTime())) return { start: null, end: null };

            const endDate = new Date(currentYear, endMonth - 1, endDay);
            if (isNaN(endDate.getTime())) return { start: null, end: null };

            if (endDate < startDate) {
                endDate.setFullYear(currentYear + 1);
            }
            // 종료 날짜의 시간을 23:59:59로 설정하여 '오늘'이 해당일에 포함되도록 함
            endDate.setHours(23, 59, 59, 999);

            return { start: startDate, end: endDate };
        } catch (e) {
            console.error("Date parsing error:", e);
            return { start: null, end: null };
        }
    };

    if (sheetName === 'KSL_Data') {
        const colIncrement = 3; // A, D, G... (3칸씩 이동)
        for (let i = 0; i < numWeeks; i++) {
            const startCol = i * colIncrement;
            const dateCol = startCol + 2; // C, F, I...

            const dateRow = allRows[0]; // 날짜는 항상 3행에 있음 (rowData 기준 0번째)
            const dateCell = dateRow && dateRow.values ? dateRow.values[dateCol] : null;
            const dateRange = dateCell && dateCell.formattedValue ? parseDateRange(dateCell.formattedValue) : { start: null, end: null };

            // 날짜 정보가 없으면 해당 주를 건너뜀
            if (!dateRange.start) continue;

            const weekRows = [];
            for (let j = 0; j < weekRowCount; j++) {
                const sourceRow = allRows[j];
                if (!sourceRow || !sourceRow.values) {
                    weekRows.push({ values: [null, null] }); // 빈 행 추가
                    continue;
                };

                // KSL계획표의 B열, C열처럼 보이도록 데이터 재구성
                const displayCell1 = sourceRow.values[startCol + 1]; // B, E, H...
                const displayCell2 = sourceRow.values[dateCol];     // C, F, I...
                weekRows.push({ values: [displayCell1, displayCell2] });
            }
            
            weeks.push({
                startDate: dateRange.start,
                endDate: dateRange.end,
                rows: weekRows
            });
        }
    } else if (sheetName === 'Ko_Data') {
        const colIncrement = 2; // A, C, E... (2칸씩 이동)
        for (let i = 0; i < numWeeks; i++) {
            const startCol = i * colIncrement;
            
            const dateRow = allRows[0];
            const dateCell = dateRow && dateRow.values ? dateRow.values[startCol] : null;
            const dateRange = dateCell && dateCell.formattedValue ? parseDateRange(dateCell.formattedValue) : { start: null, end: null };
            
            if (!dateRange.start) continue;

            const weekRows = [];
            for (let j = 0; j < weekRowCount; j++) {
                const sourceRow = allRows[j];
                 if (!sourceRow || !sourceRow.values) {
                    weekRows.push({ values: [null, null] });
                    continue;
                };

                // Ko계획표의 B열, C열처럼 보이도록 데이터 재구성
                const displayCell1 = sourceRow.values[startCol];     // A, C, E...
                const displayCell2 = sourceRow.values[startCol + 1]; // B, D, F...
                weekRows.push({ values: [displayCell1, displayCell2] });
            }

            weeks.push({
                startDate: dateRange.start,
                endDate: dateRange.end,
                rows: weekRows
            });
        }
    }

    return weeks;
}