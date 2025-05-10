const mysql = require('mysql');

const connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'biblioteca_db',
	charset: 'utf8mb4'
});

connection.connect((err) => {
	if (err) {
		console.error('Error al conectar a la base de datos:', err);
		return;
	}
	console.log('Conexión exitosa a la base de datos MySQL');
});

module.exports = connection;