// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";

// Cargar variables .env
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/infordle")
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error de conexión MongoDB:", err));

// ====================
// MODELOS
// ====================
const commentSchema = new mongoose.Schema({
  post_id: String,
  user: String,
  text: String,
  created_at: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  user: String,
  title: String,
  text: String,
  image: String,
  imageBase64: String,
  likes: { type: Number, default: 0 },
  likedBy: [String],
  created_at: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  bio: String,
  avatar: String,
  postsCount: { type: Number, default: 0 },
  followers: { type: Number, default: 0 }
});

const Comment = mongoose.model("Comment", commentSchema);
const Post = mongoose.model("Post", postSchema);
const User = mongoose.model("User", userSchema);

// ====================
// RUTAS
// ====================

// Obtener publicaciones con comentarios
app.get("/api/posts", async (req, res) => {
  const posts = await Post.find().sort({ created_at: -1 }).lean();
  for (const post of posts) {
    post.comments = await Comment.find({ post_id: post._id });
  }
  res.json(posts);
});

// Crear publicación
app.post("/api/posts", async (req, res) => {
  const post = new Post(req.body);
  await post.save();
  io.emit("postsUpdated");
  res.json(post);
});

// Like
app.post("/api/posts/:id/like", async (req, res) => {
  const { username } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post no encontrado" });

  const alreadyLiked = post.likedBy.includes(username);
  if (alreadyLiked) {
    post.likedBy = post.likedBy.filter(u => u !== username);
    post.likes--;
  } else {
    post.likedBy.push(username);
    post.likes++;
  }
  await post.save();
  io.emit("postsUpdated");
  res.json({ likes: post.likes });
});

// Comentario
app.post("/api/posts/:id/comment", async (req, res) => {
  const { user, text } = req.body;
  const { id } = req.params;
  const comment = new Comment({ post_id: id, user, text });
  await comment.save();
  io.emit("postsUpdated");
  res.json(comment);
});

// Obtener publicación individual
app.get("/api/posts/:id", async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "No existe" });
  post.comments = await Comment.find({ post_id: post._id });
  res.json(post);
});

// Editar publicación
app.put("/api/posts/:id", async (req, res) => {
  await Post.findByIdAndUpdate(req.params.id, req.body);
  io.emit("postsUpdated");
  res.json({ message: "Actualizado" });
});

// Eliminar publicación
app.delete("/api/posts/:id", async (req, res) => {
  const postId = req.params.id;
  await Post.findByIdAndDelete(postId);
  await Comment.deleteMany({ post_id: postId });
  io.emit("postsUpdated");
  res.json({ message: "Eliminado" });
});

// Obtener datos de usuario
app.get("/api/users/:username", async (req, res) => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
  res.json(user);
});

// ====================
// SERVIDOR HTTP + SOCKET.IO
// ====================
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }
});

io.on("connection", socket => {
  console.log("🟢 Cliente conectado");
  socket.on("disconnect", () => console.log("🔴 Cliente desconectado"));
});

// ====================
// INICIO DEL SERVIDOR
// ====================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
