document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const startButton = document.getElementById('startButton');
    const transcriptionOutput = document.getElementById('transcriptionOutput');
    const status = document.getElementById('status');
    const copyButton = document.getElementById('copyButton');
    const downloadButton = document.getElementById('downloadButton');
    const shareButton = document.getElementById('shareButton');
    const clearButton = document.getElementById('clearButton');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;
    const darkModeIcon = darkModeToggle.querySelector('i');
    const wordCountElement = document.querySelector('.word-count');

    // Actualizar contador de palabras
    function updateWordCount() {
        const text = transcriptionOutput.value;
        const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        wordCountElement.textContent = `${wordCount} ${wordCount === 1 ? 'palabra' : 'palabras'}`;
    }

    transcriptionOutput.addEventListener('input', updateWordCount);

    // --- Reconocimiento de Voz ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    let finalTranscript = '';
    let isListening = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-ES';

        recognition.onstart = () => {
            isListening = true;
            status.textContent = 'Escuchando... Habla ahora';
            startButton.classList.add('listening');
            startButton.innerHTML = '<span class="button-icon"><i class="fas fa-stop"></i></span><span class="button-text">Detener</span>';
            console.log('Reconocimiento de voz activado');
        };

        recognition.onerror = (event) => {
            console.error('Error en reconocimiento:', event.error);
            let errorMessage = 'Error: ';
            
            switch(event.error) {
                case 'no-speech':
                    errorMessage += 'No se detectó voz. Habla más claro.';
                    break;
                case 'audio-capture':
                    errorMessage += 'Problema con el micrófono.';
                    break;
                case 'not-allowed':
                    errorMessage += 'Permiso denegado para usar el micrófono.';
                    break;
                default:
                    errorMessage += event.error;
            }
            
            status.textContent = errorMessage;
            stopRecognition();
        };

        recognition.onend = () => {
            if (isListening) {
                try {
                    recognition.start();
                } catch(e) {
                    console.warn("Error al reiniciar:", e);
                    stopRecognition();
                }
            }
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                let transcript = event.results[i][0].transcript;
                
                // Procesar comandos especiales
                transcript = transcript.replace(/salto de línea/gi, '\n')
                                      .replace(/coma coma/gi, ',')
                                      .replace(/punto punto/gi, '.');
                
                // Capitalizar después de salto de línea
                if (transcript.includes('\n')) {
                    transcript = transcript.split('\n').map((line, index) => {
                        if (index > 0 && line.length > 0) {
                            return line.charAt(0).toUpperCase() + line.slice(1);
                        }
                        return line;
                    }).join('\n');
                }
                
                if (event.results[i].isFinal) {
                    if (finalTranscript && !finalTranscript.endsWith(' ') && !transcript.startsWith(' ')) {
                        finalTranscript += ' ';
                    }
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            let displayTranscript = finalTranscript;
            if (interimTranscript) {
                if (displayTranscript && !displayTranscript.endsWith(' ')) {
                    displayTranscript += ' ';
                }
                displayTranscript += interimTranscript;
            }

            transcriptionOutput.value = displayTranscript;
            updateWordCount();
            transcriptionOutput.scrollTop = transcriptionOutput.scrollHeight;
        };

        function startRecognition() {
            if (!isListening) {
                finalTranscript = transcriptionOutput.value;
                if (finalTranscript && !finalTranscript.endsWith(' ')) {
                    finalTranscript += ' ';
                }
                try {
                    recognition.start();
                } catch(e) {
                    console.error("Error al iniciar:", e);
                    status.textContent = "Error al iniciar. Intenta recargar la página.";
                    isListening = false;
                    resetStartButton();
                }
            }
        }

        function stopRecognition() {
            if (isListening) {
                recognition.stop();
                isListening = false;
                status.textContent = 'Presiona para comenzar a grabar';
                resetStartButton();
            }
        }

        function resetStartButton() {
            startButton.classList.remove('listening');
            startButton.innerHTML = '<span class="button-icon"><i class="fas fa-microphone"></i></span><span class="button-text">Iniciar</span>';
        }

        startButton.addEventListener('click', () => {
            if (isListening) {
                stopRecognition();
            } else {
                startRecognition();
            }
        });
    } else {
        status.textContent = 'Tu navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge.';
        startButton.disabled = true;
    }

    // --- Funcionalidad de los botones ---
    
    // Copiar texto
    copyButton.addEventListener('click', async () => {
        if (!transcriptionOutput.value) {
            showAlert('No hay texto para copiar');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(transcriptionOutput.value);
            const originalHTML = copyButton.innerHTML;
            copyButton.innerHTML = '<i class="fas fa-check"></i><span>Copiado!</span>';
            setTimeout(() => {
                copyButton.innerHTML = originalHTML;
            }, 2000);
        } catch(err) {
            console.error('Error al copiar:', err);
            showAlert('Error al copiar. Usa Ctrl+C manualmente.');
        }
    });

    // Descargar texto
    downloadButton.addEventListener('click', () => {
        const text = transcriptionOutput.value;
        if (!text) {
            showAlert('No hay texto para descargar');
            return;
        }
        
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcripcion-${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    });

    // Compartir texto
    shareButton.addEventListener('click', async () => {
        const text = transcriptionOutput.value;
        if (!text) {
            showAlert('No hay texto para compartir');
            return;
        }
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Mi Transcripción',
                    text: text.length > 100 ? `${text.substring(0, 100)}...` : text,
                });
            } catch(err) {
                console.log('Compartir cancelado:', err);
            }
        } else {
            showAlert('Compartir no soportado. Copia el texto para compartirlo.');
        }
    });

    // Borrar texto
    clearButton.addEventListener('click', () => {
        if (!transcriptionOutput.value) {
            showAlert('No hay texto para borrar');
            return;
        }
        
        if (confirm('¿Borrar todo el texto?')) {
            transcriptionOutput.value = '';
            finalTranscript = '';
            updateWordCount();
            status.textContent = 'Texto borrado. Presiona para grabar.';
        }
    });

    // Mostrar alerta temporal
    function showAlert(message) {
        const alert = document.createElement('div');
        alert.className = 'alert-message';
        alert.textContent = message;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.classList.add('fade-out');
            setTimeout(() => alert.remove(), 300);
        }, 2000);
    }

    // --- Modo Oscuro ---
    function setDarkMode(isDark) {
        if (isDark) {
            body.classList.add('dark-mode');
            darkModeIcon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            body.classList.remove('dark-mode');
            darkModeIcon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('darkMode', 'disabled');
        }
    }

    // Verificar preferencia al cargar
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    
    if (savedMode === 'enabled' || (savedMode === null && prefersDark)) {
        setDarkMode(true);
    } else {
        setDarkMode(false);
    }

    // Alternar modo oscuro
    darkModeToggle.addEventListener('click', () => {
        setDarkMode(!body.classList.contains('dark-mode'));
    });

    // Escuchar cambios en las preferencias del sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem('darkMode') === null) {
            setDarkMode(e.matches);
        }
    });
});