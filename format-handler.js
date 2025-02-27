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
        
        let html = '<table class="sheet-table">';
        
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
                    const style = getStyleForCell(cell);
                    
                    // 셀 값 가져오기
                    const value = cell && cell.formattedValue ? cell.formattedValue : '';
                    
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
        if (!cell) return 'border: 1px solid transparent;';
        
        let style = '';
        
        // 배경색 처리
        let bgColor = 'transparent';
        if (cell.effectiveFormat && cell.effectiveFormat.backgroundColor) {
            const bg = cell.effectiveFormat.backgroundColor;
            bgColor = `rgb(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)})`;
            style += `background-color: ${bgColor};`;
        }
        
        // 테두리 처리
        let hasBorder = false;
        if (cell.effectiveFormat && cell.effectiveFormat.borders) {
            const borders = cell.effectiveFormat.borders;
            
            // 각 테두리 방향별 처리
            if (borders.top && borders.top.style !== 'NONE') {
                const color = getBorderColor(borders.top.color, bgColor);
                style += `border-top: 1px solid ${color};`;
                hasBorder = true;
            }
            
            if (borders.right && borders.right.style !== 'NONE') {
                const color = getBorderColor(borders.right.color, bgColor);
                style += `border-right: 1px solid ${color};`;
                hasBorder = true;
            }
            
            if (borders.bottom && borders.bottom.style !== 'NONE') {
                const color = getBorderColor(borders.bottom.color, bgColor);
                style += `border-bottom: 1px solid ${color};`;
                hasBorder = true;
            }
            
            if (borders.left && borders.left.style !== 'NONE') {
                const color = getBorderColor(borders.left.color, bgColor);
                style += `border-left: 1px solid ${color};`;
                hasBorder = true;
            }
        }
        
        // 기본 테두리 설정 (없는 경우 배경색과 동일하게)
        if (!hasBorder) {
            style += `border: 1px solid ${bgColor};`;
        }
        
        // 텍스트 서식
        if (cell.effectiveFormat && cell.effectiveFormat.textFormat) {
            const textFormat = cell.effectiveFormat.textFormat;
            
            if (textFormat.bold) {
                style += 'font-weight: bold;';
            }
            
            if (textFormat.foregroundColor) {
                const fg = textFormat.foregroundColor;
                style += `color: rgb(${Math.round(fg.red*255)}, ${Math.round(fg.green*255)}, ${Math.round(fg.blue*255)});`;
            }
        }
        
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
    
    // 공개 API
    return {
        createFormattedTable,
        parseRange,
        applyMerges
    };
})();
