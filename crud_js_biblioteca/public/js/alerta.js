document.addEventListener('DOMContentLoaded', function () {
    const deleteButtons = document.querySelectorAll('.sweet-delete-confirm');

    deleteButtons.forEach(button => {
        button.addEventListener('click', function (event) {
            event.preventDefault(); // Previene la acción por defecto del enlace (navegar)

            const deleteUrl = this.href; // La URL a la que se debe ir si se confirma
            const bookName = this.dataset.bookName || 'este elemento'; // Obtiene el nombre del libro o usa un genérico

            Swal.fire({
                title: '¿Estás seguro?',
                text: `¡No podrás revertir la eliminación de "${bookName}"!`, // Mensaje personalizado
                icon: 'warning', // Icono de advertencia
                showCancelButton: true,
                confirmButtonColor: '#d33', // Color rojo para el botón de confirmación (peligro)
                cancelButtonColor: '#3085d6', // Color azul para el botón de cancelar
                confirmButtonText: 'Sí, ¡eliminar!',
                cancelButtonText: 'Cancelar',
                reverseButtons: true // Opcional: Pone el botón de confirmar a la derecha
            }).then((result) => {
                if (result.isConfirmed) {
                    // Si el usuario confirma, redirigir a la URL de eliminación
                    window.location.href = deleteUrl;
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    Swal.fire(
                        'Cancelado',
                        'La eliminación ha sido cancelada.',
                        'info' // Puedes cambiar a 'error' o 'success' también
                    )
                }
            });
        });
    });
});