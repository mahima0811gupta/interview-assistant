
const form = document.getElementById('resumeForm');
const fileInput = document.getElementById('resumeFile');
const roundSelect = document.getElementById('roundType');
const fileNameDisplay = document.getElementById('fileName');
const loadingSection = document.getElementById('loadingSection');
const questionsSection = document.getElementById('questionsSection');
const questionsList = document.getElementById('questionsList');
const toast = document.getElementById('toast');
const webcamContainer = document.getElementById('webcamContainer');
const webcamVideo = document.getElementById('webcam');
const themeToggleBtn = document.getElementById('themeToggleBtn');

let currentQuestionIndex = 0;
let questionArray = [];
let webcamStream = null;
let mediaRecorder;
let recordedChunks = [];
let currentUtterance = null;

fileInput.onchange = () => {
  fileNameDisplay.textContent = fileInput.files[0]?.name || '';
};

form.onsubmit = async function (e) {
  e.preventDefault();
  showLoader(true);
  questionsSection.style.display = 'none';
  questionsList.innerHTML = '';
  currentQuestionIndex = 0;

  const formData = new FormData(form);
  const selectedRound = roundSelect.value;
  formData.append("round_type", selectedRound);

  try {
    const res = await fetch('http://localhost:8000/generate_questions', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error('Server error');

    const data = await res.json();
    questionArray = data.questions
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.match(/^\d+[\.\)]\s/));

    if (questionArray.length > 0) {
      showNextQuestion();
    }

    showToast('✅ Questions generated successfully!');
    questionsSection.style.display = 'block';
    questionsSection.style.opacity = '1';
    questionsSection.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error(err);
    showToast('❌ Error generating questions.', true);
  } finally {
    showLoader(false);
  }
};

function showNextQuestion() {
  if (currentQuestionIndex >= questionArray.length) {
    questionsList.innerHTML = "<li><strong>✅ Interview complete!</strong></li>";
    stopWebcam();
    return;
  }

  questionsList.innerHTML = '';
  const cleanQuestion = questionArray[currentQuestionIndex].replace(/\*\*/g, '');
  const li = document.createElement('li');
  li.innerHTML = `
    <div><strong>${cleanQuestion}</strong></div>
    <textarea placeholder="Type or speak your answer..." rows="3"></textarea>
    <button class="speakBtn">🎤 Speak</button>
    <button class="retryVoice">🔁 Retry</button>
    <button class="evalBtn" data-index="${currentQuestionIndex}">Evaluate</button>
    <div class="evalResult" style="margin-top:10px;"></div>
  `;
  questionsList.appendChild(li);
  if (!webcamStream) startWebcam();
}

function showLoader(show) {
  loadingSection.style.display = show ? 'block' : 'none';
  loadingSection.style.opacity = show ? '1' : '0';
}

questionsList.addEventListener('click', async (e) => {
  const li = e.target.closest('li');
  const textarea = li.querySelector('textarea');
  const questionText = li.querySelector('strong').textContent;
  const resultDiv = li.querySelector('.evalResult');

  if (e.target.classList.contains('speakBtn')) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("❌ Speech Recognition not supported. Use Google Chrome.", true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    window.recognition = recognition;

    recognition.onstart = () => showToast("🎤 Listening...");
    recognition.onresult = (event) => {
      textarea.value = event.results[0][0].transcript;
      showToast("✅ Speech captured!");
    };
    recognition.onerror = (event) => showToast(`❌ ${event.error}`, true);
    recognition.start();
  }

  if (e.target.classList.contains('retryVoice')) {
    textarea.value = '';
    if (!webcamStream) startWebcam();
  }

  if (e.target.classList.contains('evalBtn')) {
    const answerText = textarea.value.trim();
    if (!answerText) {
      resultDiv.innerHTML = "<span style='color:red;'>⚠️ Please enter or speak an answer first.</span>";
      return;
    }

    e.target.textContent = 'Evaluating...';
    e.target.disabled = true;
    resultDiv.innerHTML = '';

    try {
      const feedbackRes = await fetch('http://localhost:8000/generate_feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText, candidate_answer: answerText })
      });

      const feedbackData = await feedbackRes.json();
      const feedbackText = feedbackData.feedback;
      const score = feedbackData.score || 'N/A';

      resultDiv.innerHTML = `
        <div style="margin-top:8px;">
          <strong style="font-size: 18px; color: #2c3e50;">📝 Feedback:</strong>
          <div style="font-size: 16px; font-weight: bold; color: #34495e; margin: 10px 0;">
            🎯 Score: ${score}/10
          </div>
          <div class="feedback-text">${formatFeedback(feedbackText)}</div>
          <button class="playFeedbackBtn">🔊 Play Feedback</button>
          <button class="stopFeedbackBtn">⏹️ Stop</button>
          <button class="nextQuestionBtn">➡️ Next Question</button>
        </div>
      `;

      stopWebcam();

    } catch (err) {
      console.error(err);
      resultDiv.innerHTML = "<span style='color:red;'>❌ Error evaluating answer.</span>";
    } finally {
      e.target.textContent = 'Evaluate';
      e.target.disabled = false;
    }
  }

  if (e.target.classList.contains('playFeedbackBtn')) {
    const feedbackText = li.querySelector('.feedback-text').textContent;
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    currentUtterance = new SpeechSynthesisUtterance(feedbackText);
    currentUtterance.lang = 'en-US';
    speechSynthesis.speak(currentUtterance);
  }

  if (e.target.classList.contains('stopFeedbackBtn')) {
    speechSynthesis.cancel();
  }

  if (e.target.classList.contains('nextQuestionBtn')) {
    currentQuestionIndex++;
    showNextQuestion();
  }
});

function formatFeedback(text) {
  return `<div style="font-family:'Segoe UI', sans-serif; font-size:15px; color:#222; line-height:1.6;">${
    text.replace(/\*\*Score.*?\*\*/g, '')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#2c3e50;">$1</strong>')
        .replace(/\n/g, '<br>')
  }</div>`;
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.style.background = isError ? '#e74c3c' : '#2ecc71';
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

async function startWebcam() {
  try {
    webcamContainer.style.display = 'block';
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    webcamVideo.srcObject = webcamStream;
    startRecording();
  } catch (err) {
    console.error("Webcam error:", err);
  }
}

function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
    webcamStream = null;
  }
  stopRecording();
  webcamContainer.style.display = 'none';
}

function startRecording() {
  if (!webcamStream) return;

  recordedChunks = [];
  mediaRecorder = new MediaRecorder(webcamStream, { mimeType: 'video/webm' });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const resultDiv = questionsList.querySelector('.evalResult');

    const showRecordingBtn = document.createElement('button');
    showRecordingBtn.textContent = '🎬 Want to see your recording?';
    showRecordingBtn.className = 'playRecordingBtn';
    showRecordingBtn.style.marginTop = '12px';
    showRecordingBtn.style.background = '#8e44ad';
    showRecordingBtn.style.color = 'white';

    showRecordingBtn.onclick = () => {
      const playback = document.createElement('video');
      playback.controls = true;
      playback.src = url;
      playback.style = `
        width: 320px;
        height: 240px;
        margin-top: 10px;
        border-radius: 8px;
        border: 2px solid #ccc;
      `;
      resultDiv.appendChild(playback);
      showRecordingBtn.disabled = true;
      showRecordingBtn.textContent = '🎥 Recording shown above';
    };

    resultDiv.appendChild(showRecordingBtn);
  };

  mediaRecorder.start();
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
}

function applyTheme(theme) {
  document.body.className = theme;
  localStorage.setItem('theme', theme);
  themeToggleBtn.textContent = theme === 'dark-mode' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = document.body.className;
  const newTheme = currentTheme === 'dark-mode' ? 'light-mode' : 'dark-mode';
  applyTheme(newTheme);
});

const savedTheme = localStorage.getItem('theme') || 'light-mode';
applyTheme(savedTheme);





// const form = document.getElementById('resumeForm');
// const fileInput = document.getElementById('resumeFile');
// const roundSelect = document.getElementById('roundType');
// const fileNameDisplay = document.getElementById('fileName');
// const loadingSection = document.getElementById('loadingSection');
// const questionsSection = document.getElementById('questionsSection');
// const questionsList = document.getElementById('questionsList');
// const toast = document.getElementById('toast');
// const webcamContainer = document.getElementById('webcamContainer');
// const webcamVideo = document.getElementById('webcam');
// const themeToggleBtn = document.getElementById('themeToggleBtn');

// let currentQuestionIndex = 0;
// let questionArray = [];
// let webcamStream = null;
// let mediaRecorder;
// let recordedChunks = [];
// let currentUtterance = null;

// fileInput.onchange = () => {
//   fileNameDisplay.textContent = fileInput.files[0]?.name || '';
// };

// form.onsubmit = async function (e) {
//   e.preventDefault();
//   showLoader(true);
//   questionsSection.style.display = 'none';
//   questionsList.innerHTML = '';
//   currentQuestionIndex = 0;

//   const formData = new FormData(form);
//   const selectedRound = roundSelect.value;
//   formData.append("round_type", selectedRound);

//   try {
//     const res = await fetch('http://localhost:8000/generate_questions', {
//       method: 'POST',
//       body: formData
//     });

//     if (!res.ok) throw new Error('Server error');

//     const data = await res.json();
//     questionArray = data.questions
//       .split('\n')
//       .map(line => line.trim())
//       .filter(line => line.match(/^\d+[\.\)]\s/));

//     if (questionArray.length > 0) {
//       showNextQuestion();
//     }

//     showToast('✅ Questions generated successfully!');
//     questionsSection.style.display = 'block';
//     questionsSection.style.opacity = '1';
//     questionsSection.scrollIntoView({ behavior: 'smooth' });

//   } catch (err) {
//     console.error(err);
//     showToast('❌ Error generating questions.', true);
//   } finally {
//     showLoader(false);
//   }
// };

// function showNextQuestion() {
//   if (currentQuestionIndex >= questionArray.length) {
//     questionsList.innerHTML = "<li><strong>✅ Interview complete!</strong></li>";
//     stopWebcam();
//     return;
//   }

//   questionsList.innerHTML = '';
//   const cleanQuestion = questionArray[currentQuestionIndex].replace(/\*\*/g, '');
//   const li = document.createElement('li');
//   li.innerHTML = `
//     <div><strong>${cleanQuestion}</strong></div>
//     <textarea placeholder="Type or speak your answer..." rows="3"></textarea>
//     <button class="speakBtn">🎤 Speak (Browser)</button>
//     <button class="recordVoiceBtn">🎙️ Speak (Whisper)</button>
//     <button class="retryVoice">🔁 Retry</button>
//     <button class="evalBtn" data-index="${currentQuestionIndex}">Evaluate</button>
//     <div class="evalResult" style="margin-top:10px;"></div>
//   `;
//   questionsList.appendChild(li);
//   if (!webcamStream) startWebcam();
// }

// function showLoader(show) {
//   loadingSection.style.display = show ? 'block' : 'none';
//   loadingSection.style.opacity = show ? '1' : '0';
// }

// questionsList.addEventListener('click', async (e) => {
//   const li = e.target.closest('li');
//   const textarea = li.querySelector('textarea');
//   const questionText = li.querySelector('strong').textContent;
//   const resultDiv = li.querySelector('.evalResult');

//   if (e.target.classList.contains('speakBtn')) {
//     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//     if (!SpeechRecognition) {
//       showToast("❌ Speech Recognition not supported. Use Google Chrome.", true);
//       return;
//     }

//     const recognition = new SpeechRecognition();
//     recognition.lang = 'en-US';
//     recognition.interimResults = false;
//     recognition.maxAlternatives = 1;
//     window.recognition = recognition;

//     recognition.onstart = () => showToast("🎤 Listening...");
//     recognition.onresult = (event) => {
//       textarea.value = event.results[0][0].transcript;
//       showToast("✅ Speech captured!");
//     };
//     recognition.onerror = (event) => showToast(`❌ ${event.error}`, true);
//     recognition.start();
//   }

//   if (e.target.classList.contains('recordVoiceBtn')) {
//     try {
//       showToast("🎙️ Recording... Speak now");

//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       const mediaRecorder = new MediaRecorder(stream);
//       const chunks = [];

//       mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

//       mediaRecorder.onstop = async () => {
//         const blob = new Blob(chunks, { type: 'audio/webm' });
//         const formData = new FormData();
//         formData.append('file', blob, 'voice.webm');

//         const res = await fetch('http://localhost:8000/voice_transcribe', {
//           method: 'POST',
//           body: formData
//         });
//         const data = await res.json();
//         textarea.value = data.transcription;
//         showToast('✅ Transcription complete');
//       };

//       mediaRecorder.start();
//       setTimeout(() => mediaRecorder.stop(), 6000);

//     } catch (err) {
//       showToast("❌ Error accessing microphone", true);
//     }
//   }

//   if (e.target.classList.contains('retryVoice')) {
//     textarea.value = '';
//     if (!webcamStream) startWebcam();
//   }

//   if (e.target.classList.contains('evalBtn')) {
//     const answerText = textarea.value.trim();
//     if (!answerText) {
//       resultDiv.innerHTML = "<span style='color:red;'>⚠️ Please enter or speak an answer first.</span>";
//       return;
//     }

//     e.target.textContent = 'Evaluating...';
//     e.target.disabled = true;
//     resultDiv.innerHTML = '';

//     try {
//       const feedbackRes = await fetch('http://localhost:8000/generate_feedback', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ question: questionText, candidate_answer: answerText })
//       });

//       const feedbackData = await feedbackRes.json();
//       const feedbackText = feedbackData.feedback;
//       const score = feedbackData.score || 'N/A';

