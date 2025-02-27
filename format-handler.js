const formatHandler = (function() {
    // 범위 파싱 함수
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
    
    // 열 문자를 인덱스로 변환
    function columnLetterToIndex(column) {
        let result = 0;
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 64);
        }
        return result - 1;
    }
    
    // 테두리 색상 확인 함수
    function hasBorderColor(format) {
        if (!format || !format.borders) return false;
        
        const sides = ['top', 'right', 'bottom', 'left'];
        return sides.some(side => {
            const border = format.borders[side];
            return border && border.style !== 'NONE' && 
                   border.color && border.color.alpha > 0;
        });
    }
    
    // 셀 표시 여부 결정 함수
    function isCellVisible(cell) {
        if (!cell) return false;
        
        // 값이 있으면 표시
        if (cell.formattedValue) return true;
        
        // 서식 정보가 없으면 표시하지 않음
        if (!cell.effectiveFormat) return false;
        
        const format = cell.effectiveFormat;
        
        // 배경색 확인 - 알파값이 0보다 크면 표시
        if (format.backgroundColor && format.backgroundColor.alpha > 0) {
            return true;
        }
        
        // 테두리 색상 확인
        if (hasBorderColor(format)) {
            return true;
        }
        
        return false;
    }
    
    // 셀 스타일 생성 함수
    function generateCellStyle(cell) {
        if (!cell || !cell.effectiveFormat) return '';
        
        const format = cell.effectiveFormat;
        let style = '';
        let hasBgColor = false;
        let bgColorStr = 'transparent';
        
        // 배경색 처리
        if (format.backgroundColor) {
            const bg = format.backgroundColor;
            // 알파값이 0보다 크면 배경색 적용
            if (bg.alpha > 0) {
                bgColorStr = `rgba(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)}, ${bg.alpha})`;
                style += `background-color: ${bgColorStr};`;
                hasBgColor = true;
            }
        }
        
        // 테두리 처리 - 기본은 투명, 색상 있으면 해당 색상으로
        if (format.borders) {
            const sides = ['top', 'right', 'bottom', 'left'];
            sides.forEach(side => {
                const border = format.borders[side];
                if (border && border.style !== 'NONE' && border.color) {
                    const color = border.color;
                    style += `border-${side}: 1px solid rgba(${Math.round(color.red*255)}, ${Math.round(color.green*255)}, ${Math.round(color.blue*255)}, ${color.alpha});`;
                } else if (hasBgColor) {
                    // 배경색이 있으면 배경색과 동일한 테두리
                    style += `border-${side}: 1px solid ${bgColorStr};`;
                } else {
                    style += `border-${side}: 1px solid transparent;`;
                }
            });
        } else {
            // 테두리 정보가 없는 경우
            if (hasBgColor) {
                style += `border: 1px solid ${bgColorStr};`;
            } else {
                style += 'border: 1px solid transparent;';
            }
        }
        
        // 텍스트 서식 처리
        if (format.textFormat) {
            const text = format.textFormat;
            
            // 폰트 패밀리
            if (text.fontFamily) {
                style += `font-family: ${text.fontFamily}, Arial, sans-serif;`;
            }
            
            // 폰트 크기
            if (text.fontSize) {
                style += `font-size: ${text.fontSize}pt;`;
            }
            
            // 텍스트 스타일
            if (text.bold) style += 'font-weight: bold;';
            if (text.italic) style += 'font-style: italic;';
            
            // 텍스트 장식
            let textDecoration = [];
            if (text.underline) textDecoration.push('underline');
            if (text.strikethrough) textDecoration.push('line-through');
            if (textDecoration.length > 0) {
                style += `text-decoration: ${textDecoration.join(' ')};`;
            }
            
            // 텍스트 색상
            if (text.foregroundColor) {
                const fg = text.foregroundColor;
                style += `color: rgba(${Math.round(fg.red*255)}, ${Math.round(fg.green*255)}, ${Math.round(fg.blue*255)}, ${fg.alpha});`;
            }
        }
        
        // 텍스트 정렬
        if (format.horizontalAlignment) {
            style += `text-align: ${format.horizontalAlignment.toLowerCase()};`;
        }
        
        // 수직 정렬
        if (format.verticalAlignment) {
            style += `vertical-align: ${format.verticalAlignment.toLowerCase()};`;
        }
        
        // 패딩
        style += 'padding: 4px 8px;';
        
        return style;
    }
    
    // 테이블 생성 함수
    function createFormattedTable(gridData, merges, sheetProperties, displayRange) {
        const rows = gridData.rowData || [];
        const range = parseRange(displayRange);
        
        let html = '<table class="sheet-table">';
        
        rows.forEach((row, rowIndex) => {
            // 범위 밖의 행은 건너뛰기
            if (range) {
                if (rowIndex < range.startRow || rowIndex > range.endRow) {
                    return;
                }
            }
            
            html += `<tr data-row="${rowIndex}">`;
            
            if (row.values) {
                // 열 범위 결정
                const startCol = range ? range.startCol : 0;
                const endCol = range ? range.endCol : row.values.length - 1;
                
                for (let colIndex = startCol; colIndex <= endCol; colIndex++) {
                    const cell = colIndex < row.values.length ? row.values[colIndex] : null;
                    
                    // 보이지 않는 셀 처리
                    if (!isCellVisible(cell)) {
                        html += `<td data-row="${rowIndex}" data-col="${colIndex}" class="empty-cell"></td>`;
                        continue;
                    }
                    
                    const cellStyle = generateCellStyle(cell);
                    const cellValue = cell.formattedValue || '';
                    
                    html += `<td 
                        style="${cellStyle}" 
                        data-row="${rowIndex}" 
                        data-col="${colIndex}"
                        title="${escapeHtml(cellValue)}"
                    >${escapeHtml(cellValue)}</td>`;
                }
            }
            
            html += '</tr>';
        });
        
        html += '</table>';
        return html;
    }
    
    // HTML 이스케이프 처리
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
    
    // 공개 API
    return {
        createFormattedTable,
        parseRange
    };
})();
