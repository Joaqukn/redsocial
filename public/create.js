document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  if (!username) {
    // Mostrar popup
    const popup = document.getElementById('accessPopup');
    popup.classList.add('active');

    // Bloquear scroll y formulario
    document.body.style.overflow = 'hidden';

    // Botón cerrar popup
    document.getElementById('popupCloseBtn').addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    // Desactivar formulario
    const postForm = document.getElementById('postForm');
    postForm.querySelectorAll('input, textarea, button').forEach(el => el.disabled = true);
  }
});

