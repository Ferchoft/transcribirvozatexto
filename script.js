document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM (sin cambios)
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

    // Actualizar contador de palabras (sin cambios)
    function updateWordCount() {
        const text = transcriptionOutput.value;
        const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        wordCountElement.textContent = `${wordCount} ${wordCount === 1 ? 'palabra' : 'palabras'}`;
    }

    transcriptionOutput.addEventListener('input', updateWordCount);

    // --- Reconocimiento de Voz - Versión mejorada para móviles ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    let finalTranscript = '';
    let isListening = false;
    let lastFinalResult = '';
    let mobileDuplicatePrevention = '';

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-ES';
        
        // Configuración específica para móviles
        if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            recognition.maxAlternatives = 1; // Reducir alternativas en móviles
        }

        recognition.onstart = () => {
            isListening = true;
            status.textContent = 'Escuchando... Habla ahora';
            startButton.classList.add('listening');
            startButton.innerHTML = '<span class="button-icon"><i class="fas fa-stop"></i></span><span class="button-text">Detener</span>';
            console.log('Reconocimiento de voz activado');
            mobileDuplicatePrevention = ''; // Resetear prevención de duplicados
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
                    // Pequeño retraso para móviles antes de reiniciar
                    setTimeout(() => recognition.start(), 300);
                } catch(e) {
                    console.warn("Error al reiniciar:", e);
                    stopRecognition();
                }
            }
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let newFinalContent = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                let transcript = result[0].transcript;
                
                // Prevención de duplicados en móviles
                if (result.isFinal && transcript === mobileDuplicatePrevention) {
                    continue;
                }
                
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
                
                if (result.isFinal) {
                    mobileDuplicatePrevention = transcript; // Guardar para prevención
                    
                    if (finalTranscript && !finalTranscript.endsWith(' ') && !transcript.startsWith(' ')) {
                        newFinalContent += ' ';
                    }
                    newFinalContent += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Actualizar solo si hay nuevo contenido final
            if (newFinalContent) {
                finalTranscript += newFinalContent;
                lastFinalResult = newFinalContent;
            }
            
            let displayTranscript = finalTranscript;
            
            // Manejo mejorado para resultados intermedios en móviles
            if (interimTranscript && interimTranscript !== lastFinalResult) {
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

    // Resto del código (sin cambios)
    // [Mantener todas las demás funciones igual que en el original]
    // ...
});
