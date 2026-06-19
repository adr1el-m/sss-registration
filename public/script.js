const form = document.getElementById('e1-form');
const recordList = document.getElementById('record-list');
const formStatus = document.getElementById('form-status');
const recordSearch = document.getElementById('record-search');
const recordStatusFilter = document.getElementById('record-status-filter');
const childrenList = document.getElementById('children-list');
const otherBeneficiariesList = document.getElementById('other-beneficiaries-list');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleLabel = document.getElementById('theme-toggle-label');
const validationErrors = document.getElementById('validation-errors');
const reviewModal = document.getElementById('review-modal');
const reviewContent = document.getElementById('review-content');
const reviewConfirm = document.getElementById('review-confirm');
const mobileDemo = document.getElementById('mobile-demo');

let editingId = null;
let pendingSave = null;

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

function formatSex(inputValue) {
    if (inputValue === 'M') return 'Male';
    if (inputValue === 'F') return 'Female';
    return '-';
}

function formatCivilStatus(inputValue) {
    return {
        S: 'Single',
        M: 'Married',
        W: 'Widowed',
        LS: 'Legally Separated',
        O: 'Others'
    }[inputValue] || inputValue || '-';
}

function employmentLabel(inputValue) {
    return {
        SE: 'Self-Employed',
        OFW: 'OFW',
        NWS: 'Non-Working Spouse'
    }[inputValue] || inputValue || '-';
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

function clearValidation() {
    validationErrors.classList.add('hidden');
    validationErrors.innerHTML = '';
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute('aria-invalid'));
}

function markInvalid(id) {
    const input = document.getElementById(id);
    if (!input) return;
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
}

function showValidationErrors(errors) {
    clearValidation();
    if (!errors.length) return;
    validationErrors.classList.remove('hidden');
    validationErrors.innerHTML = `
        <strong>Please fix these items before saving:</strong>
        <ul>${errors.map(error => `<li>${escapeHtml(error.message)}</li>`).join('')}</ul>
    `;
    errors.forEach(error => markInvalid(error.id));
    showStatus('Some fields need attention before saving.', 'error');
}

function isFutureDate(dateString) {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateString) > today;
}

function validatePayload(payload) {
    const errors = [];
    const r = payload.registrant;
    const ssPattern = /^\d{2}-\d{7}-\d$/;
    const tinPattern = /^\d{3}-\d{3}-\d{3}-\d{3}$/;
    const mobilePattern = /^09\d{9}$/;

    [
        ['SS_Number', r.SS_Number, 'SS Number is required.'],
        ['Registrant_Name', r.Registrant_Name, 'Full name is required.'],
        ['Date_of_Birth', r.Date_of_Birth, 'Date of birth is required.'],
        ['Sex', r.Sex, 'Sex is required.'],
        ['Civil_Status', r.Civil_Status, 'Civil status is required.'],
        ['Home_Address', r.Home_Address, 'Home address is required.'],
        ['Mother_Maiden_Name', r.Mother_Maiden_Name, "Mother's maiden name is required."]
    ].forEach(([id, fieldValue, message]) => {
        if (!fieldValue) errors.push({ id, message });
    });

    if (r.SS_Number && !ssPattern.test(r.SS_Number)) {
        errors.push({ id: 'SS_Number', message: 'SS Number must use the format 00-0000000-0.' });
    }
    if (r.TIN && !tinPattern.test(r.TIN)) {
        errors.push({ id: 'TIN', message: 'TIN must use the format 000-000-000-000.' });
    }
    if (r.Mobile_Number && !mobilePattern.test(r.Mobile_Number)) {
        errors.push({ id: 'Mobile_Number', message: 'Mobile number must start with 09 and contain 11 digits.' });
    }
    if (r.Date_of_Birth && isFutureDate(r.Date_of_Birth)) {
        errors.push({ id: 'Date_of_Birth', message: 'Date of birth cannot be in the future.' });
    }
    if (payload.spouse.Spouse_DOB && isFutureDate(payload.spouse.Spouse_DOB)) {
        errors.push({ id: 'Spouse_DOB', message: 'Spouse date of birth cannot be in the future.' });
    }

    if (r.Employment_Type === 'SE') {
        if (payload.employmentDetails.SE_Year_Started && Number(payload.employmentDetails.SE_Year_Started) > new Date().getFullYear()) {
            errors.push({ id: 'SE_Year_Started', message: 'Self-employed year started cannot be in the future.' });
        }
        if (payload.employmentDetails.SE_Monthly_Earnings && Number(payload.employmentDetails.SE_Monthly_Earnings) < 0) {
            errors.push({ id: 'SE_Monthly_Earnings', message: 'Monthly earnings cannot be negative.' });
        }
    }
    if (r.Employment_Type === 'OFW' && payload.employmentDetails.OFW_Monthly_Earnings && Number(payload.employmentDetails.OFW_Monthly_Earnings) < 0) {
        errors.push({ id: 'OFW_Monthly_Earnings', message: 'OFW monthly earnings cannot be negative.' });
    }
    if (r.Employment_Type === 'NWS' && payload.employmentDetails.WS_Income && Number(payload.employmentDetails.WS_Income) < 0) {
        errors.push({ id: 'WS_Income', message: 'Working spouse income cannot be negative.' });
    }

    return errors;
}

