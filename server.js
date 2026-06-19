require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sss_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

let appTablesReady = null;
function ensureAppTables() {
    if (!appTablesReady) {
        appTablesReady = pool.query(`
            CREATE TABLE IF NOT EXISTS Record_Status (
                SS_Number varchar(15) NOT NULL,
                Is_Archived tinyint(1) NOT NULL DEFAULT 0,
                Created_At timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                Updated_At timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                Archived_At timestamp NULL DEFAULT NULL,
                PRIMARY KEY (SS_Number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }
    return appTablesReady;
}

function emptyToNull(value) {
    if (value === undefined || value === null || value === '') return null;
    return value;
}

function sexCode(value) {
    if (!value) return null;
    return String(value).toUpperCase().startsWith('F') ? 'F' : 'M';
}

function civilStatusCode(value) {
    const map = {
        Single: 'S',
        Married: 'M',
        Widowed: 'W',
        'Legally Separated': 'LS',
        Others: 'O'
    };
    return map[value] || value || null;
}

async function nextBeneficiaryId(conn) {
    const [rows] = await conn.query(
        `SELECT MAX(CAST(SUBSTRING(Ben_ID, 2) AS UNSIGNED)) AS maxId
         FROM Beneficiaries_Table
         WHERE Ben_ID REGEXP '^B[0-9]+$'`
    );
    const next = Number(rows[0]?.maxId || 0) + 1;
    return `B${String(next).padStart(5, '0')}`;
}

async function getE1Record(ssNumber) {
    await ensureAppTables();
    const [[registrant]] = await pool.query(
        `SELECT r.*, COALESCE(s.Is_Archived, 0) AS Is_Archived, s.Created_At, s.Updated_At, s.Archived_At
         FROM Registrant_Table r
         LEFT JOIN Record_Status s ON s.SS_Number = r.SS_Number
         WHERE r.SS_Number = ?`,
        [ssNumber]
    );
    if (!registrant) return null;

    const [[spouse]] = await pool.query('SELECT * FROM Spouse_Table WHERE SS_Number = ?', [ssNumber]);
    const [beneficiaries] = await pool.query(
        'SELECT * FROM Beneficiaries_Table WHERE SS_Number = ? ORDER BY Ben_Relationship, Ben_ID',
        [ssNumber]
    );
    const [[selfEmployed]] = await pool.query('SELECT * FROM Self_Employed_Table WHERE SS_Number = ?', [ssNumber]);
    const [[ofw]] = await pool.query('SELECT * FROM OFW_Table WHERE SS_Number = ?', [ssNumber]);
    const [[nws]] = await pool.query('SELECT * FROM Non_Working_Spouse WHERE SS_Number = ?', [ssNumber]);

    return {
        registrant,
        spouse: spouse || null,
        children: beneficiaries.filter(b => String(b.Ben_Relationship || '').toLowerCase() === 'child'),
        otherBeneficiaries: beneficiaries.filter(b => String(b.Ben_Relationship || '').toLowerCase() !== 'child'),
        employmentDetails: {
            selfEmployed: selfEmployed || null,
            ofw: ofw || null,
            nonWorkingSpouse: nws || null
        }
    };
}

async function saveE1Record(payload, existingSsNumber = null) {
    await ensureAppTables();
    const d = payload.registrant || payload;
    const ssNumber = existingSsNumber || d.SS_Number;
    if (!ssNumber) {
        const err = new Error('SS Number is required.');
        err.status = 400;
        throw err;
    }

    const employmentType = d.Employment_Type || 'SE';
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        if (existingSsNumber && existingSsNumber !== d.SS_Number) {
            const err = new Error('SS Number cannot be changed while editing.');
            err.status = 400;
            throw err;
        }

        if (!existingSsNumber) {
            const [duplicates] = await conn.query(
                'SELECT SS_Number FROM Registrant_Table WHERE SS_Number = ? LIMIT 1',
                [ssNumber]
            );
            if (duplicates.length) {
                const err = new Error('SS Number already exists. Use Edit instead, or choose another SS Number.');
                err.status = 409;
                throw err;
            }
        }

        await conn.query(
            `INSERT INTO Registrant_Table
                (SS_Number, Registrant_Name, Date_of_Birth, Sex, Civil_Status, TIN, Nationality, Religion, POB,
                 Home_Address, Mobile_Number, Email_Address, Telephone_Number, Father_Name, Mother_Maiden_Name, Employment_Type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                Registrant_Name=VALUES(Registrant_Name),
                Date_of_Birth=VALUES(Date_of_Birth),
                Sex=VALUES(Sex),
                Civil_Status=VALUES(Civil_Status),
                TIN=VALUES(TIN),
                Nationality=VALUES(Nationality),
                Religion=VALUES(Religion),
                POB=VALUES(POB),
                Home_Address=VALUES(Home_Address),
                Mobile_Number=VALUES(Mobile_Number),
                Email_Address=VALUES(Email_Address),
                Telephone_Number=VALUES(Telephone_Number),
                Father_Name=VALUES(Father_Name),
                Mother_Maiden_Name=VALUES(Mother_Maiden_Name),
                Employment_Type=VALUES(Employment_Type)`,
            [
                ssNumber,
                d.Registrant_Name,
                d.Date_of_Birth,
                sexCode(d.Sex),
                civilStatusCode(d.Civil_Status),
                emptyToNull(d.TIN),
                emptyToNull(d.Nationality),
                emptyToNull(d.Religion),
                emptyToNull(d.POB),
                d.Home_Address,
                emptyToNull(d.Mobile_Number),
                emptyToNull(d.Email_Address),
                emptyToNull(d.Telephone_Number),
                emptyToNull(d.Father_Name),
                d.Mother_Maiden_Name,
                employmentType
            ]
        );

        await conn.query('DELETE FROM Spouse_Table WHERE SS_Number = ?', [ssNumber]);
        const spouse = payload.spouse || {};
        if (spouse.Spouse_Name) {
            await conn.query(
                `INSERT INTO Spouse_Table (SS_Number, Spouse_SSN, Spouse_Name, Spouse_DOB)
                 VALUES (?, ?, ?, ?)`,
                [
                    ssNumber,
                    spouse.Spouse_SSN || `SP-${Date.now().toString().slice(-12)}`,
                    spouse.Spouse_Name,
                    emptyToNull(spouse.Spouse_DOB)
                ]
            );
        }

        await conn.query('DELETE FROM Beneficiaries_Table WHERE SS_Number = ?', [ssNumber]);
        const beneficiaryRows = [
            ...(payload.children || []).map(child => ({ ...child, Ben_Relationship: 'Child' })),
            ...(payload.otherBeneficiaries || []).map(beneficiary => ({
                ...beneficiary,
                Ben_Relationship: beneficiary.Ben_Relationship || 'Other'
            }))
        ].filter(beneficiary => beneficiary.Ben_Name);

        for (const beneficiary of beneficiaryRows) {
            await conn.query(
                `INSERT INTO Beneficiaries_Table (Ben_ID, SS_Number, Ben_Name, Ben_DOB, Ben_Relationship)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    beneficiary.Ben_ID || await nextBeneficiaryId(conn),
                    ssNumber,
                    beneficiary.Ben_Name,
                    emptyToNull(beneficiary.Ben_DOB),
                    emptyToNull(beneficiary.Ben_Relationship)
                ]
            );
        }

        await conn.query('DELETE FROM Self_Employed_Table WHERE SS_Number = ?', [ssNumber]);
        await conn.query('DELETE FROM OFW_Table WHERE SS_Number = ?', [ssNumber]);
        await conn.query('DELETE FROM Non_Working_Spouse WHERE SS_Number = ?', [ssNumber]);

        const details = payload.employmentDetails || {};
        if (employmentType === 'SE') {
            await conn.query(
                `INSERT INTO Self_Employed_Table (SS_Number, SE_Profession, SE_Year_Started, SE_Monthly_Earnings)
                 VALUES (?, ?, ?, ?)`,
                [
                    ssNumber,
                    details.SE_Profession || 'N/A',
                    Number(details.SE_Year_Started || new Date().getFullYear()),
                    Number(details.SE_Monthly_Earnings || 0)
                ]
            );
        }

        if (employmentType === 'OFW') {
            await conn.query(
                `INSERT INTO OFW_Table (SS_Number, OFW_Foreign_Address, OFW_Monthly_Earnings, OFW_FlexiFund_Flag)
                 VALUES (?, ?, ?, ?)`,
                [
                    ssNumber,
                    details.OFW_Foreign_Address || 'N/A',
                    Number(details.OFW_Monthly_Earnings || 0),
                    details.OFW_FlexiFund_Flag ? 'Y' : 'N'
                ]
            );
        }

        if (employmentType === 'NWS') {
            await conn.query(
                `INSERT INTO Non_Working_Spouse (SS_Number, WS_SSN, WS_Income)
                 VALUES (?, ?, ?)`,
                [
                    ssNumber,
                    details.WS_SSN || 'N/A',
                    Number(details.WS_Income || 0)
                ]
            );
        }

        await conn.query(
            `INSERT INTO Record_Status (SS_Number, Is_Archived, Created_At, Updated_At, Archived_At)
             VALUES (?, 0, NOW(), NOW(), NULL)
             ON DUPLICATE KEY UPDATE
                Is_Archived = 0,
                Updated_At = NOW(),
                Archived_At = NULL`,
            [ssNumber]
        );

        await conn.commit();
        return ssNumber;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

// ─── E-1 PERSONAL RECORD DOCUMENT CRUD ────────────────────────
app.get('/api/e1-records', async (req, res) => {
    try {
        await ensureAppTables();
        const search = req.query.search ? `%${req.query.search}%` : null;
        const status = req.query.status || 'active';
        let query = `
            SELECT
                r.SS_Number, r.Registrant_Name, r.Date_of_Birth, r.Sex, r.Civil_Status, r.Mobile_Number,
                r.Email_Address, r.Employment_Type,
                COUNT(b.Ben_ID) AS Beneficiary_Count,
                COALESCE(s.Is_Archived, 0) AS Is_Archived,
                s.Created_At, s.Updated_At, s.Archived_At
            FROM Registrant_Table r
            LEFT JOIN Beneficiaries_Table b ON b.SS_Number = r.SS_Number
            LEFT JOIN Record_Status s ON s.SS_Number = r.SS_Number`;
        const where = [];
        const params = [];
        if (search) {
            where.push('(r.SS_Number LIKE ? OR r.Registrant_Name LIKE ? OR r.Email_Address LIKE ?)');
            params.push(search, search, search);
        }
        if (status === 'archived') {
            where.push('COALESCE(s.Is_Archived, 0) = 1');
        } else if (status !== 'all') {
            where.push('COALESCE(s.Is_Archived, 0) = 0');
        }
        if (where.length) query += ` WHERE ${where.join(' AND ')}`;
        query += `
            GROUP BY r.SS_Number, r.Registrant_Name, r.Date_of_Birth, r.Sex, r.Civil_Status,
                     r.Mobile_Number, r.Email_Address, r.Employment_Type,
                     s.Is_Archived, s.Created_At, s.Updated_At, s.Archived_At
            ORDER BY r.SS_Number DESC`;
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/e1-records/summary', async (req, res) => {
    try {
        await ensureAppTables();
        const [[summary]] = await pool.query(`
            SELECT
                SUM(CASE WHEN COALESCE(s.Is_Archived, 0) = 0 THEN 1 ELSE 0 END) AS totalActive,
                SUM(CASE WHEN COALESCE(s.Is_Archived, 0) = 1 THEN 1 ELSE 0 END) AS archived,
                SUM(CASE WHEN COALESCE(s.Is_Archived, 0) = 0 AND r.Employment_Type = 'SE' THEN 1 ELSE 0 END) AS selfEmployed,
                SUM(CASE WHEN COALESCE(s.Is_Archived, 0) = 0 AND r.Employment_Type = 'OFW' THEN 1 ELSE 0 END) AS ofw,
                SUM(CASE WHEN COALESCE(s.Is_Archived, 0) = 0 AND r.Employment_Type = 'NWS' THEN 1 ELSE 0 END) AS nonWorkingSpouse
            FROM Registrant_Table r
            LEFT JOIN Record_Status s ON s.SS_Number = r.SS_Number
        `);
        const [[beneficiaries]] = await pool.query(`
            SELECT COUNT(b.Ben_ID) AS totalBeneficiaries
            FROM Beneficiaries_Table b
            INNER JOIN Registrant_Table r ON r.SS_Number = b.SS_Number
            LEFT JOIN Record_Status s ON s.SS_Number = r.SS_Number
            WHERE COALESCE(s.Is_Archived, 0) = 0
        `);
        res.json({
            totalActive: Number(summary.totalActive || 0),
            archived: Number(summary.archived || 0),
            selfEmployed: Number(summary.selfEmployed || 0),
            ofw: Number(summary.ofw || 0),
            nonWorkingSpouse: Number(summary.nonWorkingSpouse || 0),
            totalBeneficiaries: Number(beneficiaries.totalBeneficiaries || 0)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/e1-records/check/:id', async (req, res) => {
    try {
        await ensureAppTables();
        const [[record]] = await pool.query(
            `SELECT r.SS_Number, COALESCE(s.Is_Archived, 0) AS Is_Archived
             FROM Registrant_Table r
             LEFT JOIN Record_Status s ON s.SS_Number = r.SS_Number
             WHERE r.SS_Number = ?`,
            [req.params.id]
        );
        res.json({
            exists: !!record,
            archived: !!record?.Is_Archived
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/e1-records/:id', async (req, res) => {
    try {
        const record = await getE1Record(req.params.id);
        if (!record) return res.status(404).json({ error: 'E-1 record not found.' });
        res.json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/e1-records', async (req, res) => {
    try {
        const id = await saveE1Record(req.body);
        res.status(201).json({ message: 'E-1 record created.', id });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

app.put('/api/e1-records/:id', async (req, res) => {
    try {
        const record = await getE1Record(req.params.id);
        if (!record) return res.status(404).json({ error: 'E-1 record not found.' });
        const id = await saveE1Record(req.body, req.params.id);
        res.json({ message: 'E-1 record updated.', id });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

app.delete('/api/e1-records/:id', async (req, res) => {
    try {
        await ensureAppTables();
        const [[record]] = await pool.query('SELECT SS_Number FROM Registrant_Table WHERE SS_Number = ?', [req.params.id]);
        if (!record) return res.status(404).json({ error: 'E-1 record not found.' });
        await pool.query(
            `INSERT INTO Record_Status (SS_Number, Is_Archived, Created_At, Updated_At, Archived_At)
             VALUES (?, 1, NOW(), NOW(), NOW())
             ON DUPLICATE KEY UPDATE
                Is_Archived = 1,
                Updated_At = NOW(),
                Archived_At = NOW()`,
            [req.params.id]
        );
        res.json({ message: 'E-1 record archived.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/e1-records/:id/restore', async (req, res) => {
    try {
        await ensureAppTables();
        const [[record]] = await pool.query('SELECT SS_Number FROM Registrant_Table WHERE SS_Number = ?', [req.params.id]);
        if (!record) return res.status(404).json({ error: 'E-1 record not found.' });
        await pool.query(
            `INSERT INTO Record_Status (SS_Number, Is_Archived, Created_At, Updated_At, Archived_At)
             VALUES (?, 0, NOW(), NOW(), NULL)
             ON DUPLICATE KEY UPDATE
                Is_Archived = 0,
                Updated_At = NOW(),
                Archived_At = NULL`,
            [req.params.id]
        );
        res.json({ message: 'E-1 record restored.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── REGISTRANTS ──────────────────────────────────────────────
app.get('/api/registrants', async (req, res) => {
    try {
        const search = req.query.search ? `%${req.query.search}%` : null;
        let query = 'SELECT * FROM Registrant_Table';
        let params = [];
        if (search) {
            query += ' WHERE SS_Number LIKE ? OR Registrant_Name LIKE ?';
            params = [search, search];
        }
        query += ' ORDER BY SS_Number DESC';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/registrants/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Registrant_Table WHERE SS_Number = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/registrants', async (req, res) => {
    const d = req.body;
    try {
        await pool.query(
            `INSERT INTO Registrant_Table (SS_Number,Registrant_Name,Date_of_Birth,Sex,Civil_Status,TIN,Nationality,Religion,POB,Home_Address,Mobile_Number,Email_Address,Telephone_Number,Father_Name,Mother_Maiden_Name,Employment_Type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [d.SS_Number,d.Registrant_Name,d.Date_of_Birth||null,d.Sex||null,d.Civil_Status||null,d.TIN||null,d.Nationality||null,d.Religion||null,d.POB||null,d.Home_Address||null,d.Mobile_Number||null,d.Email_Address||null,d.Telephone_Number||null,d.Father_Name||null,d.Mother_Maiden_Name||null,d.Employment_Type||d.Employement_Type||null]
        );
        res.status(201).json({ message: 'Created', id: d.SS_Number });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/registrants/:id', async (req, res) => {
    const d = req.body;
    try {
        const [result] = await pool.query(
            `UPDATE Registrant_Table SET Registrant_Name=?,Date_of_Birth=?,Sex=?,Civil_Status=?,TIN=?,Nationality=?,Religion=?,POB=?,Home_Address=?,Mobile_Number=?,Email_Address=?,Telephone_Number=?,Father_Name=?,Mother_Maiden_Name=?,Employment_Type=? WHERE SS_Number=?`,
            [d.Registrant_Name,d.Date_of_Birth||null,d.Sex||null,d.Civil_Status||null,d.TIN||null,d.Nationality||null,d.Religion||null,d.POB||null,d.Home_Address||null,d.Mobile_Number||null,d.Email_Address||null,d.Telephone_Number||null,d.Father_Name||null,d.Mother_Maiden_Name||null,d.Employment_Type||d.Employement_Type||null,req.params.id]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/registrants/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM Registrant_Table WHERE SS_Number = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── BENEFICIARIES ────────────────────────────────────────────
app.get('/api/beneficiaries', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Beneficiaries_Table ORDER BY Ben_ID');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/beneficiaries/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Beneficiaries_Table WHERE Ben_ID = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/beneficiaries', async (req, res) => {
    const d = req.body;
    try {
        const [result] = await pool.query('INSERT INTO Beneficiaries_Table (Ben_Name,Ben_DOB) VALUES (?,?)', [d.Ben_Name, d.Ben_DOB||null]);
        res.status(201).json({ message: 'Created', id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/beneficiaries/:id', async (req, res) => {
    const d = req.body;
    try {
        const [result] = await pool.query('UPDATE Beneficiaries_Table SET Ben_Name=?,Ben_DOB=? WHERE Ben_ID=?', [d.Ben_Name, d.Ben_DOB||null, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/beneficiaries/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM Beneficiaries_Table WHERE Ben_ID = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DESIGNATIONS ─────────────────────────────────────────────
app.get('/api/designations', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT SS_Number, Ben_ID, Ben_Relationship FROM Beneficiaries_Table ORDER BY SS_Number, Ben_ID');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/designations', async (req, res) => {
    const d = req.body;
    try {
        await pool.query('UPDATE Beneficiaries_Table SET SS_Number=?, Ben_Relationship=? WHERE Ben_ID=?', [d.SS_Number, d.Ben_Relationship||null, d.Ben_ID]);
        res.status(201).json({ message: 'Created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/designations/:ss/:ben', async (req, res) => {
    const d = req.body;
    try {
        const [result] = await pool.query('UPDATE Beneficiaries_Table SET Ben_Relationship=? WHERE SS_Number=? AND Ben_ID=?', [d.Ben_Relationship, req.params.ss, req.params.ben]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/designations/:ss/:ben', async (req, res) => {
    try {
        const [result] = await pool.query('UPDATE Beneficiaries_Table SET Ben_Relationship=NULL WHERE SS_Number=? AND Ben_ID=?', [req.params.ss, req.params.ben]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SPOUSES ──────────────────────────────────────────────────
app.get('/api/spouses', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Spouse_Table ORDER BY SS_Number');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/spouses/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Spouse_Table WHERE SS_Number = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/spouses', async (req, res) => {
    const d = req.body;
    try {
        await pool.query('INSERT INTO Spouse_Table (SS_Number,Spouse_Name,Spouse_DOB) VALUES (?,?,?)', [d.SS_Number, d.Spouse_Name, d.Spouse_DOB||null]);
        res.status(201).json({ message: 'Created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/spouses/:id', async (req, res) => {
    const d = req.body;
    try {
        const [result] = await pool.query('UPDATE Spouse_Table SET Spouse_Name=?,Spouse_DOB=? WHERE SS_Number=?', [d.Spouse_Name, d.Spouse_DOB||null, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/spouses/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM Spouse_Table WHERE SS_Number = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SELF-EMPLOYED ────────────────────────────────────────────
app.get('/api/self-employed', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Self_Employed_Table ORDER BY SS_Number');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/self-employed/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Self_Employed_Table WHERE SS_Number = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/self-employed', async (req, res) => {
    const d = req.body;
    try {
        await pool.query('INSERT INTO Self_Employed_Table (SS_Number,SE_Profession,SE_Year_Started,SE_Monthly_Earnings) VALUES (?,?,?,?)', [d.SS_Number, d.SE_Profession||null, d.SE_Year_Started||null, d.SE_Monthly_Earnings||null]);
        res.status(201).json({ message: 'Created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/self-employed/:id', async (req, res) => {
    const d = req.body;
    try {
        const [result] = await pool.query('UPDATE Self_Employed_Table SET SE_Profession=?,SE_Year_Started=?,SE_Monthly_Earnings=? WHERE SS_Number=?', [d.SE_Profession||null, d.SE_Year_Started||null, d.SE_Monthly_Earnings||null, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/self-employed/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM Self_Employed_Table WHERE SS_Number = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── OFW ──────────────────────────────────────────────────────
app.get('/api/ofw', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM OFW_Table ORDER BY SS_Number');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/ofw/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM OFW_Table WHERE SS_Number = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/ofw', async (req, res) => {
    const d = req.body;
    try {
        await pool.query('INSERT INTO OFW_Table (SS_Number,OFW_Foreign_Address,OFW_Monthly_Earnings,OFW_FlexiFund_Flag) VALUES (?,?,?,?)', [d.SS_Number, d.OFW_Foreign_Address||null, d.OFW_Monthly_Earnings||null, d.OFW_FlexiFund_Flag ? 1 : 0]);
        res.status(201).json({ message: 'Created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/ofw/:id', async (req, res) => {
    const d = req.body;
    try {
        const [result] = await pool.query('UPDATE OFW_Table SET OFW_Foreign_Address=?,OFW_Monthly_Earnings=?,OFW_FlexiFund_Flag=? WHERE SS_Number=?', [d.OFW_Foreign_Address||null, d.OFW_Monthly_Earnings||null, d.OFW_FlexiFund_Flag ? 1 : 0, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/ofw/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM OFW_Table WHERE SS_Number = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── NON-WORKING SPOUSE ───────────────────────────────────────
app.get('/api/nws', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Non_Working_Spouse ORDER BY SS_Number');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/nws/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Non_Working_Spouse WHERE SS_Number = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/nws', async (req, res) => {
    const d = req.body;
    try {
        await pool.query('INSERT INTO Non_Working_Spouse (SS_Number,WS_SSN,WS_Income) VALUES (?,?,?)', [d.SS_Number, d.WS_SSN||null, d.WS_Income||null]);
        res.status(201).json({ message: 'Created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/nws/:id', async (req, res) => {
    const d = req.body;
    try {
        const [result] = await pool.query('UPDATE Non_Working_Spouse SET WS_SSN=?,WS_Income=? WHERE SS_Number=?', [d.WS_SSN||null, d.WS_Income||null, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/nws/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM Non_Working_Spouse WHERE SS_Number = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Only listen when not running on Vercel
if (!process.env.VERCEL) {
    app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
}

module.exports = app;
