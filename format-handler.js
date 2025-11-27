const formatHandler = (function() {
    // Helper function to convert column letter to index (e.g., A -> 0, B -> 1)
    function columnLetterToIndex(column) {
        let result = 0;
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 64);
        }
        return result - 1;
    }
    
    // Helper function to parse a range string (e.g., "A1:B2")
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
    
    // Main function to create an HTML table from Google Sheet grid data
    function createTableFromGridData(gridData, merges) {
        const rows = gridData.rowData || [];
        const columnMetadata = gridData.columnMetadata || []; 
        const totalCols = gridData.properties?.gridProperties?.columnCount || columnMetadata.length;

        let html = '<table class="sheet-table" style="border-collapse: collapse; width: 100%;">';

        // Add colgroup for column widths
        html += '<colgroup>';
        for (let colIndex = 0; colIndex < totalCols; colIndex++) {
            const colWidth = columnMetadata[colIndex]?.pixelSize || 100; // Default to 100px
            let colStyle = `width: ${colWidth}px;`;
            if (colIndex % 3 === 0) { // First column of every 3-column group (A, D, G, etc.)
                colStyle += 'display: none;';
            }
            html += `<col style="${colStyle}">`;
        }
        html += '</colgroup>';
    
        // Create a map to check for merged cells
        const mergeMap = {};
        if (merges) {
            merges.forEach(merge => {
                for (let r = merge.startRowIndex; r < merge.endRowIndex; r++) {
                    for (let c = merge.startColumnIndex; c < merge.endColumnIndex; c++) {
                        if (r === merge.startRowIndex && c === merge.startColumnIndex) {
                            mergeMap[`${r}-${c}`] = {
                                isStart: true,
                                rowspan: merge.endRowIndex - merge.startRowIndex,
                                colspan: merge.endColumnIndex - merge.startColumnIndex
                            };
                        } else {
                            mergeMap[`${r}-${c}`] = { isMerged: true };
                        }
                    }
                }
            });
        }
    
        rows.forEach((row, rowIndex) => {
            html += `<tr data-row="${rowIndex}">`;
            const cells = row.values || [];
            // Use totalCols for iterating through columns to ensure all are accounted for
            for (let colIndex = 0; colIndex < totalCols; colIndex++) {
                const mergeInfo = mergeMap[`${rowIndex}-${colIndex}`];
                if (mergeInfo && mergeInfo.isMerged) {
                    continue; 
                }

                let tdStyle = ''; 
                if (colIndex % 3 === 0) { // First column of every 3-column group
                    tdStyle += 'display: none;';
                }

                const cell = colIndex < cells.length ? cells[colIndex] : null;
                let style = getStyleForCell(cell);
                let value = cell && cell.formattedValue ? cell.formattedValue : '';
                
                // If this is the 3rd column in a group (C, F, I...), check the flag in the 1st column
                if (colIndex % 3 === 2) {
                    if (colIndex - 2 < cells.length) { 
                        const flagCell = cells[colIndex - 2];
                        const flagValue = flagCell && flagCell.formattedValue ? flagCell.formattedValue.toUpperCase() : '';
                        if (flagValue === 'FALSE') {
                            value = `통역 : ${value}`;
                        }
                    }
                }
                
                let userName = localStorage.getItem('userName') || (window.appState ? window.appState.userName : '');
                if (userName && value && value.includes(userName)) {
                    value = value.replace(new RegExp(userName, 'g'), `<span style="background-color: rgba(255, 255, 0, 0.3);">${userName}</span>`);
                }
    
                let rowspan = mergeInfo && mergeInfo.rowspan > 1 ? ` rowspan="${mergeInfo.rowspan}"` : '';
                let colspan = mergeInfo && mergeInfo.colspan > 1 ? ` colspan="${mergeInfo.colspan}"` : '';
                
                html += `<td data-row="${rowIndex}" data-col="${colIndex}" style="${style}${tdStyle}"${rowspan}${colspan}>${value}</td>`;
            }
            html += '</tr>';
        });
    
        html += '</table>';
        return html;
    }

    // Helper function to get border color from Color object
    function getBorderColor(colorObj, defaultColor) {
        if (!colorObj) return defaultColor;
        
        if (colorObj.red !== undefined && colorObj.green !== undefined && colorObj.blue !== undefined) {
            return `rgb(${Math.round(colorObj.red*255)}, ${Math.round(colorObj.green*255)}, ${Math.round(colorObj.blue*255)})`;
        }
        
        return defaultColor;
    }
    
    // Helper function to extract CSS styles from a cell's effectiveFormat
    function getStyleForCell(cell) {
        if (!cell) return 'border: 1px solid #ccc; padding: 4px 6px; white-space: normal; word-wrap: break-word;';
    
        let style = '';
        
        // Background Color
        let bgColor = 'transparent';
        if (cell.effectiveFormat && cell.effectiveFormat.backgroundColor) {
            const bg = cell.effectiveFormat.backgroundColor;
            bgColor = `rgb(${Math.round(bg.red*255)}, ${Math.round(bg.green*255)}, ${Math.round(bg.blue*255)})`;
            style += `background-color: ${bgColor};`;
        }
        
        // Borders
        const defaultBorderColor = '#ccc';
        if (cell.effectiveFormat && cell.effectiveFormat.borders) {
            const borders = cell.effectiveFormat.borders;
            const top = borders.top || {style: 'NONE'};
            const right = borders.right || {style: 'NONE'};
            const bottom = borders.bottom || {style: 'NONE'};
            const left = borders.left || {style: 'NONE'};

            style += `border-top: ${top.style !== 'NONE' ? (top.width || 1)+'px solid '+getBorderColor(top.color, defaultBorderColor) : '1px solid #ccc'};`;
            style += `border-right: ${right.style !== 'NONE' ? (right.width || 1)+'px solid '+getBorderColor(right.color, defaultBorderColor) : '1px solid #ccc'};`;
            style += `border-bottom: ${bottom.style !== 'NONE' ? (bottom.width || 1)+'px solid '+getBorderColor(bottom.color, defaultBorderColor) : '1px solid #ccc'};`;
            style += `border-left: ${left.style !== 'NONE' ? (left.width || 1)+'px solid '+getBorderColor(left.color, defaultBorderColor) : '1px solid #ccc'};`;
        } else {
             style += `border: 1px solid ${defaultBorderColor};`;
        }

        // Text Format
        if (cell.effectiveFormat && cell.effectiveFormat.textFormat) {
            const textFormat = cell.effectiveFormat.textFormat;
            if (textFormat.fontSize) style += `font-size: ${textFormat.fontSize}pt;`;
            if (textFormat.bold) style += 'font-weight: bold;';
            if (textFormat.foregroundColor) {
                const fg = textFormat.foregroundColor;
                style += `color: rgb(${Math.round(fg.red*255)}, ${Math.round(fg.green*255)}, ${Math.round(fg.blue*255)});`;
            }
        }
        
        // Wrapping and Alignment
        style += 'white-space: normal; word-wrap: break-word; overflow-wrap: break-word;';
        
        if (cell.effectiveFormat && cell.effectiveFormat.horizontalAlignment) {
            style += `text-align: ${cell.effectiveFormat.horizontalAlignment.toLowerCase()};`;
        }
        
        if (cell.effectiveFormat && cell.effectiveFormat.verticalAlignment) {
            style += `vertical-align: ${cell.effectiveFormat.verticalAlignment.toLowerCase()};`;
        }

        style += 'padding: 4px 8px;';
        
        return style;
    }
    
    // Function to add global CSS styles (font imports, base table styles)
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
    
    // Public API of the formatHandler module
    return {
        createTableFromGridData,
        addGlobalStyles
    };
})();