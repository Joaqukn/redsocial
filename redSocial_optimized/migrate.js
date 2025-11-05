// migrate.js
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');

// Conexión a MongoDB
mongoose.connect('mongodb+srv://tumianpro_db_user:1234@soulsocial.8ctfcyh.mongodb.net/?appName=SoulSocial')
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error MongoDB:', err));

// Definir modelos Mongoose
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  email: String,
  password: String
}));

const Post = mongoose.model('Post', new mongoose.Schema({
  user: String,
  title: String,
  text: String,
  image: String,
  created_at: Date,
  likes: Number
}));

const Comment = mongoose.model('Comment', new mongoose.Schema({
  post_id: String,
  user: String,
  text: String,
  created_at: Date
}));

// Función principal de migración
async function migrate() {
  try {
    // Conexión a MySQL
    const mysqlConn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // tu contraseña de MySQL
      database: 'redsocial',
      charset: 'utf8mb4' // importante para emojis y caracteres especiales
    });

    console.log('Conectado a MySQL');

    // 1️⃣ Migrar usuarios
    const [users] = await mysqlConn.execute('SELECT * FROM miembros');
    await User.insertMany(users.map(u => ({
      username: u.username,
      email: u.email,
      password: u.password_hash
    })));
    console.log('Usuarios migrados');

    // 2️⃣ Migrar posts
    const [posts] = await mysqlConn.execute('SELECT * FROM posts');
    await Post.insertMany(posts.map(p => ({
      user: p.user,
      title: p.title,
      text: p.text,
      image: p.image,
      created_at: p.created_at ? new Date(p.created_at) : new Date(),
      likes: p.likes
    })));
    console.log('Posts migrados');

    // 3️⃣ Migrar comentarios
    const [comments] = await mysqlConn.execute('SELECT * FROM comments');
    await Comment.insertMany(comments.map(c => ({
      post_id: c.post_id ? c.post_id.toString() : null,
      user: c.user,
      text: c.text,
      created_at: c.created_at ? new Date(c.created_at) : new Date()
    })));
    console.log('Comentarios migrados');

    // Cerrar conexión MySQL
    await mysqlConn.end();
    console.log('Migración completa');
    process.exit(0);

  } catch (err) {
    console.error('Error durante la migración:', err);
    process.exit(1);
  }
}

// Ejecutar migración
migrate();
