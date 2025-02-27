const formatHandler = (function() {
    // �� ���ڸ� �ε����� ��ȯ
    function columnLetterToIndex(column) {
        let result = 0;
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 64);
        }
        return result - 1;
    }
    
    // ���� �Ľ�
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
    
    // ���̺� ����
    function createFormattedTable(gridData, merges, sheetProperties, displayRange) {
        const rows = gridData.rowData || [];
        const range = parseRange(displayRange);
        
        let html = '<table class="sheet-table">';
        
        // �� �� ó��
        rows.forEach((row, rowIndex) => {
            // ���� ���� ���� �ǳʶٱ�
            if (range && (rowIndex < range.startRow || rowIndex > range.endRow)) {
                return;
            }
            
            html += `<tr data-row="${rowIndex}">`;
            
            // �� �� ó��
            if (row.values) {
                const startCol = range ? range.startCol : 0;
                const endCol = range ? range.endCol : row.values.length - 1;
                
                for (let colIndex = startCol; colIndex <= endCol; colIndex++) {
                    const cell = colIndex < row.values.length ? row.values[colIndex] : null;
                    
                    // �� ��Ÿ�� ����
                    const style = getStyleForCell(cell);
                    
                    // �� �� ��������
                    const value = cell && cell.formattedValue ? cell.formattedValue : '';
                    
                    // �� ����
                    html += `<td data-row="${rowIndex}" data-col="${colIndex}" style="${style}">${value}</td>`;
                }
            }
            
            html += '</tr>';
        });
        
        html += '</table>';
        return html;
    }
    
    // �� ��Ÿ�� ���� - ������ �۵��ϴ� ������� �����ϵ� �׵θ� ó���� ����
    function getStyleForCell(cell) {
        if (!cell || !cell.effectiveFormat) return 'border: 1px solid transparent;';
        
        let style = '';
        let hasBgColor = false;
        let bgColorStr = 'transparent';
        
        // ���� ó�� - ���� ��� �״�� ����
        if (cell.effectiveFormat.backgroundColor) {
            const bg = cell.effectiveFormat.backgroundColor;
            bgColorStr = `rgba(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)}, ${bg.alpha})`;
            style += `background-color: ${bgColorStr};`;
            hasBgColor = true;
        }
        
        // �׵θ� ó�� - ������ �κ�
        if (cell.effectiveFormat.borders) {
            const borders = cell.effectiveFormat.borders;
            
            ['top', 'right', 'bottom', 'left'].forEach(side => {
                if (borders[side] && borders[side].style !== 'NONE') {
                    // �׵θ� ���� ����
                    let borderColor;
                    
                    if (hasBgColor) {
                        // ������ ������ ������ ������ �׵θ�
                        borderColor = bgColorStr;
                    } else if (borders[side].color) {
                        // �׵θ� ������ �����Ǿ� ������ �ش� ���� ���
                        const color = borders[side].color;
                        borderColor = `rgba(${Math.round(color.red*255)}, ${Math.round(color.green*255)}, ${Math.round(color.blue*255)}, ${color.alpha})`;
                    } else {
                        // �⺻��
                        borderColor = 'transparent';
                    }
                    
                    style += `border-${side}: 1px solid ${borderColor};`;
                } else if (hasBgColor) {
                    // �׵θ��� ���� ������ ������ ������ ������ �׵θ�
                    style += `border-${side}: 1px solid ${bgColorStr};`;
                } else {
                    // �׵θ��� ���� ������ ������ ���� �׵θ�
                    style += `border-${side}: 1px solid transparent;`;
                }
            });
        } else if (hasBgColor) {
            // �׵θ� ������ ���� ������ ������ ������ ������ �׵θ�
            style += `border: 1px solid ${bgColorStr};`;
        } else {
            // �׵θ� ������ ���� ������ ������ ���� �׵θ�
            style += 'border: 1px solid transparent;';
        }
        
        // �ؽ�Ʈ ����
        if (cell.effectiveFormat.textFormat) {
            const text = cell.effectiveFormat.textFormat;
            
            // ��Ʈ �йи�
            if (text.fontFamily) {
                style += `font-family: ${text.fontFamily}, Arial, sans-serif;`;
            }
            
            // ��Ʈ ũ��
            if (text.fontSize) {
                style += `font-size: ${text.fontSize}pt;`;
            }
            
            // ����
            if (text.bold) {
                style += 'font-weight: bold;';
            }
            
            // �����
            if (text.italic) {
                style += 'font-style: italic;';
            }
            
            // ���ٰ� ��Ҽ�
            let textDecoration = [];
            if (text.underline) textDecoration.push('underline');
            if (text.strikethrough) textDecoration.push('line-through');
            if (textDecoration.length > 0) {
                style += `text-decoration: ${textDecoration.join(' ')};`;
            }
            
            // �ؽ�Ʈ ����
            if (text.foregroundColor) {
                const fg = text.foregroundColor;
                style += `color: rgba(${Math.round(fg.red*255)}, ${Math.round(fg.green*255)}, ${Math.round(fg.blue*255)}, ${fg.alpha});`;
            }
        }
        
        // �ؽ�Ʈ ����
        if (cell.effectiveFormat.horizontalAlignment) {
            style += `text-align: ${cell.effectiveFormat.horizontalAlignment.toLowerCase()};`;
        }
        
        // ���� ����
        if (cell.effectiveFormat.verticalAlignment) {
            style += `vertical-align: ${cell.effectiveFormat.verticalAlignment.toLowerCase()};`;
        }
        
        // �е�
        style += 'padding: 4px 8px;';
        
        return style;
    }
    
    // ���� �� ����
    function applyMerges(merges) {
        if (!merges || !merges.length) return;
        
        merges.forEach(merge => {
            const startRow = merge.startRowIndex;
            const endRow = merge.endRowIndex;
            const startCol = merge.startColumnIndex;
            const endCol = merge.endColumnIndex;
            
            // ù ��° �� ã��
            const firstCell = document.querySelector(`table.sheet-table tr[data-row="${startRow}"] td[data-col="${startCol}"]`);
            if (!firstCell) return;
            
            // rowspan ����
            if (endRow - startRow > 1) {
                firstCell.rowSpan = endRow - startRow;
            }
            
            // colspan ����
            if (endCol - startCol > 1) {
                firstCell.colSpan = endCol - startCol;
            }
            
            // ���յ� �ٸ� �� ����
            for (let r = startRow; r < endRow; r++) {
                for (let c = startCol; c < endCol; c++) {
                    // ù ��° ���� �ǳʶٱ�
                    if (r === startRow && c === startCol) continue;
                    
                    const cell = document.querySelector(`table.sheet-table tr[data-row="${r}"] td[data-col="${c}"]`);
                    if (cell) cell.remove();
                }
            }
        });
    }
    
    // ���� API
    return {
        createFormattedTable,
        parseRange,
        applyMerges
    };
})();
