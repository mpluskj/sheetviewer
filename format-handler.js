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
    
    // 셀 스타일 생성 - 이전에 작동하던 방식으로 복원하되 테두리 처리만 수정
    function getStyleForCell(cell) {
        if (!cell || !cell.effectiveFormat) return 'border: 1px solid transparent;';
        
        let style = '';
        let hasBgColor = false;
        let bgColorStr = 'transparent';
        
        // 배경색 처리 - 이전 방식 그대로 유지
        if (cell.effectiveFormat.backgroundColor) {
            const bg = cell.effectiveFormat.backgroundColor;
            bgColorStr = `rgba(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)}, ${bg.alpha})`;
            style += `background-color: ${bgColorStr};`;
            hasBgColor = true;
        }
        
        // 테두리 처리 - 수정된 부분
        if (cell.effectiveFormat.borders) {
            const borders = cell.effectiveFormat.borders;
            
            ['top', 'right', 'bottom', 'left'].forEach(side => {
                if (borders[side] && borders[side].style !== 'NONE') {
                    // 테두리 색상 결정
                    let borderColor;
                    
                    if (hasBgColor) {
                        // 배경색이 있으면 배경색과 동일한 테두리
                        borderColor = bgColorStr;
                    } else if (borders[side].color) {
                        // 테두리 색상이 지정되어 있으면 해당 색상 사용
                        const color = borders[side].color;
                        borderColor = `rgba(${Math.round(color.red*255)}, ${Math.round(color.green*255)}, ${Math.round(color.blue*255)}, ${color.alpha})`;
                    } else {
                        // 기본값
                        borderColor = 'transparent';
                    }
                    
                    style += `border-${side}: 1px solid ${borderColor};`;
                } else if (hasBgColor) {
                    // 테두리가 없고 배경색이 있으면 배경색과 동일한 테두리
                    style += `border-${side}: 1px solid ${bgColorStr};`;
                } else {
                    // 테두리가 없고 배경색도 없으면 투명 테두리
                    style += `border-${side}: 1px solid transparent;`;
                }
            });
        } else if (hasBgColor) {
            // 테두리 정보가 없고 배경색이 있으면 배경색과 동일한 테두리
            style += `border: 1px solid ${bgColorStr};`;
        } else {
            // 테두리 정보도 없고 배경색도 없으면 투명 테두리
            style += 'border: 1px solid transparent;';
        }
        
        // 텍스트 서식
        if (cell.effectiveFormat.textFormat) {
            const text = cell.effectiveFormat.textFormat;
            
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
                style += `color: rgba(${Math.round(fg.red*255)}, ${Math.round(fg.green*255)}, ${Math.round(fg.blue*255)}, ${fg.alpha});`;
            }
        }
        
        // 텍스트 정렬
        if (cell.effectiveFormat.horizontalAlignment) {
            style += `text-align: ${cell.effectiveFormat.horizontalAlignment.toLowerCase()};`;
        }
        
        // 수직 정렬
        if (cell.effectiveFormat.verticalAlignment) {
            style += `vertical-align: ${cell.effectiveFormat.verticalAlignment.toLowerCase()};`;
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
