// hash-password.js

const bcrypt = require('bcryptjs');

const password = 'admin123'; // <--- CHANGE THIS
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error("Error hashing password:", err);
        return;
    }
    console.log("Your Hashed Password Is:");
    console.log(hash);
});