const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const bodyParser = require("body-parser");
const Joi = require('joi');
const ejs = require("ejs");

const app = express();
const session = require("express-session");

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "secretKey",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Change to true if using HTTPS
    })
);

// Database Connection
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "food_ordering",
});

// Helper Functions for Validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function validateUsername(username) {
    return username.length >= 3; // Username must be at least 3 characters
}

const registrationSchema = Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().required(),
    password: Joi.string().required(),
});

const validateRegistrationData = (data) => {
    const result = registrationSchema.validate(data);
    if (result.error) {
        throw new Error(result.error.message);
    }
    return result.value;
};

// Register Endpoint
app.post("/register", async(req, res) => {
    try {
        const validatedData = validateRegistrationData(req.body);
        const { email, username, password } = validatedData;

        if (!email || !username || !password) {
            return res
                .status(400)
                .json({ success: false, message: "All fields are required" });
        }

        if (!validateEmail(email) || !validateUsername(username)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid email or username" });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const query =
                "INSERT INTO users (email, username, password) VALUES (?, ?, ?)";
            await db.query(query, [email, username, hashedPassword]);
            res
                .status(201)
                .json({ success: true, message: "User registered successfully" });
        } catch (error) {
            console.error("Error during registration:", error);
            res.status(500).json({ success: false, message: "Registration failed" });
        }
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});


// Login Endpoint with Role Validation
app.post("/login", async(req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res
            .status(400)
            .json({ success: false, message: "All fields are required" });
    }

    if (role !== "admin" && role !== "users") {
        return res.status(400).json({ success: false, message: "Invalid role" });
    }

    try {
        const query =
            role === "admin" ?
            "SELECT * FROM admin WHERE username = ?" :
            "SELECT * FROM users WHERE username = ?";
        const [results] = await db.query(query, [username]);

        if (results.length === 0) {
            return res
                .status(401)
                .json({ success: false, message: `${role} not found` });
        }

        const user = results[0];
        const isValidPassword =
            role === "admin" ?
            password === user.password :
            await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res
                .status(401)
                .json({ success: false, message: "Invalid username or password" });
        }

        if (role === "users") {
            req.session.testerId = user.id; // Store testerId in session
        }

        res.status(200).json({
            success: true,
            message: `${role} login successful`,
            role,
            testerId: user.id || null,
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ success: false, message: "Login failed" });
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
        } else {
            res.redirect("../login.html");
        }
    });
});

// Feedback Submission Endpoint
app.post("/api/submitFeedback", async(req, res) => {
    const { name, email, rating, comments } = req.body;

    if (!name || !email || !rating || !comments) {
        return res
            .status(400)
            .json({ success: false, message: "All fields are required!" });
    }

    try {
        const query = "INSERT INTO feedback (name, email, rating, comments) VALUES (?, ?, ?, ?)";
        await db.query(query, [name, email, rating, comments]);
        res
            .status(201)
            .json({ success: true, message: "Thank you for your feedback!" });
    } catch (error) {
        console.error("Error submitting feedback:", error);
        res
            .status(500)
            .json({ success: false, message: "Error saving feedback to the database." });
    }
});



app.post("/api/submitFeedback", async(req, res) => {
    const { name, email, rating, comments } = req.body;

    // Validate input
    if (!name || !email || !rating || !comments) {
        return res.status(400).json({
            success: false,
            message: "All fields are required, including a valid rating.",
        });
    }

    try {
        const query =
            "INSERT INTO feedback (name, email, rating, comments) VALUES (?, ?, ?, ?)";
        await db.query(query, [name, email, rating, comments]);
        res.status(201).json({
            success: true,
            message: "Thank you for your feedback!",
        });
    } catch (error) {
        console.error("Error submitting feedback:", error);
        res.status(500).json({
            success: false,
            message: "Error saving feedback to the database.",
        });
    }
});


