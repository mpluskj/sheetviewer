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
    
    // ���̺� ���̾ƿ��� fixed�� �����Ͽ� % �ʺ� ����� ����ǵ��� ��
    let html = '<table class="sheet-table" style="border-collapse: collapse; width: 100%; table-layout: fixed;">';
    
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
                let style = getStyleForCell(cell);
                
                // �� �� ��������
                const value = cell && cell.formattedValue ? cell.formattedValue : '';
                
                // ���� �� ���Ŀ��� �ٹٲ� ���� Ȯ��
                const wrapText = cell && cell.effectiveFormat && cell.effectiveFormat.wrapStrategy === 'WRAP';
                
                // �׻� �ٹٲ� ��� (���� ���� ����)
                style += "white-space: normal; word-wrap: break-word; overflow-wrap: break-word;";
                
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
            return `rgb(${Math.round(colorObj.red*255)}, ${Math.round(colorObj.green*255)}, ${Math.round(colorObj.blue*255)})`;
        }
        
        return defaultColor;
    }
    
// �� ��Ÿ�� ����
function getStyleForCell(cell) {
    if (!cell) return 'border: 0px solid transparent; padding: 4px 6px; white-space: normal; word-wrap: break-word;';
    
    let style = '';
    
    // ���� ó��
    let bgColor = 'transparent';
    if (cell.effectiveFormat && cell.effectiveFormat.backgroundColor) {
        const bg = cell.effectiveFormat.backgroundColor;
        bgColor = `rgb(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)})`;
        style += `background-color: ${bgColor};`;
    }
    
    // �׵θ� ó�� - �⺻�� ����, �β� 0px
    const defaultBorderColor = 'transparent';
    let hasBorder = false;
    
    if (cell.effectiveFormat && cell.effectiveFormat.borders) {
        const borders = cell.effectiveFormat.borders;
        
        // �� �׵θ� ���⺰ ó��
        if (borders.top && borders.top.style !== 'NONE') {
            const color = getBorderColor(borders.top.color, defaultBorderColor);
            const width = borders.top.style === 'THICK' ? '2px' : '1px';
            style += `border-top: ${width} solid ${color};`;
            hasBorder = true;
        } else {
            style += `border-top: 0px solid ${defaultBorderColor};`;
        }
        
        if (borders.right && borders.right.style !== 'NONE') {
            const color = getBorderColor(borders.right.color, defaultBorderColor);
            const width = borders.right.style === 'THICK' ? '2px' : '1px';
            style += `border-right: ${width} solid ${color};`;
            hasBorder = true;
        } else {
            style += `border-right: 0px solid ${defaultBorderColor};`;
        }
        
        if (borders.bottom && borders.bottom.style !== 'NONE') {
            const color = getBorderColor(borders.bottom.color, defaultBorderColor);
            const width = borders.bottom.style === 'THICK' ? '2px' : '1px';
            style += `border-bottom: ${width} solid ${color};`;
            hasBorder = true;
        } else {
            style += `border-bottom: 0px solid ${defaultBorderColor};`;
        }
        
        if (borders.left && borders.left.style !== 'NONE') {
            const color = getBorderColor(borders.left.color, defaultBorderColor);
            const width = borders.left.style === 'THICK' ? '2px' : '1px';
            style += `border-left: ${width} solid ${color};`;
            hasBorder = true;
        } else {
            style += `border-left: 0px solid ${defaultBorderColor};`;
        }
    }
    
    // �׵θ��� ���� ���� ��� ��� ���⿡ 0px ���� �׵θ� ����
    if (!hasBorder) {
        style += `
            border-top: 0px solid ${defaultBorderColor};
            border-right: 0px solid ${defaultBorderColor};
            border-bottom: 0px solid ${defaultBorderColor};
            border-left: 0px solid ${defaultBorderColor};
        `;
    }
    
    // �ؽ�Ʈ ����
    if (cell.effectiveFormat && cell.effectiveFormat.textFormat) {
        const textFormat = cell.effectiveFormat.textFormat;
        
        // �۲� ũ�� - ���� ũ�� ����
        if (textFormat.fontSize) {
            style += `font-size: ${textFormat.fontSize}pt;`;
        }
        
        if (textFormat.bold) {
            style += 'font-weight: bold;';
        }
        
        if (textFormat.foregroundColor) {
            const fg = textFormat.foregroundColor;
            style += `color: rgb(${Math.round(fg.red*255)}, ${Math.round(fg.green*255)}, ${Math.round(fg.blue*255)});`;
        }
    }
    
    // �ٹٲ� ���� - �׻� ���
    style += 'white-space: normal; word-wrap: break-word; overflow-wrap: break-word;';
    
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
    
    // CSS ��Ÿ�� �߰� - �� ���� �ּ�ȭ (�۲� ũ�� ���� ����)
    function addGlobalStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .sheet-table {
                border-collapse: collapse;
                border-spacing: 0;
                width: 100%;
                font-family: Arial, sans-serif;
            }
            .sheet-table td {
                border: 0px solid transparent;
                margin: 0;
                padding: 4px 8px;
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    // ���� API
    return {
        createFormattedTable,
        parseRange,
        applyMerges,
        addGlobalStyles
    };
})();
