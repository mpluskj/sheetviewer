const formatHandler = (function() {
    // �� ���ڸ� �ε����� ��ȯ
    function columnLetterToIndex(column) {
        let result = 0;
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 64);
        }
        return result - 1;
    }
    
    // �ε����� �� ���ڷ� ��ȯ
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
    
    // ���� �ǹ� �ִ� ������ �ִ��� Ȯ��
    function hasFormatting(cell) {
        if (!cell || !cell.effectiveFormat) return false;
        
        const format = cell.effectiveFormat;
        
        // ���� Ȯ��
        if (format.backgroundColor && format.backgroundColor.alpha > 0) {
            return true;
        }
        
        // �׵θ� Ȯ��
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
    
    // ���� ����ִ��� Ȯ��
    function isEmptyRow(row) {
        if (!row.values) return true;
        
        return !row.values.some(cell => 
            cell && (cell.formattedValue || hasFormatting(cell))
        );
    }
    
    // �׵θ� �β� ��ȯ
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
    
    // �׵θ� ��Ÿ�� ��ȯ
    function getBorderStyle(style) {
        switch(style) {
            case 'DOTTED': return 'dotted';
            case 'DASHED': return 'dashed';
            case 'DOUBLE': return 'double';
            default: return 'solid';
        }
    }
    
    // �� ��Ÿ�� ����
    function getStyleForCell(cell) {
        if (!cell) return 'border: 1px solid transparent;';
        
        let style = '';
        let hasBgColor = false;
        let bgColorStr = 'transparent';
        
        // ���� ó��
        if (cell.effectiveFormat && cell.effectiveFormat.backgroundColor) {
            const bg = cell.effectiveFormat.backgroundColor;
            if (bg.alpha > 0) {
                bgColorStr = `rgb(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)})`;
                style += `background-color: ${bgColorStr};`;
                hasBgColor = true;
            }
        }
        
        // �׵θ� ó��
        if (cell.effectiveFormat && cell.effectiveFormat.borders) {
            const borders = cell.effectiveFormat.borders;
            
            ['top', 'right', 'bottom', 'left'].forEach(side => {
                const border = borders[side];
                if (border && border.style !== 'NONE') {
                    let borderColor = '#000'; // �⺻��
                    
                    // �׵θ� ���� ����
                    if (border.color && border.color.alpha > 0) {
                        borderColor = `rgb(${Math.round(border.color.red*255)}, ${Math.round(border.color.green*255)}, ${Math.round(border.color.blue*255)})`;
                    } else if (hasBgColor) {
                        // �׵θ� ������ ���ų� �����ϸ� ������ �����ϰ�
                        borderColor = bgColorStr;
                    }
                    
                    style += `border-${side}: ${getBorderWidth(border.style)} ${getBorderStyle(border.style)} ${borderColor};`;
                } else if (hasBgColor) {
                    // �׵θ��� ���� ������ ������ ������ ������ �׵θ�
                    style += `border-${side}: 1px solid ${bgColorStr};`;
                } else {
                    // �׵θ��� ������ ��� ������ ���� �׵θ�
                    style += `border-${side}: 1px solid transparent;`;
                }
            });
        } else if (hasBgColor) {
            // �׵θ� ������ ���� ������ ������ ������ ������ �׵θ�
            style += `border: 1px solid ${bgColorStr};`;
        } else {
            // �׵θ��� ������ ��� ������ ���� �׵θ�
            style += 'border: 1px solid transparent;';
        }
        
        // �ؽ�Ʈ ����
        if (cell.effectiveFormat && cell.effectiveFormat.textFormat) {
            const textFormat = cell.effectiveFormat.textFormat;
            
            // ��Ʈ �йи�
            if (textFormat.fontFamily) {
                style += `font-family: ${textFormat.fontFamily}, Arial, sans-serif;`;
            }
            
            // ��Ʈ ũ��
            if (textFormat.fontSize) {
                style += `font-size: ${textFormat.fontSize}pt;`;
            }
            
            // �ؽ�Ʈ ��Ÿ��
            if (textFormat.bold) style += 'font-weight: bold;';
            if (textFormat.italic) style += 'font-style: italic;';
            
            // �ؽ�Ʈ ���
            let textDecoration = [];
            if (textFormat.underline) textDecoration.push('underline');
            if (textFormat.strikethrough) textDecoration.push('line-through');
            if (textDecoration.length > 0) {
                style += `text-decoration: ${textDecoration.join(' ')};`;
            }
            
            // �ؽ�Ʈ ����
            if (textFormat.foregroundColor) {
                const fg = textFormat.foregroundColor;
                style += `color: rgb(${Math.round(fg.red*255)}, ${Math.round(fg.green*255)}, ${Math.round(fg.blue*255)});`;
            }
        }
        
        // ����
        if (cell.effectiveFormat && cell.effectiveFormat.horizontalAlignment) {
            style += `text-align: ${cell.effectiveFormat.horizontalAlignment.toLowerCase()};`;
        }
        
        if (cell.effectiveFormat && cell.effectiveFormat.verticalAlignment) {
            style += `vertical-align: ${cell.effectiveFormat.verticalAlignment.toLowerCase()};`;
        }
        
        // �е�
        style += 'padding: 4px 8px;';
        
        return style;
    }
    
    // ���̺� ����
    function createFormattedTable(gridData, merges, sheetProperties, displayRange) {
        const rows = gridData.rowData || [];
        const range = parseRange(displayRange);
        
        // ���� �����Ͱ� �ִ� ������ �� ã��
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
        
        // �� �� ó��
        rows.forEach((row, rowIndex) => {
            // ���� ���� ���� �ǳʶٱ�
            if (range && (rowIndex < range.startRow || rowIndex > range.endRow)) {
                return;
            }
            
            // �� �� �ǳʶٱ� (������ ������ ��쿡�� �������� ����)
            if (!range && isEmptyRow(row)) {
                return;
            }
            
            html += `<tr data-row="${rowIndex}">`;
            
            // �� �� ó��
            if (row.values) {
                const startCol = range ? range.startCol : 0;
                const endCol = Math.min(range ? range.endCol : lastDataColumn, lastDataColumn);
                
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
    
    // ���� �� ����
    function applyMerges(merges) {
        if (!merges || !merges.length) return;
        
        const table = document.querySelector('.sheet-table');
        if (!table) return;
        
        merges.forEach(merge => {
            const startRow = merge.startRowIndex;
            const endRow = merge.endRowIndex;
            const startCol = merge.startColumnIndex;
            const endCol = merge.endColumnIndex;
            
            // ù ��° �� ã��
            const firstCell = table.querySelector(`tr[data-row="${startRow}"] td[data-col="${startCol}"]`);
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
                    
                    const cell = table.querySelector(`tr[data-row="${r}"] td[data-col="${c}"]`);
                    if (cell) cell.remove();
                }
            }
        });
    }
    
    // ������ �� ���� ���
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
    
    // ���� API
    return {
        createFormattedTable,
        parseRange,
        applyMerges,
        logCellInfo
    };
})();
