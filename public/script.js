const form = document.getElementById('e1-form');
const recordList = document.getElementById('record-list');
const formStatus = document.getElementById('form-status');
const recordSearch = document.getElementById('record-search');
const childrenList = document.getElementById('children-list');
const otherBeneficiariesList = document.getElementById('other-beneficiaries-list');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleLabel = document.getElementById('theme-toggle-label');

let editingId = null;
const firstNames = ['Miguel', 'Maria', 'Juan', 'Teresa', 'Paolo', 'Isabella', 'Rafael', 'Carmen', 'Luisa', 'Antonio', 'Elena', 'Jose'];
const lastNames = ['Santos', 'Reyes', 'Dela Cruz', 'Garcia', 'Torres', 'Navarro', 'Bautista', 'Mendoza', 'Flores', 'Ramos', 'Castillo', 'Gonzales'];
const cities = ['Manila', 'Quezon City', 'Makati', 'Pasig', 'Taguig', 'Cebu City', 'Davao City', 'Baguio', 'Iloilo City', 'Antipolo'];
const religions = ['Catholic', 'Iglesia ni Cristo', 'Islam', 'Protestant', 'None'];
const professions = ['Freelance Designer', 'Online Seller', 'Consultant', 'Driver', 'Shop Owner', 'Tutor', 'Food Vendor'];
const relationships = ['Parent', 'Sibling', 'Relative'];

function value(id) {
    return document.getElementById(id)?.value?.trim() || '';
}

function setValue(id, inputValue) {
    const element = document.getElementById(id);
    if (element) element.value = inputValue ?? '';
}

function setChecked(id, checked) {
    const element = document.getElementById(id);
    if (element) element.checked = !!checked;
}

