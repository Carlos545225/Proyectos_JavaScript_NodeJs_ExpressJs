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

// Listar libros y otras tablas
router.get('/', (req, res) => {
    const tab = req.query.tab || 'libros';
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Consultas para todas las tablas con búsqueda
    const queries = {
        books: `SELECT b.*, a.name as author, c.name as category, p.name as publisher 
                FROM books b 
                LEFT JOIN authors a ON b.author_id = a.id 
                LEFT JOIN category c ON b.category_id = c.id 
                LEFT JOIN publishers p ON b.publisher_id = p.id 
                WHERE b.status = "active" 
                AND (b.title LIKE ? OR b.isbn LIKE ?)
                ORDER BY b.id DESC 
                LIMIT ? OFFSET ?`,
        authors: `SELECT * FROM authors 
                 WHERE status = "active" 
                 AND name LIKE ? 
                 ORDER BY id DESC 
                 LIMIT ? OFFSET ?`,
        categories: `SELECT * FROM category 
                    WHERE status = "active" 
                    AND name LIKE ? 
                    ORDER BY id DESC 
                    LIMIT ? OFFSET ?`,
        publishers: `SELECT * FROM publishers 
                    WHERE status = "active" 
                    AND name LIKE ? 
                    ORDER BY id DESC 
                    LIMIT ? OFFSET ?`,
        countBooks: `SELECT COUNT(*) as total 
                    FROM books 
                    WHERE status = "active" 
                    AND (title LIKE ? OR isbn LIKE ?)`,
        countAuthors: `SELECT COUNT(*) as total 
                      FROM authors 
                      WHERE status = "active" 
                      AND name LIKE ?`,
        countCategories: `SELECT COUNT(*) as total 
                         FROM category 
                         WHERE status = "active" 
                         AND name LIKE ?`,
        countPublishers: `SELECT COUNT(*) as total 
                         FROM publishers 
                         WHERE status = "active" 
                         AND name LIKE ?`
    };

    const searchPattern = `%${search}%`;

    // Función para obtener la consulta según la pestaña
    const getMainQuery = (tab) => {
        switch(tab) {
            case 'libros': return queries.books;
            case 'autores': return queries.authors;
            case 'categorias': return queries.categories;
            case 'editoriales': return queries.publishers;
            default: return queries.books;
        }
    };

    // Función para obtener la consulta de conteo según la pestaña
    const getTotalCount = (tab) => {
        switch(tab) {
            case 'libros': return queries.countBooks;
            case 'autores': return queries.countAuthors;
            case 'categorias': return queries.countCategories;
            case 'editoriales': return queries.countPublishers;
            default: return queries.countBooks;
        }
    };

    // Función para cargar datos adicionales
    const loadAdditionalData = (callback) => {
        let completedQueries = 0;
        const totalQueries = 4;
        const data = {
            books: [],
            authors: [],
            categories: [],
            publishers: []
        };
        const paginationData = {
            libros: {},
            autores: {},
            categorias: {},
            editoriales: {}
        };

        const checkCompletion = () => {
            completedQueries++;
            if (completedQueries === totalQueries) {
                callback(data, paginationData);
            }
        };

        // Cargar datos de libros
        dbConn.query(queries.countBooks, [searchPattern, searchPattern], (err, countResult) => {
            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);
            paginationData.libros = {
                page: tab === 'libros' ? page : 1,
                totalPages,
                hasNext: (tab === 'libros' ? page : 1) < totalPages,
                hasPrev: (tab === 'libros' ? page : 1) > 1
            };
            dbConn.query(queries.books, [searchPattern, searchPattern, limit, tab === 'libros' ? offset : 0], (err, books) => {
                data.books = books || [];
                checkCompletion();
            });
        });

        // Cargar datos de autores
        dbConn.query(queries.countAuthors, [searchPattern], (err, countResult) => {
            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);
            paginationData.autores = {
                page: tab === 'autores' ? page : 1,
                totalPages,
                hasNext: (tab === 'autores' ? page : 1) < totalPages,
                hasPrev: (tab === 'autores' ? page : 1) > 1
            };
            dbConn.query(queries.authors, [searchPattern, limit, tab === 'autores' ? offset : 0], (err, authors) => {
                data.authors = authors || [];
                checkCompletion();
            });
        });

        // Cargar datos de categorías
        dbConn.query(queries.countCategories, [searchPattern], (err, countResult) => {
            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);
            paginationData.categorias = {
                page: tab === 'categorias' ? page : 1,
                totalPages,
                hasNext: (tab === 'categorias' ? page : 1) < totalPages,
                hasPrev: (tab === 'categorias' ? page : 1) > 1
            };
            dbConn.query(queries.categories, [searchPattern, limit, tab === 'categorias' ? offset : 0], (err, categories) => {
                data.categories = categories || [];
                checkCompletion();
            });
        });

        // Cargar datos de editoriales
        dbConn.query(queries.countPublishers, [searchPattern], (err, countResult) => {
            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);
            paginationData.editoriales = {
                page: tab === 'editoriales' ? page : 1,
                totalPages,
                hasNext: (tab === 'editoriales' ? page : 1) < totalPages,
                hasPrev: (tab === 'editoriales' ? page : 1) > 1
            };
            dbConn.query(queries.publishers, [searchPattern, limit, tab === 'editoriales' ? offset : 0], (err, publishers) => {
                data.publishers = publishers || [];
                checkCompletion();
            });
        });
    };

    // Cargar todos los datos
    loadAdditionalData((data, paginationData) => {
        res.render('books/index', {
            tab,
            ...data,
            pagination: paginationData,
            search
        });
    });
});

