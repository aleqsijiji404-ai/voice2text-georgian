/**
 * Voice2Text AI - Speech to Text Engine (Georgian & Multi-language)
 * Powered by Web Speech API & HTML5 Web Audio API
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const micBtn = document.getElementById('micBtn');
    const languageSelect = document.getElementById('languageSelect');
    const transcriptText = document.getElementById('transcriptText');
    const interimBox = document.getElementById('interimBox');
    const interimText = document.getElementById('interimText');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const timerDisplay = document.getElementById('timerDisplay');
    const micHint = document.getElementById('micHint');
    const visualizer = document.getElementById('visualizer');
    const visualizerPlaceholder = document.getElementById('visualizerPlaceholder');
    
    // Stats & controls
    const wordCountEl = document.getElementById('wordCount');
    const charCountEl = document.getElementById('charCount');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const speakBtn = document.getElementById('speakBtn');
    const clearBtn = document.getElementById('clearBtn');
    const fontDec = document.getElementById('fontDec');
    const fontInc = document.getElementById('fontInc');
    const fontSizeVal = document.getElementById('fontSizeVal');
    const toastContainer = document.getElementById('toastContainer');

    // State Variables
    let recognition = null;
    let isListening = false;
    let timerInterval = null;
    let secondsElapsed = 0;
    let currentFontSize = 16;
    
    // Web Audio API variables for visualizer
    let audioCtx = null;
    let analyser = null;
    let microphoneStream = null;
    let animFrameId = null;

    // Check Browser Support for Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        showToast('თქვენს ბრაუზერს არ აქვს ხმის ცნობის მხარდაჭერა. გთხოვთ გამოიყენოთ Google Chrome ან Microsoft Edge.', 'error');
        statusText.textContent = 'არ არის მხარდაჭერილი';
        statusDot.className = 'status-dot error';
        micBtn.disabled = true;
        micHint.textContent = 'გთხოვთ გახსნათ აპლიკაცია Google Chrome-ში ან Microsoft Edge-ში';
        return;
    }

    // Initialize Speech Recognition Engine
    function initSpeechRecognition() {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = languageSelect.value;

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('recording');
            statusDot.className = 'status-dot listening';
            statusText.textContent = 'ისმინება...';
            micHint.textContent = 'საუბარი მიმდინარეობს... დააჭირეთ ხელახლა შესაჩერებლად';
            visualizerPlaceholder.classList.add('hidden');
            startTimer();
            startAudioVisualizer();
        };

        recognition.onresult = (event) => {
            let finalTranscriptSegment = '';
            let interimTranscriptSegment = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscriptSegment += transcript + ' ';
                } else {
                    interimTranscriptSegment += transcript;
                }
            }

            if (finalTranscriptSegment) {
                // Append final text to textarea
                if (transcriptText.value && !transcriptText.value.endsWith(' ') && !transcriptText.value.endsWith('\n')) {
                    transcriptText.value += ' ';
                }
                transcriptText.value += finalTranscriptSegment;
                updateStats();
                // Auto scroll textarea to bottom
                transcriptText.scrollTop = transcriptText.scrollHeight;
            }

            if (interimTranscriptSegment.trim()) {
                interimBox.hidden = false;
                interimText.textContent = interimTranscriptSegment;
            } else {
                interimBox.hidden = true;
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                showToast('მიკროფონზე წვდომა უარყოფილია. გთხოვთ მისცეთ ნებართვა ბრაუზერის პარამეტრებში.', 'error');
                stopListening();
            } else if (event.error === 'no-speech') {
                // Gentle timeout, continuous restart handles this
            }
        };

        recognition.onend = () => {
            // Auto restart if user didn't explicitly stop recording
            if (isListening) {
                try {
                    recognition.start();
                } catch (e) {
                    stopListening();
                }
            } else {
                stopListeningStateUI();
            }
        };
    }

    // Toggle Listening
    function toggleListening() {
        if (!recognition) {
            initSpeechRecognition();
        }

        if (isListening) {
            isListening = false;
            try {
                recognition.stop();
            } catch(e) {}
            stopListeningStateUI();
        } else {
            recognition.lang = languageSelect.value;
            try {
                recognition.start();
            } catch(e) {
                // If recognition is in invalid state, re-init
                initSpeechRecognition();
                recognition.start();
            }
        }
    }

    function stopListeningStateUI() {
        isListening = false;
        micBtn.classList.remove('recording');
        statusDot.className = 'status-dot active';
        statusText.textContent = 'მზადყოფნაშია';
        micHint.textContent = 'დააჭირეთ მიკროფონის ღილაკს და დაიწყეთ ლაპარაკი';
        interimBox.hidden = true;
        visualizerPlaceholder.classList.remove('hidden');
        stopTimer();
        stopAudioVisualizer();
    }

    // Timer Functions
    function startTimer() {
        secondsElapsed = 0;
        updateTimerDisplay();
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            secondsElapsed++;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function updateTimerDisplay() {
        const hrs = Math.floor(secondsElapsed / 3600);
        const mins = Math.floor((secondsElapsed % 3600) / 60);
        const secs = secondsElapsed % 60;
        timerDisplay.textContent = 
            `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Text Statistics (Word & Character count)
    function updateStats() {
        const text = transcriptText.value.trim();
        const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
        const chars = text.length;

        wordCountEl.textContent = words.toLocaleString('ka-GE');
        charCountEl.textContent = chars.toLocaleString('ka-GE');
    }

    // Textarea input event for live statistics during manual typing
    transcriptText.addEventListener('input', updateStats);

    // Font size adjustment
    fontInc.addEventListener('click', () => {
        if (currentFontSize < 28) {
            currentFontSize += 2;
            transcriptText.style.fontSize = `${currentFontSize}px`;
            fontSizeVal.textContent = `${currentFontSize}px`;
        }
    });

    fontDec.addEventListener('click', () => {
        if (currentFontSize > 12) {
            currentFontSize -= 2;
            transcriptText.style.fontSize = `${currentFontSize}px`;
            fontSizeVal.textContent = `${currentFontSize}px`;
        }
    });

    // Copy to Clipboard
    copyBtn.addEventListener('click', () => {
        if (!transcriptText.value.trim()) {
            showToast('ტექსტი ცარიელია!', 'error');
            return;
        }
        navigator.clipboard.writeText(transcriptText.value)
            .then(() => showToast('ტექსტი წარმატებით დაკოპირდა!', 'success'))
            .catch(() => showToast('კოპირება ვერ მოხერხდა', 'error'));
    });

    // Download as .txt file
    downloadBtn.addEventListener('click', () => {
        const text = transcriptText.value.trim();
        if (!text) {
            showToast('ჩამოსატვირთი ტექსტი ცარიელია!', 'error');
            return;
        }
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date().toISOString().slice(0, 10);
        a.download = `voice_transcript_${now}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('ფაილი ჩამოტვირთულია (.txt)', 'success');
    });

    // Text to Speech Playback
    speakBtn.addEventListener('click', () => {
        const text = transcriptText.value.trim();
        if (!text) {
            showToast('წასაკითხი ტექსტი ცარიელია!', 'error');
            return;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // cancel any active speech
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = languageSelect.value;
            window.speechSynthesis.speak(utterance);
            showToast('ტექსტის გახმოვანება დაიწყო...', 'success');
        } else {
            showToast('თქვენს ბრაუზერს არ აქვს ტექსტის წაკითხვის (SpeechSynthesis) მხარდაჭერა.', 'error');
        }
    });

    // Clear Text
    clearBtn.addEventListener('click', () => {
        if (!transcriptText.value.trim()) return;
        if (confirm('დარწმუნებული ხართ, რომ გსურთ ტექსტის გასუფთავება?')) {
            transcriptText.value = '';
            updateStats();
            showToast('ტექსტი გასუფთავდა', 'success');
        }
    });

    // Change Language Listener
    languageSelect.addEventListener('change', () => {
        const selectedLangName = languageSelect.options[languageSelect.selectedIndex].text;
        showToast(`ენა შეიცვალა: ${selectedLangName}`, 'success');
        if (isListening && recognition) {
            recognition.stop();
            recognition.lang = languageSelect.value;
            setTimeout(() => {
                if (isListening) recognition.start();
            }, 300);
        }
    });

    // Mic Button Click Handler
    micBtn.addEventListener('click', toggleListening);

    // Audio Visualizer Implementation
    async function startAudioVisualizer() {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            const source = audioCtx.createMediaStreamSource(microphoneStream);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);

            drawVisualizer();
        } catch (err) {
            console.warn('Microphone stream for visualizer failed:', err);
        }
    }

    function stopAudioVisualizer() {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (microphoneStream) {
            microphoneStream.getTracks().forEach(track => track.stop());
            microphoneStream = null;
        }
        if (audioCtx && audioCtx.state !== 'closed') {
            audioCtx.close();
            audioCtx = null;
        }
        const ctx = visualizer.getContext('2d');
        ctx.clearRect(0, 0, visualizer.width, visualizer.height);
    }

    function drawVisualizer() {
        if (!analyser) return;
        const ctx = visualizer.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const width = visualizer.width;
        const height = visualizer.height;

        function render() {
            animFrameId = requestAnimationFrame(render);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, width, height);

            const barWidth = (width / bufferLength) * 1.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * height * 0.85;

                const gradient = ctx.createLinearGradient(0, height, 0, 0);
                gradient.addColorStop(0, '#6366f1');
                gradient.addColorStop(0.5, '#06b6d4');
                gradient.addColorStop(1, '#ec4899');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.roundRect(x, (height - barHeight) / 2, barWidth - 4, barHeight + 4, 4);
                ctx.fill();

                x += barWidth + 2;
            }
        }

        render();
    }

    // Toast Notification helper
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconClass = 'fa-circle-info';
        if (type === 'success') iconClass = 'fa-circle-check';
        if (type === 'error') iconClass = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    // Initialize default stats
    updateStats();
});
