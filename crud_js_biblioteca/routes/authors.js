const express = require('express');
const router = express.Router();
const db = require('../lib/db');

// Listar autores
router.get('/', (req, res) => {
    res.redirect('/books?tab=autores');
});

// Formulario agregar autor
router.get('/add', (req, res) => {
    res.render('books/authors/add', { author: null });
});

// Guardar autor
router.post('/add', (req, res) => {
    const { name } = req.body;
    const errors = [];
    if (!name || name.trim() === '') {
        errors.push('El nombre del autor es obligatorio.');
    }
    if (errors.length > 0) {
        return res.render('books/authors/add', { author: { name }, errors });
    }
    db.query('INSERT INTO authors (name) VALUES (?)', [name], (err) => {
        if (err) {
            return res.render('books/authors/add', { author: { name }, errors: [err.message] });
        }
        res.redirect('/books?tab=autores');
    });
});

// Formulario editar autor
router.get('/edit/:id', (req, res) => {
    db.query('SELECT * FROM authors WHERE id = ?', [req.params.id], (err, rows) => {
        if (err || rows.length === 0) {
            req.flash('error', 'No se encontró el autor');
            return res.redirect('/books?tab=autores');
        }
        res.render('books/authors/edit', { author: rows[0] });
    });
});

// Actualizar autor
router.post('/edit/:id', (req, res) => {
    const { name } = req.body;
    const errors = [];
    if (!name || name.trim() === '') {
        errors.push('El nombre del autor es obligatorio.');
    }
    if (errors.length > 0) {
        return res.render('books/authors/edit', { author: { id: req.params.id, name }, errors });
    }
    db.query('UPDATE authors SET name = ? WHERE id = ?', [name, req.params.id], (err) => {
        if (err) {
            return res.render('books/authors/edit', { author: { id: req.params.id, name }, errors: [err.message] });
        }
        res.redirect('/books?tab=autores');
    });
});

// Desactivar autor (en lugar de eliminar)
router.get('/delete/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM authors WHERE id = ?', [id], (err, rows) => {
        if (err || rows.length === 0) {
            req.flash('error', 'Error al encontrar el autor: ' + (err ? err.message : 'Autor no encontrado'));
            return res.redirect('/books?tab=autores');
        }
        const author = rows[0];
        db.query('INSERT INTO historial_authors (author_id, name, deactivated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', 
            [author.id, author.name], 
            (err2) => {
                if (err2) {
                    req.flash('error', 'Error al guardar en el historial: ' + err2.message);
                    return res.redirect('/books?tab=autores');
                }
                db.query('UPDATE authors SET status = "inactive" WHERE id = ?', [id], (err3) => {
                    if (err3) {
                        req.flash('error', 'Error al desactivar el autor: ' + err3.message);
                    } else {
                        req.flash('success', 'Autor desactivado exitosamente');
                    }
                    res.redirect('/books?tab=autores');
                });
            }
        );
    });
});

// Mostrar historial de autores desactivados
router.get('/historial', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Consulta para obtener el total de registros con búsqueda
    const countQuery = `
        SELECT COUNT(*) as total 
        FROM historial_authors h 
        JOIN authors a ON h.author_id = a.id 
        WHERE h.restored_at IS NULL 
        AND h.name LIKE ?
    `;

    // Consulta principal con búsqueda y paginación
    const mainQuery = `
        SELECT h.*, a.status 
        FROM historial_authors h 
        JOIN authors a ON h.author_id = a.id 
        WHERE h.restored_at IS NULL 
        AND h.name LIKE ? 
        ORDER BY h.deactivated_at DESC 
        LIMIT ? OFFSET ?
    `;

    const searchPattern = `%${search}%`;

    // Primero obtenemos el total de registros
    db.query(countQuery, [searchPattern], (err, countResult) => {
        if (err) {
            req.flash('error', 'Error al contar registros: ' + err.message);
            return res.render('books/authors/historial', { 
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
        db.query(mainQuery, [searchPattern, limit, offset], (err, historial) => {
            if (err) {
                req.flash('error', 'Error al cargar el historial: ' + err.message);
                res.render('books/authors/historial', { 
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
                res.render('books/authors/historial', { 
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

// Restaurar autor
router.get('/restore/:id', (req, res) => {
    const id = req.params.id;
    db.query('UPDATE authors SET status = "active" WHERE id = ?', [id], (err) => {
        if (err) {
            req.flash('error', 'Error al restaurar el autor: ' + err.message);
            return res.redirect('/books?tab=autores');
        }
        db.query('UPDATE historial_authors SET restored_at = CURRENT_TIMESTAMP WHERE author_id = ? AND restored_at IS NULL', [id], (err2) => {
            if (err2) {
                req.flash('error', 'Error al actualizar el historial: ' + err2.message);
            } else {
                req.flash('success', '¡El autor ha sido restaurado exitosamente!');
            }
            res.redirect('/books?tab=autores');
        });
    });
});

module.exports = router;
