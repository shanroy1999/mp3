// Get the packages we need
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// CORS
app.use(cors());

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || process.env.TOKEN;
if (!mongoURI)
{
    console.error('No MongoDB connection string found. Please set MONGODB_URI or TOKEN in .env');
} else
{
    mongoose
        .connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        .then(() => console.log('✅ Connected to MongoDB'))
        .catch((err) =>
        {
            console.error('❌ MongoDB connection error:', err);
        });
}

// Routes
require('./routes')(app, router);

// Start
app.listen(port, () =>
{
    console.log('Server running on port ' + port);
});