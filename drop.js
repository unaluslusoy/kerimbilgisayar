import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection('mysql://todestek_kerim:39RdaT38tx5rBH7sTvXs@45.43.152.5:3306/todestek_kerim');
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  
  const [rows] = await connection.query('SHOW TABLES');
  for (const row of rows) {
    const tableName = Object.values(row)[0];
    console.log('Dropping', tableName);
    await connection.query('DROP TABLE ??', [tableName]);
  }
  
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  await connection.end();
  console.log('All tables dropped successfully.');
}
run().catch(console.error);
