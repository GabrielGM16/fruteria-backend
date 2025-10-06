const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateAdminPassword() {
  try {
    const newPassword = 'admin123'; // Cambia esto por la contraseña que quieras
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('Nuevo password hash generado:', passwordHash);
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'fruteria_inventory'
    });
    
    await connection.execute(
      'UPDATE usuarios SET password_hash = ? WHERE username = ?',
      [passwordHash, 'admin']
    );
    
    console.log('\n✅ Password actualizado exitosamente');
    console.log('\n=== NUEVAS CREDENCIALES ===');
    console.log('Username: admin');
    console.log('Password:', newPassword);
    console.log('===========================\n');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateAdminPassword();