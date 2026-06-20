const form = document.getElementById('e1-form');
const recordList = document.getElementById('record-list');
const formStatus = document.getElementById('form-status');
const recordSearch = document.getElementById('record-search');
const recordStatusFilter = document.getElementById('record-status-filter');
const recordEmploymentFilter = document.getElementById('record-employment-filter');
const recordSexFilter = document.getElementById('record-sex-filter');
const recordCivilFilter = document.getElementById('record-civil-filter');
const recordQualityFilter = document.getElementById('record-quality-filter');
const recordCityFilter = document.getElementById('record-city-filter');
const recordAgeMinFilter = document.getElementById('record-age-min-filter');
const recordAgeMaxFilter = document.getElementById('record-age-max-filter');
const recordCreatedFromFilter = document.getElementById('record-created-from-filter');
const recordCreatedToFilter = document.getElementById('record-created-to-filter');
const childrenList = document.getElementById('children-list');
const otherBeneficiariesList = document.getElementById('other-beneficiaries-list');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleLabel = document.getElementById('theme-toggle-label');
const validationErrors = document.getElementById('validation-errors');
const validationChecklist = document.getElementById('validation-checklist');
const validationChecklistSummary = document.getElementById('validation-checklist-summary');
const validationChecklistList = document.getElementById('validation-checklist-list');
const addressPreviewText = document.getElementById('address-preview-text');
const qualityPanel = document.getElementById('quality-panel');
const qualitySummary = document.getElementById('quality-summary');
const qualityList = document.getElementById('quality-list');
const reviewModal = document.getElementById('review-modal');
const reviewContent = document.getElementById('review-content');
const reviewConfirm = document.getElementById('review-confirm');
const archivePage = document.getElementById('archive-page');
const activityPage = document.getElementById('activity-page');
const activityModal = document.getElementById('activity-modal');
const activityList = document.getElementById('activity-list');
const detailModal = document.getElementById('detail-modal');
const detailContent = document.getElementById('detail-content');
const officialPrint = document.getElementById('official-print');
const wizardSteps = document.getElementById('wizard-steps');
const wizardPrev = document.getElementById('wizard-prev');
const wizardNext = document.getElementById('wizard-next');

let editingId = null;
let pendingSave = null;
let currentPreviewRecord = null;
let currentWizardStep = 0;
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

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

function compactJoin(parts, separator = ' ') {
    return parts.map(part => String(part || '').trim()).filter(Boolean).join(separator);
}

function composeName(first, middle, last) {
    const givenNames = compactJoin([first, middle]);
    if (last && givenNames) return `${last.trim()}, ${givenNames}`;
    return compactJoin([first, middle, last]);
}

function composeNameFromPrefix(prefix) {
    return composeName(
        value(`${prefix}_First_Name`),
        value(`${prefix}_Middle_Name`),
        value(`${prefix}_Last_Name`)
    );
}

function splitStoredName(inputValue) {
    const raw = String(inputValue || '').trim();
    if (!raw) return { first: '', middle: '', last: '' };
    if (raw.includes(',')) {
        const [last, rest = ''] = raw.split(',');
        const names = rest.trim().split(/\s+/).filter(Boolean);
        return {
            first: names.shift() || '',
            middle: names.join(' '),
            last: last.trim()
        };
    }
    const names = raw.split(/\s+/).filter(Boolean);
    if (names.length <= 1) return { first: names[0] || '', middle: '', last: '' };
    const first = names.shift();
    const last = names.pop();
    return { first, middle: names.join(' '), last };
}

function setNameParts(prefix, inputValue) {
    const parts = splitStoredName(inputValue);
    setValue(`${prefix}_First_Name`, parts.first);
    setValue(`${prefix}_Middle_Name`, parts.middle);
    setValue(`${prefix}_Last_Name`, parts.last);
}

function composeHomeAddress() {
    return compactJoin([
        value('Address_Unit'),
        value('Address_House_Lot'),
        value('Address_Street'),
        value('Address_Subdivision'),
        value('Address_Barangay'),
        value('Address_City'),
        value('Address_Province'),
        value('Address_Country'),
        value('Address_Zip')
    ], ', ');
}