async function checkDuplicateSsNumber(ssNumber) {
    if (!ssNumber || editingId) return false;
    const result = await requestJson(`/api/e1-records/check/${encodeURIComponent(ssNumber)}`);
    return result.exists;
}

function reviewRow(label, fieldValue) {
    return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(fieldValue || '-')}</dd></div>`;
}

function showReviewModal(payload) {
    const r = payload.registrant;
    reviewContent.innerHTML = `
        <section>
            <h3>Registrant</h3>
            <dl>
                ${reviewRow('SS Number', r.SS_Number)}
                ${reviewRow('Name', r.Registrant_Name)}
                ${reviewRow('Date of Birth', formatDate(r.Date_of_Birth))}
                ${reviewRow('Sex', formatSex(r.Sex))}
                ${reviewRow('Civil Status', formatCivilStatus(r.Civil_Status))}
                ${reviewRow('Employment Type', employmentLabel(r.Employment_Type))}
                ${reviewRow('Mobile', r.Mobile_Number)}
                ${reviewRow('Email', r.Email_Address)}
            </dl>
        </section>
        <section>
            <h3>Dependents and Beneficiaries</h3>
            <dl>
                ${reviewRow('Spouse', payload.spouse.Spouse_Name)}
                ${reviewRow('Children', payload.children.length)}
                ${reviewRow('Other Beneficiaries', payload.otherBeneficiaries.length)}
            </dl>
        </section>
        <section>
            <h3>Address</h3>
            <p>${escapeHtml(r.Home_Address || '-')}</p>
        </section>
    `;
    reviewModal.classList.remove('hidden');
}

function closeReviewModal() {
    reviewModal.classList.add('hidden');
    pendingSave = null;
}

async function loadSummary() {
    const summary = await requestJson('/api/e1-records/summary');
    document.getElementById('summary-active').textContent = summary.totalActive;
    document.getElementById('summary-se').textContent = summary.selfEmployed;
    document.getElementById('summary-ofw').textContent = summary.ofw;
    document.getElementById('summary-nws').textContent = summary.nonWorkingSpouse;
    document.getElementById('summary-beneficiaries').textContent = summary.totalBeneficiaries;
    document.getElementById('summary-archived').textContent = summary.archived;
}

async function loadRecords(search = '') {
    const status = recordStatusFilter.value;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const records = await requestJson(`/api/e1-records?${params.toString()}`);
    document.getElementById('record-count').textContent = `${records.length} ${records.length === 1 ? 'record' : 'records'}`;
    recordList.innerHTML = '';
    document.getElementById('empty-records').classList.toggle('hidden', records.length > 0);

    records.forEach(record => {
        const archived = Number(record.Is_Archived) === 1;
        const item = document.createElement('article');
        item.className = `record-card${archived ? ' is-archived' : ''}`;
        item.innerHTML = `
            <div class="record-card-head">
                <div>
                    <strong>${escapeHtml(record.Registrant_Name)}</strong>
                    <span>${escapeHtml(record.SS_Number)}</span>
                </div>
                <span class="status-pill">${archived ? 'Archived' : 'Active'}</span>
            </div>
            <dl>
                <div><dt>DOB</dt><dd>${formatDate(record.Date_of_Birth)}</dd></div>
                <div><dt>Sex</dt><dd>${formatSex(record.Sex)}</dd></div>
                <div><dt>Status</dt><dd>${formatCivilStatus(record.Civil_Status)}</dd></div>
                <div><dt>Type</dt><dd>${employmentLabel(record.Employment_Type)}</dd></div>
            </dl>
            <div class="record-actions">
                ${archived
                    ? '<button type="button" class="btn btn-secondary" data-action="restore">Restore</button>'
                    : '<button type="button" class="btn btn-secondary" data-action="edit">Edit</button><button type="button" class="btn btn-danger" data-action="delete">Archive</button>'}
            </div>
        `;
        item.querySelector('[data-action="edit"]')?.addEventListener('click', () => editRecord(record.SS_Number));
        item.querySelector('[data-action="delete"]')?.addEventListener('click', () => archiveRecord(record.SS_Number));
        item.querySelector('[data-action="restore"]')?.addEventListener('click', () => restoreRecord(record.SS_Number));
        recordList.appendChild(item);
    });
}

async function refreshRecords() {
    await Promise.all([
        loadSummary(),
        loadRecords(recordSearch.value)
    ]);
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
    clearValidation();
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
    clearValidation();
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
    clearValidation();
    showStatus('Loaded record for editing.', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function archiveRecord(ssNumber) {
    if (!confirm(`Archive E-1 record for ${ssNumber}? You can restore it later.`)) return;
    await requestJson(`/api/e1-records/${encodeURIComponent(ssNumber)}`, { method: 'DELETE' });
    if (editingId === ssNumber) resetForm();
    await refreshRecords();
    showStatus('Record archived.', 'success');
}

async function restoreRecord(ssNumber) {
    await requestJson(`/api/e1-records/${encodeURIComponent(ssNumber)}/restore`, { method: 'PATCH' });
    await refreshRecords();
    showStatus('Record restored.', 'success');
}

async function saveConfirmedRecord() {
    if (!pendingSave) return;
    const saveMethod = pendingSave.method;
    reviewConfirm.disabled = true;
    showStatus('Saving...', 'neutral');
    try {
        await requestJson(pendingSave.url, {
            method: pendingSave.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingSave.payload)
        });
        closeReviewModal();
        await refreshRecords();
        resetForm();
        showStatus(saveMethod === 'POST' ? 'Record created.' : 'Record updated.', 'success');
    } catch (error) {
        showStatus(error.message, 'error');
    } finally {
        reviewConfirm.disabled = false;
    }
}

function printForm() {
    showStatus('Opening print dialog. Choose Save as PDF to export.', 'neutral');
    window.print();
}

function toggleMobileDemo() {
    document.body.classList.toggle('mobile-demo-mode');
    mobileDemo.textContent = document.body.classList.contains('mobile-demo-mode') ? 'Desktop View' : 'Mobile Demo';
}

form.addEventListener('submit', async event => {
    event.preventDefault();
    const payload = buildPayload();
    const errors = validatePayload(payload);
    if (errors.length) {
        showValidationErrors(errors);
        return;
    }

    try {
        if (!editingId && await checkDuplicateSsNumber(payload.registrant.SS_Number)) {
            showValidationErrors([{ id: 'SS_Number', message: 'This SS Number already exists. Search for it and use Edit instead.' }]);
            return;
        }
        clearValidation();
        pendingSave = {
            payload,
            url: editingId ? `/api/e1-records/${encodeURIComponent(editingId)}` : '/api/e1-records',
            method: editingId ? 'PUT' : 'POST'
        };
        showReviewModal(payload);
    } catch (error) {
        showStatus(error.message, 'error');
    }
});

document.getElementById('SS_Number').addEventListener('blur', async () => {
    const ssNumber = value('SS_Number');
    if (!ssNumber || editingId || !/^\d{2}-\d{7}-\d$/.test(ssNumber)) return;
    try {
        if (await checkDuplicateSsNumber(ssNumber)) {
            showStatus('Warning: this SS Number already exists. Search for it and use Edit instead.', 'warning');
            markInvalid('SS_Number');
        }
    } catch (error) {
        showStatus(error.message, 'error');
    }
});

document.getElementById('reset-form').addEventListener('click', resetForm);
document.getElementById('random-fill').addEventListener('click', fillRandomInfo);
document.getElementById('print-form').addEventListener('click', printForm);
mobileDemo.addEventListener('click', toggleMobileDemo);
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
recordStatusFilter.addEventListener('change', () => loadRecords(recordSearch.value));
document.getElementById('review-close').addEventListener('click', closeReviewModal);
document.getElementById('review-back').addEventListener('click', closeReviewModal);
reviewConfirm.addEventListener('click', saveConfirmedRecord);

resetForm();
applyTheme(localStorage.getItem('sss-e1-theme') || 'light');
refreshRecords().catch(error => showStatus(error.message, 'error'));