function escapeHtml(inputValue) {
    return String(inputValue ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

function isoDate(inputValue) {
    if (!inputValue) return '';
    return String(inputValue).slice(0, 10);
}

function formatDate(inputValue) {
    if (!inputValue) return '-';
    return new Date(inputValue).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatSex(value) {
    if (value === 'M') return 'Male';
    if (value === 'F') return 'Female';
    return '-';
}

function formatCivilStatus(value) {
    return {
        S: 'Single',
        M: 'Married',
        W: 'Widowed',
        LS: 'Legally Separated',
        O: 'Others'
    }[value] || value || '-';
}

function employmentLabel(value) {
    return {
        SE: 'Self-Employed',
        OFW: 'OFW',
        NWS: 'Non-Working Spouse'
    }[value] || value || '-';
}

function showStatus(message, tone = 'neutral') {
    formStatus.textContent = message;
    formStatus.dataset.tone = tone;
}

function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startYear, endYear) {
    const year = randomNumber(startYear, endYear);
    const month = String(randomNumber(1, 12)).padStart(2, '0');
    const day = String(randomNumber(1, 28)).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function randomFullName() {
    return `${randomItem(lastNames)}, ${randomItem(firstNames)} ${randomItem(lastNames)}`;
}

function randomSsNumber() {
    return `${randomNumber(10, 99)}-${randomNumber(1000000, 9999999)}-${randomNumber(0, 9)}`;
}

function randomTin() {
    return `${randomNumber(100, 999)}-${randomNumber(100, 999)}-${randomNumber(100, 999)}-000`;
}

function randomMoney(min, max) {
    return randomNumber(min, max).toFixed(2);
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.dataset.theme = theme;
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggleLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    localStorage.setItem('sss-e1-theme', theme);
}

function createPersonRow(type, data = {}) {
    const row = document.createElement('div');
    row.className = 'repeat-row';
    row.dataset.rowType = type;
    row.innerHTML = `
        <input type="hidden" data-field="Ben_ID" value="${escapeHtml(data.Ben_ID)}">
        <label>
            <span>Name</span>
            <input data-field="Ben_Name" value="${escapeHtml(data.Ben_Name)}" placeholder="Last name, First name Middle name">
        </label>
        <label>
            <span>Date of Birth</span>
            <input data-field="Ben_DOB" type="date" value="${isoDate(data.Ben_DOB)}">
        </label>
        ${type === 'other' ? `
            <label>
                <span>Relationship</span>
                <input data-field="Ben_Relationship" value="${escapeHtml(data.Ben_Relationship)}" placeholder="Parent, sibling, relative">
            </label>
        ` : ''}
        <button type="button" class="icon-btn" aria-label="Remove row">Remove</button>
    `;
    row.querySelector('button').addEventListener('click', () => row.remove());
    return row;
}

function ensureInitialRows() {
    if (!childrenList.children.length) {
        for (let i = 0; i < 2; i += 1) childrenList.appendChild(createPersonRow('child'));
    }
    if (!otherBeneficiariesList.children.length) {
        otherBeneficiariesList.appendChild(createPersonRow('other'));
    }
}

function collectRows(container, type) {
    return [...container.querySelectorAll('.repeat-row')]
        .map(row => {
            const output = {};
            row.querySelectorAll('[data-field]').forEach(input => {
                output[input.dataset.field] = input.value.trim();
            });
            if (type === 'child') output.Ben_Relationship = 'Child';
            return output;
        })
        .filter(row => row.Ben_Name || row.Ben_DOB || row.Ben_Relationship);
}

function selectedEmploymentType() {
    return form.querySelector('input[name="Employment_Type"]:checked')?.value || 'SE';
}

function updateEmploymentPanels() {
    const active = selectedEmploymentType();
    document.querySelectorAll('[data-employment-panel]').forEach(panel => {
        panel.classList.toggle('hidden', panel.dataset.employmentPanel !== active);
    });
}

function buildPayload() {
    const employmentType = selectedEmploymentType();
    return {
        registrant: {
            SS_Number: value('SS_Number'),
            Registrant_Name: value('Registrant_Name'),
            Date_of_Birth: value('Date_of_Birth'),
            Sex: value('Sex'),
            Civil_Status: value('Civil_Status'),
            TIN: value('TIN'),
            Nationality: value('Nationality'),
            Religion: value('Religion'),
            POB: value('POB'),
            Home_Address: value('Home_Address'),
            Mobile_Number: value('Mobile_Number'),
            Email_Address: value('Email_Address'),
            Telephone_Number: value('Telephone_Number'),
            Father_Name: value('Father_Name'),
            Mother_Maiden_Name: value('Mother_Maiden_Name'),
            Employment_Type: employmentType
        },
        spouse: {
            Spouse_Name: value('Spouse_Name'),
            Spouse_DOB: value('Spouse_DOB')
        },
        children: collectRows(childrenList, 'child'),
        otherBeneficiaries: collectRows(otherBeneficiariesList, 'other'),
        employmentDetails: {
            SE_Profession: value('SE_Profession'),
            SE_Year_Started: value('SE_Year_Started'),
            SE_Monthly_Earnings: value('SE_Monthly_Earnings'),
            OFW_Foreign_Address: value('OFW_Foreign_Address'),
            OFW_Monthly_Earnings: value('OFW_Monthly_Earnings'),
            OFW_FlexiFund_Flag: document.getElementById('OFW_FlexiFund_Flag').checked,
            WS_SSN: value('WS_SSN'),
            WS_Income: value('WS_Income')
        }
    };
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Request failed.');
    }
    return data;
}

async function loadRecords(search = '') {
    const records = await requestJson(`/api/e1-records${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    document.getElementById('record-count').textContent = `${records.length} ${records.length === 1 ? 'record' : 'records'}`;
    recordList.innerHTML = '';
    document.getElementById('empty-records').classList.toggle('hidden', records.length > 0);

    records.forEach(record => {
        const item = document.createElement('article');
        item.className = 'record-card';
        item.innerHTML = `
            <div>
                <strong>${escapeHtml(record.Registrant_Name)}</strong>
                <span>${escapeHtml(record.SS_Number)}</span>
            </div>
            <dl>
                <div><dt>DOB</dt><dd>${formatDate(record.Date_of_Birth)}</dd></div>
                <div><dt>Sex</dt><dd>${formatSex(record.Sex)}</dd></div>
                <div><dt>Status</dt><dd>${formatCivilStatus(record.Civil_Status)}</dd></div>
                <div><dt>Type</dt><dd>${employmentLabel(record.Employment_Type)}</dd></div>
            </dl>
            <div class="record-actions">
                <button type="button" class="btn btn-secondary" data-action="edit">Edit</button>
                <button type="button" class="btn btn-danger" data-action="delete">Delete</button>
            </div>
        `;
        item.querySelector('[data-action="edit"]').addEventListener('click', () => editRecord(record.SS_Number));
        item.querySelector('[data-action="delete"]').addEventListener('click', () => deleteRecord(record.SS_Number));
        recordList.appendChild(item);
    });
}

function resetForm() {
    editingId = null;
    form.reset();
    document.getElementById('SS_Number').disabled = false;
    document.getElementById('form-mode').textContent = 'New record';
    document.getElementById('save-record').textContent = 'Save E-1 Record';
    childrenList.innerHTML = '';
    otherBeneficiariesList.innerHTML = '';
    ensureInitialRows();
    updateEmploymentPanels();
    showStatus('');
}

function fillRandomInfo() {
    resetForm();

    const firstName = randomItem(firstNames).toLowerCase();
    const lastName = randomItem(lastNames).toLowerCase().replace(/\s+/g, '');
    const city = randomItem(cities);
    const employmentType = randomItem(['SE', 'OFW', 'NWS']);

    setValue('SS_Number', randomSsNumber());
    setValue('Registrant_Name', randomFullName());
    setValue('Date_of_Birth', randomDate(1965, 2004));
    setValue('Sex', randomItem(['M', 'F']));
    setValue('Civil_Status', randomItem(['S', 'M', 'W', 'LS']));
    setValue('TIN', randomTin());
    setValue('Nationality', 'Filipino');
    setValue('Religion', randomItem(religions));
    setValue('POB', `${city}, Philippines`);
    setValue('Home_Address', `${randomNumber(10, 999)} ${randomItem(lastNames)} Street, Barangay ${randomItem(firstNames)}, ${city}, Philippines ${randomNumber(1000, 9999)}`);
    setValue('Mobile_Number', `09${randomNumber(100000000, 999999999)}`);
    setValue('Email_Address', `${firstName}.${lastName}${randomNumber(10, 99)}@example.com`);
    setValue('Telephone_Number', `02-${randomNumber(1000, 9999)}-${randomNumber(1000, 9999)}`);
    setValue('Father_Name', randomFullName());
    setValue('Mother_Maiden_Name', randomFullName());
    setValue('Spouse_Name', randomFullName());
    setValue('Spouse_DOB', randomDate(1965, 2001));

    childrenList.innerHTML = '';
    for (let i = 0; i < randomNumber(1, 3); i += 1) {
        childrenList.appendChild(createPersonRow('child', {
            Ben_Name: randomFullName(),
            Ben_DOB: randomDate(2008, 2023)
        }));
    }

    otherBeneficiariesList.innerHTML = '';
    for (let i = 0; i < randomNumber(1, 2); i += 1) {
        otherBeneficiariesList.appendChild(createPersonRow('other', {
            Ben_Name: randomFullName(),
            Ben_DOB: randomDate(1960, 2006),
            Ben_Relationship: randomItem(relationships)
        }));
    }

    document.querySelector(`input[name="Employment_Type"][value="${employmentType}"]`).checked = true;
    setValue('SE_Profession', randomItem(professions));
    setValue('SE_Year_Started', randomNumber(2005, 2025));
    setValue('SE_Monthly_Earnings', randomMoney(15000, 90000));
    setValue('OFW_Foreign_Address', `${randomNumber(10, 999)} Main Street, ${randomItem(['Dubai', 'Doha', 'Singapore', 'Hong Kong', 'Riyadh'])}`);
    setValue('OFW_Monthly_Earnings', randomMoney(40000, 180000));
    setChecked('OFW_FlexiFund_Flag', Math.random() > 0.5);
    setValue('WS_SSN', randomSsNumber());
    setValue('WS_Income', randomMoney(20000, 120000));

    updateEmploymentPanels();
    showStatus('Random sample data filled in. Review it, then save when ready.', 'success');
}

async function editRecord(ssNumber) {
    const record = await requestJson(`/api/e1-records/${encodeURIComponent(ssNumber)}`);
    const r = record.registrant;
    editingId = r.SS_Number;

    [
        'SS_Number', 'Registrant_Name', 'TIN', 'Nationality', 'Religion', 'POB', 'Home_Address',
        'Mobile_Number', 'Email_Address', 'Telephone_Number', 'Father_Name', 'Mother_Maiden_Name'
    ].forEach(field => setValue(field, r[field]));
    setValue('Date_of_Birth', isoDate(r.Date_of_Birth));
    setValue('Sex', r.Sex);
    setValue('Civil_Status', r.Civil_Status);
    document.querySelector(`input[name="Employment_Type"][value="${r.Employment_Type || 'SE'}"]`).checked = true;

    setValue('Spouse_Name', record.spouse?.Spouse_Name || '');
    setValue('Spouse_DOB', isoDate(record.spouse?.Spouse_DOB));

    childrenList.innerHTML = '';
    (record.children.length ? record.children : [{}]).forEach(child => {
        childrenList.appendChild(createPersonRow('child', child));
    });

    otherBeneficiariesList.innerHTML = '';
    (record.otherBeneficiaries.length ? record.otherBeneficiaries : [{}]).forEach(beneficiary => {
        otherBeneficiariesList.appendChild(createPersonRow('other', beneficiary));
    });

    const se = record.employmentDetails.selfEmployed || {};
    const ofw = record.employmentDetails.ofw || {};
    const nws = record.employmentDetails.nonWorkingSpouse || {};
    setValue('SE_Profession', se.SE_Profession);
    setValue('SE_Year_Started', se.SE_Year_Started);
    setValue('SE_Monthly_Earnings', se.SE_Monthly_Earnings);
    setValue('OFW_Foreign_Address', ofw.OFW_Foreign_Address);
    setValue('OFW_Monthly_Earnings', ofw.OFW_Monthly_Earnings);
    setChecked('OFW_FlexiFund_Flag', ofw.OFW_FlexiFund_Flag === 'Y' || ofw.OFW_FlexiFund_Flag === 1);
    setValue('WS_SSN', nws.WS_SSN);
    setValue('WS_Income', nws.WS_Income);

    document.getElementById('SS_Number').disabled = true;
    document.getElementById('form-mode').textContent = `Editing ${r.SS_Number}`;
    document.getElementById('save-record').textContent = 'Update E-1 Record';
    updateEmploymentPanels();
    showStatus('Loaded record for editing.', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteRecord(ssNumber) {
    if (!confirm(`Delete E-1 record for ${ssNumber}?`)) return;
    await requestJson(`/api/e1-records/${encodeURIComponent(ssNumber)}`, { method: 'DELETE' });
    if (editingId === ssNumber) resetForm();
    await loadRecords(recordSearch.value);
    showStatus('Record deleted.', 'success');
}

form.addEventListener('submit', async event => {
    event.preventDefault();
    showStatus('Saving...', 'neutral');
    const payload = buildPayload();
    const url = editingId ? `/api/e1-records/${encodeURIComponent(editingId)}` : '/api/e1-records';
    const method = editingId ? 'PUT' : 'POST';

    try {
        await requestJson(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        await loadRecords(recordSearch.value);
        resetForm();
        showStatus(method === 'POST' ? 'Record created.' : 'Record updated.', 'success');
    } catch (error) {
        showStatus(error.message, 'error');
    }
});

document.getElementById('reset-form').addEventListener('click', resetForm);
document.getElementById('random-fill').addEventListener('click', fillRandomInfo);
themeToggle.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});
document.getElementById('add-child').addEventListener('click', () => {
    childrenList.appendChild(createPersonRow('child'));
});
document.getElementById('add-beneficiary').addEventListener('click', () => {
    otherBeneficiariesList.appendChild(createPersonRow('other'));
});
document.querySelectorAll('input[name="Employment_Type"]').forEach(input => {
    input.addEventListener('change', updateEmploymentPanels);
});
recordSearch.addEventListener('input', () => loadRecords(recordSearch.value));

resetForm();
applyTheme(localStorage.getItem('sss-e1-theme') || 'light');
loadRecords().catch(error => showStatus(error.message, 'error'));
