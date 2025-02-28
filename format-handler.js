const formatHandler = (function() {
    // 열 문자를 인덱스로 변환
    function columnLetterToIndex(column) {
        let result = 0;
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 64);
        }
        return result - 1;
    }
    
    // 범위 파싱
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
    
// 테이블 생성
function createFormattedTable(gridData, merges, sheetProperties, displayRange) {
    const rows = gridData.rowData || [];
    const range = parseRange(displayRange);
    
    // 테이블 레이아웃을 fixed로 설정하여 % 너비가 제대로 적용되도록 함
    let html = '<table class="sheet-table" style="border-collapse: collapse; width: 100%; table-layout: fixed;">';
    
    // 각 행 처리
    rows.forEach((row, rowIndex) => {
        // 범위 밖의 행은 건너뛰기
        if (range && (rowIndex < range.startRow || rowIndex > range.endRow)) {
            return;
        }
        
        html += `<tr data-row="${rowIndex}">`;
        
        // 각 셀 처리
        if (row.values) {
            const startCol = range ? range.startCol : 0;
            const endCol = range ? range.endCol : row.values.length - 1;
            
            for (let colIndex = startCol; colIndex <= endCol; colIndex++) {
                const cell = colIndex < row.values.length ? row.values[colIndex] : null;
                
                // 셀 스타일 생성
                let style = getStyleForCell(cell);
                
                // 셀 값 가져오기
                const value = cell && cell.formattedValue ? cell.formattedValue : '';
                
                // 원본 셀 서식에서 줄바꿈 설정 확인
                const wrapText = cell && cell.effectiveFormat && cell.effectiveFormat.wrapStrategy === 'WRAP';
                
                // 항상 줄바꿈 허용 (원본 서식 유지)
                style += "white-space: normal; word-wrap: break-word; overflow-wrap: break-word;";
                
                // 셀 생성
                html += `<td data-row="${rowIndex}" data-col="${colIndex}" style="${style}">${value}</td>`;
            }
        }
        
        html += '</tr>';
    });
    
    html += '</table>';
    return html;
}


    
    // 테두리 색상을 가져오는 헬퍼 함수
    function getBorderColor(colorObj, defaultColor) {
        if (!colorObj) return defaultColor;
        
        // 색상 객체가 있으면 RGB로 변환
        if (colorObj.red !== undefined && colorObj.green !== undefined && colorObj.blue !== undefined) {
            return `rgb(${Math.round(colorObj.red*255)}, ${Math.round(colorObj.green*255)}, ${Math.round(colorObj.blue*255)})`;
        }
        
        return defaultColor;
    }
    
// 셀 스타일 생성
function getStyleForCell(cell) {
    if (!cell) return 'border: 0px solid transparent; padding: 4px 6px; white-space: normal; word-wrap: break-word;';
    
    let style = '';
    
    // 배경색 처리
    let bgColor = 'transparent';
    if (cell.effectiveFormat && cell.effectiveFormat.backgroundColor) {
        const bg = cell.effectiveFormat.backgroundColor;
        bgColor = `rgb(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)})`;
        style += `background-color: ${bgColor};`;
    }
    
    // 테두리 처리 - 기본값 투명, 두께 0px
    const defaultBorderColor = 'transparent';
    let hasBorder = false;
    
    if (cell.effectiveFormat && cell.effectiveFormat.borders) {
        const borders = cell.effectiveFormat.borders;
        
        // 각 테두리 방향별 처리
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
    
    // 테두리가 전혀 없는 경우 모든 방향에 0px 투명 테두리 적용
    if (!hasBorder) {
        style += `
            border-top: 0px solid ${defaultBorderColor};
            border-right: 0px solid ${defaultBorderColor};
            border-bottom: 0px solid ${defaultBorderColor};
            border-left: 0px solid ${defaultBorderColor};
        `;
    }
    
    // 텍스트 서식
    if (cell.effectiveFormat && cell.effectiveFormat.textFormat) {
        const textFormat = cell.effectiveFormat.textFormat;
        
        // 글꼴 크기 - 원본 크기 유지
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
    
    // 줄바꿈 설정 - 항상 허용
    style += 'white-space: normal; word-wrap: break-word; overflow-wrap: break-word;';
    
    // 정렬
    if (cell.effectiveFormat && cell.effectiveFormat.horizontalAlignment) {
        style += `text-align: ${cell.effectiveFormat.horizontalAlignment.toLowerCase()};`;
    }
    
    // 패딩
    style += 'padding: 4px 8px;';
    
    return style;
}

    
    // 병합 셀 적용
    function applyMerges(merges) {
        if (!merges || !merges.length) return;
        
        merges.forEach(merge => {
            const startRow = merge.startRowIndex;
            const endRow = merge.endRowIndex;
            const startCol = merge.startColumnIndex;
            const endCol = merge.endColumnIndex;
            
            // 첫 번째 셀 찾기
            const firstCell = document.querySelector(`table.sheet-table tr[data-row="${startRow}"] td[data-col="${startCol}"]`);
            if (!firstCell) return;
            
            // rowspan 설정
            if (endRow - startRow > 1) {
                firstCell.rowSpan = endRow - startRow;
            }
            
            // colspan 설정
            if (endCol - startCol > 1) {
                firstCell.colSpan = endCol - startCol;
            }
            
            // 병합된 다른 셀 제거
            for (let r = startRow; r < endRow; r++) {
                for (let c = startCol; c < endCol; c++) {
                    // 첫 번째 셀은 건너뛰기
                    if (r === startRow && c === startCol) continue;
                    
                    const cell = document.querySelector(`table.sheet-table tr[data-row="${r}"] td[data-col="${c}"]`);
                    if (cell) cell.remove();
                }
            }
        });
    }
    
    // CSS 스타일 추가 - 셀 간격 최소화 (글꼴 크기 설정 제거)
    function addGlobalStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .sheet-table {
                border-collapse: collapse;
                border-spacing: 0;
                width: 100%;
                font-family: Arial, sans-serif;
            }
            .sheet-table td {
                border: 0px solid transparent;
                margin: 0;
                padding: 4px 8px;
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    // 공개 API
    return {
        createFormattedTable,
        parseRange,
        applyMerges,
        addGlobalStyles
    };
})();
