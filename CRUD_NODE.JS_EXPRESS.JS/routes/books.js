const express = require('express');
const router = express.Router();
const dbConn = require('../lib/db');
const multer = require('multer');
const path = require('path');

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images/books');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'book-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Mostrar página de libros
router.get('/', (req, res) => {
    dbConn.query('SELECT * FROM books ORDER BY id DESC', (err, books) => {
        if (err) {
            req.flash('error', 'Error al cargar los libros: ' + err.message);
            res.render('books/index', { books: [] });
        } else {
            res.render('books/index', { books });
        }
    });
});

// Mostrar página de añadir libro
router.get('/add', (req, res) => {
    res.render('books/add', {
        title: '',
        author: '',
        publisher: '',
        year: new Date().getFullYear(),
        image_url: ''
    });
});

// Añadir nuevo libro
router.post('/add', upload.single('image'), (req, res) => {
    const { title, author, publisher, year } = req.body;
    const errors = [];

    // Validación de campos
    if (!title) errors.push('El título del libro es requerido');
    if (!author) errors.push('El autor del libro es requerido');
    if (!publisher) errors.push('La editorial es requerida');
    if (!year || year < 1000 || year > new Date().getFullYear()) {
        errors.push('El año de publicación debe ser válido');
    }

    if (errors.length > 0) {
        req.flash('error', errors.join('. '));
        return res.render('books/add', { title, author, publisher, year });
    }

    const image_url = req.file ? '/images/books/' + req.file.filename : null;
    const book = { title, author, publisher, year, image_url };

    dbConn.query('INSERT INTO books SET ?', book, (err, result) => {
        if (err) {
            req.flash('error', 'Error al añadir el libro: ' + err.message);
            res.render('books/add', { title, author, publisher, year });
        } else {
            req.flash('success', '¡El libro ha sido añadido exitosamente a la biblioteca!');
            res.redirect('/books');
        }
    });
});

// Mostrar página de editar libro
router.get('/edit/:id', (req, res) => {
    const id = req.params.id;

    dbConn.query('SELECT * FROM books WHERE id = ?', [id], (err, rows) => {
        if (err) {
            req.flash('error', 'Error al cargar el libro: ' + err.message);
            return res.redirect('/books');
        }

        if (rows.length === 0) {
            req.flash('error', 'No se encontró ningún libro con el ID = ' + id);
            return res.redirect('/books');
        }

        const book = rows[0];
        res.render('books/edit', {
            id: book.id,
            title: book.title,
            author: book.author,
            publisher: book.publisher,
            year: book.year,
            image_url: book.image_url
        });
    });
});

// Actualizar libro
router.post('/update/:id', upload.single('image'), (req, res) => {
    const id = req.params.id;
    const { title, author, publisher, year } = req.body;
    const errors = [];

    // Validación de campos
    if (!title) errors.push('El título del libro es requerido');
    if (!author) errors.push('El autor del libro es requerido');
    if (!publisher) errors.push('La editorial es requerida');
    if (!year || year < 1000 || year > new Date().getFullYear()) {
        errors.push('El año de publicación debe ser válido');
    }

    if (errors.length > 0) {
        req.flash('error', errors.join('. '));
        return res.render('books/edit', { id, title, author, publisher, year });
    }

    const image_url = req.file ? '/images/books/' + req.file.filename : req.body.current_image;
    const book = { title, author, publisher, year, image_url };

    dbConn.query('UPDATE books SET ? WHERE id = ?', [book, id], (err, result) => {
        if (err) {
            req.flash('error', 'Error al actualizar el libro: ' + err.message);
            res.render('books/edit', { id, title, author, publisher, year });
        } else {
            req.flash('success', '¡El libro ha sido actualizado con éxito en el grimorio!');
            res.redirect('/books');
        }
    });
});

// Eliminar libro
router.get('/delete/:id', (req, res) => {
    const id = req.params.id;

    // Primero obtener la información del libro para eliminar la imagen
    dbConn.query('SELECT image_url FROM books WHERE id = ?', [id], (err, rows) => {
        if (err) {
            req.flash('error', 'Error al eliminar el libro: ' + err.message);
            return res.redirect('/books');
        }

        // Eliminar el libro
        dbConn.query('DELETE FROM books WHERE id = ?', [id], (err, result) => {
            if (err) {
                req.flash('error', 'Error al eliminar el libro: ' + err.message);
            } else {
                req.flash('success', '¡El libro se ha desvanecido exitosamente de la biblioteca!');
            }
            res.redirect('/books');
        });
    });
});

module.exports = router;