// Mostrar página de añadir libro (cargar autores, editoriales y categorías)
router.get('/add', (req, res) => {
    dbConn.query('SELECT * FROM authors WHERE status = "active"', (err, authors) => {
        if (err) return res.render('books/add', { authors: [], publishers: [], categories: [], book: {} });
        dbConn.query('SELECT * FROM publishers WHERE status = "active"', (err2, publishers) => {
            if (err2) return res.render('books/add', { authors, publishers: [], categories: [], book: {} });
            dbConn.query('SELECT * FROM category WHERE status = "active"', (err3, categories) => {
                if (err3) return res.render('books/add', { authors, publishers, categories: [], book: {} });
                res.render('books/add', { authors, publishers, categories, book: {} });
            });
        });
    });
});

// Añadir nuevo libro (usando IDs)
router.post('/add', upload.single('image'), (req, res) => {
    const { title, author_id, publisher_id, category_id, year, num_ejemplares, isbn } = req.body;
    const errors = [];
    if (!title) errors.push('El título del libro es requerido');
    if (!author_id) errors.push('El autor es requerido');
    if (!publisher_id) errors.push('La editorial es requerida');
    if (!category_id) errors.push('La categoría es requerida');
    if (!year || year < 1000 || year > new Date().getFullYear()) {
        errors.push('El año de publicación debe ser válido');
    }
    if (!num_ejemplares || num_ejemplares < 1) {
        errors.push('El número de ejemplares debe ser mayor a 0');
    }
    if (isbn && !/^[0-9-]{10,13}$/.test(isbn)) {
        errors.push('El formato del ISBN no es válido');
    }
    if (errors.length > 0) {
        // Recargar selects
        dbConn.query('SELECT * FROM authors WHERE status = "active"', (err, authors) => {
            dbConn.query('SELECT * FROM publishers WHERE status = "active"', (err2, publishers) => {
                dbConn.query('SELECT * FROM category WHERE status = "active"', (err3, categories) => {
                    res.render('books/add', { 
                        authors, 
                        publishers, 
                        categories, 
                        book: { 
                            title, 
                            author_id, 
                            publisher_id, 
                            category_id, 
                            year, 
                            num_ejemplares, 
                            isbn 
                        }, 
                        errors 
                    });
                });
            });
        });
        return;
    }
    const image_url = req.file ? '/images/books/' + req.file.filename : null;
    const book = { 
        title, 
        author_id, 
        publisher_id, 
        category_id, 
        year, 
        num_ejemplares: parseInt(num_ejemplares) || 1, 
        isbn: isbn || null, 
        image_url 
    };
    dbConn.query('INSERT INTO books SET ?', book, (err, result) => {
        if (err) {
            req.flash('error', 'Error al añadir el libro: ' + err.message);
            dbConn.query('SELECT * FROM authors WHERE status = "active"', (err, authors) => {
                dbConn.query('SELECT * FROM publishers WHERE status = "active"', (err2, publishers) => {
                    dbConn.query('SELECT * FROM category WHERE status = "active"', (err3, categories) => {
                        res.render('books/add', { 
                            authors, 
                            publishers, 
                            categories, 
                            book: { 
                                title, 
                                author_id, 
                                publisher_id, 
                                category_id, 
                                year, 
                                num_ejemplares, 
                                isbn 
                            }, 
                            errors: [err.message] 
                        });
                    });
                });
            });
        } else {
            req.flash('success', '¡El libro ha sido añadido exitosamente a la biblioteca!');
            res.redirect('/books');
        }
    });
});

