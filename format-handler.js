// 서식 처리를 위한 모듈
const formatHandler = (function() {
    
    // 행에 데이터가 있는지 확인하는 함수
    function hasRowData(row) {
        if (!row.values) return false;
        
        // 행의 모든 셀을 확인하여 하나라도 값이 있으면 true 반환
        return row.values.some(cell => cell && cell.formattedValue);
    }
    
    // 서식이 적용된 테이블 생성
    function createFormattedTable(gridData, merges, sheetProperties) {
        const rows = gridData.rowData || [];
        
        // 데이터가 있는 마지막 열 인덱스 찾기
        let lastDataColumn = 0;
        rows.forEach(row => {
            if (row.values) {
                for (let i = row.values.length - 1; i >= 0; i--) {
                    if (row.values[i] && row.values[i].formattedValue) {
                        lastDataColumn = Math.max(lastDataColumn, i);
                        break;
                    }
                }
            }
        });
        
        let html = '<table class="sheet-table">';
        
        // 각 행 처리
        rows.forEach((row, rowIndex) => {
            // 빈 행 건너뛰기
            if (!hasRowData(row)) return;
            
            html += `<tr data-row="${rowIndex}">`;
            
            // 각 셀 처리
            if (row.values) {
                // 데이터가 있는 열까지만 처리
                for (let colIndex = 0; colIndex <= lastDataColumn; colIndex++) {
                    const cell = colIndex < row.values.length ? row.values[colIndex] : null;
                    
                    // 셀이 없거나 값이 없으면 빈 셀 생성
                    if (!cell || !cell.formattedValue) {
                        html += `<td data-row="${rowIndex}" data-col="${colIndex}" class="empty-cell"></td>`;
                        continue;
                    }
                    
                    // 셀 스타일 생성
                    const cellStyle = generateCellStyle(cell);
                    
                    // 셀 값 처리
                    const cellValue = cell.formattedValue || '';
                    
                    // 셀 클래스 결정
                    const cellClass = getCellClass(cell);
                    
                    // 셀 생성
                    html += `<td 
                        style="${cellStyle}" 
                        class="${cellClass}" 
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
    
    // 셀 서식 정보를 CSS 스타일로 변환
    function generateCellStyle(cell) {
        if (!cell || !cell.effectiveFormat) return '';
        
        const format = cell.effectiveFormat;
        let style = '';
        
        // 배경색
        if (format.backgroundColor) {
            const bg = format.backgroundColor;
            style += `background-color: rgba(${Math.round(bg.red*255)||0}, ${Math.round(bg.green*255)||0}, ${Math.round(bg.blue*255)||0}, ${bg.alpha||1});`;
        }
        
        // 텍스트 서식
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
            
            // 굵게
            if (text.bold) {
                style += 'font-weight: bold;';
            }
            
            // 기울임
            if (text.italic) {
                style += 'font-style: italic;';
            }
            
            // 밑줄과 취소선
            let textDecoration = [];
            if (text.underline) textDecoration.push('underline');
            if (text.strikethrough) textDecoration.push('line-through');
            if (textDecoration.length > 0) {
                style += `text-decoration: ${textDecoration.join(' ')};`;
            }
            
            // 텍스트 색상
            if (text.foregroundColor) {
                const fg = text.foregroundColor;
                style += `color: rgba(${Math.round(fg.red*255)||0}, ${Math.round(fg.green*255)||0}, ${Math.round(fg.blue*255)||0}, ${fg.alpha||1});`;
            }
        }
        
        // 테두리
        if (format.borders) {
            const borders = format.borders;
            ['top', 'right', 'bottom', 'left'].forEach(side => {
                if (borders[side] && borders[side].style && borders[side].style !== 'NONE') {
                    const border = borders[side];
                    const color = border.color || { red: 0, green: 0, blue: 0, alpha: 1 };
                    const colorStr = `rgba(${Math.round(color.red*255)||0}, ${Math.round(color.green*255)||0}, ${Math.round(color.blue*255)||0}, ${color.alpha||1})`;
                    style += `border-${side}: ${getBorderWidth(border.style)} ${getBorderStyle(border.style)} ${colorStr};`;
                }
            });
        }
        
        // 텍스트 정렬
        if (format.horizontalAlignment) {
            style += `text-align: ${getHorizontalAlignment(format.horizontalAlignment)};`;
        }
        
        // 수직 정렬
        if (format.verticalAlignment) {
            style += `vertical-align: ${getVerticalAlignment(format.verticalAlignment)};`;
        }
        
        // 패딩
        style += 'padding: 4px 8px;';
        
        return style;
    }
    
    // 셀 클래스 결정
    function getCellClass(cell) {
        let classes = [];
        
        if (!cell || !cell.effectiveFormat) return '';
        
        const format = cell.effectiveFormat;
        
        // 텍스트 줄바꿈 처리
        if (format.wrapStrategy && format.wrapStrategy === 'WRAP') {
            classes.push('wrap-text');
        } else {
            classes.push('nowrap-text');
        }
        
        // 셀 유형에 따른 클래스
        if (cell.effectiveValue) {
            if (cell.effectiveValue.numberValue !== undefined) {
                classes.push('number-cell');
            }
        }
        
        return classes.join(' ');
    }
    
    // 병합 셀 적용
    function applyMerges(merges) {
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
    
    // 테두리 스타일 변환
    function getBorderStyle(gsStyle) {
        switch(gsStyle) {
            case 'SOLID': return 'solid';
            case 'SOLID_MEDIUM': return 'solid';
            case 'SOLID_THICK': return 'solid';
            case 'DOTTED': return 'dotted';
            case 'DASHED': return 'dashed';
            case 'DOUBLE': return 'double';
            default: return 'solid';
        }
    }
    
    // 테두리 두께 변환
    function getBorderWidth(gsStyle) {
        switch(gsStyle) {
            case 'SOLID_THICK': return '3px';
            case 'SOLID_MEDIUM': return '2px';
            case 'SOLID': return '1px';
            case 'DOTTED': return '1px';
            case 'DASHED': return '1px';
            case 'DOUBLE': return '2px';
            default: return '1px';
        }
    }
    
    // 수평 정렬 변환
    function getHorizontalAlignment(gsAlignment) {
        switch(gsAlignment) {
            case 'LEFT': return 'left';
            case 'CENTER': return 'center';
            case 'RIGHT': return 'right';
            default: return 'left';
        }
    }
    
    // 수직 정렬 변환
    function getVerticalAlignment(gsAlignment) {
        switch(gsAlignment) {
            case 'TOP': return 'top';
            case 'MIDDLE': return 'middle';
            case 'BOTTOM': return 'bottom';
            default: return 'middle';
        }
    }
    
    // 공개 API
    return {
        createFormattedTable,
        generateCellStyle,
        applyMerges
    };
})();
