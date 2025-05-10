-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS crud_node_js;

-- Usar la base de datos
USE crud_node_js;

-- Crear la tabla de libros
CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    publisher VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar algunos datos de ejemplo
INSERT INTO books (title, author, publisher, year, image_url) VALUES
('El Señor de los Anillos', 'J.R.R. Tolkien', 'Minotauro', 1954, '/images/books/lotr.jpg'),
('Cien años de soledad', 'Gabriel García Márquez', 'Editorial Sudamericana', 1967, '/images/books/cien-anos.jpg'),
('Don Quijote de la Mancha', 'Miguel de Cervantes', 'Francisco de Robles', 1605, '/images/books/quijote.jpg');