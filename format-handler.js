const formatHandler = (function() {
    // 열 문자를 인덱스로 변환
    function columnLetterToIndex(column) {
        let result = 0;
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 64);
        }
        return result - 1;
    }
    
    // 인덱스를 열 문자로 변환
    function indexToColumnLetter(index) {
        let temp = index + 1;
        let letter = '';
        
        while (temp > 0) {
            const remainder = (temp - 1) % 26;
            letter = String.fromCharCode(65 + remainder) + letter;
            temp = Math.floor((temp - remainder) / 26);
        }
        
        return letter;
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
    
    // 셀에 의미 있는 서식이 있는지 확인
    function hasFormatting(cell) {
        if (!cell || !cell.effectiveFormat) return false;
        
        const format = cell.effectiveFormat;
        
        // 배경색 확인
        if (format.backgroundColor && format.backgroundColor.alpha > 0) {
            return true;
        }
        
        // 테두리 확인
        if (format.borders) {
            const sides = ['top', 'right', 'bottom', 'left'];
            for (const side of sides) {
                const border = format.borders[side];
                if (border && border.style !== 'NONE' && border.color && border.color.alpha > 0) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // 행이 비어있는지 확인
    function isEmptyRow(row) {
        if (!row.values) return true;
        
        return !row.values.some(cell => 
            cell && (cell.formattedValue || hasFormatting(cell))
        );
    }
    
    // 테두리 두께 변환
    function getBorderWidth(style) {
        switch(style) {
            case 'SOLID_THICK': return '3px';
            case 'SOLID_MEDIUM': return '2px';
            case 'DOTTED': return '1px';
            case 'DASHED': return '1px';
            case 'DOUBLE': return '2px';
            default: return '1px';
        }
    }
    
    // 테두리 스타일 변환
    function getBorderStyle(style) {
        switch(style) {
            case 'DOTTED': return 'dotted';
            case 'DASHED': return 'dashed';
            case 'DOUBLE': return 'double';
            default: return 'solid';
        }
    }
    
    // 셀 스타일 생성
    function getStyleForCell(cell) {
        if (!cell) return 'border: 1px solid transparent;';
        
        let style = '';
        let hasBgColor = false;
        let bgColorStr = 'transparent';
        
        // 배경색 처리
        if (cell.effectiveFormat && cell.effectiveFormat.backgroundColor) {
            const bg = cell.effectiveFormat.backgroundColor;
            if (bg.alpha > 0) {
                bgColorStr = `rgb(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)})`;
                style += `background-color: ${bgColorStr};`;
                hasBgColor = true;
            }
        }
        
        // 테두리 처리
        if (cell.effectiveFormat && cell.effectiveFormat.borders) {
            const borders = cell.effectiveFormat.borders;
            
            ['top', 'right', 'bottom', 'left'].forEach(side => {
                const border = borders[side];
                if (border && border.style !== 'NONE') {
                    let borderColor = '#000'; // 기본값
                    
                    // 테두리 색상 설정
                    if (border.color && border.color.alpha > 0) {
                        borderColor = `rgb(${Math.round(border.color.red*255)}, ${Math.round(border.color.green*255)}, ${Math.round(border.color.blue*255)})`;
                    } else if (hasBgColor) {
                        // 테두리 색상이 없거나 투명하면 배경색과 동일하게
                        borderColor = bgColorStr;
                    }
                    
                    style += `border-${side}: ${getBorderWidth(border.style)} ${getBorderStyle(border.style)} ${borderColor};`;
                } else if (hasBgColor) {
                    // 테두리가 없고 배경색이 있으면 배경색과 동일한 테두리
                    style += `border-${side}: 1px solid ${bgColorStr};`;
                } else {
                    // 테두리와 배경색이 모두 없으면 투명 테두리
                    style += `border-${side}: 1px solid transparent;`;
                }
            });
        } else if (hasBgColor) {
            // 테두리 정보가 없고 배경색이 있으면 배경색과 동일한 테두리
            style += `border: 1px solid ${bgColorStr};`;
        } else {
            // 테두리와 배경색이 모두 없으면 투명 테두리
            style += 'border: 1px solid transparent;';
        }
        
        // 텍스트 서식
        if (cell.effectiveFormat && cell.effectiveFormat.textFormat) {
            const textFormat = cell.effectiveFormat.textFormat;
            
            // 폰트 패밀리
            if (textFormat.fontFamily) {
                style += `font-family: ${textFormat.fontFamily}, Arial, sans-serif;`;
            }
            
            // 폰트 크기
            if (textFormat.fontSize) {
                style += `font-size: ${textFormat.fontSize}pt;`;
            }
            
            // 텍스트 스타일
            if (textFormat.bold) style += 'font-weight: bold;';
            if (textFormat.italic) style += 'font-style: italic;';
            
            // 텍스트 장식
            let textDecoration = [];
            if (textFormat.underline) textDecoration.push('underline');
            if (textFormat.strikethrough) textDecoration.push('line-through');
            if (textDecoration.length > 0) {
                style += `text-decoration: ${textDecoration.join(' ')};`;
            }
            
            // 텍스트 색상
            if (textFormat.foregroundColor) {
                const fg = textFormat.foregroundColor;
                style += `color: rgb(${Math.round(fg.red*255)}, ${Math.round(fg.green*255)}, ${Math.round(fg.blue*255)});`;
            }
        }
        
        // 정렬
        if (cell.effectiveFormat && cell.effectiveFormat.horizontalAlignment) {
            style += `text-align: ${cell.effectiveFormat.horizontalAlignment.toLowerCase()};`;
        }
        
        if (cell.effectiveFormat && cell.effectiveFormat.verticalAlignment) {
            style += `vertical-align: ${cell.effectiveFormat.verticalAlignment.toLowerCase()};`;
        }
        
        // 패딩
        style += 'padding: 4px 8px;';
        
        return style;
    }
    
    // 테이블 생성
    function createFormattedTable(gridData, merges, sheetProperties, displayRange) {
        const rows = gridData.rowData || [];
        const range = parseRange(displayRange);
        
        // 실제 데이터가 있는 마지막 열 찾기
        let lastDataColumn = 0;
        if (range) {
            lastDataColumn = range.endCol;
        } else {
            rows.forEach(row => {
                if (row.values) {
                    for (let i = row.values.length - 1; i >= 0; i--) {
                        if (row.values[i] && (row.values[i].formattedValue || hasFormatting(row.values[i]))) {
                            lastDataColumn = Math.max(lastDataColumn, i);
                            break;
                        }
                    }
                }
            });
        }
        
        let html = '<table class="sheet-table">';
        
        // 각 행 처리
        rows.forEach((row, rowIndex) => {
            // 범위 밖의 행은 건너뛰기
            if (range && (rowIndex < range.startRow || rowIndex > range.endRow)) {
                return;
            }
            
            // 빈 행 건너뛰기 (범위가 지정된 경우에는 적용하지 않음)
            if (!range && isEmptyRow(row)) {
                return;
            }
            
            html += `<tr data-row="${rowIndex}">`;
            
            // 각 셀 처리
            if (row.values) {
                const startCol = range ? range.startCol : 0;
                const endCol = Math.min(range ? range.endCol : lastDataColumn, lastDataColumn);
                
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
    
    // 병합 셀 적용
    function applyMerges(merges) {
        if (!merges || !merges.length) return;
        
        const table = document.querySelector('.sheet-table');
        if (!table) return;
        
        merges.forEach(merge => {
            const startRow = merge.startRowIndex;
            const endRow = merge.endRowIndex;
            const startCol = merge.startColumnIndex;
            const endCol = merge.endColumnIndex;
            
            // 첫 번째 셀 찾기
            const firstCell = table.querySelector(`tr[data-row="${startRow}"] td[data-col="${startCol}"]`);
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
                    
                    const cell = table.querySelector(`tr[data-row="${r}"] td[data-col="${c}"]`);
                    if (cell) cell.remove();
                }
            }
        });
    }
    
    // 디버깅용 셀 정보 출력
    function logCellInfo(cell) {
        if (!cell) {
            console.log('Cell is null or undefined');
            return;
        }
        
        console.group('Cell Info');
        console.log('Value:', cell.formattedValue);
        console.log('Format:', cell.effectiveFormat);
        if (cell.effectiveFormat && cell.effectiveFormat.backgroundColor) {
            console.log('Background:', cell.effectiveFormat.backgroundColor);
        }
        console.groupEnd();
    }
    
    // 공개 API
    return {
        createFormattedTable,
        parseRange,
        applyMerges,
        logCellInfo
    };
})();
