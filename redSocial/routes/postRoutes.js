// Agregar like
router.post('/:id/like', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } }, { new: true });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Error al dar like' });
  }
});

// Agregar comentario
router.post('/:id/comment', async (req, res) => {
  const { user, text } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    post.comments.push({ user, text });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Error al comentar' });
  }
});
