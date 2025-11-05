const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const compression = require('compression');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(compression());
app.use(express.static('public', { maxAge: '1d' }));

// === CONEXIÓN A MONGODB ===
mongoose.connect(process.env.MONGO_URI, {})
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error al conectar con MongoDB:', err));

// === MODELOS ===
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  bio: String,
  avatar: String
});
const User = mongoose.model('User', userSchema);

const postSchema = new mongoose.Schema({
  user: String,
  title: String,
  text: String,
  image: String,
  created_at: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  likedBy: { type: [String], default: [] }
});
const Post = mongoose.model('Post', postSchema);

const commentSchema = new mongoose.Schema({
  post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  user: String,
  text: String,
  created_at: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

// === CONFIG MULTER ===
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// === RUTAS DE USUARIOS ===
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Correo ya registrado' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Email o contraseña incorrectos' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Email o contraseña incorrectos' });

    res.json({ username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en login' });
  }
});

app.get('/api/users/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const user = await User.findOne({ username }).lean();
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const postsCount = await Post.countDocuments({ user: username });
    res.json({
      username: user.username,
      bio: user.bio || '',
      avatar: user.avatar || '',
      postsCount,
      followers: 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener usuario' });
  }
});

// === RUTAS DE POSTS ===
app.post('/api/posts', upload.single('image'), async (req, res) => {
  try {
    const { title, text, username } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;

    const post = new Post({ user: username || 'Anónimo', title, text, image });
    await post.save();
    res.status(201).json({ message: 'Publicación creada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear publicación' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ created_at: -1 }).lean();
    const comments = await Comment.find().lean();

    const postsWithComments = posts.map(post => ({
      ...post,
      comments: comments.filter(c => c.post_id && c.post_id.toString() === post._id.toString())
    }));
    res.json(postsWithComments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener publicaciones' });
  }
});

// --- LIKE ---
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(401).json({ message: 'Debes iniciar sesión' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });

    if (!post.likedBy.includes(username)) {
      post.likes = (post.likes || 0) + 1;
      post.likedBy.push(username);
    } else {
      post.likes = Math.max((post.likes || 1) - 1, 0);
      post.likedBy = post.likedBy.filter(u => u !== username);
    }
    await post.save();
    res.json({ likes: post.likes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al dar like' });
  }
});

// --- COMENTARIOS ---
app.post('/api/posts/:id/comment', async (req, res) => {
  try {
    const { user, text } = req.body;
    const comment = new Comment({ post_id: req.params.id, user, text });
    await comment.save();
    res.json({ message: 'Comentario agregado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al agregar comentario' });
  }
});

// --- EDITAR ---
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { title, text } = req.body;
    await Post.findByIdAndUpdate(req.params.id, { title, text });
    res.json({ message: 'Publicación actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al editar publicación' });
  }
});

// --- ELIMINAR POST Y SUS COMENTARIOS ---
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id;

    // Eliminar el post
    await Post.findByIdAndDelete(postId);

    // Eliminar los comentarios asociados
    await Comment.deleteMany({ post_id: postId });

    res.json({ message: 'Publicación y comentarios eliminados correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar publicación' });
  }
});


app.get('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'ID inválido' });

  try {
    const post = await Post.findById(id).lean();
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    const comments = await Comment.find({ post_id: post._id }).lean(); // <-- post_id
    post.comments = comments;

    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener post' });
  }
});


// --- CACHE ---
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// === INICIO SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
