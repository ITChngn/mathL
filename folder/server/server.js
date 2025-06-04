// Hardcode the MongoDB URI for testing
const MONGODB_URI = "mongodb+srv://chngn:dbchngnpassword@cluster0.tomeub5.mongodb.net/myDatabase?retryWrites=true&w=majority&appName=Cluster0";

// MongoDB connection
const mongoose = require('mongoose');
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

const bcrypt = require('bcrypt');
const session = require('express-session');
const express = require('express');
const app = express();
app.use(express.json());
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Add progress field to user schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  progress: {
    type: Object,
    default: {}
  },

  isAdmin: { type: Boolean, default: false }, // Add admin flag
  solvedProblems: [{ type: String }] // Add solvedProblems field
});
const User = mongoose.model('User', userSchema);

// Password reset token schema
const passwordResetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 3600 } // 1 hour expiry
});
const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

// Media schema for images and voice files
const mediaSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  type: { type: String, enum: ['image', 'voice'], required: true },
  url: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now }
});
const Media = mongoose.model('Media', mediaSchema);

// Math Problem schema
const mathProblemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  timeLimit: { type: Number, default: 0 },
  type: { type: String, required: true },
  hasTimer: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const MathProblem = mongoose.model('MathProblem', mathProblemSchema);

const PORT = process.env.PORT || 3000;

// Nodemailer transporter (configure with your SMTP or Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Serve static files from /static
app.use('/static', express.static(path.join(__dirname, '../static')));

// Serve index.html from /templates
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/index.html'));
});

// Serve preschool.html
app.get('/preschool', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/preschool.html'));
});
app.get('/preschool/:id', (req, res) => {
  const preschoolId = req.params.id;   
    res.sendFile(path.join(__dirname, '../templates/preschool.html'));
}
);

// Serve preschool-list pages
app.get('/preschool-list/:id.html', (req, res) => {
  const id = req.params.id;
  res.sendFile(path.join(__dirname, `../templates/preschool-list/${id}.html`));
});

// Serve login.html
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/login.html'));
});

// Serve register.html
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/register.html'));
});

// Serve forgot-password.html
app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/forgot-password.html'));
});

// Serve reset-password.html
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/reset-password.html'));
});

// Serve profile.html
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/profile.html'));
});

// Serve problems.html for /problems and /problems/:id
app.get('/problems', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/problems.html'));
});
app.get('/problems/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/problems.html'));
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'matl-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));

// Registration route
app.post('/register', async (req, res) => {
  const { username, email, password, confirm } = req.body;
  if (!username || !email || !password || password !== confirm) {
    return res.status(400).send('Мэдээллээ зөв бөглөнө үү.');
  }
  try {
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).send('Хэрэглэгчийн нэр эсвэл имэйл бүртгэлтэй байна.');
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hash });
    await user.save();
    res.redirect('/login');
  } catch (err) {
    res.status(500).send('Бүртгэхэд алдаа гарлаа.');
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Мэдээллээ бөглөнө үү.');
  try {
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) return res.status(400).send('Хэрэглэгч олдсонгүй.');
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).send('Нууц үг буруу.');
    req.session.username = user.username;
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Нэвтрэхэд алдаа гарлаа.');
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// API endpoint to get current user
app.get('/api/user', async (req, res) => {
  if (req.session && req.session.username) {
    const user = await User.findOne({ username: req.session.username });
    res.json({ username: req.session.username, email: user ? user.email : '', isAdmin: user ? !!user.isAdmin : false });
  } else {
    res.json({ username: null, isAdmin: false });
  }
});

