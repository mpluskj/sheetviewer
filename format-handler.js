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
    
    // ���� ��ü�� CSS RGB ���ڿ��� ��ȯ
    function colorToRgb(colorObj, defaultColor = 'transparent') {
        if (!colorObj) return defaultColor;
        
        // RGB ���� ��� �����ϴ��� Ȯ��
        if (colorObj.red !== undefined && colorObj.green !== undefined && colorObj.blue !== undefined) {
            const r = Math.round(colorObj.red * 255);
            const g = Math.round(colorObj.green * 255);
            const b = Math.round(colorObj.blue * 255);
            
            // alpha ���� �ִ� ��� rgba ���
            if (colorObj.alpha !== undefined && colorObj.alpha < 1) {
                return `rgba(${r}, ${g}, ${b}, ${colorObj.alpha})`;
            }
            
            return `rgb(${r}, ${g}, ${b})`;
        }
        
        return defaultColor;
    }
    
    // Ư�� �ؽ�Ʈ�� ���� ���� ����
    const textBackgroundMap = {
        '�߿� ���翡 �����ʽÿ�': '#f1c232', // �����
        '�׸�����': '#b45f06',              // ����
        '��ȣ��': '#ea9999'                 // ��ȫ��
    };
    
    // ���̺� ����
    function createFormattedTable(gridData, merges, sheetProperties, displayRange) {
        const rows = gridData.rowData || [];
        const range = parseRange(displayRange);
        
        let html = '<table class="sheet-table" style="border-collapse: collapse; width: 100%;">';
        
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
                    
                    // Ư�� �ؽ�Ʈ�� �ִ� ���� ���� ���� ����
                    let forceBackground = null;
                    for (const [text, color] of Object.entries(textBackgroundMap)) {
                        if (value.includes(text)) {
                            forceBackground = color;
                            break;
                        }
                    }
                    
                    // �� ��Ÿ�� ���� (���� ���� ����)
                    const style = getStyleForCell(cell, forceBackground);
                    
                    // �� ����
                    html += `<td data-row="${rowIndex}" data-col="${colIndex}" style="${style}">${value}</td>`;
                }
            }
            
            html += '</tr>';
        });
        
        html += '</table>';
        return html;
    }
    
    // �� ��Ÿ�� ����
    function getStyleForCell(cell, forceBgColor = null) {
        if (!cell) return 'border: 1px solid #d0d0d0; padding: 4px 8px;';
        
        let style = '';
        
        // ���� ó�� - ���� ������ ������ �켱 ����
        let bgColor = 'transparent';
        
        if (forceBgColor) {
            bgColor = forceBgColor;
            style += `background-color: ${bgColor} !important;`; // !important�� �켱���� ����
        } else if (cell.effectiveFormat && cell.effectiveFormat.backgroundColor) {
            bgColor = colorToRgb(cell.effectiveFormat.backgroundColor, 'transparent');
            style += `background-color: ${bgColor};`;
        } else if (cell.userEnteredFormat && cell.userEnteredFormat.backgroundColor) {
            // ��ü ��ο��� ���� Ȯ��
            bgColor = colorToRgb(cell.userEnteredFormat.backgroundColor, 'transparent');
            style += `background-color: ${bgColor};`;
        }
        
        // �׵θ� ó�� - �� ���� �ѷ��� �׵θ� ���
        const borderColor = '#d0d0d0'; // �⺻ �׵θ� ����
        const borderStyle = '1px solid';
        
        // �⺻������ ��� ���⿡ �׵θ� ����
        style += `
            border-top: ${borderStyle} ${borderColor};
            border-right: ${borderStyle} ${borderColor};
            border-bottom: ${borderStyle} ${borderColor};
            border-left: ${borderStyle} ${borderColor};
        `;
        
        // ���� ������� �׵θ� ������ ������ �����
        if (cell.effectiveFormat && cell.effectiveFormat.borders) {
            const borders = cell.effectiveFormat.borders;
            
            // �� �׵θ� ���⺰ ó��
            if (borders.top && borders.top.style !== 'NONE') {
                const color = colorToRgb(borders.top.color, borderColor);
                const width = borders.top.style === 'THICK' ? '2px' : '1px';
                style += `border-top: ${width} solid ${color};`;
            }
            
            if (borders.right && borders.right.style !== 'NONE') {
                const color = colorToRgb(borders.right.color, borderColor);
                const width = borders.right.style === 'THICK' ? '2px' : '1px';
                style += `border-right: ${width} solid ${color};`;
            }
            
            if (borders.bottom && borders.bottom.style !== 'NONE') {
                const color = colorToRgb(borders.bottom.color, borderColor);
                const width = borders.bottom.style === 'THICK' ? '2px' : '1px';
                style += `border-bottom: ${width} solid ${color};`;
            }
            
            if (borders.left && borders.left.style !== 'NONE') {
                const color = colorToRgb(borders.left.color, borderColor);
                const width = borders.left.style === 'THICK' ? '2px' : '1px';
                style += `border-left: ${width} solid ${color};`;
            }
        }
        
        // �ؽ�Ʈ ����
        if (cell.effectiveFormat && cell.effectiveFormat.textFormat) {
            const textFormat = cell.effectiveFormat.textFormat;
            
            if (textFormat.bold) {
                style += 'font-weight: bold;';
            }
            
            if (textFormat.foregroundColor) {
                const color = colorToRgb(textFormat.foregroundColor, '#000000');
                style += `color: ${color};`;
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
    
    // CSS ��Ÿ�� �߰�
    function addGlobalStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .sheet-table {
                border-collapse: collapse;
                width: 100%;
            }
            .sheet-table td {
                border: 1px solid #d0d0d0;
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
