// src/scripts/personas/wizard-form.ts
export function initializePersonaWizard() {
    const form = document.getElementById('wizard-form') as HTMLFormElement;
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const numeroIdInput = document.getElementById('numero_id') as HTMLInputElement;
    const verifyBtn = document.getElementById('verify-btn') as HTMLButtonElement;
    const idErrorMessage = document.getElementById('id-error-message');
    const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
    const fotoUploadInput = document.getElementById('foto_upload') as HTMLInputElement;
    const fotoPreview = document.getElementById('foto_preview') as HTMLImageElement;
  
  if (!form || !step1 || !step2 || !numeroIdInput || !verifyBtn || !idErrorMessage || !submitBtn || !fotoUploadInput || !fotoPreview) {
    console.error("Faltan elementos del DOM para el wizard.");
    return;
  }
  fotoUploadInput.addEventListener('change', () => {
    const file = fotoUploadInput.files?.[0];
    if (file) {
      // Creamos una URL local para el archivo seleccionado y la asignamos a la imagen.
      fotoPreview.src = URL.createObjectURL(file);
    }
  });
  
    // --- LÓGICA DEL BOTÓN DE VERIFICACIÓN ---
    verifyBtn.addEventListener('click', async () => {
      const numeroId = numeroIdInput.value;
      if (numeroId.length <= 4) {
        idErrorMessage.textContent = 'El ID debe tener más de 4 caracteres.';
        return;
      }
  
      verifyBtn.textContent = 'Verificando...';
      verifyBtn.disabled = true;
      idErrorMessage.textContent = '';
  
      try {
        const response = await fetch('/api/verify-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ numeroId }),
        });
  
        if (!response.ok) throw new Error('Error del servidor.');
        const { exists } = await response.json();
  
        if (exists) {
          idErrorMessage.textContent = 'Este número de ID ya está registrado.';
        } else {
          // ¡ÉXITO! Pasamos al siguiente paso.
          numeroIdInput.readOnly = true; // Bloqueamos el campo de ID
          numeroIdInput.classList.add('bg-gray-100'); // Damos una pista visual de que está bloqueado.
          step1.classList.add('hidden');
          step2.classList.remove('hidden');
        }
      } catch (error) {
        idErrorMessage.textContent = 'No se pudo verificar. Inténtalo de nuevo.';
      } finally {
        verifyBtn.textContent = 'Verificar y Continuar';
        verifyBtn.disabled = false;
      }
    });
  
    // --- LÓGICA DEL ENVÍO FINAL ---
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); // ¡Prevenimos el envío para controlarlo con fetch!
  
      submitBtn.disabled = true;
      submitBtn.textContent = 'Guardando...';
  
      try {
        const formData = new FormData(form);
        const response = await fetch('/api/personas', {
          method: 'POST',
          body: formData,
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Ocurrió un error.');
        }
  
        // Si todo va bien, la API nos redirige, pero por si acaso, lo forzamos.
        window.location.href = '/personas?success=Persona+creada+con+éxito';
  
      } catch (error: any) {
        alert('Error: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Persona';
      }
    });

    
  }
  