// Save progress endpoint
app.post('/api/progress', async (req, res) => {
  if (!req.session || !req.session.username) return res.status(401).json({ error: 'Not logged in' });
  const { skill, score, questionsAnswered } = req.body;
  try {
    const user = await User.findOne({ username: req.session.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.progress = user.progress || {};
    user.progress[skill] = { score, questionsAnswered, updated: new Date() };
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// Forgot password POST handler (send reset link)
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ $or: [{ email: email }, { username: email }] });
  if (!user) {
    return res.send('<script>alert("Ийм хэрэглэгч олдсонгүй.");window.location="/forgot-password";</script>');
  }
  const token = crypto.randomBytes(32).toString('hex');
  await PasswordReset.deleteMany({ userId: user._id }); // Remove old tokens
  await PasswordReset.create({ userId: user._id, token });
  const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
  await transporter.sendMail({
    to: user.email,
    subject: 'MaTL - Нууц үг сэргээх холбоос',
    html: `<p>Сайн байна уу, ${user.username || user.email}!</p><p>Нууц үгээ шинэчлэхийн тулд доорх холбоос дээр дарна уу:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Хэрэв та хүсэлт гаргаагүй бол энэ имэйлийг үл тоомсорлоно уу.</p>`
  });
  res.send('<script>alert("Сэргээх холбоос таны имэйл рүү илгээгдлээ.");window.location="/login";</script>');
});

// Reset password GET handler (show form)
app.get('/reset-password', async (req, res) => {
  const { token } = req.query;
  const reset = await PasswordReset.findOne({ token });
  if (!reset) {
    return res.send('<script>alert("Холбоос хүчингүй эсвэл хугацаа дууссан байна.");window.location="/forgot-password";</script>');
  }
  // Render reset-password.html with token
  const fs = require('fs');
  let html = fs.readFileSync(path.join(__dirname, '../templates/reset-password.html'), 'utf8');
  html = html.replace('{{token}}', token);
  res.send(html);
});

// Reset password POST handler (update password)
app.post('/reset-password', async (req, res) => {
  const { token, password, confirm } = req.body;
  if (!token) return res.send('<script>alert("Холбоос буруу байна.");window.location="/forgot-password";</script>');
  if (!password || password.length < 6) return res.send('<script>alert("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.");window.history.back();</script>');
  if (password !== confirm) return res.send('<script>alert("Нууц үг таарахгүй байна.");window.history.back();</script>');
  const reset = await PasswordReset.findOne({ token });
  if (!reset) return res.send('<script>alert("Холбоос хүчингүй эсвэл хугацаа дууссан байна.");window.location="/forgot-password";</script>');
  const user = await User.findById(reset.userId);
  if (!user) return res.send('<script>alert("Хэрэглэгч олдсонгүй.");window.location="/forgot-password";</script>');
  user.password = await bcrypt.hash(password, 10);
  await user.save();
  await PasswordReset.deleteMany({ userId: user._id });
  res.send('<script>alert("Нууц үг амжилттай шинэчлэгдлээ!");window.location="/login";</script>');
});

// Change password API
app.post('/api/change-password', async (req, res) => {
  if (!req.session || !req.session.username) {
    return res.status(401).json({ success: false, error: 'Нэвтэрсэн байх шаардлагатай.' });
  }
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.json({ success: false, error: 'Бүх талбарыг бөглөнө үү.' });
  }
  try {
    const user = await User.findOne({ username: req.session.username });
    if (!user) return res.json({ success: false, error: 'Хэрэглэгч олдсонгүй.' });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.json({ success: false, error: 'Одоогийн нууц үг буруу.' });
    if (newPassword.length < 6) return res.json({ success: false, error: 'Шинэ нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Серверийн алдаа.' });
  }
});

const multer = require('multer');

// Multer storage with file type filtering and extension
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../static/uploads'));
  },
  filename: function (req, file, cb) {
    // Always use the original filename (e.g., basketball.png)
    cb(null, file.originalname);
  }
});

function fileFilter(req, file, cb) {
  const type = req.body.type || req.query.type;
  if (type === 'image') {
    // Accept only png, jpg, jpeg
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true);
    } else {
      cb(new Error('Зөвхөн PNG эсвэл JPG зураг зөвшөөрнө.'));
    }
  } else if (type === 'voice') {
    // Accept only mp3
    if (file.mimetype === 'audio/mpeg' && file.originalname.toLowerCase().endsWith('.mp3')) {
      cb(null, true);
    } else {
      cb(new Error('Зөвхөн mp3 дуу зөвшөөрнө.'));
    }
  } else {
    cb(new Error('Файлын төрөл буруу байна.'));
  }
}

const upload = multer({ storage, fileFilter });

// Admin middleware
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.username) return res.status(401).json({ error: 'Not logged in' });
  User.findOne({ username: req.session.username }).then(user => {
    if (!user || !user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

// Admin API: List all users
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const users = await User.find({}, { password: 0 });
  res.json(users);
});

// Admin API: List recent submissions (dummy for now)
app.get('/api/admin/submissions', requireAdmin, async (req, res) => {
  // Replace with real DB logic if you have a submissions collection
  res.json([
    { username: 'abc', problemTitle: 'Шугаман тэгшитгэлийг шийдвэрлэх: 7x - 14 = 35', status: 'Зөв' },
    { username: 'abc', problemTitle: 'Гурвалжны талбайг ол', status: 'Зөв' }
  ]);
});

// Admin API: Upload image or voice file
app.post('/api/admin/upload', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const type = req.body.type;
  if (!['image', 'voice'].includes(type)) return res.status(400).json({ error: 'Invalid type' });

  // Validate audio file is mp3 if type is 'voice'
  if (type === 'voice') {
    const isMp3 = req.file.mimetype === 'audio/mpeg' && req.file.originalname.toLowerCase().endsWith('.mp3');
    if (!isMp3) {
      // Remove the uploaded file if not valid mp3
      const fs = require('fs');
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Зөвхөн mp3 файл зөвшөөрнө.' });
    }
  }

  const url = `/static/uploads/${req.file.filename}`;
  const user = await User.findOne({ username: req.session.username });
  const media = new Media({
    filename: req.file.originalname,
    type,
    url,
    uploadedBy: user ? user._id : null
  });
  await media.save();
  res.json({ success: true, url, media });
});