function setAddressParts(inputValue) {
    const parts = String(inputValue || '').split(',').map(part => part.trim());
    [
        'Address_Unit',
        'Address_House_Lot',
        'Address_Street',
        'Address_Subdivision',
        'Address_Barangay',
        'Address_City',
        'Address_Province',
        'Address_Country',
        'Address_Zip'
    ].forEach((id, index) => setValue(id, parts[index] || ''));
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

function formatDateTime(inputValue) {
    if (!inputValue) return 'Not tracked';
    return new Date(inputValue).toLocaleString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function digitsOnly(inputValue) {
    return String(inputValue || '').replace(/\D/g, '');
}

function groupDigits(inputValue, groups) {
    const digits = digitsOnly(inputValue).slice(0, groups.reduce((sum, group) => sum + group, 0));
    const output = [];
    let index = 0;
    groups.forEach(group => {
        const chunk = digits.slice(index, index + group);
        if (chunk) output.push(chunk);
        index += group;
    });
    return output.join('-');
}

function formatSsNumber(inputValue) {
    return groupDigits(inputValue, [2, 7, 1]);
}

function formatTinNumber(inputValue) {
    return groupDigits(inputValue, [3, 3, 3, 3]);
}

function formatMobileNumber(inputValue) {
    return digitsOnly(inputValue).slice(0, 11);
}

function money(inputValue) {
    const numeric = Number(inputValue || 0);
    return numeric.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function moneyOrBlank(inputValue) {
    if (inputValue === undefined || inputValue === null || inputValue === '') return '';
    return money(inputValue);
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
    const nameParts = splitStoredName(data.Ben_Name);
    row.className = 'repeat-row';
    row.dataset.rowType = type;
    row.innerHTML = `
        <input type="hidden" data-field="Ben_ID" value="${escapeHtml(data.Ben_ID)}">
        <label>
            <span>First Name</span>
            <input data-field="Ben_First_Name" required value="${escapeHtml(nameParts.first)}" placeholder="First name">
        </label>
        <label>
            <span>Middle Name</span>
            <input data-field="Ben_Middle_Name" value="${escapeHtml(nameParts.middle)}" placeholder="Middle name">
        </label>
        <label>
            <span>Last Name</span>
            <input data-field="Ben_Last_Name" required value="${escapeHtml(nameParts.last)}" placeholder="Last name">
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
    row.querySelector('button').addEventListener('click', () => {
        row.remove();
        updateQualityPanel();
    });
    return row;
}

function collectRows(container, type) {
    return [...container.querySelectorAll('.repeat-row')]
        .map(row => {
            const output = {};
            row.querySelectorAll('[data-field]').forEach(input => {
                output[input.dataset.field] = input.value.trim();
            });
            output.Ben_Name = composeName(output.Ben_First_Name, output.Ben_Middle_Name, output.Ben_Last_Name);
            const hasUserData = Boolean(
                output.Ben_Name
                || output.Ben_DOB
                || (type === 'other' && output.Ben_Relationship)
            );
            if (!hasUserData) return null;
            if (type === 'child') output.Ben_Relationship = 'Child';
            return output;
        })
        .filter(Boolean);
}

function selectedEmploymentType() {
    return form.querySelector('input[name="Employment_Type"]:checked')?.value || 'SE';
}

function updateEmploymentPanels() {
    const active = selectedEmploymentType();
    document.querySelectorAll('[data-employment-panel]').forEach(panel => {
        const isActive = panel.dataset.employmentPanel === active;
        panel.classList.toggle('hidden', !isActive);
        panel.querySelectorAll('input').forEach(input => {
            input.disabled = !isActive;
        });
    });
    setInputRequired(['SE_Profession', 'SE_Year_Started', 'SE_Monthly_Earnings'], active === 'SE');
    setInputRequired(['OFW_Foreign_Address', 'OFW_Monthly_Earnings'], active === 'OFW');
    setInputRequired(['WS_SSN', 'WS_Income'], active === 'NWS');
}

function setInputRequired(ids, required) {
    ids.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.required = required;
    });
}

function updateSpouseSection({ clearWhenHidden = true } = {}) {
    const isMarried = value('Civil_Status') === 'M';
    const spouseSection = document.getElementById('spouse-section');
    if (!spouseSection) return;
    spouseSection.classList.toggle('hidden', !isMarried);
    spouseSection.setAttribute('aria-hidden', String(!isMarried));
    spouseSection.querySelectorAll('input').forEach(input => {
        input.disabled = !isMarried;
        if (!isMarried && clearWhenHidden) input.value = '';
    });
    setInputRequired(['Spouse_First_Name', 'Spouse_Last_Name'], isMarried);
}

function buildPayload() {
    const employmentType = selectedEmploymentType();
    const isMarried = value('Civil_Status') === 'M';
    return {
        registrant: {
            SS_Number: value('SS_Number'),
            Registrant_Name: composeNameFromPrefix('Registrant'),
            Date_of_Birth: value('Date_of_Birth'),
            Sex: value('Sex'),
            Civil_Status: value('Civil_Status'),
            TIN: value('TIN'),
            Nationality: value('Nationality'),
            Religion: value('Religion'),
            POB: value('POB'),
            Home_Address: composeHomeAddress(),
            Mobile_Number: value('Mobile_Number'),
            Email_Address: value('Email_Address'),
            Telephone_Number: value('Telephone_Number'),
            Father_Name: composeNameFromPrefix('Father'),
            Mother_Maiden_Name: composeNameFromPrefix('Mother'),
            Employment_Type: employmentType
        },
        spouse: {
            Spouse_Name: isMarried ? composeNameFromPrefix('Spouse') : '',
            Spouse_DOB: isMarried ? value('Spouse_DOB') : ''
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
    const response = await fetch(`${API_BASE}${url}`, options);
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

function calculateAge(dateString) {
    if (!dateString || isFutureDate(dateString)) return '';
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
    }
    return age >= 0 ? String(age) : '';
}

function updateRegistrantAge() {
    setValue('Registrant_Age', calculateAge(value('Date_of_Birth')));
}

function setWizardStep(step) {
    const panels = [...document.querySelectorAll('[data-wizard-panel]')];
    currentWizardStep = Math.max(0, Math.min(step, panels.length - 1));
    panels.forEach((panel, index) => {
        panel.classList.toggle('wizard-panel-active', index === currentWizardStep);
    });
    document.querySelectorAll('.wizard-step').forEach((button, index) => {
        button.classList.toggle('is-active', index === currentWizardStep);
    });
    if (wizardPrev) wizardPrev.disabled = currentWizardStep === 0;
    if (wizardNext) wizardNext.disabled = currentWizardStep === panels.length - 1;
}

function validatePayload(payload) {
    const errors = [];
    const r = payload.registrant;
    const ssPattern = /^\d{2}-\d{7}-\d$/;
    const tinPattern = /^\d{3}-\d{3}-\d{3}-\d{3}$/;
    const mobilePattern = /^09\d{9}$/;

    [
        ['SS_Number', r.SS_Number, 'SS Number is required.'],
        ['Registrant_First_Name', value('Registrant_First_Name'), 'Registrant first name is required.'],
        ['Registrant_Last_Name', value('Registrant_Last_Name'), 'Registrant last name is required.'],
        ['Date_of_Birth', r.Date_of_Birth, 'Date of birth is required.'],
        ['Sex', r.Sex, 'Sex is required.'],
        ['Civil_Status', r.Civil_Status, 'Civil status is required.'],
        ['Address_Barangay', value('Address_Barangay'), 'Barangay, district, or locality is required.'],
        ['Address_City', value('Address_City'), 'City or municipality is required.'],
        ['Address_Province', value('Address_Province'), 'Province is required.'],
        ['Address_Zip', value('Address_Zip'), 'ZIP code is required.'],
        ['Mother_First_Name', value('Mother_First_Name'), "Mother's first name is required."],
        ['Mother_Last_Name', value('Mother_Last_Name'), "Mother's maiden last name is required."]
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
    if (r.Civil_Status === 'M') {
        if (!value('Spouse_First_Name')) {
            errors.push({ id: 'Spouse_First_Name', message: 'Spouse first name is required when civil status is married.' });
        }
        if (!value('Spouse_Last_Name')) {
            errors.push({ id: 'Spouse_Last_Name', message: 'Spouse last name is required when civil status is married.' });
        }
    }

    [...childrenList.querySelectorAll('.repeat-row'), ...otherBeneficiariesList.querySelectorAll('.repeat-row')].forEach((row, index) => {
        const first = row.querySelector('[data-field="Ben_First_Name"]')?.value.trim();
        const middle = row.querySelector('[data-field="Ben_Middle_Name"]')?.value.trim();
        const last = row.querySelector('[data-field="Ben_Last_Name"]')?.value.trim();
        const dob = row.querySelector('[data-field="Ben_DOB"]')?.value.trim();
        const relationship = row.querySelector('[data-field="Ben_Relationship"]')?.value.trim();
        const hasAnyValue = Boolean(first || middle || last || dob || relationship);
        if (hasAnyValue && !first) {
            errors.push({ id: row.querySelector('[data-field="Ben_First_Name"]')?.id || '', message: `Beneficiary row ${index + 1} needs a first name.` });
        }
        if (hasAnyValue && !last) {
            errors.push({ id: row.querySelector('[data-field="Ben_Last_Name"]')?.id || '', message: `Beneficiary row ${index + 1} needs a last name.` });
        }
    });

    if (r.Employment_Type === 'SE') {
        if (!payload.employmentDetails.SE_Profession) {
            errors.push({ id: 'SE_Profession', message: 'Profession or business is required for self-employed records.' });
        }
        if (!payload.employmentDetails.SE_Year_Started) {
            errors.push({ id: 'SE_Year_Started', message: 'Year started is required for self-employed records.' });
        }
        if (!payload.employmentDetails.SE_Monthly_Earnings) {
            errors.push({ id: 'SE_Monthly_Earnings', message: 'Monthly earnings are required for self-employed records.' });
        }
        if (payload.employmentDetails.SE_Year_Started && Number(payload.employmentDetails.SE_Year_Started) > new Date().getFullYear()) {
            errors.push({ id: 'SE_Year_Started', message: 'Self-employed year started cannot be in the future.' });
        }
        if (payload.employmentDetails.SE_Monthly_Earnings && Number(payload.employmentDetails.SE_Monthly_Earnings) < 0) {
            errors.push({ id: 'SE_Monthly_Earnings', message: 'Monthly earnings cannot be negative.' });
        }
    }
    if (r.Employment_Type === 'OFW') {
        if (!payload.employmentDetails.OFW_Foreign_Address) {
            errors.push({ id: 'OFW_Foreign_Address', message: 'Foreign address is required for OFW records.' });
        }
        if (!payload.employmentDetails.OFW_Monthly_Earnings) {
            errors.push({ id: 'OFW_Monthly_Earnings', message: 'Monthly earnings are required for OFW records.' });
        }
        if (payload.employmentDetails.OFW_Monthly_Earnings && Number(payload.employmentDetails.OFW_Monthly_Earnings) < 0) {
            errors.push({ id: 'OFW_Monthly_Earnings', message: 'OFW monthly earnings cannot be negative.' });
        }
    }
    if (r.Employment_Type === 'NWS') {
        if (!payload.employmentDetails.WS_SSN) {
            errors.push({ id: 'WS_SSN', message: 'Working spouse SS/Common Reference No. is required for non-working spouse records.' });
        }
        if (!payload.employmentDetails.WS_Income) {
            errors.push({ id: 'WS_Income', message: 'Working spouse monthly income is required for non-working spouse records.' });
        }
        if (payload.employmentDetails.WS_Income && Number(payload.employmentDetails.WS_Income) < 0) {
            errors.push({ id: 'WS_Income', message: 'Working spouse income cannot be negative.' });
        }
    }

    return errors;
}

function recordToPayload(record) {
    const r = record.registrant || {};
    const se = record.employmentDetails?.selfEmployed || {};
    const ofw = record.employmentDetails?.ofw || {};
    const nws = record.employmentDetails?.nonWorkingSpouse || {};
    return {
        registrant: {
            SS_Number: r.SS_Number,
            Registrant_Name: r.Registrant_Name,
            Date_of_Birth: isoDate(r.Date_of_Birth),
            Sex: r.Sex,
            Civil_Status: r.Civil_Status,
            TIN: r.TIN,
            Nationality: r.Nationality,
            Religion: r.Religion,
            POB: r.POB,
            Home_Address: r.Home_Address,
            Mobile_Number: r.Mobile_Number,
            Email_Address: r.Email_Address,
            Telephone_Number: r.Telephone_Number,
            Father_Name: r.Father_Name,
            Mother_Maiden_Name: r.Mother_Maiden_Name,
            Employment_Type: r.Employment_Type
        },
        spouse: {
            Spouse_Name: record.spouse?.Spouse_Name || '',
            Spouse_DOB: isoDate(record.spouse?.Spouse_DOB)
        },
        children: record.children || [],
        otherBeneficiaries: record.otherBeneficiaries || [],
        employmentDetails: {
            SE_Profession: se.SE_Profession,
            SE_Year_Started: se.SE_Year_Started,
            SE_Monthly_Earnings: se.SE_Monthly_Earnings,
            OFW_Foreign_Address: ofw.OFW_Foreign_Address,
            OFW_Monthly_Earnings: ofw.OFW_Monthly_Earnings,
            OFW_FlexiFund_Flag: ofw.OFW_FlexiFund_Flag === 'Y' || ofw.OFW_FlexiFund_Flag === 1,
            WS_SSN: nws.WS_SSN,
            WS_Income: nws.WS_Income
        }
    };
}

function payloadToRecord(payload) {
    const employmentType = payload.registrant.Employment_Type;
    return {
        registrant: payload.registrant,
        spouse: payload.spouse.Spouse_Name || payload.spouse.Spouse_DOB ? {
            Spouse_Name: payload.spouse.Spouse_Name,
            Spouse_DOB: payload.spouse.Spouse_DOB
        } : null,
        children: payload.children || [],
        otherBeneficiaries: payload.otherBeneficiaries || [],
        employmentDetails: {
            selfEmployed: employmentType === 'SE' ? {
                SE_Profession: payload.employmentDetails.SE_Profession,
                SE_Year_Started: payload.employmentDetails.SE_Year_Started,
                SE_Monthly_Earnings: payload.employmentDetails.SE_Monthly_Earnings
            } : null,
            ofw: employmentType === 'OFW' ? {
                OFW_Foreign_Address: payload.employmentDetails.OFW_Foreign_Address,
                OFW_Monthly_Earnings: payload.employmentDetails.OFW_Monthly_Earnings,
                OFW_FlexiFund_Flag: payload.employmentDetails.OFW_FlexiFund_Flag ? 'Y' : 'N'
            } : null,
            nonWorkingSpouse: employmentType === 'NWS' ? {
                WS_SSN: payload.employmentDetails.WS_SSN,
                WS_Income: payload.employmentDetails.WS_Income
            } : null
        }
    };
}

function computeQualityWarnings(payload) {
    const warnings = [];
    const r = payload.registrant;
    const hasDependents = Boolean(payload.spouse.Spouse_Name || payload.children.length || payload.otherBeneficiaries.length);
    const validCivilStatuses = ['S', 'M', 'W', 'LS', 'O'];
    const validEmploymentTypes = ['SE', 'OFW', 'NWS'];

    if (!r.TIN) warnings.push('TIN is blank.');
    if (!r.Mobile_Number) warnings.push('Mobile number is blank.');
    if (!r.Email_Address) warnings.push('Email address is blank.');
    if (!r.Sex) warnings.push('Sex is blank.');
    if (r.Sex && !['M', 'F'].includes(r.Sex)) warnings.push('Sex code is not recognized.');
    if (!r.Civil_Status) warnings.push('Civil status is blank.');
    if (r.Civil_Status && !validCivilStatuses.includes(r.Civil_Status)) warnings.push('Civil status code is not recognized.');
    if (!r.Employment_Type) warnings.push('Employment type is blank.');
    if (r.Employment_Type && !validEmploymentTypes.includes(r.Employment_Type)) warnings.push('Employment type is not recognized.');
    if (!hasDependents) warnings.push('No spouse, child, or beneficiary has been added.');
    if (r.Civil_Status === 'M' && !payload.spouse.Spouse_Name) warnings.push('Civil status is married but spouse name is blank.');
    if (r.Employment_Type === 'SE' && !payload.employmentDetails.SE_Profession) warnings.push('Self-employed profession or business is blank.');
    if (r.Employment_Type === 'SE' && !payload.employmentDetails.SE_Monthly_Earnings) warnings.push('Self-employed monthly earnings are blank.');
    if (r.Employment_Type === 'OFW' && !payload.employmentDetails.OFW_Foreign_Address) warnings.push('OFW foreign address is blank.');
    if (r.Employment_Type === 'OFW' && !payload.employmentDetails.OFW_Monthly_Earnings) warnings.push('OFW monthly earnings are blank.');
    if (r.Employment_Type === 'NWS' && !payload.employmentDetails.WS_SSN) warnings.push('Working spouse SS number is blank.');
    if (r.Employment_Type === 'NWS' && !payload.employmentDetails.WS_Income) warnings.push('Working spouse monthly income is blank.');

    return warnings;
}

function validationChecklistItems(payload) {
    const r = payload.registrant;
    return [
        { label: 'Generated SS number is present', done: Boolean(r.SS_Number) },
        { label: 'Registrant first and last name are filled', done: Boolean(value('Registrant_First_Name') && value('Registrant_Last_Name')) },
        { label: 'Date of birth, sex, and civil status are selected', done: Boolean(r.Date_of_Birth && r.Sex && r.Civil_Status) },
        { label: 'Required address parts are complete', done: Boolean(value('Address_Barangay') && value('Address_City') && value('Address_Province') && value('Address_Zip')) },
        { label: "Mother's maiden name is complete", done: Boolean(value('Mother_First_Name') && value('Mother_Last_Name')) },
        { label: 'At least one dependent or beneficiary is listed', done: Boolean(payload.spouse.Spouse_Name || payload.children.length || payload.otherBeneficiaries.length) },
        { label: 'Employment section matches the selected type', done: Boolean(
            (r.Employment_Type === 'SE' && payload.employmentDetails.SE_Profession)
            || (r.Employment_Type === 'OFW' && payload.employmentDetails.OFW_Foreign_Address)
            || (r.Employment_Type === 'NWS' && payload.employmentDetails.WS_SSN)
        ) },
        { label: 'Contact details include mobile or email', done: Boolean(r.Mobile_Number || r.Email_Address) }
    ];
}

function updateValidationChecklist(payload = buildPayload()) {
    if (!validationChecklist) return;
    const items = validationChecklistItems(payload);
    const completed = items.filter(item => item.done).length;
    validationChecklist.classList.toggle('checklist-complete', completed === items.length);
    validationChecklistSummary.textContent = `${completed}/${items.length} complete`;
    validationChecklistList.innerHTML = items.map(item => `
        <li class="${item.done ? 'is-done' : 'is-open'}">
            <span>${item.done ? 'OK' : '!'}</span>
            ${escapeHtml(item.label)}
        </li>
    `).join('');
}

function updateAddressPreview() {
    if (!addressPreviewText) return;
    const requiredAddressComplete = value('Address_Barangay')
        && value('Address_City')
        && value('Address_Province')
        && value('Address_Zip');
    const formatted = composeHomeAddress();
    addressPreviewText.textContent = requiredAddressComplete && formatted
        ? formatted
        : 'Complete barangay, city/municipality, province, and ZIP code.';
}

function updateQualityPanel() {
    if (!qualityPanel) return;
    const payload = buildPayload();
    const warnings = computeQualityWarnings(payload);
    const isClean = warnings.length === 0;
    qualityPanel.classList.toggle('quality-ok', isClean);
    qualityPanel.classList.toggle('quality-warning', !isClean);
    qualitySummary.textContent = isClean ? 'Quality OK' : `${warnings.length} item${warnings.length === 1 ? '' : 's'} need review`;
    qualityList.innerHTML = isClean
        ? '<li>All key quality checks passed.</li>'
        : warnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join('');
    updateValidationChecklist(payload);
    updateAddressPreview();
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
    document.getElementById('summary-quality').textContent = summary.needsReview;
}

function updateRecordsMode() {
    const isArchivePage = recordStatusFilter.value === 'archived';
    document.body.classList.toggle('archive-page-mode', isArchivePage);
    document.getElementById('records-title').textContent = isArchivePage ? 'Trash Page' : 'Saved Records';
}

async function loadRecords(search = '') {
    const status = recordStatusFilter.value;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (recordEmploymentFilter.value) params.set('employment', recordEmploymentFilter.value);
    if (recordSexFilter.value) params.set('sex', recordSexFilter.value);
    if (recordCivilFilter.value) params.set('civil', recordCivilFilter.value);
    if (recordQualityFilter.value) params.set('quality', recordQualityFilter.value);
    if (recordCityFilter.value) params.set('location', recordCityFilter.value);
    if (recordAgeMinFilter.value) params.set('ageMin', recordAgeMinFilter.value);
    if (recordAgeMaxFilter.value) params.set('ageMax', recordAgeMaxFilter.value);
    if (recordCreatedFromFilter.value) params.set('createdFrom', recordCreatedFromFilter.value);
    if (recordCreatedToFilter.value) params.set('createdTo', recordCreatedToFilter.value);
    updateRecordsMode();
    const records = await requestJson(`/api/e1-records?${params.toString()}`);
    document.getElementById('record-count').textContent = `${records.length} ${records.length === 1 ? 'record' : 'records'}`;
    recordList.innerHTML = '';
    document.getElementById('empty-records').classList.toggle('hidden', records.length > 0);

    records.forEach(record => {
        const archived = Number(record.Is_Archived) === 1;
        const needsReview = Number(record.Quality_Issues) > 0;
        const item = document.createElement('article');
        item.className = `record-card${archived ? ' is-archived' : ''}`;
        item.innerHTML = `
            <div class="record-card-head">
                <div>
                    <strong>${escapeHtml(record.Registrant_Name)}</strong>
                    <span>${escapeHtml(record.SS_Number)}</span>
                </div>
                <div class="pill-stack">
                    <span class="status-pill">${archived ? 'Archived' : 'Active'}</span>
                    <span class="status-pill ${needsReview ? 'pill-warning' : 'pill-success'}">${needsReview ? 'Needs Review' : 'Quality OK'}</span>
                </div>
            </div>
            <dl>
                <div><dt>DOB</dt><dd>${formatDate(record.Date_of_Birth)}</dd></div>
                <div><dt>Sex</dt><dd>${formatSex(record.Sex)}</dd></div>
                <div><dt>Status</dt><dd>${formatCivilStatus(record.Civil_Status)}</dd></div>
                <div><dt>Type</dt><dd>${employmentLabel(record.Employment_Type)}</dd></div>
                <div><dt>Dependents/Ben.</dt><dd>${Number(record.Beneficiary_Count || 0)}</dd></div>
                <div><dt>Updated</dt><dd>${formatDate(record.Updated_At)}</dd></div>
            </dl>
            <div class="record-actions">
                <button type="button" class="btn btn-secondary" data-action="view">View</button>
                ${needsReview ? '<button type="button" class="btn btn-secondary" data-action="issues">Issues</button>' : ''}
                <button type="button" class="btn btn-secondary" data-action="pdf">PDF</button>
                ${archived
                    ? '<button type="button" class="btn btn-secondary" data-action="restore">Restore</button>'
                    : '<button type="button" class="btn btn-secondary" data-action="edit">Edit</button><button type="button" class="btn btn-danger" data-action="delete">Archive</button>'}
            </div>
        `;
        item.querySelector('[data-action="view"]').addEventListener('click', () => openRecordPreview(record.SS_Number));
        item.querySelector('[data-action="issues"]')?.addEventListener('click', () => openReviewIssuesPanel(record.SS_Number));
        item.querySelector('[data-action="pdf"]').addEventListener('click', () => printRecordById(record.SS_Number));
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
    document.getElementById('SS_Number').readOnly = true;
    setValue('SS_Number', randomSsNumber());
    document.getElementById('form-mode').textContent = 'New record';
    document.getElementById('save-record').textContent = 'Save E-1 Record';
    setValue('Address_Country', 'Philippines');
    childrenList.innerHTML = '';
    otherBeneficiariesList.innerHTML = '';
    updateEmploymentPanels();
    updateSpouseSection();
    updateQualityPanel();
    updateRegistrantAge();
    setWizardStep(0);
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
    setNameParts('Registrant', randomFullName());
    setValue('Date_of_Birth', randomDate(1965, 2004));
    setValue('Sex', randomItem(['M', 'F']));
    setValue('Civil_Status', randomItem(['S', 'M', 'W', 'LS']));
    setValue('TIN', randomTin());
    setValue('Nationality', 'Filipino');
    setValue('Religion', randomItem(religions));
    setValue('POB', `${city}, Philippines`);
    setValue('Address_Unit', `Unit ${randomNumber(1, 20)}`);
    setValue('Address_House_Lot', String(randomNumber(10, 999)));
    setValue('Address_Street', `${randomItem(lastNames)} Street`);
    setValue('Address_Subdivision', randomItem(['Greenview', 'San Isidro Homes', 'Riverside Village', '']));
    setValue('Address_Barangay', `Barangay ${randomItem(firstNames)}`);
    setValue('Address_City', city);
    setValue('Address_Province', randomItem(['Metro Manila', 'Cebu', 'Davao del Sur', 'Rizal', 'Benguet']));
    setValue('Address_Country', 'Philippines');
    setValue('Address_Zip', randomNumber(1000, 9999));
    setValue('Mobile_Number', `09${randomNumber(100000000, 999999999)}`);
    setValue('Email_Address', `${firstName}.${lastName}${randomNumber(10, 99)}@example.com`);
    setValue('Telephone_Number', `02-${randomNumber(1000, 9999)}-${randomNumber(1000, 9999)}`);
    setNameParts('Father', randomFullName());
    setNameParts('Mother', randomFullName());
    setNameParts('Spouse', randomFullName());
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
    updateSpouseSection();
    updateQualityPanel();
    updateRegistrantAge();
    clearValidation();
    showStatus('Random sample data filled in. Review it, then save when ready.', 'success');
}

function detailRow(label, fieldValue) {
    return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(fieldValue || '-')}</dd></div>`;
}

function renderPeopleList(people, emptyLabel) {
    if (!people.length) return `<p class="muted-note">${escapeHtml(emptyLabel)}</p>`;
    return `
        <ul class="detail-list">
            ${people.map(person => `
                <li>
                    <strong>${escapeHtml(person.Ben_Name || '-')}</strong>
                    <span>${escapeHtml(person.Ben_Relationship || 'Child')} · ${formatDate(person.Ben_DOB)}</span>
                </li>
            `).join('')}
        </ul>
    `;
}

function renderEmploymentPreview(record) {
    const r = record.registrant || {};
    const details = record.employmentDetails || {};
    if (r.Employment_Type === 'OFW') {
        const ofw = details.ofw || {};
        return `
            <dl>
                ${detailRow('Foreign Address', ofw.OFW_Foreign_Address)}
                ${detailRow('Monthly Earnings', `PHP ${money(ofw.OFW_Monthly_Earnings)}`)}
                ${detailRow('Flexi-Fund', ofw.OFW_FlexiFund_Flag === 'Y' || ofw.OFW_FlexiFund_Flag === 1 ? 'Yes' : 'No')}
            </dl>
        `;
    }
    if (r.Employment_Type === 'NWS') {
        const nws = details.nonWorkingSpouse || {};
        return `
            <dl>
                ${detailRow('Working Spouse SS/CRN', nws.WS_SSN)}
                ${detailRow('Working Spouse Income', `PHP ${money(nws.WS_Income)}`)}
            </dl>
        `;
    }
    const se = details.selfEmployed || {};
    return `
        <dl>
            ${detailRow('Profession/Business', se.SE_Profession)}
            ${detailRow('Year Started', se.SE_Year_Started)}
            ${detailRow('Monthly Earnings', `PHP ${money(se.SE_Monthly_Earnings)}`)}
        </dl>
    `;
}

function renderQualityPreview(payload) {
    const warnings = computeQualityWarnings(payload);
    if (!warnings.length) {
        return '<div class="quality-result good">All key data quality checks passed.</div>';
    }
    return `
        <div class="quality-result needs-work">
            <strong>${warnings.length} item${warnings.length === 1 ? '' : 's'} need review</strong>
            <ul>${warnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>
        </div>
    `;
}

function renderRecordPreview(record) {
    const r = record.registrant || {};
    const payload = recordToPayload(record);
    const archived = Number(r.Is_Archived) === 1;
    document.getElementById('detail-title').textContent = `${r.Registrant_Name || 'E-1 Record'} · ${r.SS_Number || ''}`;
    detailContent.innerHTML = `
        <section class="detail-hero">
            <div>
                <strong>${escapeHtml(r.Registrant_Name || '-')}</strong>
                <span>${escapeHtml(r.SS_Number || '-')}</span>
            </div>
            <span class="status-pill">${archived ? 'Archived' : 'Active'}</span>
        </section>
        <section>
            <h3>Personal Data</h3>
            <dl>
                ${detailRow('Date of Birth', formatDate(r.Date_of_Birth))}
                ${detailRow('Age', calculateAge(isoDate(r.Date_of_Birth)))}
                ${detailRow('Sex', formatSex(r.Sex))}
                ${detailRow('Civil Status', formatCivilStatus(r.Civil_Status))}
                ${detailRow('TIN', r.TIN)}
                ${detailRow('Nationality', r.Nationality)}
                ${detailRow('Religion', r.Religion)}
                ${detailRow('Place of Birth', r.POB)}
                ${detailRow('Employment Type', employmentLabel(r.Employment_Type))}
            </dl>
        </section>
        <section>
            <h3>Contact and Address</h3>
            <dl>
                ${detailRow('Mobile', r.Mobile_Number)}
                ${detailRow('Email', r.Email_Address)}
                ${detailRow('Telephone', r.Telephone_Number)}
            </dl>
            <p>${escapeHtml(r.Home_Address || '-')}</p>
        </section>
        <section>
            <h3>Dependents and Beneficiaries</h3>
            <dl>
                ${detailRow('Spouse', record.spouse?.Spouse_Name)}
                ${detailRow('Spouse DOB', formatDate(record.spouse?.Spouse_DOB))}
                ${detailRow('Children', record.children?.length || 0)}
                ${detailRow('Other Beneficiaries', record.otherBeneficiaries?.length || 0)}
            </dl>
            ${renderPeopleList(record.children || [], 'No children listed.')}
            ${renderPeopleList(record.otherBeneficiaries || [], 'No other beneficiaries listed.')}
        </section>
        <section>
            <h3>Section C Details</h3>
            ${renderEmploymentPreview(record)}
        </section>
        <section>
            <h3>Audit Fields</h3>
            <dl>
                ${detailRow('Created', formatDateTime(r.Created_At))}
                ${detailRow('Updated', formatDateTime(r.Updated_At))}
                ${detailRow('Archived', formatDateTime(r.Archived_At))}
            </dl>
        </section>
        <section>
            <h3>Data Quality Checker</h3>
            ${renderQualityPreview(payload)}
        </section>
    `;
}

async function openReviewIssuesPanel(ssNumber) {
    const record = await requestJson(`/api/e1-records/${encodeURIComponent(ssNumber)}`);
    currentPreviewRecord = record;
    const r = record.registrant || {};
    const payload = recordToPayload(record);
    const warnings = computeQualityWarnings(payload);
    document.getElementById('detail-title').textContent = `Review Issues · ${r.SS_Number || ''}`;
    detailContent.innerHTML = `
        <section class="detail-hero">
            <div>
                <strong>${escapeHtml(r.Registrant_Name || 'E-1 Record')}</strong>
                <span>${escapeHtml(r.SS_Number || '-')}</span>
            </div>
            <span class="status-pill ${warnings.length ? 'pill-warning' : 'pill-success'}">${warnings.length ? 'Needs Review' : 'Quality OK'}</span>
        </section>
        <section>
            <h3>Review Issues Panel</h3>
            ${renderQualityPreview(payload)}
        </section>
        <section>
            <h3>Recommended Action</h3>
            <p>${warnings.length ? 'Click Edit, complete the highlighted missing information, then save again.' : 'No review issues were found for this record.'}</p>
        </section>
    `;
    detailModal.classList.remove('hidden');
}

function activityDetails(inputValue) {
    if (!inputValue) return '';
    try {
        const parsed = typeof inputValue === 'string' ? JSON.parse(inputValue) : inputValue;
        return Object.entries(parsed || {})
            .map(([key, fieldValue]) => `${key}: ${fieldValue}`)
            .join(' · ');
    } catch (error) {
        return String(inputValue);
    }
}

async function openActivityLogs() {
    activityList.innerHTML = '<p class="muted-note">Loading activity logs...</p>';
    activityModal.classList.remove('hidden');
    try {
        const logs = await requestJson('/api/activity-logs');
        activityList.innerHTML = logs.length ? logs.map(log => `
            <article class="activity-item">
                <div>
                    <strong>${escapeHtml(log.Action || '-')}</strong>
                    <span>${escapeHtml(formatDateTime(log.Created_At))}</span>
                </div>
                <p>${escapeHtml(log.Record_Name || log.SS_Number || 'System')}</p>
                <small>${escapeHtml(activityDetails(log.Details))}</small>
            </article>
        `).join('') : '<p class="muted-note">No activity has been recorded yet.</p>';
    } catch (error) {
        activityList.innerHTML = `<p class="muted-note">${escapeHtml(error.message)}</p>`;
    }
}

function closeActivityLogs() {
    activityModal.classList.add('hidden');
}

async function openRecordPreview(ssNumber) {
    currentPreviewRecord = await requestJson(`/api/e1-records/${encodeURIComponent(ssNumber)}`);
    renderRecordPreview(currentPreviewRecord);
    detailModal.classList.remove('hidden');
}

function closeDetailModal() {
    detailModal.classList.add('hidden');
    currentPreviewRecord = null;
}

function officialDate(inputValue) {
    const date = isoDate(inputValue);
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return `${month}${day}${year}`;
}

function splitPersonName(inputValue) {
    const raw = String(inputValue || '').trim();
    if (!raw) return { last: '', first: '', middle: '', suffix: '' };
    const [lastPart, restPart = ''] = raw.split(',').map(part => part.trim());
    const parts = restPart.split(/\s+/).filter(Boolean);
    return {
        last: lastPart || raw,
        first: parts[0] || '',
        middle: parts.slice(1).join(' '),
        suffix: ''
    };
}

function officialDigits(inputValue, total, dividers = []) {
    const digits = digitsOnly(inputValue).slice(0, total).padEnd(total, ' ');
    return `
        <span class="official-digits digits-${total}">
            ${Array.from({ length: total }, (_, index) => `
                <i class="${dividers.includes(index + 1) ? 'has-divider' : ''}">${escapeHtml(digits[index].trim())}</i>
            `).join('')}
        </span>
    `;
}

function officialCheckbox(label, checked) {
    return `<span class="official-check"><b>${checked ? 'X' : ''}</b>${escapeHtml(label)}</span>`;
}

function officialCell(label, fieldValue = '', className = '') {
    return `
        <div class="official-cell ${className}">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(fieldValue || '')}</strong>
        </div>
    `;
}

function officialNameCell(label, inputValue, className = '') {
    const name = splitPersonName(inputValue);
    return `
        <div class="official-cell official-name ${className}">
            <span>${escapeHtml(label)}</span>
            <div>
                <strong>${escapeHtml(name.last)}</strong>
                <strong>${escapeHtml(name.first)}</strong>
                <strong>${escapeHtml(name.middle)}</strong>
                <strong>${escapeHtml(name.suffix)}</strong>
            </div>
            <small><b>(LAST NAME)</b><b>(FIRST NAME)</b><b>(MIDDLE NAME)</b><b>(SUFFIX)</b></small>
        </div>
    `;
}

function officialDateCell(label, inputValue, className = '') {
    return `
        <div class="official-cell official-date-cell ${className}">
            <span>${escapeHtml(label)}</span>
            ${officialDigits(officialDate(inputValue), 8, [2, 4])}
        </div>
    `;
}

function officialLine(label, fieldValue = '') {
    return `
        <div class="official-line">
            <strong>${escapeHtml(fieldValue || '')}</strong>
            <span>${escapeHtml(label)}</span>
        </div>
    `;
}

function officialBeneficiaryRows(people, count, includeRelationship = false) {
    return Array.from({ length: count }, (_, index) => {
        const person = people[index] || {};
        const name = splitPersonName(person.Ben_Name);
        return `
            <div class="official-beneficiary-row ${includeRelationship ? 'with-relationship' : ''}">
                <span>${index + 1}.</span>
                <strong>${escapeHtml(name.last)}</strong>
                <strong>${escapeHtml(name.first)}</strong>
                <strong>${escapeHtml(name.middle)}</strong>
                <strong>${escapeHtml(name.suffix)}</strong>
                ${includeRelationship ? `<em>${escapeHtml(person.Ben_Relationship || '')}</em>` : ''}
                <small>${officialDigits(officialDate(person.Ben_DOB), 8, [2, 4])}</small>
            </div>
        `;
    }).join('');
}

function renderOfficialE1(record) {
    const r = record.registrant || {};
    const details = record.employmentDetails || {};
    const se = details.selfEmployed || {};
    const ofw = details.ofw || {};
    const nws = details.nonWorkingSpouse || {};
    const employmentType = r.Employment_Type || 'SE';
    const civil = r.Civil_Status;
    return `
        <div class="official-sheet">
            <header class="official-header">
                <div class="official-brand">
                    <div class="official-logo"><span></span><span></span><span></span></div>
                    <div>
                        <strong>E-1</strong>
                        <small>COV-01214 (09-2015)</small>
                    </div>
                </div>
                <div class="official-title">
                    <p>Republic of the Philippines</p>
                    <h1>Social Security System</h1>
                    <h2>Personal Record</h2>
                    <strong>For Issuance of SS Number</strong>
                </div>
                <div class="official-ss">
                    <span>SS Number</span>
                    ${officialDigits(r.SS_Number, 10, [2, 9])}
                </div>
            </header>
            <p class="official-repro">THIS FORM MAY BE REPRODUCED AND IS NOT FOR SALE. THIS CAN ALSO BE DOWNLOADED THRU THE SSS WEBSITE AT www.sss.gov.ph.</p>
            <p class="official-instruction">PLEASE READ THE INSTRUCTIONS AND REMINDERS AT THE BACK BEFORE FILLING OUT THIS FORM. PRINT ALL INFORMATION IN CAPITAL LETTERS AND <b>USE BLACK INK ONLY.</b></p>
            <h3>Part I - To Be Filled Out By The Registrant</h3>
            <h4>A. Personal Data</h4>
            <div class="official-grid">
                ${officialNameCell('Name', r.Registrant_Name, 'wide-3')}
                ${officialDateCell('Date of Birth (MMDDYYYY)', r.Date_of_Birth)}
                <div class="official-cell official-options">
                    <span>Sex</span>
                    <div>${officialCheckbox('Male', r.Sex === 'M')}${officialCheckbox('Female', r.Sex === 'F')}</div>
                </div>
                <div class="official-cell official-options wide-2">
                    <span>Civil Status</span>
                    <div>
                        ${officialCheckbox('Single', civil === 'S')}
                        ${officialCheckbox('Married', civil === 'M')}
                        ${officialCheckbox('Widowed', civil === 'W')}
                        ${officialCheckbox('Legally Separated', civil === 'LS')}
                        ${officialCheckbox('Others', civil === 'O')}
                    </div>
                </div>
                <div class="official-cell official-date-cell">
                    <span>Tax Identification Number (if any)</span>
                    ${officialDigits(r.TIN, 12, [3, 6, 9])}
                </div>
                ${officialCell('Nationality', r.Nationality)}
                ${officialCell('Religion', r.Religion)}
                ${officialCell('Place of Birth', r.POB, 'wide-2')}
                ${officialCell('Home Address', r.Home_Address, 'wide-4')}
                ${officialCell('Mobile/Cellphone Number', r.Mobile_Number)}
                ${officialCell('Email Address', r.Email_Address, 'wide-2')}
                ${officialCell('Telephone Number', r.Telephone_Number)}
                ${officialNameCell('Father', r.Father_Name, 'wide-4')}
                ${officialNameCell("Mother's Maiden Name", r.Mother_Maiden_Name, 'wide-4')}
            </div>
            <h4 class="official-h4-with-check"><span>B. Dependent(s)/Beneficiary/ies</span>${officialCheckbox('Check this box if using additional sheet.', document.getElementById('additional-sheet')?.checked)}</h4>
            <div class="official-grid">
                ${officialNameCell('Spouse', record.spouse?.Spouse_Name, 'wide-3')}
                ${officialDateCell('Date of Birth (MMDDYYYY)', record.spouse?.Spouse_DOB)}
            </div>
            <div class="official-beneficiary-head child-head"><span>Child/ren</span><b>(LAST NAME)</b><b>(FIRST NAME)</b><b>(MIDDLE NAME)</b><b>(SUFFIX)</b><b>DATE OF BIRTH (MMDDYYYY)</b></div>
            ${officialBeneficiaryRows(record.children || [], 5)}
            <div class="official-beneficiary-head other-head"><span>Other Beneficiary/ies <i>(If without spouse and child and parents are both deceased)</i></span><b>(LAST NAME)</b><b>(FIRST NAME)</b><b>(MIDDLE NAME)</b><b>(SUFFIX)</b><b>RELATIONSHIP</b><b>DATE OF BIRTH (MMDDYYYY)</b></div>
            ${officialBeneficiaryRows(record.otherBeneficiaries || [], 2, true)}
            <h4>C. For Self-Employed / Overseas Filipino Worker / Non-Working Spouse</h4>
            <div class="official-three">
                <section>
                    <strong>Self-Employed (SE)</strong>
                    ${officialLine('Profession/Business', employmentType === 'SE' ? se.SE_Profession : '')}
                    ${officialLine('Year Prof./Business Started', employmentType === 'SE' ? se.SE_Year_Started : '')}
                    ${officialLine('Monthly Earnings', employmentType === 'SE' && se.SE_Monthly_Earnings ? `P ${moneyOrBlank(se.SE_Monthly_Earnings)}` : '')}
                </section>
                <section>
                    <strong>Overseas Filipino Worker (OFW)</strong>
                    ${officialLine('Foreign Address', employmentType === 'OFW' ? ofw.OFW_Foreign_Address : '')}
                    ${officialLine('Monthly Earnings', employmentType === 'OFW' && ofw.OFW_Monthly_Earnings ? `P ${moneyOrBlank(ofw.OFW_Monthly_Earnings)}` : '')}
                    <div class="official-flexi">
                        <span>Are you applying for membership in the Flexi-Fund Program?</span>
                        ${officialCheckbox('YES', employmentType === 'OFW' && (ofw.OFW_FlexiFund_Flag === 'Y' || ofw.OFW_FlexiFund_Flag === 1))}
                        ${officialCheckbox('NO', employmentType === 'OFW' && !(ofw.OFW_FlexiFund_Flag === 'Y' || ofw.OFW_FlexiFund_Flag === 1))}
                    </div>
                </section>
                <section>
                    <strong>Non-Working Spouse (NWS)</strong>
                    ${officialLine('SS No./Common Reference No. of Working Spouse', employmentType === 'NWS' ? nws.WS_SSN : '')}
                    ${officialLine('Monthly Income of Working Spouse (P)', employmentType === 'NWS' && nws.WS_Income ? moneyOrBlank(nws.WS_Income) : '')}
                    <p class="official-consent">I agree with my spouse's membership with SSS.</p>
                    ${officialLine('SIGNATURE OVER PRINTED NAME OF WORKING SPOUSE')}
                </section>
            </div>
            <h4>D. Certification</h4>
            <div class="official-certification">
                <section>
                    <p>I certify that the information provided in this form are true and correct.</p>
                    <em>(If registrant cannot sign, affix fingerprints in the presence of an SSS personnel.)</em>
                    <div class="official-sign-lines">${officialLine('PRINTED NAME')}${officialLine('SIGNATURE')}${officialLine('DATE')}</div>
                </section>
                <section>
                    <strong>Registrant is required to affix fingerprints.</strong>
                    <div class="official-fingerprints"><div><span>RIGHT THUMB</span></div><div><span>RIGHT INDEX</span></div></div>
                </section>
            </div>
            <h3>Part II - To Be Filled Out By SSS</h3>
            <div class="official-sss-grid">
                ${officialCell('Business Code (for SE)')}
                ${officialCell("Working Spouse's MSC (for NWS)", 'P')}
                ${officialCell('Received By (Representative Office/Partner Agent)', '', 'wide-2')}
                ${officialCell('Received & Processed By (MSS, Branch/Service Office/Foreign Office)', '', 'wide-2')}
                ${officialCell('Monthly SS Contribution (for SE/OFW/NWS)', 'P')}
                ${officialCell('Approved MSC (for SE/OFW/NWS)', 'P')}
                ${officialCell('Reviewed By (MSS, Branch/Service Office)', '', 'wide-4')}
                ${officialCell('Start of Payment (for SE/NWS)')}
                <div class="official-cell official-options"><span>Flexi-Fund Application (for OFW)</span><div>${officialCheckbox('Approved', false)}${officialCheckbox('Disapproved', false)}</div></div>
            </div>
        </div>
    `;
}

function printOfficialRecord(record) {
    officialPrint.innerHTML = renderOfficialE1(record);
    officialPrint.classList.remove('hidden');
    document.body.classList.add('printing-official');
    showStatus('Opening official E-1 print sheet. Choose Save as PDF to export.', 'neutral');
    setTimeout(() => window.print(), 80);
}

async function printRecordById(ssNumber) {
    const record = await requestJson(`/api/e1-records/${encodeURIComponent(ssNumber)}`);
    printOfficialRecord(record);
}

async function editRecord(ssNumber) {
    const record = await requestJson(`/api/e1-records/${encodeURIComponent(ssNumber)}`);
    const r = record.registrant;
    editingId = r.SS_Number;

    setValue('SS_Number', r.SS_Number);
    setNameParts('Registrant', r.Registrant_Name);
    setAddressParts(r.Home_Address);
    setNameParts('Father', r.Father_Name);
    setNameParts('Mother', r.Mother_Maiden_Name);
    [
        'TIN', 'Nationality', 'Religion', 'POB',
        'Mobile_Number', 'Email_Address', 'Telephone_Number'
    ].forEach(field => setValue(field, r[field]));
    setValue('Date_of_Birth', isoDate(r.Date_of_Birth));
    setValue('Sex', r.Sex);
    setValue('Civil_Status', r.Civil_Status);
    document.querySelector(`input[name="Employment_Type"][value="${r.Employment_Type || 'SE'}"]`).checked = true;

    setNameParts('Spouse', record.spouse?.Spouse_Name || '');
    setValue('Spouse_DOB', isoDate(record.spouse?.Spouse_DOB));
    updateSpouseSection({ clearWhenHidden: false });

    childrenList.innerHTML = '';
    record.children.forEach(child => {
        childrenList.appendChild(createPersonRow('child', child));
    });

    otherBeneficiariesList.innerHTML = '';
    record.otherBeneficiaries.forEach(beneficiary => {
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

    document.getElementById('SS_Number').readOnly = true;
    document.getElementById('form-mode').textContent = `Editing ${r.SS_Number}`;
    document.getElementById('save-record').textContent = 'Update E-1 Record';
    updateEmploymentPanels();
    updateSpouseSection({ clearWhenHidden: false });
    updateQualityPanel();
    updateRegistrantAge();
    setWizardStep(0);
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
    const payload = buildPayload();
    printOfficialRecord(payloadToRecord(payload));
}

function openArchivePage() {
    recordStatusFilter.value = 'archived';
    loadRecords(recordSearch.value).catch(error => showStatus(error.message, 'error'));
    document.querySelector('.records-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearRecordFilters() {
    recordStatusFilter.value = 'active';
    recordEmploymentFilter.value = '';
    recordSexFilter.value = '';
    recordCivilFilter.value = '';
    recordQualityFilter.value = '';
    recordCityFilter.value = '';
    recordAgeMinFilter.value = '';
    recordAgeMaxFilter.value = '';
    recordCreatedFromFilter.value = '';
    recordCreatedToFilter.value = '';
    recordSearch.value = '';
    loadRecords('').catch(error => showStatus(error.message, 'error'));
}

function attachSmartFormatting() {
    [
        ['SS_Number', formatSsNumber],
        ['WS_SSN', formatSsNumber],
        ['TIN', formatTinNumber],
        ['Mobile_Number', formatMobileNumber]
    ].forEach(([id, formatter]) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('input', () => {
            const formatted = formatter(input.value);
            if (input.value !== formatted) input.value = formatted;
        });
    });
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
            payload.registrant.SS_Number = randomSsNumber();
            setValue('SS_Number', payload.registrant.SS_Number);
            if (await checkDuplicateSsNumber(payload.registrant.SS_Number)) {
                showValidationErrors([{ id: 'SS_Number', message: 'Generated SS Number already exists. Click Clear Form to generate a new one.' }]);
                return;
            }
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
archivePage.addEventListener('click', openArchivePage);
activityPage.addEventListener('click', openActivityLogs);
themeToggle.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});
document.getElementById('Date_of_Birth').addEventListener('change', updateRegistrantAge);
document.getElementById('Date_of_Birth').addEventListener('input', updateRegistrantAge);
document.getElementById('Civil_Status').addEventListener('change', () => {
    updateSpouseSection();
    updateQualityPanel();
});
wizardSteps?.addEventListener('click', event => {
    const button = event.target.closest('[data-step]');
    if (button) setWizardStep(Number(button.dataset.step));
});
wizardPrev?.addEventListener('click', () => setWizardStep(currentWizardStep - 1));
wizardNext?.addEventListener('click', () => setWizardStep(currentWizardStep + 1));
document.getElementById('add-child').addEventListener('click', () => {
    childrenList.appendChild(createPersonRow('child'));
    updateQualityPanel();
});
document.getElementById('add-beneficiary').addEventListener('click', () => {
    otherBeneficiariesList.appendChild(createPersonRow('other'));
    updateQualityPanel();
});
document.querySelectorAll('input[name="Employment_Type"]').forEach(input => {
    input.addEventListener('change', () => {
        updateEmploymentPanels();
        updateQualityPanel();
    });
});
recordSearch.addEventListener('input', () => loadRecords(recordSearch.value));
[
    recordStatusFilter,
    recordEmploymentFilter,
    recordSexFilter,
    recordCivilFilter,
    recordQualityFilter,
    recordCityFilter,
    recordAgeMinFilter,
    recordAgeMaxFilter,
    recordCreatedFromFilter,
    recordCreatedToFilter
].forEach(filter => {
    filter.addEventListener('input', () => loadRecords(recordSearch.value));
    filter.addEventListener('change', () => loadRecords(recordSearch.value));
});
document.getElementById('clear-record-filters').addEventListener('click', clearRecordFilters);
document.getElementById('review-close').addEventListener('click', closeReviewModal);
document.getElementById('review-back').addEventListener('click', closeReviewModal);
reviewConfirm.addEventListener('click', saveConfirmedRecord);
document.getElementById('detail-close').addEventListener('click', closeDetailModal);
document.getElementById('detail-done').addEventListener('click', closeDetailModal);
document.getElementById('detail-edit').addEventListener('click', () => {
    if (!currentPreviewRecord?.registrant?.SS_Number) return;
    const ssNumber = currentPreviewRecord.registrant.SS_Number;
    closeDetailModal();
    editRecord(ssNumber).catch(error => showStatus(error.message, 'error'));
});
document.getElementById('detail-pdf').addEventListener('click', () => {
    if (currentPreviewRecord) printOfficialRecord(currentPreviewRecord);
});
document.getElementById('activity-close').addEventListener('click', closeActivityLogs);
form.addEventListener('input', updateQualityPanel);
form.addEventListener('change', updateQualityPanel);
window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing-official');
    officialPrint.classList.add('hidden');
    officialPrint.innerHTML = '';
});

attachSmartFormatting();
resetForm();
applyTheme(localStorage.getItem('sss-e1-theme') || 'light');
refreshRecords().catch(error => showStatus(error.message, 'error'));
