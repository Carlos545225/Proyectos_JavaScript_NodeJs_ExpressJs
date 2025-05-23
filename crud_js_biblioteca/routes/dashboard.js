const express = require('express');
const router = express.Router();
const dbConn = require('../lib/db');

// Ruta principal del dashboard
router.get('/', (req, res) => {
    const queries = {
        totalBooks: 'SELECT COUNT(*) as total FROM books WHERE status = "active"',
        totalPrestados: 'SELECT COUNT(*) as total FROM books WHERE status = "inactive"',
        recientes: `
            (SELECT 'add' as tipo, id, title, created_at as fecha FROM books WHERE status = "active" ORDER BY created_at DESC LIMIT 3)
            UNION
            (SELECT 'edit' as tipo, id, title, updated_at as fecha FROM books WHERE status = "active" AND updated_at != created_at ORDER BY updated_at DESC LIMIT 3)
            UNION
            (SELECT 'historial' as tipo, book_id as id, title, deactivated_at as fecha FROM historial_books ORDER BY deactivated_at DESC LIMIT 3)
            ORDER BY fecha DESC
            LIMIT 5
        `
    };

    dbConn.query(queries.totalBooks, (err, resultBooks) => {
        if (err) return res.render('dashboard/index', { totalBooks: 0, totalPrestados: 0, actividades: [] });
        dbConn.query(queries.totalPrestados, (err2, resultPrestados) => {
            if (err2) return res.render('dashboard/index', { totalBooks: resultBooks[0].total, totalPrestados: 0, actividades: [] });
            dbConn.query(queries.recientes, (err3, actividades) => {
                if (err3 || !actividades) actividades = [];
                res.render('dashboard/index', {
                    totalBooks: resultBooks[0].total,
                    totalPrestados: resultPrestados[0].total,
                    actividades
                });
            });
        });
    });
});

module.exports = router; 