// Mostrar página de editar libro (cargar autores, editoriales y categorías)
router.get('/edit/:id', (req, res) => {
    const id = req.params.id;
    dbConn.query('SELECT * FROM books WHERE id = ?', [id], (err, rows) => {
        if (err || rows.length === 0) {
            req.flash('error', 'No se encontró ningún libro con el ID = ' + id);
            return res.redirect('/books');
        }
        const book = rows[0];
        dbConn.query('SELECT * FROM authors WHERE status = "active"', (err, authors) => {
            dbConn.query('SELECT * FROM publishers WHERE status = "active"', (err2, publishers) => {
                dbConn.query('SELECT * FROM category WHERE status = "active"', (err3, categories) => {
                    res.render('books/edit', { book, authors, publishers, categories });
                });
            });
        });
    });
});

// Actualizar libro (usando IDs)
router.post('/update/:id', upload.single('image'), (req, res) => {
    const id = req.params.id;
    const { title, author_id, publisher_id, category_id, year, num_ejemplares, isbn } = req.body;
    const errors = [];
    if (!title) errors.push('El título del libro es requerido');
    if (!author_id) errors.push('El autor es requerido');
    if (!publisher_id) errors.push('La editorial es requerida');
    if (!category_id) errors.push('La categoría es requerida');
    if (!year || year < 1000 || year > new Date().getFullYear()) {
        errors.push('El año de publicación debe ser válido');
    }
    if (!num_ejemplares || num_ejemplares < 1) {
        errors.push('El número de ejemplares debe ser mayor a 0');
    }
    if (isbn && !/^[0-9-]{10,13}$/.test(isbn)) {
        errors.push('El formato del ISBN no es válido');
    }
    if (errors.length > 0) {
        dbConn.query('SELECT * FROM authors WHERE status = "active"', (err, authors) => {
            dbConn.query('SELECT * FROM publishers WHERE status = "active"', (err2, publishers) => {
                dbConn.query('SELECT * FROM category WHERE status = "active"', (err3, categories) => {
                    res.render('books/edit', { 
                        book: { 
                            id, 
                            title, 
                            author_id, 
                            publisher_id, 
                            category_id, 
                            year, 
                            num_ejemplares, 
                            isbn, 
                            image_url: req.body.current_image 
                        }, 
                        authors, 
                        publishers, 
                        categories, 
                        errors 
                    });
                });
            });
        });
        return;
    }
    const image_url = req.file ? '/images/books/' + req.file.filename : req.body.current_image;
    const book = { 
        title, 
        author_id, 
        publisher_id, 
        category_id, 
        year, 
        num_ejemplares, 
        isbn, 
        image_url 
    };
    dbConn.query('UPDATE books SET ? WHERE id = ?', [book, id], (err, result) => {
        if (err) {
            dbConn.query('SELECT * FROM authors WHERE status = "active"', (err, authors) => {
                dbConn.query('SELECT * FROM publishers WHERE status = "active"', (err2, publishers) => {
                    dbConn.query('SELECT * FROM category WHERE status = "active"', (err3, categories) => {
                        res.render('books/edit', { 
                            book: { 
                                id, 
                                title, 
                                author_id, 
                                publisher_id, 
                                category_id, 
                                year, 
                                num_ejemplares, 
                                isbn, 
                                image_url: req.body.current_image 
                            }, 
                            authors, 
                            publishers, 
                            categories, 
                            errors: [err.message] 
                        });
                    });
                });
            });
        } else {
            req.flash('success', '¡El libro ha sido actualizado con éxito!');
            res.redirect('/books');
        }
    });
});

