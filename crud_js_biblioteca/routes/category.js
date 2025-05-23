const express = require('express');
const router = express.Router();
const dbConn = require('../lib/db');

// Listar categorías
router.get('/', (req, res) => {
    res.redirect('/books?tab=categorias');
});

// Formulario agregar categoría
router.get('/add', (req, res) => {
    res.render('books/category/add', { category: null });
});

// Guardar categoría
router.post('/add', (req, res) => {
    const { name } = req.body;
    const errors = [];
    if (!name || name.trim() === '') {
        errors.push('El nombre de la categoría es obligatorio.');
    }
    if (errors.length > 0) {
        return res.render('books/category/add', { category: { name }, errors });
    }
    dbConn.query('INSERT INTO category (name) VALUES (?)', [name], (err) => {
        if (err) {
            return res.render('books/category/add', { category: { name }, errors: [err.message] });
        }
        res.redirect('/books?tab=categorias');
    });
});

// Formulario editar categoría
router.get('/edit/:id', (req, res) => {
    dbConn.query('SELECT * FROM category WHERE id = ?', [req.params.id], (err, rows) => {
        if (err || rows.length === 0) {
            req.flash('error', 'No se encontró la categoría');
            return res.redirect('/books?tab=categorias');
        }
        res.render('books/category/edit', { category: rows[0] });
    });
});

// Actualizar categoría
router.post('/edit/:id', (req, res) => {
    const { name } = req.body;
    const errors = [];
    if (!name || name.trim() === '') {
        errors.push('El nombre de la categoría es obligatorio.');
    }
    if (errors.length > 0) {
        return res.render('books/category/edit', { category: { id: req.params.id, name }, errors });
    }
    dbConn.query('UPDATE category SET name = ? WHERE id = ?', [name, req.params.id], (err) => {
        if (err) {
            return res.render('books/category/edit', { category: { id: req.params.id, name }, errors: [err.message] });
        }
        res.redirect('/books?tab=categorias');
    });
});

// Desactivar categoría (en lugar de eliminar)
router.get('/delete/:id', (req, res) => {
    const id = req.params.id;
    dbConn.query('SELECT * FROM category WHERE id = ?', [id], (err, rows) => {
        if (err || rows.length === 0) return res.redirect('/books?tab=categorias');
        const category = rows[0];
        dbConn.query('INSERT INTO historial_category (category_id, name) VALUES (?, ?)', [category.id, category.name], (err2) => {
            dbConn.query('UPDATE category SET status = "inactive" WHERE id = ?', [id], (err3) => {
                res.redirect('/books?tab=categorias');
            });
        });
    });
});

// Mostrar historial de categorías desactivadas
router.get('/historial', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Consulta para obtener el total de registros con búsqueda
    const countQuery = `
        SELECT COUNT(*) as total 
        FROM historial_category h 
        WHERE h.restored_at IS NULL 
        AND h.name LIKE ?
    `;

    // Consulta principal con búsqueda y paginación
    const mainQuery = `
        SELECT h.* 
        FROM historial_category h 
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
            return res.render('books/category/historial', { 
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
                res.render('books/category/historial', { 
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
                res.render('books/category/historial', { 
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

// Restaurar categoría
router.get('/restore/:id', (req, res) => {
    const id = req.params.id;
    dbConn.query('UPDATE category SET status = "active" WHERE id = ?', [id], (err) => {
        if (err) {
            req.flash('error', 'Error al restaurar la categoría: ' + err.message);
            return res.redirect('/books?tab=categorias');
        }
        dbConn.query('UPDATE historial_category SET restored_at = CURRENT_TIMESTAMP WHERE category_id = ? AND restored_at IS NULL', [id], (err2) => {
            if (err2) {
                req.flash('error', 'Error al actualizar el historial: ' + err2.message);
            } else {
                req.flash('success', '¡La categoría ha sido restaurada exitosamente!');
            }
            res.redirect('/books?tab=categorias');
        });
    });
});

module.exports = router;
