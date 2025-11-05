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

// === MODELOS MONGOOSE ===
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});
const User = mongoose.model('User', userSchema);

const postSchema = new mongoose.Schema({
  user: String,
  title: String,
  text: String,
  image: String,
  created_at: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 }
});
const Post = mongoose.model('Post', postSchema);

const commentSchema = new mongoose.Schema({
  post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  user: String,
  text: String,
  created_at: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

// === CONFIGURACIÓN MULTER PARA IMÁGENES ===
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

// Registro
app.post('/api/users/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
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

// Login
app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(401).json({ message: 'Email o contraseña incorrectos' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Email o contraseña incorrectos' });

    res.json({ username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en login' });
  }
});

// === RUTAS DE POSTS ===

// Crear publicación
app.post('/api/posts', upload.single('image'), async (req, res) => {
  try {
    const { title, text, username } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;

    const post = new Post({
      user: username || 'Anónimo',
      title,
      text,
      image
    });
    await post.save();

    res.status(201).json({ message: 'Publicación creada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear publicación' });
  }
});

// Obtener todas las publicaciones con comentarios
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

// Editar publicación
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

// Eliminar publicación
app.delete('/api/posts/:id', async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Publicación eliminada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar publicación' });
  }
});

// Dar like
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
    res.json({ message: 'Like agregado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al dar like' });
  }
});

// Agregar comentario
app.post('/api/posts/:id/comment', async (req, res) => {
  try {
    const { user, text } = req.body;
    const comment = new Comment({
      post_id: req.params.id,
      user,
      text
    });
    await comment.save();
    res.json({ message: 'Comentario agregado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al agregar comentario' });
  }
});

// === INICIO DEL SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
