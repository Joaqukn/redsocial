const express = require('express');
const path = require('path');
const connection = require('./db');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Servir archivos estáticos

// === LOGIN ===
app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM miembros WHERE email = ?';

  connection.query(sql, [email], async (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).json({ message: 'Error del servidor' });
    }

    if (results.length > 0) {
      const user = results[0];
      const match = await bcrypt.compare(password, user.password_hash);

      if (match) {
        res.json({ username: user.username });
      } else {
        res.status(401).json({ message: 'Email o contraseña incorrectos' });
      }
    } else {
      res.status(401).json({ message: 'Email o contraseña incorrectos' });
    }
  });
});

// === REGISTRO ===
app.post('/api/users/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO miembros (username, email, password_hash) VALUES (?, ?, ?)';

    connection.query(sql, [username, email, password_hash], (err) => {
      if (err) {
        console.error('Error al registrar:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Correo o usuario ya registrado.' });
        }
        return res.status(500).json({ message: 'Error del servidor' });
      }
      res.json({ username });
    });
  } catch (err) {
    console.error('Error al encriptar la contraseña:', err);
    res.status(500).json({ message: 'Error al encriptar la contraseña.' });
  }
});

// === CONFIGURACIÓN MULTER PARA IMÁGENES ===
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// === RUTAS DE PUBLICACIONES ===

// Obtener todas las publicaciones
app.get('/api/posts', (req, res) => {
  const sql = 'SELECT * FROM posts ORDER BY created_at DESC';
  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener posts:', err);
      return res.status(500).json({ message: 'Error al obtener publicaciones' });
    }
    res.json(results);
  });
});

// Crear publicación
app.post('/api/posts', upload.single('image'), (req, res) => {
  const { title, text, username } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : null;

  const sql = 'INSERT INTO posts (user, title, text, image, created_at, likes) VALUES (?, ?, ?, ?, NOW(), 0)';
  connection.query(sql, [username || 'Anónimo', title, text, image], (err) => {
    if (err) {
      console.error('Error al crear post:', err);
      return res.status(500).json({ message: 'Error al crear publicación' });
    }
    res.status(201).json({ message: 'Publicación creada correctamente' });
  });
});

// Editar publicación
app.put('/api/posts/:id', (req, res) => {
  const postId = req.params.id;
  const { title, text } = req.body;

  const sql = 'UPDATE posts SET title = ?, text = ? WHERE id = ?';
  connection.query(sql, [title, text, postId], (err) => {
    if (err) {
      console.error('Error al editar publicación:', err);
      return res.status(500).json({ message: 'Error al editar publicación' });
    }
    res.json({ message: 'Publicación actualizada correctamente' });
  });
});

// Eliminar publicación
app.delete('/api/posts/:id', (req, res) => {
  const postId = req.params.id;
  const sql = 'DELETE FROM posts WHERE id = ?';
  connection.query(sql, [postId], (err) => {
    if (err) {
      console.error('Error al eliminar publicación:', err);
      return res.status(500).json({ message: 'Error al eliminar publicación' });
    }
    res.json({ message: 'Publicación eliminada correctamente' });
  });
});

// Like
app.post('/api/posts/:id/like', (req, res) => {
  const postId = req.params.id;
  const sql = 'UPDATE posts SET likes = likes + 1 WHERE id = ?';
  connection.query(sql, [postId], (err) => {
    if (err) {
      console.error('Error al dar like:', err);
      return res.status(500).json({ message: 'Error al dar like' });
    }
    res.json({ message: 'Like agregado' });
  });
});

// Agregar comentario
app.post('/api/posts/:id/comment', (req, res) => {
  const postId = req.params.id;
  const { user, text } = req.body;

  const sql = 'INSERT INTO comments (post_id, user, text, created_at) VALUES (?, ?, ?, NOW())';
  connection.query(sql, [postId, user, text], (err) => {
    if (err) {
      console.error('Error al agregar comentario:', err);
      return res.status(500).json({ message: 'Error al comentar' });
    }
    res.json({ message: 'Comentario agregado' });
  });
});

// Backend: ruta GET /api/posts
app.get('/api/posts', async (req, res) => {
  try {
    // Traer todos los posts
    const [posts] = await db.query("SELECT * FROM posts ORDER BY created_at DESC");

    // Traer comentarios de todos los posts
    const [comments] = await db.query("SELECT * FROM comments");

    // Asociar comentarios a cada post
    const postsWithComments = posts.map(post => ({
      ...post,
      comments: comments.filter(c => c.post_id === post.id)  // solo los de ese post
    }));

    res.json(postsWithComments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al traer posts" });
  }
});



// === INICIO DEL SERVIDOR ===
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
