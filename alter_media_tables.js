import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection('mysql://todestek_kerim:39RdaT38tx5rBH7sTvXs@45.43.152.5:3306/todestek_kerim');
  console.log('Connected to DB');

  try {
    await connection.query(`
      ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)
    `);
    console.log('Added image_url to services');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') console.error('Error adding image_url:', err);
  }

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS media_folders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT,
        name VARCHAR(255) NOT NULL,
        parent_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('media_folders table created');
  } catch (err) {
    console.error('Error creating media_folders:', err);
  }

  try {
    await connection.query(`
      ALTER TABLE media_library ADD COLUMN IF NOT EXISTS folder_id INT
    `);
    console.log('Added folder_id to media_library');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') console.error('Error adding folder_id:', err);
  }

  await connection.end();
}

run().catch(console.error);
