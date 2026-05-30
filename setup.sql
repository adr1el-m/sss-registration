CREATE DATABASE IF NOT EXISTS sss_db;
USE sss_db;

CREATE TABLE IF NOT EXISTS Registrant_Table (
    SS_Number VARCHAR(20) PRIMARY KEY,
    Registrant_Name VARCHAR(100) NOT NULL,
    Date_of_Birth DATE NOT NULL,
    Sex ENUM('Male', 'Female') NOT NULL,
    Civil_Status VARCHAR(30) NOT NULL,
    TIN VARCHAR(20),
    Nationality VARCHAR(50),
    Religion VARCHAR(50),
    POB VARCHAR(100),
    Home_Address TEXT NOT NULL,
    Mobile_Number VARCHAR(20),
    Email_Address VARCHAR(100),
    Telephone_Number VARCHAR(20),
    Father_Name VARCHAR(100),
    Mother_Maiden_Name VARCHAR(100) NOT NULL,
    Employement_Type ENUM('NWS', 'SE', 'OFW') NOT NULL 
);

CREATE TABLE IF NOT EXISTS Spouse_Table (
    SS_Number VARCHAR(20) PRIMARY KEY,
    Spouse_Name VARCHAR(100) NOT NULL,
    Spouse_DOB DATE,
    FOREIGN KEY (SS_Number) REFERENCES Registrant_Table(SS_Number) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Beneficiaries_Table (
    Ben_ID INT AUTO_INCREMENT PRIMARY KEY,
    SS_Number VARCHAR(20) NOT NULL,
    Ben_Name VARCHAR(100) NOT NULL,
    Ben_DOB DATE,
    Ben_Relationship VARCHAR(50),
    FOREIGN KEY (SS_Number) REFERENCES Registrant_Table(SS_Number) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Self_Employed_Table (
    SS_Number VARCHAR(20) PRIMARY KEY,
    SE_Profession VARCHAR(100) NOT NULL,
    SE_Year_Started YEAR NOT NULL,
    SE_Monthly_Earnings DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (SS_Number) REFERENCES Registrant_Table(SS_Number) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS OFW_Table (
    SS_Number VARCHAR(20) PRIMARY KEY,
    OFW_Foreign_Address TEXT NOT NULL,
    OFW_Monthly_Earnings DECIMAL(15, 2) NOT NULL,
    OFW_FlexiFund_Flag BOOLEAN NOT NULL,
    FOREIGN KEY (SS_Number) REFERENCES Registrant_Table(SS_Number) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Non_Working_Spouse_Table (
    SS_Number VARCHAR(20) PRIMARY KEY,
    WS_SSN VARCHAR(20) NOT NULL,
    WS_Income DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (SS_Number) REFERENCES Registrant_Table(SS_Number) ON DELETE CASCADE
);

-- Insert mock data based on 3NF tables
INSERT INTO Registrant_Table (SS_Number, Registrant_Name, Date_of_Birth, Sex, Civil_Status, TIN, Nationality, Religion, POB, Home_Address, Mobile_Number, Email_Address, Telephone_Number, Father_Name, Mother_Maiden_Name, Employement_Type) VALUES
('02-3788924-7', 'Maribela S. Jafina', '1980-02-25', 'Female', 'Married', '243-856-655', 'Filipino', 'Catholic', 'Sta. Maria, Bulacan', 'Vergel St., Barangay 99, Pasay City', '09724687754', 'maribelasampaloc@yahoo.com', '(02) 8443-9677', 'Antonio R. Sampaloc', 'Maria Serena A. Gabadingan', 'SE'),
('01-0477821-4', 'Jeremiah A. Conceptual', '2002-09-11', 'Male', 'Single', '465-985-134', 'Filipino', 'Iglesia ni Cristo', 'St. Luke''s Medical Center - Global City, Fort Bonifacio, Taguig City', '9th 12th St., Barangay 183, Pasay City', '09694417341', 'jeremiahconceptual@gmail.com', '(02) 7469-2388', 'San Jose S. Conceptual', 'Lorna Maya G. Acunsacion', 'SE'),
('07-9925781-3', 'Darwin Johnson S. Fortunado', '1999-06-12', 'Male', 'Single', '676-494-616', 'Filipino', 'Catholic', 'Ospital ng Parañaque, Quirino Ave, Parañaque, Metro Manila', 'Anonas St., Barangay 630, Sta. Mesa, Manila', '09684970322', 'darwinjohnson@gmail.com', '(02) 4780-2433', 'John Cortes G. Fortunado', 'Helena Friana O. Sandigan', 'SE'),
('07-0091345-2', 'Lorenzo R. Chismoso', '1980-04-01', 'Male', 'Married', '275-809-124', 'Filipino', 'Born Again Christian', 'Marinduque Provincial Hospital, Boac, Marinduque', 'Dr.Maximo Flores, Pasig, Metro Manila', '09215897991', 'chismososilorenzo@gmail.com', '(02) 7455-2100', 'San Roque V. Chismoso', 'Yasha Horilunsk R. Riyansk', 'OFW'),
('12-7080091-1', 'Edna Josefina T. Rodriguez', '1973-01-01', 'Female', 'Married', '587-901-800', 'Filipino', 'Muslim', 'Tobacco, Albay', '8th Ave, Grace Park East, Manila, Metro Manila', '09081759800', 'josefina@yahoo.com', '(02) 3588-1200', 'Takahada R. Takehashi', 'Edralina Santa Ana T. Maypajo', 'NWS');

INSERT INTO Beneficiaries_Table (Ben_ID, SS_Number, Ben_Name, Ben_DOB, Ben_Relationship) VALUES
(1, '02-3788924-7', 'Sasha Mae S. Jafina', '2009-04-07', 'Daughter'),
(2, '02-3788924-7', 'Ferdy Jonnathan S. Jafina', '2011-02-19', 'Son'),
(3, '01-0477821-4', 'Ferdinand Joe M. Honasan', '2000-09-09', 'Friend'),
(4, '07-9925781-3', 'Caroline A. Fortunado', '2007-06-26', 'Niece'),
(5, '07-0091345-2', 'Llana Marie Curie D. Chismoso', '2011-07-08', 'Daughter'),
(6, '07-0091345-2', 'Sophia Vannessa D. Chismoso', '2007-03-18', 'Daughter'),
(7, '12-7080091-1', 'Gerald G. Rodriguez', '2001-10-09', 'Nephew');

INSERT INTO Self_Employed_Table (SS_Number, SE_Profession, SE_Year_Started, SE_Monthly_Earnings) VALUES
('02-3788924-7', 'Human Resource Employee', 2010, 23000.00),
('01-0477821-4', 'Graphic Illustrator', 2024, 75650.00),
('07-9925781-3', 'Civil Engineer', 2019, 180000.00);

INSERT INTO OFW_Table (SS_Number, OFW_Foreign_Address, OFW_Monthly_Earnings, OFW_FlexiFund_Flag) VALUES
('07-0091345-2', 'Stroitel''naya Ulitsa, 19, Vidnoye, Moskovskaya oblast'', Russia', 145000.00, TRUE);

INSERT INTO Spouse_Table (SS_Number, Spouse_Name, Spouse_DOB) VALUES
('02-3788924-7', 'Jose Adrian Q. Jafina', '1980-12-01'),
('07-0091345-2', 'Jennifer Ana D. Chismoso', '1984-07-04'),
('12-7080091-1', 'Edward Magalona S. Rodriguez', '1970-09-01');

INSERT INTO Non_Working_Spouse_Table (SS_Number, WS_SSN, WS_Income) VALUES
('12-7080091-1', '12-4889008-3', 35000.00);
