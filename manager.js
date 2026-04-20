let adminInfo = JSON.parse(sessionStorage.getItem('adminInfo')) || null;
let weekdayData = []; // Array of objects mapping to 'schedules' table (8 fields)
let deletedIds = [];
let currentWeekFilter = 'all';
let deletedNavIds = [];
let weekendData = [];
let outlines = [];
let deletedWeekendIds = [];
let currentWeekendFilter = 'upcoming';
let adminUsers = [];
let deletedAdminIds = [];

// Focus Management for Weekend Table
let nextFocusTarget = { idx: null, field: null };
const weekendFieldSequence = ['speaker', 'congregation', 'speaker_contact', 'inviter', 'chairman', 'interpreter_name', 'reader', 'prayer'];


document.addEventListener('DOMContentLoaded', () => {
    if (adminInfo) {
        showManagerContent();
    } else {
        showLoginSection();
    }
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('btn-login').addEventListener('click', handleLogin);

    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.removeItem('adminInfo');
        location.reload();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');


            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).style.display = 'flex';

            if (tabId === 'menu-settings') {
                loadNavLinks();
            } else if (tabId === 'weekend-data') {
                loadWeekendData();
            } else if (tabId === 'admin-accounts') {
                loadAdminAccounts();
            }
        });
    });

    // 계정 관�??�벤??리스??
    document.getElementById('btn-add-account').addEventListener('click', addAdminAccountRow);
    document.getElementById('btn-save-accounts').addEventListener('click', saveAdminAccounts);

    // 주말 집회 ?�벤??리스??
    document.getElementById('btn-show-outlines').addEventListener('click', () => {
        const section = document.getElementById('outlines-manager-section');
        section.style.display = (section.style.display === 'flex') ? 'none' : 'flex';
        if (section.style.display === 'flex') loadOutlines();
    });

    document.getElementById('btn-process-outlines').addEventListener('click', processOutlinesBulk);
    document.getElementById('btn-save-weekend').addEventListener('click', saveWeekendData);
    document.getElementById('btn-execute-move').addEventListener('click', executeMove);

    // 주말 검??�?관�?리스??
    document.getElementById('btn-search-weekend').addEventListener('click', loadWeekendData);
    document.getElementById('btn-reset-weekend').addEventListener('click', resetWeekendFilters);
    document.getElementById('btn-delete-selected-weekend').addEventListener('click', deleteSelectedWeekendRows);
    document.getElementById('btn-batch-delete-weekend').addEventListener('click', deleteWeekendByRange);

    // 주말 ?�정 ?�괄 ?�성 버튼
    const btnGenSlots = document.getElementById('btn-generate-slots');
    if (btnGenSlots) {
        btnGenSlots.addEventListener('click', handleBatchGenerate);
    }

    // 주말 집회 ?�터???�동 기능 추�?
    document.getElementById('weekend-data-table').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.target.tagName === 'INPUT')) {
            e.preventDefault();
            const inputs = Array.from(document.querySelectorAll('#weekend-data-table input[type="text"], #weekend-data-table input[type="date"]'));
            const index = inputs.indexOf(e.target);
            if (index > -1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
                // ?�스???�체 ?�택 (?�의??
                if (inputs[index + 1].select) inputs[index + 1].select();
            }
        }
    });

    document.getElementById('check-all-weekend').addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('.check-weekend').forEach(cb => {
            cb.checked = checked;
        });
    });



    document.getElementById('btn-save-data').addEventListener('click', saveData);

    const btnFetchWol = document.getElementById('btn-fetch-wol');
    if (btnFetchWol) {
        btnFetchWol.addEventListener('click', fetchWolData);
    }

    const btnShowManual = document.getElementById('btn-show-manual');
    if (btnShowManual) {
        btnShowManual.addEventListener('click', () => {
            const area = document.getElementById('manual-fetch-area');
            area.style.display = area.style.display === 'none' ? 'flex' : 'none';
        });
    }
    const btnFetchManual = document.getElementById('btn-fetch-manual');
    if (btnFetchManual) {
        btnFetchManual.addEventListener('click', () => {
            const html = document.getElementById('wol-manual-html').value;
            if (!html || !html.trim()) return alert('복사한 텍스트(Ctrl+A, Ctrl+C 후 사용)를 먼저 텍스트 상자에 붙여 넣고 아래에 제공해 주세요.');
            parseWolHtml(html);
        });
    }

    const weekFilter = document.getElementById('week-filter');
    if (weekFilter) {
        weekFilter.addEventListener('change', (e) => {
            currentWeekFilter = e.target.value;
            renderWeekdayTable();
        });
    }

    document.getElementById('btn-add-nav').addEventListener('click', () => {
        navLinks.push({ label: '새 버튼', type: 'internal', target: '평일집회', sort_order: navLinks.length + 1 });
        renderNavLinks();
    });

    document.getElementById('btn-save-nav').addEventListener('click', saveNavLinks);

    document.getElementById('btn-delete-week').addEventListener('click', deleteWeek);
    document.getElementById('btn-delete-past').addEventListener('click', deletePastWeeks);
}

function showLoginSection() {
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('manager-content').style.display = 'none';
}

function showManagerContent() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('manager-content').style.display = 'flex';
    document.getElementById('manager-content').style.flexDirection = 'column';
    document.getElementById('manager-content').style.flex = '1';
    document.getElementById('manager-content').style.overflow = 'hidden';

    // 최고관리자 ?��????�른 ???�출 ?�어
    const isSuper = adminInfo && adminInfo.role === 'superadmin';
    document.getElementById('tab-admin-accounts').style.display = isSuper ? 'inline-block' : 'none';
    document.getElementById('tab-menu-settings').style.display = isSuper ? 'inline-block' : 'none';

    const userInfoEl = document.getElementById('user-info');
    if (userInfoEl) {
        userInfoEl.textContent = `${adminInfo.name} (${adminInfo.role === 'superadmin' ? '최고관리자' : '관리자'})`;
    }

    // 기본 ???�시 (?�일집회 ?�집)
    document.getElementById('weekday-data-tab').style.display = 'flex';

    loadAllData();

    // ?�시�??�속 ?�황 ?�성??
    initPresence();
}

