const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const flash = require('express-flash');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);

// Importar rutas
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const booksRouter = require('./routes/books');
const dashboardRouter = require('./routes/dashboard');
const authorsRouter = require('./routes/authors');
const publishersRouter = require('./routes/publishers');
const categoryRouter = require('./routes/category');

const app = express();

// Configuración del motor de vistas
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesión mejorada
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'secret',
    store: new MemoryStore({
        checkPeriod: 86400000 // Limpiar entradas expiradas cada 24 horas
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    },
    resave: false,
    saveUninitialized: false
};

app.use(session(sessionConfig));
app.use(flash());

// Variables globales para las vistas
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.messages = {
        success: req.flash('success'),
        error: req.flash('error')
    };
    next();
});

// Rutas
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/books', booksRouter);
app.use('/dashboard', dashboardRouter);
app.use('/books/authors', authorsRouter);
app.use('/books/publishers', publishersRouter);
app.use('/books/category', categoryRouter);

// Redirigir 404 a la página principal
app.use((req, res, next) => {
    res.redirect('/');
});

// Manejador global de errores
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;