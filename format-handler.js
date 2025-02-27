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
    
    // 색상 객체를 CSS RGB 문자열로 변환
    function colorToRgb(colorObj, defaultColor = 'transparent') {
        if (!colorObj) return defaultColor;
        
        // RGB 값이 모두 존재하는지 확인
        if (colorObj.red !== undefined && colorObj.green !== undefined && colorObj.blue !== undefined) {
            const r = Math.round(colorObj.red * 255);
            const g = Math.round(colorObj.green * 255);
            const b = Math.round(colorObj.blue * 255);
            
            // alpha 값이 있는 경우 rgba 사용
            if (colorObj.alpha !== undefined && colorObj.alpha < 1) {
                return `rgba(${r}, ${g}, ${b}, ${colorObj.alpha})`;
            }
            
            return `rgb(${r}, ${g}, ${b})`;
        }
        
        return defaultColor;
    }
    
    // 특정 텍스트에 따라 배경색 매핑
    const textBackgroundMap = {
        '야외 봉사에 힘쓰십시오': '#f1c232', // 노란색
        '그리스도': '#b45f06',              // 갈색
        '여호와': '#ea9999'                 // 분홍색
    };
    
    // 테이블 생성
    function createFormattedTable(gridData, merges, sheetProperties, displayRange) {
        const rows = gridData.rowData || [];
        const range = parseRange(displayRange);
        
        let html = '<table class="sheet-table" style="border-collapse: collapse; width: 100%;">';
        
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
                    
                    // 셀 값 가져오기
                    const value = cell && cell.formattedValue ? cell.formattedValue : '';
                    
                    // 특정 텍스트가 있는 셀에 강제 배경색 적용
                    let forceBackground = null;
                    for (const [text, color] of Object.entries(textBackgroundMap)) {
                        if (value.includes(text)) {
                            forceBackground = color;
                            break;
                        }
                    }
                    
                    // 셀 스타일 생성 (강제 배경색 전달)
                    const style = getStyleForCell(cell, forceBackground);
                    
                    // 셀 생성
                    html += `<td data-row="${rowIndex}" data-col="${colIndex}" style="${style}">${value}</td>`;
                }
            }
            
            html += '</tr>';
        });
        
        html += '</table>';
        return html;
    }
    
    // 셀 스타일 생성
    function getStyleForCell(cell, forceBgColor = null) {
        if (!cell) return 'border: 1px solid #d0d0d0; padding: 4px 8px;';
        
        let style = '';
        
        // 배경색 처리 - 강제 배경색이 있으면 우선 적용
        let bgColor = 'transparent';
        
        if (forceBgColor) {
            bgColor = forceBgColor;
            style += `background-color: ${bgColor} !important;`; // !important로 우선순위 높임
        } else if (cell.effectiveFormat && cell.effectiveFormat.backgroundColor) {
            bgColor = colorToRgb(cell.effectiveFormat.backgroundColor, 'transparent');
            style += `background-color: ${bgColor};`;
        } else if (cell.userEnteredFormat && cell.userEnteredFormat.backgroundColor) {
            // 대체 경로에서 배경색 확인
            bgColor = colorToRgb(cell.userEnteredFormat.backgroundColor, 'transparent');
            style += `background-color: ${bgColor};`;
        }
        
        // 테두리 처리 - 더 굵고 뚜렷한 테두리 사용
        const borderColor = '#d0d0d0'; // 기본 테두리 색상
        const borderStyle = '1px solid';
        
        // 기본적으로 모든 방향에 테두리 적용
        style += `
            border-top: ${borderStyle} ${borderColor};
            border-right: ${borderStyle} ${borderColor};
            border-bottom: ${borderStyle} ${borderColor};
            border-left: ${borderStyle} ${borderColor};
        `;
        
        // 셀에 명시적인 테두리 정보가 있으면 덮어쓰기
        if (cell.effectiveFormat && cell.effectiveFormat.borders) {
            const borders = cell.effectiveFormat.borders;
            
            // 각 테두리 방향별 처리
            if (borders.top && borders.top.style !== 'NONE') {
                const color = colorToRgb(borders.top.color, borderColor);
                const width = borders.top.style === 'THICK' ? '2px' : '1px';
                style += `border-top: ${width} solid ${color};`;
            }
            
            if (borders.right && borders.right.style !== 'NONE') {
                const color = colorToRgb(borders.right.color, borderColor);
                const width = borders.right.style === 'THICK' ? '2px' : '1px';
                style += `border-right: ${width} solid ${color};`;
            }
            
            if (borders.bottom && borders.bottom.style !== 'NONE') {
                const color = colorToRgb(borders.bottom.color, borderColor);
                const width = borders.bottom.style === 'THICK' ? '2px' : '1px';
                style += `border-bottom: ${width} solid ${color};`;
            }
            
            if (borders.left && borders.left.style !== 'NONE') {
                const color = colorToRgb(borders.left.color, borderColor);
                const width = borders.left.style === 'THICK' ? '2px' : '1px';
                style += `border-left: ${width} solid ${color};`;
            }
        }
        
        // 텍스트 서식
        if (cell.effectiveFormat && cell.effectiveFormat.textFormat) {
            const textFormat = cell.effectiveFormat.textFormat;
            
            if (textFormat.bold) {
                style += 'font-weight: bold;';
            }
            
            if (textFormat.foregroundColor) {
                const color = colorToRgb(textFormat.foregroundColor, '#000000');
                style += `color: ${color};`;
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
    
    // CSS 스타일 추가
    function addGlobalStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .sheet-table {
                border-collapse: collapse;
                width: 100%;
            }
            .sheet-table td {
                border: 1px solid #d0d0d0;
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