//       resultDiv.innerHTML = `
//         <div style="margin-top:8px;">
//           <strong style="font-size: 18px; color: #2c3e50;">📝 Feedback:</strong>
//           <div style="font-size: 16px; font-weight: bold; color: #34495e; margin: 10px 0;">
//             🎯 Score: ${score}/10
//           </div>
//           <div class="feedback-text">${formatFeedback(feedbackText)}</div>
//           <button class="playFeedbackBtn">🔊 Play Feedback</button>
//           <button class="stopFeedbackBtn">⏹️ Stop</button>
//           <button class="nextQuestionBtn">➡️ Next Question</button>
//         </div>
//       `;

//       stopWebcam();

//     } catch (err) {
//       console.error(err);
//       resultDiv.innerHTML = "<span style='color:red;'>❌ Error evaluating answer.</span>";
//     } finally {
//       e.target.textContent = 'Evaluate';
//       e.target.disabled = false;
//     }
//   }

//   if (e.target.classList.contains('playFeedbackBtn')) {
//     const feedbackText = li.querySelector('.feedback-text').textContent;
//     if (speechSynthesis.speaking) speechSynthesis.cancel();
//     currentUtterance = new SpeechSynthesisUtterance(feedbackText);
//     currentUtterance.lang = 'en-US';
//     speechSynthesis.speak(currentUtterance);
//   }

//   if (e.target.classList.contains('stopFeedbackBtn')) {
//     speechSynthesis.cancel();
//   }

//   if (e.target.classList.contains('nextQuestionBtn')) {
//     currentQuestionIndex++;
//     showNextQuestion();
//   }
// });

// function formatFeedback(text) {
//   return `<div style="font-family:'Segoe UI', sans-serif; font-size:15px; color:#222; line-height:1.6;">${
//     text.replace(/\*\*Score.*?\*\*/g, '')
//         .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#2c3e50;">$1</strong>')
//         .replace(/\n/g, '<br>')
//   }</div>`;
// }

// function showToast(message, isError = false) {
//   toast.textContent = message;
//   toast.style.background = isError ? '#e74c3c' : '#2ecc71';
//   toast.style.display = 'block';
//   setTimeout(() => {
//     toast.style.display = 'none';
//   }, 3000);
// }

// async function startWebcam() {
//   try {
//     webcamContainer.style.display = 'block';
//     webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//     webcamVideo.srcObject = webcamStream;
//     startRecording();
//   } catch (err) {
//     console.error("Webcam error:", err);
//   }
// }

// function stopWebcam() {
//   if (webcamStream) {
//     webcamStream.getTracks().forEach(track => track.stop());
//     webcamStream = null;
//   }
//   stopRecording();
//   webcamContainer.style.display = 'none';
// }

// function startRecording() {
//   if (!webcamStream) return;

//   recordedChunks = [];
//   mediaRecorder = new MediaRecorder(webcamStream, { mimeType: 'video/webm' });

//   mediaRecorder.ondataavailable = (e) => {
//     if (e.data.size > 0) recordedChunks.push(e.data);
//   };

//   mediaRecorder.onstop = () => {
//     const blob = new Blob(recordedChunks, { type: 'video/webm' });
//     const url = URL.createObjectURL(blob);
//     const resultDiv = questionsList.querySelector('.evalResult');

//     const showRecordingBtn = document.createElement('button');
//     showRecordingBtn.textContent = '🎬 Want to see your recording?';
//     showRecordingBtn.className = 'playRecordingBtn';
//     showRecordingBtn.style.marginTop = '12px';
//     showRecordingBtn.style.background = '#8e44ad';
//     showRecordingBtn.style.color = 'white';

//     showRecordingBtn.onclick = () => {
//       const playback = document.createElement('video');
//       playback.controls = true;
//       playback.src = url;
//       playback.style = `
//         width: 320px;
//         height: 240px;
//         margin-top: 10px;
//         border-radius: 8px;
//         border: 2px solid #ccc;
//       `;
//       resultDiv.appendChild(playback);
//       showRecordingBtn.disabled = true;
//       showRecordingBtn.textContent = '🎥 Recording shown above';
//     };

//     resultDiv.appendChild(showRecordingBtn);
//   };

//   mediaRecorder.start();
// }

// function stopRecording() {
//   if (mediaRecorder && mediaRecorder.state === 'recording') {
//     mediaRecorder.stop();
//   }
// }

// function applyTheme(theme) {
//   document.body.className = theme;
//   localStorage.setItem('theme', theme);
//   themeToggleBtn.textContent = theme === 'dark-mode' ? '☀️ Light Mode' : '🌙 Dark Mode';
// }

// themeToggleBtn.addEventListener('click', () => {
//   const currentTheme = document.body.className;
//   const newTheme = currentTheme === 'dark-mode' ? 'light-mode' : 'dark-mode';
//   applyTheme(newTheme);
// });

// const savedTheme = localStorage.getItem('theme') || 'light-mode';
// applyTheme(savedTheme);
