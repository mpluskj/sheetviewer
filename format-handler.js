const formatHandler = {
    /**
     * Google Sheets 데이터를 기반으로 HTML 테이블을 생성합니다.
     * @param {Object} gridData API에서 반환된 그리드 데이터
     * @param {Array} merges 병합 정보
     * @param {Object} sheetProperties 시트 속성
     * @param {string} displayRange 표시 범위
     * @returns {string} 생성된 HTML 문자열
     */
    createFormattedTable: function(gridData, merges, sheetProperties, displayRange) {
        if (!gridData.rowData) return '<p>데이터가 없습니다.</p>';

        let html = '<table class="sheet-table" cellspacing="0" cellpadding="0">';
        
        // 데이터 처리
        gridData.rowData.forEach((row, rowIndex) => {
            // 행 높이 설정 (선택 사항)
            // const height = gridData.rowMetadata && gridData.rowMetadata[rowIndex] ? gridData.rowMetadata[rowIndex].pixelSize : 20;
            
            html += `<tr id="row-${rowIndex}">`;
            
            if (row.values) {
                row.values.forEach((cell, colIndex) => {
                    // 셀 스타일 생성
                    let style = this.getCellStyle(cell);
                    const formattedValue = cell.formattedValue || '';
                    
                    let cellContent = formattedValue;
                    
                    // 사용자 이름 강조 표시 (글자만 음영)
                    if (window.appState && window.appState.userName && cellContent.includes(window.appState.userName)) {
                        // 텍스트 하이라이트 스타일
                        const highlightStyle = 'background-color: #fff59d; color: black; font-weight: bold; border-radius: 2px; padding: 0 2px;';
                        // 이름 부분을 span 태그로 감싸서 스타일 적용
                        const escapedName = window.appState.userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(escapedName, 'g');
                        cellContent = cellContent.replace(regex, `<span style="${highlightStyle}">${window.appState.userName}</span>`);
                    }
                    
                    // 줄바꿈 처리
                    cellContent = cellContent.replace(/\n/g, '<br>');
                    
                    html += `<td id="cell-${rowIndex}-${colIndex}" style="${style}">${cellContent}</td>`;
                });
            }
            
            html += '</tr>';
        });
        
        html += '</table>';
        return html;
    },

    /**
     * 셀의 스타일 속성을 CSS 문자열로 변환합니다.
     * @param {Object} cell 셀 데이터
     * @returns {string} CSS 스타일 문자열
     */
    getCellStyle: function(cell) {
        if (!cell.userEnteredFormat) return '';
        
        const format = cell.userEnteredFormat;
        let style = '';
        let bgColor = 'rgb(255,255,255)'; // 기본 배경색 (흰색)
        
        // 배경색
        if (format.backgroundColor) {
            const { red, green, blue } = format.backgroundColor;
            // 값이 없으면 0으로 처리
            const r = Math.round((red || 0) * 255);
            const g = Math.round((green || 0) * 255);
            const b = Math.round((blue || 0) * 255);
            bgColor = `rgb(${r},${g},${b})`;
            style += `background-color: ${bgColor}; `;
        }
        
        // 테두리 색상을 배경색과 동일하게 설정하여 숨김 처리 (기본값)
        style += `border: 1px solid ${bgColor}; `;

        // 텍스트 서식
        if (format.textFormat) {
            const tf = format.textFormat;
            if (tf.foregroundColor) {
                const { red, green, blue } = tf.foregroundColor;
                const r = Math.round((red || 0) * 255);
                const g = Math.round((green || 0) * 255);
                const b = Math.round((blue || 0) * 255);
                style += `color: rgb(${r},${g},${b}); `;
            }
            if (tf.bold) style += 'font-weight: bold; ';
            if (tf.italic) style += 'font-style: italic; ';
            if (tf.strikethrough) style += 'text-decoration: line-through; ';
            if (tf.fontSize) style += `font-size: ${tf.fontSize}pt; `;
        }
        
        // 정렬
        if (format.horizontalAlignment) {
            let align = format.horizontalAlignment.toLowerCase();
            if (align === 'center') style += 'text-align: center; ';
            else if (align === 'right') style += 'text-align: right; ';
            else style += 'text-align: left; ';
        }
        
        if (format.verticalAlignment) {
            let valign = format.verticalAlignment.toLowerCase();
            if (valign === 'middle') style += 'vertical-align: middle; ';
            else if (valign === 'top') style += 'vertical-align: top; ';
            else style += 'vertical-align: bottom; ';
        }
        
        // 테두리 (명시적으로 설정된 경우 덮어쓰기)
        if (format.borders) {
            const borders = format.borders;
            const getBorderStyle = (border) => {
                if (!border || !border.style) return null; // 스타일이 없으면 null 반환
                
                // 테두리 너비 (스타일에 따라 조정 가능)
                let width = '1px';
                if (border.width) width = `${border.width}px`;
                else if (border.style === 'SOLID_THICK') width = '2px';
                else if (border.style === 'SOLID_MEDIUM') width = '2px';
                
                // 테두리 스타일
                let borderStyle = 'solid';
                if (border.style === 'DOTTED') borderStyle = 'dotted';
                else if (border.style === 'DASHED') borderStyle = 'dashed';
                else if (border.style === 'DOUBLE') borderStyle = 'double';
                
                let color = '#000';
                if (border.color) {
                    const { red, green, blue } = border.color;
                    const r = Math.round((red || 0) * 255);
                    const g = Math.round((green || 0) * 255);
                    const b = Math.round((blue || 0) * 255);
                    color = `rgb(${r},${g},${b})`;
                }
                
                // API에서 기본 색상(검정)을 반환하지 않는 경우가 있어, 
                // 스타일이 있는데 색상이 없으면 검정으로 간주해야 할 수도 있음.
                // 하지만 여기서는 border.color가 있는 경우에만 명시적으로 색상을 적용하고,
                // 그렇지 않으면 기본값(검정)을 사용.
                
                return `${width} ${borderStyle} ${color}`;
            };
            
            // 각 방향별로 테두리 적용 (기본값 덮어쓰기)
            const top = getBorderStyle(borders.top);
            if (top) style += `border-top: ${top} !important; `;
            
            const bottom = getBorderStyle(borders.bottom);
            if (bottom) style += `border-bottom: ${bottom} !important; `;
            
            const left = getBorderStyle(borders.left);
            if (left) style += `border-left: ${left} !important; `;
            
            const right = getBorderStyle(borders.right);
            if (right) style += `border-right: ${right} !important; `;
        }
        
        return style;
    },

    /**
     * 테이블에 병합(colspan, rowspan)을 적용합니다.
     * @param {Array} merges 병합 정보 배열
     */
    applyMerges: function(merges) {
        if (!merges || merges.length === 0) return;
        
        merges.forEach(merge => {
            // startRowIndex, endRowIndex, startColumnIndex, endColumnIndex
            // API 인덱스는 0-based, end는 exclusive
            const startRow = merge.startRowIndex;
            const endRow = merge.endRowIndex;
            const startCol = merge.startColumnIndex;
            const endCol = merge.endColumnIndex;
            
            const rowSpan = endRow - startRow;
            const colSpan = endCol - startCol;
            
            if (rowSpan <= 1 && colSpan <= 1) return;
            
            // 병합 시작 셀 찾기
            const cellId = `cell-${startRow}-${startCol}`;
            const cell = document.getElementById(cellId);
            
            if (cell) {
                if (rowSpan > 1) cell.setAttribute('rowspan', rowSpan);
                if (colSpan > 1) cell.setAttribute('colspan', colSpan);
                
                // 병합된 나머지 셀 숨기기
                for (let r = startRow; r < endRow; r++) {
                    for (let c = startCol; c < endCol; c++) {
                        if (r === startRow && c === startCol) continue; // 시작 셀 제외
                        
                        const hiddenCellId = `cell-${r}-${c}`;
                        const hiddenCell = document.getElementById(hiddenCellId);
                        if (hiddenCell) {
                            hiddenCell.style.display = 'none';
                        }
                    }
                }
            }
        });
    }
};



