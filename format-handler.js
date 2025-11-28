const formatHandler = (function() {
    // A1 표기법의 열 문자를 인덱스로 변환
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
        
        const sheetAndRange = rangeString.split('!');
        const range = sheetAndRange.length > 1 ? sheetAndRange[1] : sheetAndRange[0];

        const match = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
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
        let userName = localStorage.getItem('userName') || (window.appState ? window.appState.userName : '');
        window.addEventListener('storage', (e) => {
            if (e.key === 'userName') {
                userName = e.newValue || '';
            }
        });
        
        let html = '<table class="sheet-table" style="border-collapse: collapse; width: 100%; table-layout: fixed;">';
        
        rows.forEach((row, rowIndex) => {
            html += `<tr data-row="${rowIndex}">`;
            
            if (row.values) {
                for (let colIndex = 0; colIndex < row.values.length; colIndex++) {
                    const cell = row.values[colIndex];
                    
                    let style = getStyleForCell(cell);
                    
                    let value = cell && cell.formattedValue ? cell.formattedValue : '';
                    
                    if (userName && value && value.includes(userName)) {
                        const highlightedValue = value.replace(new RegExp(userName, 'g'), 
                            `<span style="background-color: rgba(255, 255, 0, 0.3);">${userName}</span>`);
                        value = highlightedValue;
                    }
                    
                    style += "white-space: normal; word-wrap: break-word; overflow-wrap: break-word;";
                    
                    if (rowIndex === 1) {
                        if (colIndex === 0) {
                            value = `<div style="display: flex; justify-content: space-between; align-items: center;"><button id="prev-week-btn-table" style="background: none; border: none; font-size: 20px; cursor: pointer;">◀</button>${value}</div>`;
                        } else if (colIndex === row.values.length - 1) {
                            value = `<div style="display: flex; justify-content: space-between; align-items: center;">${value}<button id="next-week-btn-table" style="background: none; border: none; font-size: 20px; cursor: pointer;">▶</button></div>`;
                        }
                    }

                    html += `<td data-row="${rowIndex}" data-col="${colIndex}" style="${style}">${value}</td>`;
                }
            }
            
            html += '</tr>';
        });
        
        html += '</table>';
        return html;
    }

    
    function getBorderColor(colorObj, defaultColor) {
        if (!colorObj) return defaultColor;
        
        if (colorObj.red !== undefined && colorObj.green !== undefined && colorObj.blue !== undefined) {
            return `rgb(${Math.round(colorObj.red*255)}, ${Math.round(colorObj.green*255)}, ${Math.round(colorObj.blue*255)})`;
        }
        
        return defaultColor;
    }
    
    function getStyleForCell(cell) {
        if (!cell) return 'border: 0px solid transparent; padding: 4px 6px; white-space: normal; word-wrap: break-word;';
        
        let style = '';
        
        let bgColor = 'transparent';
        if (cell.effectiveFormat && cell.effectiveFormat.backgroundColor) {
            const bg = cell.effectiveFormat.backgroundColor;
            bgColor = `rgb(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)})`;
            style += `background-color: ${bgColor};`;
        }
        
        const defaultBorderColor = 'transparent';
        let hasBorder = false;
        
        if (cell.effectiveFormat && cell.effectiveFormat.borders) {
            const borders = cell.effectiveFormat.borders;
            
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
        
        if (!hasBorder) {
            style += `
                border-top: 0px solid ${defaultBorderColor};
                border-right: 0px solid ${defaultBorderColor};
                border-bottom: 0px solid ${defaultBorderColor};
                border-left: 0px solid ${defaultBorderColor};
            `;
        }
        
        if (cell.effectiveFormat && cell.effectiveFormat.textFormat) {
            const textFormat = cell.effectiveFormat.textFormat;
            
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
        
        style += 'white-space: normal; word-wrap: break-word; overflow-wrap: break-word;';
        
        if (cell.effectiveFormat && cell.effectiveFormat.horizontalAlignment) {
            style += `text-align: ${cell.effectiveFormat.horizontalAlignment.toLowerCase()};`;
        }
        
        style += 'padding: 4px 8px;';
        
        return style;
    }

    
    function applyMerges(merges) {
        if (!merges || !merges.length) return;
        
        merges.forEach(merge => {
            const startRow = merge.startRowIndex;
            const endRow = merge.endRowIndex;
            const startCol = merge.startColumnIndex;
            const endCol = merge.endColumnIndex;
            
            const firstCell = document.querySelector(`table.sheet-table tr[data-row="${startRow}"] td[data-col="${startCol}"]`);
            if (!firstCell) return;
            
            if (endRow - startRow > 1) {
                firstCell.rowSpan = endRow - startRow;
            }
            
            if (endCol - startCol > 1) {
                firstCell.colSpan = endCol - startCol;
            }
            
            for (let r = startRow; r < endRow; r++) {
                for (let c = startCol; c < endCol; c++) {
                    if (r === startRow && c === startCol) continue;
                    
                    const cell = document.querySelector(`table.sheet-table tr[data-row="${r}"] td[data-col="${c}"]`);
                    if (cell) cell.remove();
                }
            }
        });
    }
    
    function addGlobalStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap');
            body, body *, 
            .sheet-table, .sheet-table *, 
            .sheet-table td, .sheet-table th, 
            .sheet-table tr, .sheet-table thead, 
            .sheet-table tbody {
                font-family: 'Gowun Dodum', sans-serif !important;
                font-synthesis: none;
                text-rendering: optimizeLegibility;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            .sheet-table {
                border-collapse: collapse;
                border-spacing: 0;
                width: 100%;
                font-family: 'Gowun Dodum', sans-serif !important;
            }
            .sheet-table td, .sheet-table th {
                border: 0px solid transparent;
                margin: 0;
                padding: 4px 8px;
                font-family: 'Gowun Dodum', sans-serif !important;
            }
            body {
                font-family: 'Gowun Dodum', sans-serif !important;
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    return {
        createFormattedTable,
        parseRange,
        applyMerges,
        addGlobalStyles
    };
})();