// Backend/auth-middleware.js
const jwt = require('jsonwebtoken');

/**
 * This middleware checks for a valid JWT token in the Authorization header.
 * If valid, it attaches the user's data (id, role, status) to `req.user`.
 * If invalid, it blocks the request.
 */
function authMiddleware(req, res, next) {
    // Get token from the 'Authorization' header
    // The format is "Bearer <TOKEN>"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }

    try {
        // Verify the token using your JWT_SECRET
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach the user's information to the request object
        req.user = decoded; // req.user will now contain { id, role, status }

        next(); // Token is valid, proceed to the next route
    } catch (ex) {
        res.status(400).json({ success: false, error: 'Invalid token.' });
    }
}

module.exports = authMiddleware;