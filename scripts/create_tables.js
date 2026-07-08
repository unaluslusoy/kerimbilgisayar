import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection('mysql://todestek_kerim:39RdaT38tx5rBH7sTvXs@45.43.152.5:3306/todestek_kerim');
  console.log('Connected to DB');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS languages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(10) NOT NULL UNIQUE,
      name VARCHAR(50) NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('languages table created');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS translations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lang_code VARCHAR(10) NOT NULL,
      \`key\` VARCHAR(255) NOT NULL,
      value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (lang_code) REFERENCES languages(code)
    )
  `);
  console.log('translations table created');
  
  // Insert initial default language
  await connection.query(`
    INSERT IGNORE INTO languages (code, name, is_default, is_active) VALUES ('tr', 'Türkçe', 1, 1)
  `);
  console.log('default language inserted');
  
  await connection.end();
}

run().catch(console.error);