// Desactivar libro (en lugar de eliminar)
router.get('/delete/:id', (req, res) => {
    const id = req.params.id;

    // Primero obtener la información del libro
    dbConn.query('SELECT * FROM books WHERE id = ?', [id], (err, rows) => {
        if (err) {
            req.flash('error', 'Error al desactivar el libro: ' + err.message);
            return res.redirect('/books');
        }

        if (rows.length === 0) {
            req.flash('error', 'No se encontró ningún libro con el ID = ' + id);
            return res.redirect('/books');
        }

        const book = rows[0];

        // Insertar en el historial
        dbConn.query('INSERT INTO historial_books (book_id, title, author_id, publisher_id, category_id, year, num_ejemplares, isbn, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [book.id, book.title, book.author_id, book.publisher_id, book.category_id, book.year, book.num_ejemplares, book.isbn, book.image_url],
            (err, result) => {
                if (err) {
                    req.flash('error', 'Error al registrar en el historial: ' + err.message);
                    return res.redirect('/books');
                }

                // Actualizar el estado del libro a inactivo
                dbConn.query('UPDATE books SET status = "inactive" WHERE id = ?', [id], (err, result) => {
                    if (err) {
                        req.flash('error', 'Error al desactivar el libro: ' + err.message);
                    } else {
                        req.flash('success', '¡El libro se ha desactivado exitosamente!');
                    }
                    res.redirect('/books');
                });
            });
    });
});

// Mostrar historial de libros desactivados
router.get('/historial', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Consulta para obtener el total de registros con búsqueda
    const countQuery = `
        SELECT COUNT(*) as total 
        FROM historial_books h 
        WHERE h.restored_at IS NULL 
        AND h.title LIKE ?
    `;

    // Consulta principal con búsqueda y paginación
    const mainQuery = `
        SELECT h.*,
               a.name as author_name,
               c.name as category_name,
               p.name as publisher_name
        FROM historial_books h 
        LEFT JOIN authors a ON h.author_id = a.id
        LEFT JOIN category c ON h.category_id = c.id
        LEFT JOIN publishers p ON h.publisher_id = p.id
        WHERE h.restored_at IS NULL 
        AND h.title LIKE ? 
        ORDER BY h.deactivated_at DESC 
        LIMIT ? OFFSET ?
    `;

    const searchPattern = `%${search}%`;

    // Primero obtenemos el total de registros
    dbConn.query(countQuery, [searchPattern], (err, countResult) => {
        if (err) {
            req.flash('error', 'Error al contar registros: ' + err.message);
            return res.render('books/historial', { 
                historial: [],
                pagination: {
                    page: 1,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false
                },
                search: search
            });
        }

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        // Luego obtenemos los registros paginados
        dbConn.query(mainQuery, [searchPattern, limit, offset], (err, historial) => {
            if (err) {
                req.flash('error', 'Error al cargar el historial: ' + err.message);
                res.render('books/historial', { 
                    historial: [],
                    pagination: {
                        page: 1,
                        totalPages: 1,
                        hasNext: false,
                        hasPrev: false
                    },
                    search: search
                });
            } else {
                res.render('books/historial', { 
                    historial,
                    pagination: {
                        page,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    },
                    search: search
                });
            }
        });
    });
});

// Restaurar libro
router.get('/restore/:id', (req, res) => {
    const id = req.params.id;

    // Actualizar el estado del libro a activo
    dbConn.query('UPDATE books SET status = "active" WHERE id = ?', [id], (err, result) => {
        if (err) {
            req.flash('error', 'Error al restaurar el libro: ' + err.message);
            return res.redirect('/books/historial');
        }

        // Marcar como restaurado en el historial
        dbConn.query('UPDATE historial_books SET restored_at = CURRENT_TIMESTAMP WHERE book_id = ? AND restored_at IS NULL', [id], (err, result) => {
            if (err) {
                req.flash('error', 'Error al actualizar el historial: ' + err.message);
            } else {
                req.flash('success', '¡El libro ha sido restaurado exitosamente!');
            }
            res.redirect('/books?tab=libros');
        });
    });
});

// Ver detalle de libro (con JOIN para mostrar nombres)
router.get('/view/:id', (req, res) => {
    const id = req.params.id;
    const sql = `
        SELECT b.*, a.name AS author, p.name AS publisher, c.name AS category
        FROM books b
        JOIN authors a ON b.author_id = a.id
        JOIN publishers p ON b.publisher_id = p.id
        JOIN category c ON b.category_id = c.id
        WHERE b.id = ? AND b.status = 'active'
    `;
    dbConn.query(sql, [id], (err, rows) => {
        if (err || rows.length === 0) {
            req.flash('error', 'No se encontró ningún libro con el ID = ' + id);
            return res.redirect('/books');
        }
        const book = rows[0];
        // Asegurar que los campos numéricos sean números
        book.num_ejemplares = parseInt(book.num_ejemplares) || 1;
        res.render('books/view', { book });
    });
});

module.exports = router;