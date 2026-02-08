const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

console.log('Starting DinoParks Dashboard...');
console.log('Current directory:', __dirname);

// Database connection with logging
// This allows it to work both locally and inside Docker
const dbPath = process.env.DB_FILE || path.join(__dirname, 'park.db');
console.log('Attempting to connect to database at:', dbPath);



const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('❌ DATABASE CONNECTION FAILED:', err.message);
        console.error('Error details:', err);
        
        // Provide troubleshooting tips
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Check if park_data/ folder exists');
        console.log('2. Verify park.db file exists in park_data/');
        console.log('3. Check file permissions (read/write)');
        console.log('4. Ensure SQLite3 is properly installed');
        
        process.exit(1); // Exit if database connection fails
    } else {
        console.log('✅ DATABASE CONNECTION ESTABLISHED');
        console.log('Database file:', dbPath);
        
        // Test database functionality
        db.get('SELECT sqlite_version() AS version', (err, row) => {
            if (err) {
                console.error('⚠️  Could not query SQLite version:', err.message);
            } else {
                console.log(`📊 SQLite version: ${row.version}`);
            }
        });
        
        // List tables in the database
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                console.error('⚠️  Could not list tables:', err.message);
            } else if (tables.length === 0) {
                console.log('📋 No tables found in database');
            } else {
                console.log('📋 Database tables:');
                tables.forEach(table => console.log(`   - ${table.name}`));
            }
        });
    }
});


app.set('view engine', 'ejs');
app.use(express.static('public'));

// API to get current grid status with logging
app.get('/api/grid', (req, res) => {
    const startTime = Date.now();
    
    db.all("SELECT * FROM grid", [], (err, rows) => {
        const queryTime = Date.now() - startTime;
        
        if (err) {
            console.error(`❌ Grid query failed after ${queryTime}ms:`, err.message);
            return res.status(500).json({ error: err.message });
        }
        
        res.json(rows);
    });
});


// Main Page
app.get('/', (req, res) => {
    console.log('🏠 Serving main page');
    res.render('index');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('🔥 Unhandled error:', err.stack);
    res.status(500).send('Something went wrong!');
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`\n🚀 DinoParks Dashboard running on http://localhost:${PORT}`);
    console.log(`📝 Available endpoints:`);
    console.log(`   http://localhost:${PORT}/ - Main page`);
    console.log('\nPress Ctrl+C to stop the server\n');
});

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});