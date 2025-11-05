document.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch('/api/posts');
  const posts = await res.json();
  const container = document.getElementById('posts');

  posts.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML = `
      <h3>${post.user}</h3>
      <p>${post.text}</p>
      ${post.image ? `<img src="/uploads/${post.image}" width="200">` : ''}
    `;
    container.appendChild(div);
  });
});

function attachPostHandlers() {
  // Likes
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.onclick = async () => {
      const postId = btn.dataset.postId;
      try {
        const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
        if (res.ok) renderPosts();
      } catch (e) { console.error(e); }
    };
  });

  // Enfocar comentarios
  document.querySelectorAll('.focus-comment').forEach(btn => {
    btn.onclick = () => {
      const form = document.querySelector(`.comment-form[data-post-id="${btn.dataset.postId}"]`);
      form?.querySelector('input')?.focus();
    };
  });

  // Comentarios
  document.querySelectorAll('.comment-form').forEach(form => {
    form.onsubmit = async e => {
      e.preventDefault();
      const input = form.querySelector('input');
      const comment = input.value.trim();
      if (!comment) return;

      const postId = form.dataset.postId;
      const user = localStorage.getItem('username') || 'Anónimo';

      try {
        const res = await fetch(`/api/posts/${postId}/comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user, text: comment })
        });
        if (res.ok) {
          input.value = '';
          renderPosts();
        }
      } catch (err) { console.error(err); }
    };
  });

  // Eliminar publicación
  document.querySelectorAll('.delete-post').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('¿Seguro que deseas eliminar esta publicación?')) return;
      const postId = btn.dataset.id;
      try {
        const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
        if (res.ok) renderPosts();
      } catch (err) { console.error(err); }
    };
  });
}