async function handleLogin() {
    const name = document.getElementById('admin-name').value;
    const pw = document.getElementById('admin-pw').value;

    if (!name || !pw) {
        alert('이름과 비밀번호를 입력하세요.');
        return;
    }

    showLoading(true);
    try {
        const { data, error } = await supabaseClient
            .from('admin_users')
            .select('*')
            .eq('username', name)
            .eq('password', pw)
            .single();

        if (data) {
            adminInfo = { name: data.username, role: data.role };
            sessionStorage.setItem('adminInfo', JSON.stringify(adminInfo));
            showManagerContent();
        } else {
            alert('이름 또는 비밀번호가 일치하지 않습니다.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('로그인 중 오류가 발생했습니다.');
    } finally {
        showLoading(false);
    }
}

async function loadAllData() {
    showLoading(true);
    try {
        // Fetch schedules
        const { data: schData, error: schErr } = await supabaseClient
            .from('schedules')
            .select('*')
            .eq('sheet_type', '평일집회')
            .order('sort_order', { ascending: true });

        if (schErr) throw schErr;
        weekdayData = schData || [];
        deletedIds = [];

        renderWeekdayTable();
        updateWeekFilterDropdown();
    } catch (error) {
        console.error('Data load error:', error);
        alert('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
        showLoading(false);
    }
}

function getCategoryOptions(selectedVal) {
    const categories = [
        { val: 'top', label: '상단(성경읽기/첫노래)' },
        { val: 'treasures', label: '성경에 담긴 보물' },
        { val: 'ministry', label: '야외 봉사에 힘쓰십시오' },
        { val: 'living', label: '그리스도인 생활' },
        { val: 'sunday', label: '주말집회' }
    ];
    return categories.map(c => `<option value="${c.val}" ${c.val === selectedVal ? 'selected' : ''}>${c.label}</option>`).join('');
}

function renderWeekdayTable() {
    const thead = document.querySelector('#weekday-data-table thead tr');
    thead.innerHTML = `
        <th style="width:110px;">분류</th>
        <th style="width:100px;">주차</th>
        <th style="width:100px;">부분(예: 1.)</th>
        <th>내용(주제)</th>
        <th style="width:70px;">시간</th>
        <th style="width:70px;">배정1</th>
        <th style="width:70px;">배정2</th>
        <th style="width:50px;">통역</th>
        <th style="width:70px;">-</th>
    `;

    const tbody = document.querySelector('#weekday-data-table tbody');
    tbody.innerHTML = '';

    const displayData = currentWeekFilter === 'all'
        ? weekdayData
        : weekdayData.filter(d => d.week_date === currentWeekFilter);

    displayData.forEach((row) => {
        // Find the actual index in global weekdayData
        const originalIdx = weekdayData.indexOf(row);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><select onchange="updateWeekdayData(${originalIdx}, 'category', this.value)">${getCategoryOptions(row.category)}</select></td>
            <td><input type="text" value="${escapeHtml(row.week_date || '')}" onchange="updateWeekdayData(${originalIdx}, 'week_date', this.value)"></td>
            <td><input type="text" value="${escapeHtml(row.part_num || '')}" onchange="updateWeekdayData(${originalIdx}, 'part_num', this.value)"></td>
            <td><input type="text" value="${escapeHtml(row.content || '')}" onchange="updateWeekdayData(${originalIdx}, 'content', this.value)"></td>
            <td><input type="text" value="${escapeHtml(row.duration || '')}" onchange="updateWeekdayData(${originalIdx}, 'duration', this.value)"></td>
            <td><input type="text" value="${escapeHtml(row.assignee_1 || '')}" onchange="updateWeekdayData(${originalIdx}, 'assignee_1', this.value)"></td>
            <td><input type="text" value="${escapeHtml(row.assignee_2 || '')}" onchange="updateWeekdayData(${originalIdx}, 'assignee_2', this.value)"></td>
            <td><input type="checkbox" ${row.interpreter === 'Y' ? 'checked' : ''} onchange="updateWeekdayData(${originalIdx}, 'interpreter', this.checked ? 'Y' : 'N')" style="width:20px; height:20px; cursor:pointer;"></td>
            <td>
                <div class="action-btn-group">
                    <button class="btn-mini" onclick="insertRow(${originalIdx})" style="background: #00b894;" title="추가"><i class="fas fa-plus"></i></button>
                    <button class="btn-mini" onclick="deleteRow(${originalIdx})" style="background: #d63031;" title="삭제"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateWeekdayData = (idx, field, value) => {
    weekdayData[idx][field] = value;
};

window.deleteRow = (idx) => {
    if (confirm('이 행을 삭제하시겠습니까?')) { 
        const item = weekdayData[idx];
        if (item.id) deletedIds.push(item.id);
        weekdayData.splice(idx, 1);
        renderWeekdayTable();
    }
};

window.insertRow = (idx) => {
    const prevRow = weekdayData[idx];
    const newRow = {
        category: prevRow.category || 'living',
        week_date: prevRow.week_date || '',
        part_num: '',
        content: '',
        duration: '',
        assignee_1: '',
        assignee_2: '',
        interpreter: 'N',
        sheet_type: '평일집회',
        sort_order: 0 // Will be handled on save or fixed locally
    };

    // Insert after current index
    weekdayData.splice(idx + 1, 0, newRow);

    // Recalculate sort orders for all to be safe
    weekdayData.forEach((row, i) => {
        row.sort_order = i + 1;
    });

    renderWeekdayTable();
};

async function fetchWolData() {
    const url = document.getElementById('wol-url-input').value;
    if (!url) return alert('URL을 입력하세요.');

    showLoading(true);
    let html = '';
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        html = await response.text();
    } catch (err1) {
        console.log('corsproxy.io failed, trying fallback...', err1);
        try {
            const fallbackUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
            const response2 = await fetch(fallbackUrl);
            if (!response2.ok) throw new Error(`Fallback HTTP Error: ${response2.status}`);
            html = await response2.text();
        } catch (err2) {
            console.error(err2);
            showLoading(false);
            return alert('목록이 서버가 JW.org 보안에 의해 차단되었습니다. 아래에 있는 [수동 붙여넣기 모드] 버튼을 눌러 수동으로 파싱해주세요.');
        }
    }

    await parseWolHtml(html);
}

async function parseWolHtml(html) {
    showLoading(true);
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        let defaultWeekDate = '';
        const titleElem = doc.querySelector('h1');
        if (titleElem) defaultWeekDate = titleElem.textContent.trim();
        let weekDate = prompt('집회 주간 날짜를 입력하세요.', defaultWeekDate);
        if (!weekDate) { showLoading(false); return; }

        let bibleRange = '';
        const allLinks = doc.querySelectorAll('a');
        for (let i = 0; i < allLinks.length; i++) {
            let href = allLinks[i].getAttribute('href') || '';
            // The first Bible citation link in the WOL meeting page is the weekly reading range
            if (href.includes('/bc/') || href.includes('/b/')) { 
                bibleRange = allLinks[i].textContent.trim();
                break;
            }
        }

        if (!bibleRange) {
            bibleRange = prompt('주간 성경읽기 범위를 파싱하지 못했습니다. 직접 입력해주세요 (예: 이사야 52-53장)', '');
        } else {
            let confirmRange = prompt('자동 추출된 주간 성경읽기 범위입니다. 맞으면 확인(엔터)을 눌러주세요', bibleRange);
            if (confirmRange === null) { showLoading(false); return; }
            bibleRange = confirmRange;
        }

        let newParts = [];
        let sortCounter = (weekdayData.length > 0) ? Math.max(...weekdayData.map(d => d.sort_order || 0)) + 1 : 1;

        // 1. Top - ?�경?�기/기도
        if (bibleRange) {
            newParts.push({ category: 'top', week_date: weekDate, part_num: '', content: bibleRange, duration: '', assignee_1: '', assignee_2: '', interpreter: '', sheet_type: '평일집회', sort_order: sortCounter++ });
        }

        const elements = doc.querySelectorAll('h2, h3, p');
        let currentSection = 'treasures';
        let hasFoundStartSong = false;
        let pendingPart = null;
        let lastSongText = '';

        let lastAddedText = "";
        elements.forEach(el => {
            let text = el.textContent.trim().replace(/\s+/g, ' ');
            if (!text || text === lastAddedText) return;
            lastAddedText = text;

            if (text.includes('성경에 담긴 보물')) { currentSection = 'treasures'; return; }
            if (text.includes('야외 봉사에 힘쓰십시오')) { currentSection = 'ministry'; return; }
            if (text.includes('그리스도인 생활')) { currentSection = 'living'; return; }

            // Title and Top level parsing
            if (text.startsWith('노래') && !text.includes('맺음말') && !hasFoundStartSong && currentSection === 'treasures') {
                hasFoundStartSong = true;

                let cleanText = text;
                let duration = "";

                // Extract duration if present (e.g., "(1�?")
                const durationMatch = cleanText.match(/\(([^)]*?분)\)/);
                if (durationMatch) {
                    duration = durationMatch[0];
                    cleanText = cleanText.replace(duration, "").trim();
                }

                // Deduplicate repetitive phrases
                const prayerSuffix = " 및 기도 | 소개말";
                if (cleanText.includes(prayerSuffix + " " + prayerSuffix)) { 
                    cleanText = cleanText.replace(prayerSuffix + " " + prayerSuffix, prayerSuffix).trim();
                }

                newParts.push({
                    category: 'top',
                    week_date: weekDate,
                    part_num: '',
                    content: cleanText,
                    duration: duration,
                    assignee_1: '', assignee_2: '', interpreter: '',
                    sheet_type: '평일집회',
                    sort_order: sortCounter++
                });
            }
            else if (text.startsWith('노래') && currentSection === 'living' && !text.includes('맺음말')) { 
                if (lastSongText !== text) {
                    newParts.push({ category: 'living', week_date: weekDate, part_num: '', content: text, duration: '', assignee_1: '', assignee_2: '', interpreter: '', sheet_type: '평일집회', sort_order: sortCounter++ });
                    lastSongText = text;
                }
            }
            else {
                // Legacy Regex for combined "1. ?�수께서??.. (10�?"
                let matchCombined = text.match(/^(\d+)\.\s*(.*?)\((.*?분)\)(.*)?$/);
                if (matchCombined) {
                    let partNum = matchCombined[1] + ".";
                    let contentTitle = matchCombined[2].trim();
                    let durationStr = '(' + matchCombined[3] + ')';

                    if (matchCombined[4]) contentTitle += ' ' + matchCombined[4].trim();

                    newParts.push({
                        category: currentSection,
                        week_date: weekDate,
                        part_num: partNum,
                        content: contentTitle,
                        duration: durationStr,
                        assignee_1: '', assignee_2: '', interpreter: '',
                        sheet_type: '평일집회',
                        sort_order: sortCounter++
                    });
                    pendingPart = null;
                }
                else if (text.includes('맺음말') && text.includes('분)')) { 
                    // "맺음�?(3�? | ?�래 130 �?기도"
                    let matchEnd = text.match(/^(.*?)\((.*?분)\)(.*)/);
                    if (matchEnd) {
                        newParts.push({
                            category: 'living',
                            week_date: weekDate,
                            part_num: '맺음말',
                            content: matchEnd[3].replace('|', '').trim(),
                            duration: '(' + matchEnd[2] + ')',
                            assignee_1: '', assignee_2: '', interpreter: '',
                            sheet_type: '평일집회',
                            sort_order: sortCounter++
                        });
                    }
                    pendingPart = null;
                }
                else {
                    // Check if it's JUST the title "1. 예수께서의 이로운 사랑의.." without time
                    let matchTitle = text.match(/^(\d+)\.\s*(.+)/);
                    if (matchTitle && !text.includes('분)')) { 
                        pendingPart = {
                            category: currentSection,
                            week_date: weekDate,
                            part_num: matchTitle[1] + ".",
                            content: matchTitle[2].trim(),
                            duration: '',
                            assignee_1: '', assignee_2: '', interpreter: '',
                            sheet_type: '평일집회',
                            sort_order: sortCounter++
                        };
                        newParts.push(pendingPart);
                    }
                    // Check if we have a pending part and this text contains a time like `(XX�?`
                    else if (pendingPart && text.indexOf('분)') !== -1) {
                        let matchDuration = text.match(/\((.*?분)\)(.*)/);
                        if (matchDuration) {
                            pendingPart.duration = '(' + matchDuration[1] + ')';
                            let extraContent = matchDuration[2].trim();
                            if (extraContent) {
                                pendingPart.content += ' ' + extraContent;
                            }
                            pendingPart = null; // Completed this part
                        }
                    }
                }
            }
        });


        if (newParts.length > 0) {
            weekdayData = [...weekdayData, ...newParts];
            currentWeekFilter = weekDate; // Switch to the newly fetched week
            renderWeekdayTable();
            updateWeekFilterDropdown();
            alert(`${newParts.length}개의 항목이 파싱/배치 되었습니다.\n내부 데이터를 확인하고 반드시 [최종 변경사항 저장]을 누르세요.`);
        } else {
            alert('파싱된 항목이 없습니다.');
        }

    } catch (e) {
        console.error(e);
        alert('스크래핑 중 오류가 발생했습니다.');
    }
    showLoading(false);
}

async function saveData() {
    showLoading(true);
    try {
        if (deletedIds.length > 0) {
            const { error: delErr } = await supabaseClient
                .from('schedules')
                .delete()
                .in('id', deletedIds);
            if (delErr) throw delErr;
            deletedIds = [];
        }

        const toInsert = weekdayData.filter(d => !d.id).map(d => {
            return {
                category: d.category,
                week_date: d.week_date,
                part_num: d.part_num,
                content: d.content,
                duration: d.duration,
                assignee_1: d.assignee_1,
                assignee_2: d.assignee_2,
                interpreter: d.interpreter,
                sheet_type: d.sheet_type,
                sort_order: d.sort_order
            };
        });

        if (toInsert.length > 0) {
            const { error: insErr } = await supabaseClient
                .from('schedules')
                .insert(toInsert);
            if (insErr) throw insErr;
        }

        const toUpdate = weekdayData.filter(d => d.id);
        if (toUpdate.length > 0) {
            const { error: updErr } = await supabaseClient
                .from('schedules')
                .upsert(toUpdate);
            if (updErr) throw updErr;
        }

        alert('데이터가 성공적으로 저장되었습니다.');
        broadcastChange('평일집회');
        loadAllData();
    } catch (error) {
        console.error('Save error:', error);
        alert('저장 중 오류가 발생했습니다.');
    } finally {
        showLoading(false);
    }
}

function broadcastChange(tabType) {
    if (presenceChannel) {
        presenceChannel.send({
            type: 'broadcast',
            event: 'data_saved',
            payload: { adminName: adminInfo.name, tabType: tabType }
        });
    }
}

function showSyncToast(adminName, tabType) {
    const toast = document.createElement('div');
    toast.className = 'sync-toast';
    toast.innerHTML = `
        <div style="background:#fff; padding:15px; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <strong>${adminName}</strong>님이 <strong>${tabType}</strong> 데이터를 업데이트했습니다.
            <button onclick="location.reload()" style="margin-left:10px; cursor:pointer;">지�??�로고침</button>
        </div>
    `;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 10000);
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

function updateWeekFilterDropdown() {
    const filter = document.getElementById('week-filter');
    if (!filter) return;

    // Get unique week dates
    const uniqueWeeks = [...new Set(weekdayData.map(d => d.week_date).filter(w => w))];

    // Custom sort: Use parseWeekDate helper
    uniqueWeeks.sort((a, b) => {
        const dateA = parseWeekDate(a);
        const dateB = parseWeekDate(b);
        if (!dateA || !dateB) return a.localeCompare(b);
        return dateA.start - dateB.start;
    });

    let html = '<option value="all">전체 보기</option>';
    uniqueWeeks.forEach(w => {
        html += `<option value="${w}" ${w === currentWeekFilter ? 'selected' : ''}>${w}</option>`;
    });
    filter.innerHTML = html;
}
async function loadNavLinks() {
    showLoading(true);
    try {
        // Load nav links
        const { data: navData, error: navErr } = await supabaseClient
            .from('navigation_links')
            .select('*')
            .order('sort_order', { ascending: true });

        if (navErr) throw navErr;
        navLinks = navData || [];
        deletedNavIds = [];
        renderNavLinks();

        // Load app settings
        const { data: settingsData, error: settingsErr } = await supabaseClient
            .from('app_settings')
            .select('*')
            .eq('key', 'congregation_name')
            .single();

        if (!settingsErr && settingsData) {
            document.getElementById('congregation-name-input').value = settingsData.value;
        }
    } catch (e) {
        console.error('Error loading menu settings:', e);
    }
    showLoading(false);
}

function renderNavLinks() {
    const tbody = document.querySelector('#nav-links-table tbody');
    tbody.innerHTML = '';

    navLinks.forEach((link, index) => {
        const tr = document.createElement('tr');

        // ?�재 ?�이???�태�?바탕?�로 UI ?�???�별
        let uiType = 'external';
        if (link.type === 'internal') {
            if (link.target === '평일집회') uiType = 'weekday';
            else if (link.target === '주말집회') uiType = 'weekend';
            else uiType = 'external'; // 외부 링크
        }

        const isPreset = (uiType === 'weekday' || uiType === 'weekend');

        tr.innerHTML = `
            <td><input type="text" value="${escapeHtml(link.label)}" onchange="updateNavLink(${index}, 'label', this.value)"></td>
            <td>
                <select onchange="handleNavTypeChange(${index}, this.value)">
                    <option value="weekday" ${uiType === 'weekday' ? 'selected' : ''}>평일집회</option>
                    <option value="weekend" ${uiType === 'weekend' ? 'selected' : ''}>주말집회</option>
                    <option value="external" ${uiType === 'external' ? 'selected' : ''}>외부링크</option>
                </select>
            </td>
            <td>
                <input type="text" 
                    value="${escapeHtml(link.target)}" 
                    placeholder="${isPreset ? '자동 지정됨' : 'https://...'}" 
                    onchange="updateNavLink(${index}, 'target', this.value)"
                    ${isPreset ? 'disabled style="background:#f1f2f6; color:#777;"' : ''}>
            </td>
            <td><input type="number" value="${link.sort_order}" style="width:60px; padding:6px;" onchange="updateNavLink(${index}, 'sort_order', parseInt(this.value))"></td>
            <td style="text-align:center;"><span class="btn-delete" onclick="deleteNavLink(${index})"><i class="fas fa-trash"></i></span></td>
        `;
        tbody.appendChild(tr);
    });
}

window.handleNavTypeChange = (index, uiValue) => {
    const link = navLinks[index];
    if (uiValue === 'weekday') {
        link.type = 'internal';
        link.target = '평일집회';
    } else if (uiValue === 'weekend') {
        link.type = 'internal';
        link.target = '주말집회';
    } else {
        link.type = 'external';
        link.target = ''; // ?��? 링크 ?�택 ??비�?
    }
    renderNavLinks();
};


function updateNavLink(index, field, value) {
    navLinks[index][field] = value;
}

function deleteNavLink(index) {
    if (!confirm('이 버튼을 삭제하시겠습니까?')) return;
    const link = navLinks[index];
    if (link.id) deletedNavIds.push(link.id);
    navLinks.splice(index, 1);
    renderNavLinks();
}

async function saveNavLinks() {
    showLoading(true);
    try {
        // 1. Save Congregation Name
        const congName = document.getElementById('congregation-name-input').value;
        const { error: settingsErr } = await supabaseClient
            .from('app_settings')
            .upsert({ key: 'congregation_name', value: congName, updated_at: new Date() });

        if (settingsErr) throw settingsErr;

        // 2. Delete Nav Links
        if (deletedNavIds.length > 0) {
            await supabaseClient.from('navigation_links').delete().in('id', deletedNavIds);
        }

        // 3. Save Nav Links (Split into Update and Insert to avoid ID null issues)
        const updates = navLinks.filter(l => l.id).map(l => ({
            id: l.id,
            label: l.label,
            type: l.type,
            target: l.target,
            sort_order: l.sort_order
        }));

        const inserts = navLinks.filter(l => !l.id).map(l => ({
            label: l.label,
            type: l.type,
            target: l.target,
            sort_order: l.sort_order
        }));

        if (updates.length > 0) {
            const { error: upErr } = await supabaseClient.from('navigation_links').upsert(updates);
            if (upErr) throw upErr;
        }
        if (inserts.length > 0) {
            const { error: inErr } = await supabaseClient.from('navigation_links').insert(inserts);
            if (inErr) throw inErr;
        }

        alert('메뉴 설정이 저장되었습니다.');
        await loadNavLinks();
    } catch (e) {
        console.error(e);
        alert('메뉴 설정 저장 중 오류 발생: ' + e.message);
    }
    showLoading(false);
}

// --- ??�씪 吏묓???곗씠??????濡쒖�?---

function deleteWeek() {
    if (currentWeekFilter === 'all') {
        alert('삭제할 특정 주차를 선택해 주세요.');
        return;
    }

    if (!confirm(`${currentWeekFilter} 주차의 모든 데이터를 삭제하시겠습니까? (삭제 버튼을 눌러야 최종 반영됩니다)`)) return;

    // Find matching items
    const toDelete = weekdayData.filter(d => d.week_date === currentWeekFilter);
    toDelete.forEach(item => {
        if (item.id) deletedIds.push(item.id);
    });

    // Remove from local list
    weekdayData = weekdayData.filter(d => d.week_date !== currentWeekFilter);

    currentWeekFilter = 'all';
    renderWeekdayTable();
    updateWeekFilterDropdown();
    alert('삭제되었습니다. 변경사항을 서버에 반영하려면 [최종 변경사항 저장] 버튼을 눌러주세요.');
}

function deletePastWeeks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueWeeks = [...new Set(weekdayData.map(d => d.week_date).filter(w => w))];
    const pastWeeks = uniqueWeeks.filter(w => {
        const parsed = parseWeekDate(w);
        // If the week ended before today, it's a past week
        return parsed && parsed.end < today;
    });

    if (pastWeeks.length === 0) {
        alert('삭제할 지난 계획서가 없습니다.');
        return;
    }

    if (!confirm(`지난 기간 모든 주차의 데이터를 모두 삭제하시겠습니까? (삭제 버튼을 눌러야 최종 반영됩니다)`)) return;

    pastWeeks.forEach(weekStr => {
        const toDelete = weekdayData.filter(d => d.week_date === weekStr);
        toDelete.forEach(item => {
            if (item.id) deletedIds.push(item.id);
        });
        weekdayData = weekdayData.filter(d => d.week_date !== weekStr);
    });

    currentWeekFilter = 'all';
    renderWeekdayTable();
    updateWeekFilterDropdown();
    alert(`${pastWeeks.length}개 주차의 데이터가 삭제되었습니다. [최종 변경사항 저장] 버튼을 눌러주세요.`);
}
async function loadWeekendData() {
    showLoading(true);
    try {
        const { data: outData } = await supabaseClient.from('public_talk_outlines').select('*');
        outlines = outData || [];

        // 검???�터 �??�집
        const dateFromVal = document.getElementById('search-date-from')?.value;
        const outlineNoVal = document.getElementById('search-outline-no')?.value;
        const keywordVal = document.getElementById('search-keyword')?.value;

        // ?�성 ?�구 기본�??�정 (?�이지 처음 방문 ???�늘 ~ 1?�뒤 ?�안)
        const startInput = document.getElementById('gen-start-date');
        const endInput = document.getElementById('gen-end-date');
        if (startInput && !startInput.value) {
            const now = new Date();
            const yearAhead = new Date();
            yearAhead.setFullYear(now.getFullYear() + 1);

            startInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            endInput.value = `${yearAhead.getFullYear()}-${String(yearAhead.getMonth() + 1).padStart(2, '0')}-${String(yearAhead.getDate()).padStart(2, '0')}`;
        }

        // ?�이???�치 쿼리 구성
        let query = supabaseClient.from('public_talks').select('*').order('meeting_date', { ascending: true });

        // ?�짜 ?�터 (?�으�??�늘 ?�후 기본)
        if (dateFromVal) {
            query = query.gte('meeting_date', dateFromVal);
        } else {
            const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
            query = query.gte('meeting_date', todayStr);
        }

        // 골자 번호 ?�터
        if (outlineNoVal) {
            query = query.eq('outline_no', outlineNoVal);
        }

        // ?�word ?�터 (?�사, 주제, ?�중 �??�나?�도 ?�치)
        if (keywordVal) {
            query = query.or(`speaker.ilike.%${keywordVal}%,topic.ilike.%${keywordVal}%,congregation.ilike.%${keywordVal}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        weekendData = data || [];
        deletedWeekendIds = [];
        renderWeekendTable();

        if (weekendData.length === 0) {
            // ?�터 ?�이 조회?�는?�도 ?�다�??�정 ?�체가 ?�는 �?
            const hasFilters = dateFromVal || outlineNoVal || keywordVal;
            if (hasFilters) {
                console.log('검??조건??맞는 결과가 ?�습?�다.');
            } else {
                console.log('?�시???�정???�습?�다. ?�단??[???�정 ?�성] ?�구�??�정??만들??주세??');
            }
        }
    } catch (e) {
        console.error(e);
        alert('주말 데이터를 불러오는 중 오류 발생');
    }
    showLoading(false);
}

function resetWeekendFilters() {
    document.getElementById('search-date-from').value = '';
    document.getElementById('search-outline-no').value = '';
    document.getElementById('search-keyword').value = '';
    loadWeekendData();
}


async function deleteWeekendByRange() {
    const start = prompt('삭제할 기간의 시작 날짜를 입력하세요 (예: 2023-01-01)');
    if (!start) return;
    const end = prompt('삭제할 기간의 종료 날짜를 입력하세요 (예: 2023-12-31)');
    if (!end) return;

    if (!confirm(`${start} 부터 ${end} 까지의 모든 주말 일정을 시스템에서 완전히 삭제합니다.\n이 작업은 복구할 수 없습니다. 계속하시겠습니까?`)) { 
        return;
    }

    showLoading(true);
    try {
        const { count, error: countError } = await supabaseClient
            .from('public_talks')
            .select('*', { count: 'exact', head: true })
            .gte('meeting_date', start)
            .lte('meeting_date', end);

        if (countError) throw countError;

        if (count === 0) {
            alert('해당 기간에 삭제할 데이터가 없습니다.');
            showLoading(false);
            return;
        }

        if (!confirm(`총 ${count}개의 일정이 검색되었습니다. 정말로 모두 영구 삭제하시겠습니까?`)) { 
            showLoading(false);
            return;
        }

        const { error: delError } = await supabaseClient
            .from('public_talks')
            .delete()
            .gte('meeting_date', start)
            .lte('meeting_date', end);

        if (delError) throw delError;

        alert(`${count}개의 일정이 성공적으로 삭제되었습니다.`);
        loadWeekendData();
    } catch (e) {
        console.error(e);
        alert('일괄 삭제 중 오류가 발생했습니다.');
    }
    showLoading(false);
}

async function deleteSelectedWeekendRows() {
    const checkedBoxes = Array.from(document.querySelectorAll('.check-weekend:checked'));
    if (checkedBoxes.length === 0) {
        alert('삭제할 항목을 먼저 선택하세요.');
        return;
    }

    if (!confirm(`선택한 ${checkedBoxes.length}개의 일정(날짜 포함)을 시스템에서 완전히 삭제하시겠습니까?\n이 작업은 복구할 수 복구할 수 없습니다.`)) { 
        return;
    }

    showLoading(true);
    try {
        const idsToDelete = checkedBoxes.map(cb => cb.getAttribute('data-id')).filter(id => id);

        if (idsToDelete.length > 0) {
            const { error } = await supabaseClient.from('public_talks').delete().in('id', idsToDelete);
            if (error) throw error;
        }

        // 로컬 ?�이?�에?�도 ?�거 (ID가 ?�는 ?�규 ??처리 ?�함)
        // ?�실 가??깔끔??�??�시 로드?�는 �?
        alert(`선택한 ${checkedBoxes.length}개의 항목이 성공적으로 삭제되었습니다.`);
        loadWeekendData();
    } catch (e) {
        console.error(e);
        alert('선택 삭제 중 오류가 발생했습니다.');
    }
    showLoading(false);
}

async function handleBatchGenerate() {
    const start = document.getElementById('gen-start-date').value;
    const end = document.getElementById('gen-end-date').value;
    const day = parseInt(document.getElementById('gen-target-day').value);

    if (!start || !end) {
        alert('시작일과 종료일을 입력해주세요.');
        return;
    }

    const dayName = day === 0 ? '일요일' : '토요일';
    if (!confirm(`${start} ~ ${end} 기간 내의 모든 ${dayName} 빈 일정을 생성하시겠습니까?`)) return;

    showLoading(true);
    try {
        const count = await syncWeekendSlots(start, end, day);
        alert(`${count}개의 일정이 생성되었습니다.`);
        loadWeekendData();
    } catch (e) {
        console.error(e);
        alert('일정 생성 중 오류가 발생했습니다.');
    }
    showLoading(false);
}

async function syncWeekendSlots(startDateStr, endDateStr, targetDayOfWeek) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    // ?�작?��???종료?�까지 ?�당 ?�일???�짜?�을 리스?�업
    const dates = [];
    let current = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0);

    // 가??가까운 ?�???�일�??�동
    let diff = (targetDayOfWeek + 7 - current.getDay()) % 7;
    current.setDate(current.getDate() + diff);

    while (current <= end) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);

        current.setDate(current.getDate() + 7);
    }

    if (dates.length === 0) return 0;

    // 기존 ?�이???�인 (?�짜 중복 방�?)
    const { data: existing } = await supabaseClient
        .from('public_talks')
        .select('meeting_date')
        .gte('meeting_date', dates[0])
        .lte('meeting_date', dates[dates.length - 1]);

    const existingDates = new Set(existing?.map(d => d.meeting_date) || []);
    const toInsert = dates.filter(d => !existingDates.has(d)).map(d => ({
        meeting_date: d,
        is_published: true
    }));

    if (toInsert.length > 0) {
        const { error } = await supabaseClient.from('public_talks').insert(toInsert);
        if (error) throw error;
    }
    return toInsert.length;
}

async function loadOutlines() {
    const { data } = await supabaseClient.from('public_talk_outlines').select('*').order('outline_no', { ascending: true });
    outlines = data || [];
}

function renderWeekendTable() {
    const tbody = document.querySelector('#weekend-data-table tbody');
    tbody.innerHTML = '';

    weekendData.forEach((row, idx) => {
        const tr = document.createElement('tr');
        const outlineTopic = outlines.find(o => o.outline_no === row.outline_no)?.topic || '';

        // ?�짜 ?�식 변??(YY/MM/DD)
        const d = new Date(row.meeting_date);
        const dateDisplay = isNaN(d) ? '' : `${String(d.getFullYear()).slice(-2)}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

        // 중복 ?��????�른 ?�상 ?�용 (주황: #FFA500, ?�한 주황: #FFCC99)
        let bgColor = '';
        if (row._dupStatus === '6month') bgColor = 'background-color: #FFA500;';
        else if (row._dupStatus === '12month') bgColor = 'background-color: #FFCC99;';

        tr.style = bgColor;

        tr.innerHTML = `
            <td style="text-align:center;"><input type="checkbox" class="check-weekend" data-id="${row.id || ''}"></td>
            <td style="text-align:center;">
                <div class="weekend-date-form">
                    <span class="weekend-date-display">${dateDisplay}</span>
                    <input type="date" value="${row.meeting_date || ''}" onchange="updateWeekendData(${idx}, 'meeting_date', this.value)" onclick="if(this.showPicker) this.showPicker()">
                </div>
            </td>
            <td><input type="text" data-idx="${idx}" data-field="outline_no" value="${row.outline_no || ''}" onchange="handleOutlineChange(${idx}, this.value)" placeholder="번호" style="border:none; background:transparent; text-align:center;"></td>
            <td><input type="text" data-idx="${idx}" data-field="topic" value="${row.topic || outlineTopic}" onchange="updateWeekendData(${idx}, 'topic', this.value)" placeholder="주제" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="speaker" value="${row.speaker || ''}" onchange="updateWeekendData(${idx}, 'speaker', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="congregation" value="${row.congregation || ''}" onchange="updateWeekendData(${idx}, 'congregation', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="speaker_contact" value="${row.speaker_contact || ''}" onchange="updateWeekendData(${idx}, 'speaker_contact', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="inviter" value="${row.inviter || ''}" onchange="updateWeekendData(${idx}, 'inviter', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="chairman" value="${row.chairman || ''}" onchange="updateWeekendData(${idx}, 'chairman', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="interpreter_name" value="${row.interpreter_name || ''}" onchange="updateWeekendData(${idx}, 'interpreter_name', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="reader" value="${row.reader || ''}" onchange="updateWeekendData(${idx}, 'reader', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="prayer" value="${row.prayer || ''}" onchange="updateWeekendData(${idx}, 'prayer', this.value)" style="border:none; background:transparent;"></td>
            <td>
                <div class="action-btn-group">
                    <button onclick="openMoveModal(${idx})" class="btn-mini" style="background:#0984e3;" title="데이터 이동"><i class="fas fa-arrow-right"></i></button>
                    <button onclick="addWeekendRow(${idx})" class="btn-mini" style="background:#00b894;" title="추가"><i class="fas fa-plus"></i></button>
                    <button class="btn-mini" onclick="clearWeekendRow(${idx})" style="background:#d63031;" title="내용 초기화"><i class="fas fa-eraser"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Handle next focus after render
    if (nextFocusTarget.idx !== null && nextFocusTarget.field !== null) {
        const targetInput = document.querySelector(`input[data-idx="${nextFocusTarget.idx}"][data-field="${nextFocusTarget.field}"]`);
        if (targetInput) {
            targetInput.focus();
            if (targetInput.select) targetInput.select();
        }
        nextFocusTarget = { idx: null, field: null };
    }
}

window.updateWeekendData = (idx, field, value) => {
    weekendData[idx][field] = value;

    // Set next focus target in sequence
    const currentSeqIdx = weekendFieldSequence.indexOf(field);
    if (currentSeqIdx !== -1 && currentSeqIdx < weekendFieldSequence.length - 1) {
        nextFocusTarget = { idx, field: weekendFieldSequence[currentSeqIdx + 1] };
    }

    renderWeekendTable();
};

async function handleOutlineChange(idx, val) {
    if (!val) {
        weekendData[idx].outline_no = '';
        weekendData[idx].topic = '';
        weekendData[idx]._dupStatus = null;
        renderWeekendTable();
        return;
    }

    weekendData[idx].outline_no = val;

    // 주제 ?�동 ?�성
    const found = outlines.find(o => o.outline_no === val);
    if (found) {
        weekendData[idx].topic = found.topic;
    }
    
    // Auto-advance focus to speaker after outline (skipping topic)
    nextFocusTarget = { idx, field: 'speaker' };


    // 중복 체크 기�? ?�짜 (?�의 ?�짜가 ?�으�??�늘 기�?)
    let meetingDate = new Date(weekendData[idx].meeting_date);
    if (isNaN(meetingDate)) meetingDate = new Date();

    // 1. 로컬 ?�이???�재 ?�면 목록) ??중복 검??
    const localDup = weekendData.find((d, i) => i !== idx && d.outline_no === val && d.meeting_date);
    if (localDup) {
        const dupDate = new Date(localDup.meeting_date);
        const diffMonths = (meetingDate - dupDate) / (1000 * 60 * 60 * 24 * 30);

        if (Math.abs(diffMonths) <= 6) {
            alert(`[경고] 현재 목록의 ${localDup.meeting_date} 일정과 골자가 중복됩니다. (6개월 내)\n강제로 입력하지만 주황색으로 표시됩니다.`);
            weekendData[idx]._dupStatus = '6month';
            renderWeekendTable();
            return;
        } else if (Math.abs(diffMonths) <= 12) {
            if (confirm(`[주의] 현재 목록의 ${localDup.meeting_date} 일정과 골자가 중복됩니다. (12개월 내)\n계속 입력하시겠습니까?`)) { 
                weekendData[idx]._dupStatus = '12month';
                renderWeekendTable();
                return;
            } else {
                weekendData[idx].outline_no = '';
                weekendData[idx].topic = '';
                weekendData[idx]._dupStatus = null;
                renderWeekendTable();
                return;
            }
        }
    }

    // 2. DB ?�이???�버 ?�?�분) 중복 체크
    const sixMonthsAgo = new Date(meetingDate);
    sixMonthsAgo.setMonth(meetingDate.getMonth() - 6);
    const twelveMonthsAgo = new Date(meetingDate);
    twelveMonthsAgo.setMonth(meetingDate.getMonth() - 12);

    try {
        const { data: dups } = await supabaseClient
            .from('public_talks')
            .select('meeting_date, speaker')
            .eq('outline_no', val)
            .neq('id', weekendData[idx].id || '00000000-0000-0000-0000-000000000000') // ?�기 ?�신 ?�외
            .gte('meeting_date', twelveMonthsAgo.toISOString().split('T')[0])
            .lte('meeting_date', meetingDate.toISOString().split('T')[0]);

        if (dups && dups.length > 0) {
            const lastUsed = dups.sort((a, b) => new Date(b.meeting_date) - new Date(a.meeting_date))[0];
            const lastDate = new Date(lastUsed.meeting_date);

            if (lastDate >= sixMonthsAgo) {
                alert(`[경고] 서버 기록의 ${lastUsed.meeting_date} (${lastUsed.speaker || '정보없음'}) 일정과 중복됩니다. (6개월 내)\n주황색으로 표시됩니다.`);
                weekendData[idx]._dupStatus = '6month';
            } else {
                if (confirm(`[주의] 서버 기록의 ${lastUsed.meeting_date} (${lastUsed.speaker || '정보없음'}) 일정과 중복됩니다. (12개월 내)\n계속 입력하시겠습니까?`)) { 
                    weekendData[idx]._dupStatus = '12month';
                } else {
                    weekendData[idx].outline_no = '';
                    weekendData[idx].topic = '';
                    weekendData[idx]._dupStatus = null;
                }
            }
        } else {
            weekendData[idx]._dupStatus = null;
        }
    } catch (e) {
        console.error('Duplicate check error:', e);
    }

    renderWeekendTable();
}

let moveSourceIdx = null;

function openMoveModal(idx) {
    moveSourceIdx = idx;
    const source = weekendData[idx];
    document.getElementById('move-source-info').textContent = `${source.meeting_date} 데이터를 어디로 이동할까요?`;

    const targetSelect = document.getElementById('move-target-select');
    targetSelect.innerHTML = '';

    // 미래??�??�짜??리스?�업 (?�요??목록)
    weekendData.forEach((d, i) => {
        if (i !== idx) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${d.meeting_date} ${d.speaker ? '(' + d.speaker + ')' : '(미입력)'}`;
            targetSelect.appendChild(option);
        }
    });

    document.getElementById('move-data-modal').style.display = 'flex';
}

function closeMoveModal() {
    document.getElementById('move-data-modal').style.display = 'none';
}

async function executeMove() {
    const targetIdx = parseInt(document.getElementById('move-target-select').value);
    if (isNaN(targetIdx)) return;

    const source = weekendData[moveSourceIdx];
    const target = weekendData[targetIdx];

    if (target.speaker && !confirm('해당 날짜에 이미 데이터가 있습니다. 덮어씌울까요?')) return;

    // ?�이???�동 (골자 ~ 초�???
    const fields = ['outline_no', 'topic', 'speaker', 'congregation', 'speaker_contact', 'inviter'];
    fields.forEach(f => {
        target[f] = source[f];
        source[f] = '';
    });

    alert(`${source.meeting_date} 에서 ${target.meeting_date} 로 데이터가 이동했습니다.\n[최종 변경사항 저장]을 눌러야 서버에 반영됩니다.`);
    closeMoveModal();
    renderWeekendTable();
}

window.clearWeekendRow = (idx) => {
    if (!confirm('이 행의 내용을 초기화하시겠습니까? (날짜는 보존)')) return;
    const row = weekendData[idx];
    const fields = ['outline_no', 'topic', 'speaker', 'congregation', 'speaker_contact', 'inviter', 'chairman', 'interpreter_name', 'reader', 'prayer'];
    fields.forEach(f => row[f] = '');
    row._dupStatus = null;
    renderWeekendTable();
};

function addWeekendRow(idx) {
    // ?�전 ?�의 ?�짜�?기본값으�??�용 (?�으�?�?�?
    const baseDate = (typeof idx === 'number' && weekendData[idx]) ? weekendData[idx].meeting_date : '';

    const newRow = {
        meeting_date: baseDate,
        outline_no: '',
        topic: '',
        speaker: '',
        congregation: '',
        speaker_contact: '',
        inviter: '',
        chairman: '',
        interpreter_name: '',
        reader: '',
        prayer: '',
        is_published: true
    };

    if (typeof idx === 'number') {
        weekendData.splice(idx + 1, 0, newRow);
    } else {
        weekendData.push(newRow);
    }
    renderWeekendTable();
}

async function saveWeekendData() {
    showLoading(true);
    try {
        if (deletedWeekendIds.length > 0) {
            await supabaseClient.from('public_talks').delete().in('id', deletedWeekendIds);
            deletedWeekendIds = [];
        }

        const toInsert = weekendData.filter(d => !d.id).map(d => ({
            meeting_date: d.meeting_date,
            outline_no: d.outline_no || null,  // �?문자?��? null�?(FK ?�약 조건)
            topic: d.topic || null,
            speaker: d.speaker || null,
            congregation: d.congregation || null,
            speaker_contact: d.speaker_contact || null,
            inviter: d.inviter || null,
            chairman: d.chairman || null,
            interpreter_name: d.interpreter_name || null,
            reader: d.reader || null,
            prayer: d.prayer || null,
            is_published: d.is_published !== false
        }));

        const toUpdate = weekendData.filter(d => d.id).map(d => ({
            id: d.id,
            meeting_date: d.meeting_date,
            outline_no: d.outline_no || null,  // �?문자?��? null�?(FK ?�약 조건)
            topic: d.topic || null,
            speaker: d.speaker || null,
            congregation: d.congregation || null,
            speaker_contact: d.speaker_contact || null,
            inviter: d.inviter || null,
            chairman: d.chairman || null,
            interpreter_name: d.interpreter_name || null,
            reader: d.reader || null,
            prayer: d.prayer || null,
            is_published: d.is_published !== false
        }));

        // id가 ?�는 ???? meeting_date가 ?��? DB???�으�?update, ?�으�?insert (충돌 방�?)
        if (toInsert.length > 0) {
            const { error } = await supabaseClient
                .from('public_talks')
                .upsert(toInsert, { onConflict: 'meeting_date', ignoreDuplicates: false });
            if (error) throw error;
        }
        if (toUpdate.length > 0) {
            const { error } = await supabaseClient.from('public_talks').upsert(toUpdate);
            if (error) throw error;
        }

        alert('주말 데이터가 성공적으로 저장되었습니다.');
        broadcastChange('주말집회');
        loadWeekendData();
    } catch (e) {
        console.error(e);
        alert('저장 중 오류 발생');
    }
    showLoading(false);
}

// --- 강연 골자 ?�괄 관�?로직 ---
async function processOutlinesBulk() {
    const input = document.getElementById('outlines-bulk-input').value;
    if (!input.trim()) return alert('텍스트를 입력하세요.');

    const lines = input.split('\n');
    const parsed = [];
    const resultEl = document.getElementById('outlines-sync-result');
    resultEl.style.display = 'block';
    resultEl.innerHTML = '<span style="color:#0984e3;">분석 �?..</span>';

    lines.forEach(line => {
        // ?�연???�규?�현?? "1. ?�목", "1 주제", "1-주제", "01. 주제" ??지??
        const match = line.trim().match(/^(\d+)[.\-\s\t]+(.+)$/);
        if (match) {
            parsed.push({ outline_no: match[1], topic: match[2].trim() });
        }
    });

    if (parsed.length === 0) {
        resultEl.innerHTML = '<span style="color:#d63031;">분석할 데이터가 없습니다. 형식을 확인해주세요. (예: 1. 제목)</span>';
        return;
    }

    if (!confirm(`${parsed.length}개의 골자를 분석했습니다. DB에 동기화하시겠습니까?\n(기존 번호는 업데이트하고, 새 번호는 추가합니다)`)) return;

    showLoading(true);
    try {
        const { error } = await supabaseClient.from('public_talk_outlines').upsert(parsed);
        if (error) throw error;

        resultEl.innerHTML = `<span style="color:#00b894; font-weight:bold;">성공: ${parsed.length}개의 골자가 동기화되었습니다.</span>`;
        await loadOutlines();
        // 주말 ?�이�??�더링을 ?�시 ?�출?�여 ?�동 ?�성???�이??갱신
        renderWeekendTable();
    } catch (e) {
        console.error(e);
        resultEl.innerHTML = '<span style="color:#d63031;">?�류 발생: ' + e.message + '</span>';
    }
    showLoading(false);
}

// --- 계정 관�?로직 (최고관리자 ?�용) ---

async function loadAdminAccounts() {
    if (adminInfo.role !== 'superadmin') return;

    showLoading(true);
    try {
        const { data, error } = await supabaseClient
            .from('admin_users')
            .select('*')
            .order('username', { ascending: true });

        if (error) throw error;
        adminUsers = data || [];
        deletedAdminIds = [];
        renderAdminAccountsTable();
    } catch (e) {
        console.error(e);
        alert('계정 정보를 불러오는 중 오류 발생');
    }
    showLoading(false);
}

function renderAdminAccountsTable() {
    const tbody = document.querySelector('#admin-accounts-table tbody');
    tbody.innerHTML = '';

    adminUsers.forEach((user, idx) => {
        const tr = document.createElement('tr');

        // 최고관리자 본인 계정?� ??�� 불�? 처리 권장
        const isSelf = user.username === adminInfo.name;

        tr.innerHTML = `
            <td><input type="text" value="${escapeHtml(user.username)}" onchange="updateAdminUserData(${idx}, 'username', this.value)" ${isSelf ? 'disabled' : ''}></td>
            <td><input type="text" value="${escapeHtml(user.password)}" onchange="updateAdminUserData(${idx}, 'password', this.value)"></td>
            <td>
                <select onchange="updateAdminUserData(${idx}, 'role', this.value)">
                    <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''}>최고관리자</option>
                    <option value="admin" ${user.role !== 'superadmin' ? 'selected' : ''}>일반관리자</option>
                </select>
            </td>
            <td style="text-align:center;">
                ${isSelf ? '-' : `<span class="btn-delete" onclick="deleteAdminAccount(${idx})"><i class="fas fa-trash"></i></span>`}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateAdminUserData = (idx, field, value) => {
    adminUsers[idx][field] = value;
};

window.deleteAdminAccount = (idx) => {
    if (!confirm('이 계정을 삭제하시겠습니까?')) return;
    const user = adminUsers[idx];
    if (user.id) deletedAdminIds.push(user.id);
    adminUsers.splice(idx, 1);
    renderAdminAccountsTable();
};

function addAdminAccountRow() {
    adminUsers.push({
        username: '',
        password: '',
        role: 'admin'
    });
    renderAdminAccountsTable();
}

async function saveAdminAccounts() {
    showLoading(true);
    try {
        // 1. ??�� 처리
        if (deletedAdminIds.length > 0) {
            await supabaseClient.from('admin_users').delete().in('id', deletedAdminIds);
            deletedAdminIds = [];
        }

        // 2. ?�규/?�정 처리
        const toInsert = adminUsers.filter(u => !u.id);
        const toUpdate = adminUsers.filter(u => u.id);

        if (toInsert.length > 0) {
            const { error } = await supabaseClient.from('admin_users').insert(toInsert);
            if (error) throw error;
        }
        if (toUpdate.length > 0) {
            const { error } = await supabaseClient.from('admin_users').upsert(toUpdate);
            if (error) throw error;
        }

        alert('계정 정보가 성공적으로 저장되었습니다.');
        await loadAdminAccounts();
    } catch (e) {
        console.error(e);
        alert('저장 중 오류 발생');
    }
    showLoading(false);
}
// --- ?�시�??�속 ?�황(Presence) 관??로직 ---
let presenceChannel = null;

function initPresence() {
    if (!adminInfo || !adminInfo.name) return;

    // 기존 채널???�으�??�리
    if (presenceChannel) {
        supabaseClient.removeChannel(presenceChannel);
    }

    // 채널 ?�성 �?구독 (관??주제: manager_presence)
    presenceChannel = supabaseClient.channel('manager_presence');

    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            updatePresenceUI(state);
        })
        .on('broadcast', { event: 'data_saved' }, ({ payload }) => {
            showSyncToast(payload.adminName, payload.tabType);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // ???�보 ?�래???�작
                await presenceChannel.track({
                    name: adminInfo.name,
                    online_at: new Date().toISOString(),
                });
            }
        });
}

function updatePresenceUI(state) {
    const listElement = document.getElementById('active-admins-list');
    if (!listElement) return;

    const activeUserNames = [];
    const uniqueUserNames = new Set();

    // ?�속 중인 모든 ?�용???�집 (중복 ?�거)
    for (const key in state) {
        state[key].forEach(presence => {
            if (presence.name) uniqueUserNames.add(presence.name);
        });
    }

    uniqueUserNames.forEach(name => {
        if (name === adminInfo.name) {
            activeUserNames.push(`${name}(나)`);
        } else {
            activeUserNames.push(name);
        }
    });

    if (activeUserNames.length > 0) {
        listElement.textContent = `현재 접속 중: ${activeUserNames.join(', ')}`;
    } else {
        listElement.textContent = '현재 접속 중: 아무도 없음..';
    }
}

// --- ?�시�??�???�림 �??�기??구현 ---
function broadcastChange(tabType) {
    if (presenceChannel) {
        presenceChannel.send({
            type: 'broadcast',
            event: 'data_saved',
            payload: {
                adminName: adminInfo.name,
                tabType: tabType
            }
        });
    }
}

function showSyncToast(adminName, tabType) {
    const toast = document.getElementById('sync-toast');
    const msg = document.getElementById('sync-toast-msg');
    const btn = document.getElementById('btn-sync-now');

    if (!toast || !msg || !btn) return;

    msg.innerHTML = `방금 <b>${adminName}</b> 관리자가 <b>${tabType}</b>에서 저장했습니다.`;
    toast.style.display = 'flex';

    // ?�데?�트 버튼 ?�릭 ??처리
    btn.onclick = () => {
        if (confirm('최신 데이터를 불러오시겠습니까? 현재까지 저장하지 않은 작업 내용은 소실됩니다.')) { 
            loadAllData();
            toast.style.display = 'none';
        }
    };

    // 10�????�동 ?�라�?(?�택 ?�항)
    setTimeout(() => {
        if (toast.style.display === 'flex') {
            toast.style.display = 'none';
        }
    }, 10000);
}