// Admin API: List all media files
app.get('/api/admin/media', requireAdmin, async (req, res) => {
  const media = await Media.find().populate('uploadedBy', 'username');
  res.json(media);
});

// Admin API: Delete media file
app.delete('/api/admin/media/:id', requireAdmin, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ error: 'Файл олдсонгүй.' });
    // Remove file from filesystem
    const fs = require('fs');
    const filePath = path.join(__dirname, '../static/uploads', media.url.split('/').pop());
    fs.unlink(filePath, () => {}); // ignore error if file already deleted
    await media.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Устгах үед алдаа гарлаа.' });
  }
});

// Admin API: Add math problem
app.post('/api/admin/add-problem', requireAdmin, async (req, res) => {
  try {
    const { title, description, timeLimit, type, hasTimer } = req.body;
    if (!title || !description || !type) {
      return res.status(400).json({ success: false, error: 'Бүх талбарыг бөглөнө үү.' });
    }
    const problem = new MathProblem({
      title,
      description,
      timeLimit: timeLimit ? Number(timeLimit) : 0,
      type,
      hasTimer: hasTimer === 'true' || hasTimer === true
    });
    await problem.save();
    res.json({ success: true, problem });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Серверийн алдаа.' });
  }
});

// API: Get latest math problems
app.get('/api/problems/latest', async (req, res) => {
  const problems = await MathProblem.find().sort({ createdAt: -1 }).limit(5);
  res.json(problems);
});

// Serve admin.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/admin.html'));
});

// Wait for MongoDB connection before starting server
mongoose.connection.once('open', () => {
  console.log('MongoDB connection established. Starting server...');
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Update admin user (run once)
app.get('/make-admin/:username', async (req, res) => {
  const username = req.params.username;
  try {
    const result = await User.updateOne({ username }, { $set: { isAdmin: true } });
    if (result.modifiedCount > 0) {
      res.send(`<h2>${username} is now an admin!</h2>`);
    } else {
      res.send(`<h2>User not found or already admin.</h2>`);
    }
  } catch (err) {
    res.status(500).send('Error updating admin: ' + err.message);
  }
});

// Update admin user (run once)
// User.updateOne({ username: "your_admin_username" }, { $set: { isAdmin: true } }).then(() => console.log('Admin updated')).catch(err => console.error(err));

// API endpoint to get voice file for a question
app.get('/api/voice', (req, res) => {
  const question = req.query.question;
  // For now, hardcode for a6. You can expand this for other questions.
  if (question === 'a6') {
    res.json({ url: '/static/uploads/1748999788156-34145968.mp3' });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Serve basketball image from uploads folder for /api/image/basketball
app.get('/api/image/basketball', (req, res) => {
  const imgPath = path.join(__dirname, '../static/uploads/basketball.png');
  const fs = require('fs');
  fs.access(imgPath, fs.constants.F_OK, (err) => {
    if (err) {
      // If not found in uploads, try static/img as fallback
      const fallbackPath = path.join(__dirname, '../static/img/basketball.png');
      fs.access(fallbackPath, fs.constants.F_OK, (err2) => {
        if (err2) {
          res.status(404).send('Basketball image not found');
        } else {
          res.sendFile(fallbackPath);
        }
      });
    } else {
      res.sendFile(imgPath);
    }
  });
});

// API: Mark problem as solved for user
app.post('/api/solved', async (req, res) => {
  if (!req.session || !req.session.username) return res.status(401).json({ error: 'Not logged in' });
  const { problemId } = req.body;
  if (!problemId) return res.status(400).json({ error: 'No problemId' });
  try {
    const user = await User.findOne({ username: req.session.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.solvedProblems) user.solvedProblems = [];
    if (!user.solvedProblems.includes(problemId)) {
      user.solvedProblems.push(problemId);
      await user.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as solved' });
  }
});

// API: Get solved problems for current user
app.get('/api/solved', async (req, res) => {
  if (!req.session || !req.session.username) return res.json([]);
  const user = await User.findOne({ username: req.session.username });
  res.json(user && user.solvedProblems ? user.solvedProblems : []);
});

app.post('/api/admin/add-problem', (req, res) => {
  // Save req.body (and files) to the database
});
