const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express();

app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.use(cookieParser());

app.use(session({
    secret: 'secretKey',
    resave: false,
    saveUninitialized: true
}));

app.use(express.static(path.join(__dirname)));

const TIMEOUT = 2000;

app.use((req, res, next) => {
    if (req.session.user) {
        const now = Date.now();

        if (req.session.lastActivity && (now - req.session.lastActivity > TIMEOUT)) {
            req.session.destroy(() => {
                return res.status(440).json({ error: "Session expired" });
            });
        } else {
            req.session.lastActivity = now;
            next();
        }
    } else {
        next();
    }
});

const products = [
    { id: 1, name: "Laptop", price: 50000 },
    { id: 2, name: "Phone", price: 20000 },
    { id: 3, name: "Headphones", price: 2000 }
];

app.get('/api/visits', (req, res) => {
    let visits = req.cookies.visits;
    visits = visits ? parseInt(visits) + 1 : 1;

    res.cookie('visits', visits);

    req.session.views = (req.session.views || 0) + 1;

    res.json({
        cookieVisits: visits,
        sessionViews: req.session.views
    });
});

app.get('/login', (req, res) => {
    req.session.user = "user1";
    req.session.cart = [];
    req.session.lastActivity = Date.now();
    res.json({ message: "Logged in" });
});

app.get('/products', (req, res) => {
    res.json(products);
});

app.get('/cart/add/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Login first" });
    }

    const product = products.find(p => p.id == req.params.id);
    if (!product) {
        return res.status(404).json({ error: "Product not found" });
    }

    let cart = req.session.cart;
    let item = cart.find(i => i.id == product.id);

    if (item) {
        item.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }

    res.json(cart);
});

app.get('/cart/inc/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Login first" });
    }

    let item = req.session.cart.find(i => i.id == req.params.id);
    if (item) item.qty++;

    res.json(req.session.cart);
});

app.get('/cart/dec/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Login first" });
    }

    let cart = req.session.cart;
    let item = cart.find(i => i.id == req.params.id);

    if (item) {
        item.qty--;
        if (item.qty <= 0) {
            req.session.cart = cart.filter(i => i.id != req.params.id);
        }
    }

    res.json(req.session.cart);
});

app.get('/cart', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Login first" });
    }

    let totalItems = 0;
    req.session.cart.forEach(i => totalItems += i.qty);

    res.json({
        items: req.session.cart,
        total: totalItems
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.clearCookie('visits');
        res.json({ success: true });
    });
});

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});