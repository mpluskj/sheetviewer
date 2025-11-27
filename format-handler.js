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
    
    function createTableFromGridData(gridData, merges) {
        const rows = gridData.rowData || [];
        const columnMetadata = gridData.columnMetadata || []; 
        const totalCols = gridData.properties?.gridProperties?.columnCount || columnMetadata.length;

        let html = '<table class="sheet-table" style="border-collapse: collapse; width: 100%;">';

        // Add colgroup for column widths
        html += '<colgroup>';
        for (let colIndex = 0; colIndex < totalCols; colIndex++) {
            const colWidth = columnMetadata[colIndex]?.pixelSize || 100; // Default to 100px
            let colStyle = `width: ${colWidth}px;`;
            if (colIndex % 3 === 0) { // First column of every 3-column group (A, D, G, etc.)
                colStyle += 'display: none;';
            }
            html += `<col style="${colStyle}">`;
        }
        html += '</colgroup>';
    
        const mergeMap = {};
        if (merges) {
            merges.forEach(merge => {
                for (let r = merge.startRowIndex; r < merge.endRowIndex; r++) {
                    for (let c = merge.startColumnIndex; c < merge.endColumnIndex; c++) {
                        if (r === merge.startRowIndex && c === merge.startColumnIndex) {
                            mergeMap[`${r}-${c}`] = {
                                isStart: true,
                                rowspan: merge.endRowIndex - merge.startRowIndex,
                                colspan: merge.endColumnIndex - merge.startColumnIndex
                            };
                        } else {
                            mergeMap[`${r}-${c}`] = { isMerged: true };
                        }
                    }
                }
            });
        }
    
        rows.forEach((row, rowIndex) => {
            html += `<tr data-row="${rowIndex}">`;
            const cells = row.values || [];
            // Use totalCols for iterating through columns to ensure all are accounted for
            for (let colIndex = 0; colIndex < totalCols; colIndex++) {
                const mergeInfo = mergeMap[`${rowIndex}-${colIndex}`];
                if (mergeInfo && mergeInfo.isMerged) {
                    continue; 
                }

                let tdStyle = ''; 
                if (colIndex % 3 === 0) { // First column of every 3-column group
                    tdStyle += 'display: none;';
                }

                const cell = colIndex < cells.length ? cells[colIndex] : null;
                let style = getStyleForCell(cell);
                let value = cell && cell.formattedValue ? cell.formattedValue : '';
                
                if (colIndex % 3 === 2) { // 3rd column in a group (C, F, I...)
                    if (colIndex - 2 < cells.length) { 
                        const flagCell = cells[colIndex - 2];
                        const flagValue = flagCell && flagCell.formattedValue ? flagCell.formattedValue.toUpperCase() : '';
                        if (flagValue === 'FALSE') {
                            value = `통역 : ${value}`;
                        }
                    }
                }
                
                let userName = localStorage.getItem('userName') || (window.appState ? window.appState.userName : '');
                if (userName && value && value.includes(userName)) {
                    value = value.replace(new RegExp(userName, 'g'), `<span style="background-color: rgba(255, 255, 0, 0.3);">${userName}</span>`);
                }
    
                let rowspan = mergeInfo && mergeInfo.rowspan > 1 ? ` rowspan="${mergeInfo.rowspan}"` : '';
                let colspan = mergeInfo && mergeInfo.colspan > 1 ? ` colspan="${mergeInfo.colspan}"` : '';
                
                html += `<td data-row="${rowIndex}" data-col="${colIndex}" style="${style}${tdStyle}"${rowspan}${colspan}>${value}</td>`;
            }
            html += '</tr>';
        });
    
        html += '</table>';
        return html;
    }


    // ׵θ    Լ
    function getBorderColor(colorObj, defaultColor) {
        if (!colorObj) return defaultColor;
        
        if (colorObj.red !== undefined && colorObj.green !== undefined && colorObj.blue !== undefined) {
            return `rgb(${Math.round(colorObj.red*255)}, ${Math.round(colorObj.green*255)}, ${Math.round(colorObj.blue*255)})`;
        }
        
        return defaultColor;
    }
    
    function getStyleForCell(cell) {
        if (!cell) return 'border: 1px solid #ccc; padding: 4px 6px; white-space: normal; word-wrap: break-word;';
    
        let style = '';
        
        let bgColor = 'transparent';
        if (cell.effectiveFormat && cell.effectiveFormat.backgroundColor) {
            const bg = cell.effectiveFormat.backgroundColor;
            bgColor = `rgb(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)})`;
            style += `background-color: ${bgColor};`;
        }
        
        const defaultBorderColor = '#ccc';
        if (cell.effectiveFormat && cell.effectiveFormat.borders) {
            const borders = cell.effectiveFormat.borders;
            const top = borders.top || {style: 'NONE'};
            const right = borders.right || {style: 'NONE'};
            const bottom = borders.bottom || {style: 'NONE'};
            const left = borders.left || {style: 'NONE'};

            style += `border-top: ${top.style !== 'NONE' ? (top.width || 1)+'px solid '+getBorderColor(top.color, defaultBorderColor) : '1px solid #ccc'};`;
            style += `border-right: ${right.style !== 'NONE' ? (right.width || 1)+'px solid '+getBorderColor(right.color, defaultBorderColor) : '1px solid #ccc'};`;
            style += `border-bottom: ${bottom.style !== 'NONE' ? (bottom.width || 1)+'px solid '+getBorderColor(bottom.color, defaultBorderColor) : '1px solid #ccc'};`;
            style += `border-left: ${left.style !== 'NONE' ? (left.width || 1)+'px solid '+getBorderColor(left.color, defaultBorderColor) : '1px solid #ccc'};`;
        } else {
             style += `border: 1px solid ${defaultBorderColor};`;
        }

        if (cell.effectiveFormat && cell.effectiveFormat.textFormat) {
            const textFormat = cell.effectiveFormat.textFormat;
            if (textFormat.fontSize) style += `font-size: ${textFormat.fontSize}pt;`;
            if (textFormat.bold) style += 'font-weight: bold;';
            if (textFormat.foregroundColor) {
                const fg = textFormat.foregroundColor;
                style += `color: rgb(${Math.round(fg.red*255)}, ${Math.round(fg.green*255)}, ${Math.round(fg.blue*255)});`;
            }
        }
        
        style += 'white-space: normal; word-wrap: break-word; overflow-wrap: break-word;';
        
        if (cell.effectiveFormat && cell.effectiveFormat.horizontalAlignment) {
            style += `text-align: ${cell.effectiveFormat.horizontalAlignment.toLowerCase()};`;
        }
        
        if (cell.effectiveFormat && cell.effectiveFormat.verticalAlignment) {
            style += `vertical-align: ${cell.effectiveFormat.verticalAlignment.toLowerCase()};`;
        }

        style += 'padding: 4px 8px;';
        
        return style;
    }
    
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
        createTableFromGridData,
        parseRange,
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
        if (!dateString) return { start: null, end: null };

        try {
            const cleanedString = dateString.replace(/\s/g, '').replace(/일/g, '');
            
            let startMonth, startDay, endMonth, endDay;
            const parts = cleanedString.split('-');

            if (parts[0].includes('월')) {
                [startMonth, startDay] = parts[0].split('월').map(Number);
            } else {
                return { start: null, end: null };
            }

            if (parts.length > 1 && parts[1].includes('월')) {
                [endMonth, endDay] = parts[1].split('월').map(Number);
            } else if (parts.length > 1) {
                endMonth = startMonth;
                endDay = Number(parts[1]);
            } else {
                return { start: null, end: null };
            }

            if (isNaN(startMonth) || isNaN(startDay) || isNaN(endMonth) || isNaN(endDay)) {
                return { start: null, end: null };
            }

            return {
                start: { month: startMonth, day: startDay },
                end: { month: endMonth, day: endDay }
            };
        } catch (e) {
            console.error("Date parsing error for string:", dateString, e);
            return { start: null, end: null };
        }
    };

    if (sheetName === 'KSL_Data') {
        // This sheet is now rendered fully, so this logic might not be used.
        // Kept for compatibility with how Ko_Data might work.
    } else if (sheetName === 'Ko_Data') {
        const colIncrement = 2; // A, C, E... (2칸씩 이동)
        for (let i = 0; i < numWeeks; i++) {
            const startCol = i * colIncrement;
            
            const dateRow = allRows[0];
            const dateCell = dateRow && dateRow.values ? dateRow.values[startCol] : null;
            const dateRange = dateCell && dateCell.formattedValue ? parseDateRange(dateCell.formattedValue) : { start: null, end: null };
            
            if (!dateRange.start) continue;

            const weekData = [];
            for (let j = 0; j < weekRowCount; j++) {
                const sourceRow = allRows[j];
                const rowData = [ '', '' ];
                if (sourceRow && sourceRow.values) {
                    const cell1 = sourceRow.values[startCol];
                    const cell2 = sourceRow.values[startCol + 1];
                    rowData[0] = cell1 ? cell1.formattedValue || '' : '';
                    rowData[1] = cell2 ? cell2.formattedValue || '' : '';
                }
                weekData.push(rowData);
            }

            weeks.push({
                startDate: dateRange.start,
                endDate: dateRange.end,
                data: weekData
            });
        }
    }

    return weeks;
}