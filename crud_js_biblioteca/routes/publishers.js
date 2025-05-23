const express = require('express');
const router = express.Router();
const dbConn = require('../lib/db');

// Listar editoriales
router.get('/', (req, res) => {
    res.redirect('/books?tab=editoriales');
});

// Formulario agregar editorial
router.get('/add', (req, res) => {
    res.render('books/publishers/add', { publisher: null });
});

// Guardar editorial
router.post('/add', (req, res) => {
    const { name } = req.body;
    const errors = [];
    if (!name || name.trim() === '') {
        errors.push('El nombre de la editorial es obligatorio.');
    }
    if (errors.length > 0) {
        return res.render('books/publishers/add', { publisher: { name }, errors });
    }
    dbConn.query('INSERT INTO publishers (name) VALUES (?)', [name], (err) => {
        if (err) {
            return res.render('books/publishers/add', { publisher: { name }, errors: [err.message] });
        }
        res.redirect('/books?tab=editoriales');
    });
});

// Formulario editar editorial
router.get('/edit/:id', (req, res) => {
    dbConn.query('SELECT * FROM publishers WHERE id = ?', [req.params.id], (err, rows) => {
        if (err || rows.length === 0) {
            req.flash('error', 'No se encontró la editorial');
            return res.redirect('/books?tab=editoriales');
        }
        res.render('books/publishers/edit', { publisher: rows[0] });
    });
});

// Actualizar editorial
router.post('/edit/:id', (req, res) => {
    const { name } = req.body;
    const errors = [];
    if (!name || name.trim() === '') {
        errors.push('El nombre de la editorial es obligatorio.');
    }
    if (errors.length > 0) {
        return res.render('books/publishers/edit', { publisher: { id: req.params.id, name }, errors });
    }
    dbConn.query('UPDATE publishers SET name = ? WHERE id = ?', [name, req.params.id], (err) => {
        if (err) {
            return res.render('books/publishers/edit', { publisher: { id: req.params.id, name }, errors: [err.message] });
        }
        res.redirect('/books?tab=editoriales');
    });
});

// Desactivar editorial (en lugar de eliminar)
router.get('/delete/:id', (req, res) => {
    const id = req.params.id;
    dbConn.query('SELECT * FROM publishers WHERE id = ?', [id], (err, rows) => {
        if (err || rows.length === 0) return res.redirect('/books?tab=editoriales');
        const publisher = rows[0];
        dbConn.query('INSERT INTO historial_publishers (publisher_id, name) VALUES (?, ?)', [publisher.id, publisher.name], (err2) => {
            dbConn.query('UPDATE publishers SET status = "inactive" WHERE id = ?', [id], (err3) => {
                res.redirect('/books?tab=editoriales');
            });
        });
    });
});

// Mostrar historial de editoriales desactivadas
router.get('/historial', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Consulta para obtener el total de registros con búsqueda
    const countQuery = `
        SELECT COUNT(*) as total 
        FROM historial_publishers h 
        WHERE h.restored_at IS NULL 
        AND h.name LIKE ?
    `;

    // Consulta principal con búsqueda y paginación
    const mainQuery = `
        SELECT h.* 
        FROM historial_publishers h 
        WHERE h.restored_at IS NULL 
        AND h.name LIKE ? 
        ORDER BY h.deactivated_at DESC 
        LIMIT ? OFFSET ?
    `;

    const searchPattern = `%${search}%`;

    // Primero obtenemos el total de registros
    dbConn.query(countQuery, [searchPattern], (err, countResult) => {
        if (err) {
            req.flash('error', 'Error al contar registros: ' + err.message);
            return res.render('books/publishers/historial', { 
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
                res.render('books/publishers/historial', { 
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
                res.render('books/publishers/historial', { 
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

// Restaurar editorial
router.get('/restore/:id', (req, res) => {
    const id = req.params.id;
    dbConn.query('UPDATE publishers SET status = "active" WHERE id = ?', [id], (err) => {
        if (err) {
            req.flash('error', 'Error al restaurar la editorial: ' + err.message);
            return res.redirect('/books?tab=editoriales');
        }
        dbConn.query('UPDATE historial_publishers SET restored_at = CURRENT_TIMESTAMP WHERE publisher_id = ? AND restored_at IS NULL', [id], (err2) => {
            if (err2) {
                req.flash('error', 'Error al actualizar el historial: ' + err2.message);
            } else {
                req.flash('success', '¡La editorial ha sido restaurada exitosamente!');
            }
            res.redirect('/books?tab=editoriales');
        });
    });
});

module.exports = router;
