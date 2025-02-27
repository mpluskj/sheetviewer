const formatHandler = (function() {
    // ���� �Ľ� �Լ�
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
    
    // �� ���ڸ� �ε����� ��ȯ
    function columnLetterToIndex(column) {
        let result = 0;
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 64);
        }
        return result - 1;
    }
    
// �׵θ� ���� Ȯ�� �Լ�
function hasBorderColor(format) {
    if (!format || !format.borders) return false;
    
    const sides = ['top', 'right', 'bottom', 'left'];
    return sides.some(side => {
        const border = format.borders[side];
        return border && border.style !== 'NONE' && 
               border.color && border.color.alpha > 0;
    });
}
    
// �� ǥ�� ���� ���� �Լ�
function isCellVisible(cell) {
    if (!cell) return false;
    
    // ���� ������ ǥ��
    if (cell.formattedValue) return true;
    
    // ���� ������ ������ ǥ������ ����
    if (!cell.effectiveFormat) return false;
    
    const format = cell.effectiveFormat;
    
    // ���� Ȯ�� - ���İ��� 0���� ũ�� ǥ��
    if (format.backgroundColor && format.backgroundColor.alpha > 0) {
        return true;
    }
    
    // �׵θ� ���� Ȯ��
    if (hasBorderColor(format)) {
        return true;
    }
    
    return false;
}
    
// �� ��Ÿ�� ���� �Լ�
function generateCellStyle(cell) {
    if (!cell || !cell.effectiveFormat) return '';
    
    const format = cell.effectiveFormat;
    let style = '';
    
    // ���� ó��
    if (format.backgroundColor) {
        const bg = format.backgroundColor;
        // ���İ��� 0���� ũ�� ���� ����
        if (bg.alpha > 0) {
            // ���İ� 0.1 ������ ��쵵 ǥ��
            const bgColorStr = `rgba(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)}, ${Math.max(bg.alpha, 0.1)})`;
            style += `background-color: ${bgColorStr} !important;`;
        }
    }
    
    // �׵θ� ó��
    if (format.borders) {
        const sides = ['top', 'right', 'bottom', 'left'];
        sides.forEach(side => {
            const border = format.borders[side];
            if (border && border.style !== 'NONE') {
                const color = border.color || { red: 0, green: 0, blue: 0, alpha: 0.1 };
                const borderColorStr = `rgba(${Math.round(color.red*255)}, ${Math.round(color.green*255)}, ${Math.round(color.blue*255)}, ${Math.max(color.alpha, 0.1)})`;
                
                style += `border-${side}: 1px solid ${borderColorStr} !important;`;
            }
        });
    }
    
    // �ؽ�Ʈ ���� ó��
    if (format.textFormat) {
        const text = format.textFormat;
        
        // ��Ʈ �йи�
        if (text.fontFamily) {
            style += `font-family: ${text.fontFamily}, Arial, sans-serif !important;`;
        }
        
        // ��Ʈ ũ��
        if (text.fontSize) {
            style += `font-size: ${text.fontSize}pt !important;`;
        }
        
        // �ؽ�Ʈ ��Ÿ��
        if (text.bold) style += 'font-weight: bold !important;';
        if (text.italic) style += 'font-style: italic !important;';
        
        // �ؽ�Ʈ ���
        let textDecoration = [];
        if (text.underline) textDecoration.push('underline');
        if (text.strikethrough) textDecoration.push('line-through');
        if (textDecoration.length > 0) {
            style += `text-decoration: ${textDecoration.join(' ')} !important;`;
        }
        
        // �ؽ�Ʈ ����
        if (text.foregroundColor) {
            const fg = text.foregroundColor;
            const fgColorStr = `rgba(${Math.round(fg.red*255)}, ${Math.round(fg.green*255)}, ${Math.round(fg.blue*255)}, ${Math.max(fg.alpha, 0.1)})`;
            style += `color: ${fgColorStr} !important;`;
        }
    }
    
    // �ؽ�Ʈ ����
    if (format.horizontalAlignment) {
        style += `text-align: ${format.horizontalAlignment.toLowerCase()} !important;`;
    }
    
    // ���� ����
    if (format.verticalAlignment) {
        style += `vertical-align: ${format.verticalAlignment.toLowerCase()} !important;`;
    }
    
    // �е�
    style += 'padding: 4px 8px !important;';
    
    return style;
}


    
    // ���̺� ���� �Լ�
    function createFormattedTable(gridData, merges, sheetProperties, displayRange) {
        const rows = gridData.rowData || [];
        const range = parseRange(displayRange);
        
        let html = '<table class="sheet-table">';
        
        rows.forEach((row, rowIndex) => {
            // ���� ���� ���� �ǳʶٱ�
            if (range) {
                if (rowIndex < range.startRow || rowIndex > range.endRow) {
                    return;
                }
            }
            
            html += `<tr data-row="${rowIndex}">`;
            
            if (row.values) {
                // �� ���� ����
                const startCol = range ? range.startCol : 0;
                const endCol = range ? range.endCol : row.values.length - 1;
                
                for (let colIndex = startCol; colIndex <= endCol; colIndex++) {
                    const cell = colIndex < row.values.length ? row.values[colIndex] : null;
                    
                    // ������ �ʴ� �� ó��
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
    
    // HTML �̽������� ó��
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
    
    // ���� API
    return {
        createFormattedTable,
        parseRange
    };
})();