app.post("/api/submitFeedback", async(req, res) => {
    const {
        name,
        email,
        rating,
        comments
    } = req.body;

    // Validate input
    if (!name || !email || !rating || !comments) {
        return res.status(400).json({
            success: false,
            message: "All fields are required, including a valid rating.",
        });
    }

    try {
        const query =
            "INSERT INTO feedback (name, email, rating, comments) VALUES (?, ?, ?, ?)";
        await db.query(query, [name, email, rating, comments]);
        res.status(201).json({
            success: true,
            message: "Thank you for your feedback!",
        });
    } catch (error) {
        console.error("Error submitting feedback:", error);
        res.status(500).json({
            success: false,
            message: "Error saving feedback to the database.",
        });
    }
});

//
// Contact Form API Endpoint
app.post("/api/contact", async(req, res) => {
    const { name, email, message } = req.body;

    // Validate inputs
    if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: "All fields are required!" });
    }

    // Insert data into the database
    try {
        const query = "INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)";
        await db.query(query, [name, email, message]);
        res.status(200).json({ success: true, message: "Thank you for contacting us! We will get back to you soon." });
    } catch (error) {
        console.error("Error during contact form submission:", error);
        res.status(500).json({ success: false, message: "Error saving data to the database." });
    }
});

// Route to handle order placement
app.post("/place-order", async(req, res) => {
    const { name, phone, email, address, city, postalCode, country, foodItem, quantity, amount, orderDate, specialInstructions, paymentMethod } = req.body;

    if (!name || !phone || !email || !address || !city || !postalCode || !country || !foodItem || !quantity || !amount || !orderDate || !paymentMethod) {
        return res.status(400).json({
            success: false,
            message: "All fields are required.",
        });
    }

    try {
        const query = `
        INSERT INTO orders (name, phone, email, address, city, postal_code, country, food_item, quantity, amount, order_date, special_instructions, payment_method) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

        await db.query(query, [name, phone, email, address, city, postalCode, country, foodItem, quantity, amount, orderDate, specialInstructions, paymentMethod]);

        res.status(201).json({
            success: true,
            message: "Order placed successfully!",
        });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while placing your order. Please try again later.",
        });
    }
});


// Order placement route
app.post('/place-order', (req, res) => {
    const orderDetails = req.body;

    if (!orderDetails.foodItem || !orderDetails.quantity || !orderDetails.orderDate) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    orders.push(orderDetails); // Save order (in-memory)
    res.status(201).json({ message: 'Order placed successfully!', order: orderDetails });
});







// API to fetch menu items
app.get('/menu', (req, res) => {
    db.query('SELECT * FROM menu_items', (err, results) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(results);
        }
    });
});

// API to place an order
app.post('/order', (req, res) => {
    const { item_id, quantity } = req.body;
    db.query(
        'INSERT INTO orders (item_id, quantity) VALUES (?, ?)', [item_id, quantity],
        (err, results) => {
            if (err) {
                res.status(500).send(err);
            } else {
                res.json({ message: 'Order placed successfully!', orderId: results.insertId });
            }
        }
    );
});

//admin-dashboard

// 📊 2. Get All Orders
app.get('/get-all-orders', async(req, res) => {
    try {
        const query = `SELECT * FROM orders ORDER BY order_date DESC`;
        const [orders] = await db.query(query);

        const formattedOrders = orders.map(order => ({
            id: order.id,
            name: order.name,
            phone: order.phone,
            email: order.email,
            address: `${order.address}, ${order.city}, ${order.postal_code}, ${order.country}`,
            food_item: order.food_item,
            quantity: order.quantity,
            amount: order.amount,
            order_date: order.order_date,
            payment_method: order.payment_method,
            special_instructions: order.special_instructions,
        }));

        res.json({ message: 'Orders fetched successfully', data: formattedOrders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
});

// 🔍 3. Get Order by ID
app.get('/get-order/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;
        const query = `SELECT * FROM orders WHERE id = ?`;
        const [orders] = await db.query(query, [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orders[0];
        const formattedOrder = {
            id: order.id,
            name: order.name,
            phone: order.phone,
            email: order.email,
            address: `${order.address}, ${order.city}, ${order.postal_code}, ${order.country}`,
            food_item: order.food_item,
            quantity: order.quantity,
            amount: order.amount,
            order_date: order.order_date,
            payment_method: order.payment_method,
            special_instructions: order.special_instructions,
        };

        res.json({ message: 'Order fetched successfully', data: formattedOrder });
    } catch (error) {
        console.error('Error fetching order by ID:', error);
        res.status(500).json({ message: 'Error fetching order', error: error.message });
    }
});

// ✏️ 4. Edit Order by ID
app.put('/edit-order/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { name, phone, email, address, city, postal_code, country, food_item, quantity, amount, order_date, special_instructions, payment_method } = req.body;

        const query = `
            UPDATE orders 
            SET name = ?, phone = ?, email = ?, address = ?, city = ?, postal_code = ?, country = ?, 
                food_item = ?, quantity = ?, amount = ?, order_date = ?, special_instructions = ?, payment_method = ?
            WHERE id = ?`;

        const [result] = await db.query(query, [
            name, phone, email, address, city, postal_code, country,
            food_item, quantity, amount, order_date, special_instructions, payment_method, orderId,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Order not found or no changes made' });
        }

        res.json({ message: 'Order updated successfully' });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Error updating order', error: error.message });
    }
});

// ❌ 5. Delete Order by ID
app.delete('/delete-order/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;

        const query = `DELETE FROM orders WHERE id = ?`;
        const [result] = await db.query(query, [orderId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ message: 'Error deleting order', error: error.message });
    }
});


// 📩 Save Contact Form Submission
app.post('/api/contact', async(req, res) => {
    try {
        const { name, email, message } = req.body;
        const query = `INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)`;
        await db.query(query, [name, email, message]);

        res.json({ message: 'Contact form submitted successfully!' });
    } catch (error) {
        console.error('Error saving contact form:', error);
        res.status(500).json({ message: 'Error saving contact form', error: error.message });
    }
});

// 📋 Get All Contact Submissions
app.get('/api/get-contacts', async(req, res) => {
    try {
        const query = `SELECT * FROM contacts ORDER BY submitted_at DESC`;
        const [contacts] = await db.query(query);
        res.json({ message: 'Contacts fetched successfully', data: contacts });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ message: 'Error fetching contacts', error: error.message });
    }
});


// 📝 Submit Feedback
app.post('/api/submitFeedback', async(req, res) => {
    try {
        const { name, email, rating, comments } = req.body;

        // Ensure all required fields are provided
        if (!name || !email || !rating || !comments) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        // Insert feedback with timestamp
        const query = `
            INSERT INTO feedback (name, email, rating, comments, submitted_at)
            VALUES (?, ?, ?, ?, NOW())`;
        await db.query(query, [name, email, rating, comments]);

        res.json({ success: true, message: 'Feedback submitted successfully!' });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ success: false, message: 'Error saving feedback.' });
    }
});

// 📊 Get All Feedback
app.get('/api/getAllFeedback', async(req, res) => {
    try {
        const [feedback] = await db.query('SELECT * FROM feedback ORDER BY submitted_at DESC');
        res.json({ success: true, data: feedback });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ success: false, message: 'Error fetching feedback.' });
    }
});



// Route to handle dish suggestions
app.post("/suggest-dish", (req, res) => {
    const { name, email, dishName, dishDescription } = req.body;

    const sql = "INSERT INTO suggested_dishes (name, email, dish_name, description) VALUES (?, ?, ?, ?)";
    db.query(sql, [name, email, dishName, dishDescription], (err, result) => {
        if (err) {
            console.error("Error inserting data:", err);
            return res.status(500).json({ error: "Failed to insert suggestion" });
        }
        res.status(200).json({ message: "Suggestion submitted successfully!" });
    });
});


app.get("/api/get-users", async(req, res) => {
    try {
        // Removed 'role' column
        const [users] = await db.query("SELECT id, username, email, created_at FROM users");
        res.json({ success: true, data: users });
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ success: false, message: "Failed to get users" });
    }
});

app.get('/api/your-taste-submissions', async(req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM suggested_dishes ORDER BY submitted_at DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching taste submissions:', error);
        res.json({ success: false, message: 'Error fetching submissions' });
    }
});








// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});