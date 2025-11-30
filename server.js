const express = require('express'); 
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// --- MongoDB connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

// --- User Schema ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'employee' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// --- Attendance Schema ---
const attendanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

// --- Routes ---

// Test route
app.get('/', (req, res) => {
    res.send('Backend is working!');
});

// ---------------- AUTH ROUTES ----------------

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// --------------- ATTENDANCE ROUTES ----------------

// Check-in
app.post('/api/attendance/checkin', async (req, res) => {
    try {
        const { userId } = req.body;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existing = await Attendance.findOne({
            user: userId,
            checkIn: { $gte: today }
        });

        if (existing)
            return res.status(400).json({ message: 'Already checked in today' });

        const newAttendance = new Attendance({
            user: userId,
            checkIn: new Date()
        });

        await newAttendance.save();

        res.status(201).json({
            message: 'Checked in successfully',
            attendance: newAttendance
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Check-out
app.post('/api/attendance/checkout', async (req, res) => {
    try {
        const { userId } = req.body;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            user: userId,
            checkIn: { $gte: today }
        });

        if (!attendance)
            return res.status(400).json({ message: 'You have not checked in today' });

        if (attendance.checkOut)
            return res.status(400).json({ message: 'Already checked out today' });

        attendance.checkOut = new Date();
        await attendance.save();

        res.json({
            message: 'Checked out successfully',
            attendance
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
