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
                    
                    // �� �� ��������
                    const value = cell && cell.formattedValue ? cell.formattedValue : '';
                    
                    // Ư�� �ؽ�Ʈ�� �ִ� ���� ����� ��� ���� ���� (�ӽ� �ذ�å)
                    let forceStyle = '';
                    if (value.includes('�߿� ���翡 �����ʽÿ�')) {
                        forceStyle = 'background-color: #f1c232; '; // ����� ��� ���� ����
                    }
                    
                    // �� ��Ÿ�� ����
                    const style = forceStyle + getStyleForCell(cell);
                    
                    // �� ����
                    html += `<td data-row="${rowIndex}" data-col="${colIndex}" style="${style}">${value}</td>`;
                }
            }
            
            html += '</tr>';
        });
        
        html += '</table>';
        return html;
    }
    
    // �׵θ� ������ �������� ���� �Լ�
    function getBorderColor(colorObj, defaultColor) {
        if (!colorObj) return defaultColor;
        
        // ���� ��ü�� ������ RGB�� ��ȯ
        if (colorObj.red !== undefined && colorObj.green !== undefined && colorObj.blue !== undefined) {
            // ������ �����ϰų� ����� ��� �⺻ �׵θ� ���� ���
            if ((colorObj.red === 1 && colorObj.green === 1 && colorObj.blue === 1) || 
                (colorObj.alpha !== undefined && colorObj.alpha === 0)) {
                return defaultColor;
            }
            return `rgb(${Math.round(colorObj.red*255)}, ${Math.round(colorObj.green*255)}, ${Math.round(colorObj.blue*255)})`;
        }
        
        return defaultColor;
    }
    
    // �� ��Ÿ�� ����
    function getStyleForCell(cell) {
        if (!cell) return 'border: 1px solid #e0e0e0;'; // �⺻ �׵θ� ���� ����
        
        let style = '';
        
        // ���� ó��
        let bgColor = 'transparent';
        if (cell.effectiveFormat && cell.effectiveFormat.backgroundColor) {
            const bg = cell.effectiveFormat.backgroundColor;
            bgColor = `rgb(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)})`;
            style += `background-color: ${bgColor};`;
        }
        
        // �׵θ� ó�� - �� ��Ȯ�� �⺻�� ���
        let hasTopBorder = false;
        let hasRightBorder = false;
        let hasBottomBorder = false;
        let hasLeftBorder = false;
        
        if (cell.effectiveFormat && cell.effectiveFormat.borders) {
            const borders = cell.effectiveFormat.borders;
            
            // �� �׵θ� ���⺰ ó�� - �⺻ ���� ����
            if (borders.top && borders.top.style !== 'NONE') {
                const color = getBorderColor(borders.top.color, '#d0d0d0'); // �⺻ �׵θ� ����
                style += `border-top: 1px solid ${color};`;
                hasTopBorder = true;
            }
            
            if (borders.right && borders.right.style !== 'NONE') {
                const color = getBorderColor(borders.right.color, '#d0d0d0');
                style += `border-right: 1px solid ${color};`;
                hasRightBorder = true;
            }
            
            if (borders.bottom && borders.bottom.style !== 'NONE') {
                const color = getBorderColor(borders.bottom.color, '#d0d0d0');
                style += `border-bottom: 1px solid ${color};`;
                hasBottomBorder = true;
            }
            
            if (borders.left && borders.left.style !== 'NONE') {
                const color = getBorderColor(borders.left.color, '#d0d0d0');
                style += `border-left: 1px solid ${color};`;
                hasLeftBorder = true;
            }
        }
        
        // �⺻ �׵θ� ���� - ������ �׵θ��� ���� ��������� ó��
        if (!hasTopBorder) {
            style += `border-top: 1px solid #e0e0e0;`; // ���� ȸ������ �⺻ �׵θ� ����
        }
        if (!hasRightBorder) {
            style += `border-right: 1px solid #e0e0e0;`;
        }
        if (!hasBottomBorder) {
            style += `border-bottom: 1px solid #e0e0e0;`;
        }
        if (!hasLeftBorder) {
            style += `border-left: 1px solid #e0e0e0;`;
        }
        
        // �ؽ�Ʈ ����
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
        
        // ����
        if (cell.effectiveFormat && cell.effectiveFormat.horizontalAlignment) {
            style += `text-align: ${cell.effectiveFormat.horizontalAlignment.toLowerCase()};`;
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
