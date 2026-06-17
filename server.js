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
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sss_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
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
            `INSERT INTO Registrant_Table (SS_Number,Registrant_Name,Date_of_Birth,Sex,Civil_Status,TIN,Nationality,Religion,POB,Home_Address,Mobile_Number,Email_Address,Telephone_Number,Father_Name,Mother_Maiden_Name,Employement_Type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [d.SS_Number,d.Registrant_Name,d.Date_of_Birth||null,d.Sex||null,d.Civil_Status||null,d.TIN||null,d.Nationality||null,d.Religion||null,d.POB||null,d.Home_Address||null,d.Mobile_Number||null,d.Email_Address||null,d.Telephone_Number||null,d.Father_Name||null,d.Mother_Maiden_Name||null,d.Employement_Type||null]
        );
        res.status(201).json({ message: 'Created', id: d.SS_Number });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/registrants/:id', async (req, res) => {
    const d = req.body;
    try {
        const [result] = await pool.query(
            `UPDATE Registrant_Table SET Registrant_Name=?,Date_of_Birth=?,Sex=?,Civil_Status=?,TIN=?,Nationality=?,Religion=?,POB=?,Home_Address=?,Mobile_Number=?,Email_Address=?,Telephone_Number=?,Father_Name=?,Mother_Maiden_Name=?,Employement_Type=? WHERE SS_Number=?`,
            [d.Registrant_Name,d.Date_of_Birth||null,d.Sex||null,d.Civil_Status||null,d.TIN||null,d.Nationality||null,d.Religion||null,d.POB||null,d.Home_Address||null,d.Mobile_Number||null,d.Email_Address||null,d.Telephone_Number||null,d.Father_Name||null,d.Mother_Maiden_Name||null,d.Employement_Type||null,req.params.id]
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
        const [rows] = await pool.query('SELECT * FROM Designations_Table ORDER BY SS_Number, Ben_ID');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/designations', async (req, res) => {
    const d = req.body;
    try {
        await pool.query('INSERT INTO Designations_Table (SS_Number,Ben_ID,Ben_Relationship) VALUES (?,?,?)', [d.SS_Number, d.Ben_ID, d.Ben_Relationship||null]);
        res.status(201).json({ message: 'Created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/designations/:ss/:ben', async (req, res) => {
    const d = req.body;
    try {
        const [result] = await pool.query('UPDATE Designations_Table SET Ben_Relationship=? WHERE SS_Number=? AND Ben_ID=?', [d.Ben_Relationship, req.params.ss, req.params.ben]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/designations/:ss/:ben', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM Designations_Table WHERE SS_Number=? AND Ben_ID=?', [req.params.ss, req.params.ben]);
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
        const [rows] = await pool.query('SELECT * FROM Non_Working_Spouse_Table ORDER BY SS_Number');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/nws/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Non_Working_Spouse_Table WHERE SS_Number = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/nws', async (req, res) => {
    const d = req.body;
    try {
        await pool.query('INSERT INTO Non_Working_Spouse_Table (SS_Number,WS_SSN,WS_Income) VALUES (?,?,?)', [d.SS_Number, d.WS_SSN||null, d.WS_Income||null]);
        res.status(201).json({ message: 'Created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/nws/:id', async (req, res) => {
    const d = req.body;
    try {
        const [result] = await pool.query('UPDATE Non_Working_Spouse_Table SET WS_SSN=?,WS_Income=? WHERE SS_Number=?', [d.WS_SSN||null, d.WS_Income||null, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/nws/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM Non_Working_Spouse_Table WHERE SS_Number = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Only listen when not running on Vercel
if (!process.env.VERCEL) {
    app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
}

module.exports = app;
