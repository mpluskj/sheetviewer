// ���� ó���� ���� ���
const formatHandler = (function() {
    
    // �࿡ �����Ͱ� �ִ��� Ȯ���ϴ� �Լ�
    function hasRowData(row) {
        if (!row.values) return false;
        
        // ���� ��� ���� Ȯ���Ͽ� �ϳ��� ���� ������ true ��ȯ
        return row.values.some(cell => cell && cell.formattedValue);
    }
    
    // ���� �����Ͱ� �ִ��� Ȯ���ϴ� �Լ�
    function hasColumnData(rows, colIndex) {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row.values || colIndex >= row.values.length) continue;
            
            const cell = row.values[colIndex];
            if (cell && cell.formattedValue) {
                return true;
            }
        }
        return false;
    }
    
    // ������ ����� ���̺� ����
    function createFormattedTable(gridData, merges, sheetProperties, displayRange) {
        const rows = gridData.rowData || [];
        
        // ǥ�� ���� �Ľ�
        const range = parseRange(displayRange);
        
        // �����Ͱ� �ִ� ������ �� �ε��� ã��
        let lastDataColumn = 0;
        
        // ǥ�� ������ ������ ��� �ش� ������ ������ �� ���
        if (range) {
            lastDataColumn = range.endCol;
        } else {
            // ������ �������� ���� ��� ������ ������� ������ �� ����
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
        }
        
        // �����Ͱ� �ִ� �� Ȯ��
        let columnsWithData = [];
        for (let colIndex = 0; colIndex <= lastDataColumn; colIndex++) {
            if (hasColumnData(rows, colIndex)) {
                columnsWithData.push(colIndex);
            }
        }
        
        let html = '<table class="sheet-table">';
        
        // �� �� ó��
        rows.forEach((row, rowIndex) => {
            // ���� ���� ���� �ǳʶٱ�
            if (range && (rowIndex < range.startRow || rowIndex > range.endRow)) {
                return;
            }
            
            // �� �� �ǳʶٱ� (������ ������ ��쿡�� �������� ����)
            if (!range && !hasRowData(row)) {
                return;
            }
            
            html += `<tr data-row="${rowIndex}">`;
            
            // �� �� ó��
            if (row.values) {
                // ǥ�� ���� ���� ���� ó��
                const startCol = range ? range.startCol : 0;
                const endCol = range ? range.endCol : lastDataColumn;
                
                for (let colIndex = startCol; colIndex <= endCol; colIndex++) {
                    // �����Ͱ� ���� �� ��ü�� �ǳʶٴ� ���, �� ���� ǥ���ϵ� ���߿� CSS�� ����
                    const cell = colIndex < row.values.length ? row.values[colIndex] : null;
                    
                    // ���� ���ų� ���� ������ �� �� ���� (���� �������� �׻� ǥ��)
                    if (!cell || !cell.formattedValue) {
                        html += `<td data-row="${rowIndex}" data-col="${colIndex}" class="empty-cell"></td>`;
                        continue;
                    }
                    
                    // �� ��Ÿ�� ����
                    const cellStyle = generateCellStyle(cell);
                    
                    // �� �� ó��
                    const cellValue = cell.formattedValue || '';
                    
                    // �� Ŭ���� ����
                    const cellClass = getCellClass(cell);
                    
                    // �� ����
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
    
    // A1 ǥ��� ������ �Ľ��ϴ� �Լ�
    function parseRange(rangeString) {
        if (!rangeString) return null;
        
        // A1:B2 ���� �Ľ�
        const match = rangeString.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
        if (!match) return null;
        
        const startCol = columnLetterToIndex(match[1]);
        const startRow = parseInt(match[2]) - 1; // 0-based �ε����� ��ȯ
        const endCol = columnLetterToIndex(match[3]);
        const endRow = parseInt(match[4]) - 1;   // 0-based �ε����� ��ȯ
        
        return {
            startCol,
            startRow,
            endCol,
            endRow
        };
    }
    
    // �� ���ڸ� �ε����� ��ȯ (A -> 0, B -> 1, ..., Z -> 25, AA -> 26, ...)
    function columnLetterToIndex(column) {
        let result = 0;
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 64);
        }
        return result - 1; // 0-based �ε����� ��ȯ
    }
    
    // �ε����� �� ���ڷ� ��ȯ (0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, ...)
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
    
    // �� ���� ������ CSS ��Ÿ�Ϸ� ��ȯ
    function generateCellStyle(cell) {
        if (!cell || !cell.effectiveFormat) return '';
        
        const format = cell.effectiveFormat;
        let style = '';
        
        // ����
        if (format.backgroundColor) {
            const bg = format.backgroundColor;
            style += `background-color: rgba(${Math.round(bg.red*255)||0}, ${Math.round(bg.green*255)||0}, ${Math.round(bg.blue*255)||0}, ${bg.alpha||1});`;
        }
        
        // �ؽ�Ʈ ����
        if (format.textFormat) {
            const text = format.textFormat;
            
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
                style += `color: rgba(${Math.round(fg.red*255)||0}, ${Math.round(fg.green*255)||0}, ${Math.round(fg.blue*255)||0}, ${fg.alpha||1});`;
            }
        }
        
        // �׵θ�
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
        
        // �ؽ�Ʈ ����
        if (format.horizontalAlignment) {
            style += `text-align: ${getHorizontalAlignment(format.horizontalAlignment)};`;
        }
        
        // ���� ����
        if (format.verticalAlignment) {
            style += `vertical-align: ${getVerticalAlignment(format.verticalAlignment)};`;
        }
        
        // �е�
        style += 'padding: 4px 8px;';
        
        return style;
    }
    
    // �� Ŭ���� ����
    function getCellClass(cell) {
        let classes = [];
        
        if (!cell || !cell.effectiveFormat) return '';
        
        const format = cell.effectiveFormat;
        
        // �ؽ�Ʈ �ٹٲ� ó��
        if (format.wrapStrategy && format.wrapStrategy === 'WRAP') {
            classes.push('wrap-text');
        } else {
            classes.push('nowrap-text');
        }
        
        // �� ������ ���� Ŭ����
        if (cell.effectiveValue) {
            if (cell.effectiveValue.numberValue !== undefined) {
                classes.push('number-cell');
            }
        }
        
        return classes.join(' ');
    }
    
    // ���� �� ����
    function applyMerges(merges) {
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
    
    // �׵θ� ��Ÿ�� ��ȯ
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
    
    // �׵θ� �β� ��ȯ
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
    
    // ���� ���� ��ȯ
    function getHorizontalAlignment(gsAlignment) {
        switch(gsAlignment) {
            case 'LEFT': return 'left';
            case 'CENTER': return 'center';
            case 'RIGHT': return 'right';
            default: return 'left';
        }
    }
    
    // ���� ���� ��ȯ
    function getVerticalAlignment(gsAlignment) {
        switch(gsAlignment) {
            case 'TOP': return 'top';
            case 'MIDDLE': return 'middle';
            case 'BOTTOM': return 'bottom';
            default: return 'middle';
        }
    }
    
    // ���� API
    return {
        createFormattedTable,
        generateCellStyle,
        applyMerges,
        parseRange,
        columnLetterToIndex,
        indexToColumnLetter,
        hasColumnData
    };
})();
