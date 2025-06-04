// Quiz logic for A.1 (Learn to count up to 3)
(function() {
    // Only run on a1.html
    if (!window.location.pathname.endsWith('/a1.html')) return;

    // Questions for up to 3
    const questions = [
        {
            imgCount: 1,
            img: '/static/img/starfish.png',
            question: 'Далайн оддыг тоолоорой. Тоолох бүрдээ дээр нь дарж болно.',
            ask: 'Хэдэн далайн од байна вэ?',
            answer: 1
        },
        {
            imgCount: 2,
            img: '/static/img/starfish.png',
            question: 'Далайн оддыг тоолоорой. Тоолох бүрдээ дээр нь дарж болно.',
            ask: 'Хэдэн далайн од байна вэ?',
            answer: 2
        },
        {
            imgCount: 3,
            img: '/static/img/starfish.png',
            question: 'Далайн оддыг тоолоорой. Тоолох бүрдээ дээр нь дарж болно.',
            ask: 'Хэдэн далайн од байна вэ?',
            answer: 3
        }
    ];
    let currentIdx = Math.floor(Math.random() * questions.length);
    let selectedAnswer = null;
    let questionsAnswered = 0;
    let score = 0;
    let timer = 0;
    let timerInterval = null;

    // DOM elements
    const questionsAnsweredEl = document.getElementById('questionsAnswered');
    const scoreEl = document.getElementById('score');
    const timeElapsedEl = document.getElementById('timeElapsed');
    const imgsDiv = document.querySelector('.a1-imgs');
    const questionDivs = document.querySelectorAll('.a1-question');
    const answerBtns = document.querySelectorAll('.a1-answers button');
    const feedback = document.getElementById('feedback');
    const submitBtn = document.getElementById('submitBtn');
    const exampleBtn = document.querySelector('.a1-example-btn');

    function renderQuestion(idx) {
        const q = questions[idx];
        // Render images
        imgsDiv.innerHTML = '';
        for(let i=0;i<q.imgCount;i++) {
            const img = document.createElement('img');
            img.src = q.img;
            img.alt = 'Starfish';
            img.setAttribute('data-idx', i+1);
            img.addEventListener('click', function() {
                this.classList.toggle('selected');
            });
            imgsDiv.appendChild(img);
        }
        // Render questions
        questionDivs[0].textContent = q.question;
        questionDivs[1].textContent = q.ask;
        // Reset answers
        answerBtns.forEach(btn => btn.classList.remove('selected'));
        selectedAnswer = null;
        feedback.textContent = '';
        feedback.style.color = '';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Илгээх';
    }

    answerBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            answerBtns.forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedAnswer = Number(this.getAttribute('data-answer'));
        });
    });

    function startTimer() {
        if (timerInterval) return;
        timerInterval = setInterval(() => {
            timer++;
            const min = String(Math.floor(timer/60)).padStart(2,'0');
            const sec = String(timer%60).padStart(2,'0');
            timeElapsedEl.textContent = `${min}:${sec}`;
        }, 1000);
    }
    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    startTimer();

    function showCongrats() {
        feedback.innerHTML = `Та 3 хүртэл тоолохыг сурлаа! Баяр хүргэе!<br><br>
            <a href="/preschool-list/a2.html"><button style="background:#388eea;color:#fff;border:none;border-radius:4px;padding:10px 28px;font-size:1.1rem;font-weight:bold;margin-right:12px;cursor:pointer;">Дараагийнх</button></a>
            <a href="/preschool"><button style="background:#fff;color:#388eea;border:1px solid #388eea;border-radius:4px;padding:10px 28px;font-size:1.1rem;font-weight:bold;cursor:pointer;">Цэцэрлэг рүү буцах</button></a>
        `;
        feedback.style.color = '#4caf50';
        submitBtn.disabled = true;
    }

    function showWrongExplanation(q, userAnswer) {
        const imgsHtml = Array(q.imgCount).fill(0).map(() => `<img src='${q.img}' alt='Starfish' style='width:40px;vertical-align:middle;margin:0 2px;'>`).join('');
        feedback.innerHTML = `
            <div style="background:#f9fbe7;border:1px solid #dce775;border-radius:10px;padding:18px 18px 10px 18px;margin-top:10px;">
                <div style="color:#689f38;font-size:1.3rem;font-weight:bold;margin-bottom:8px;">Тайлбар</div>
                <div style='margin-bottom:8px;'><span style='color:#1976d2;'>Асуулт:</span> ${q.ask}</div>
                <div style='margin-bottom:8px;'><span style='color:#e53935;'>Таны хариулт:</span> <b>${userAnswer}</b></div>
                <div style='margin-bottom:8px;'><span style='color:#4caf50;'>Зөв хариулт:</span> <b>${q.answer}</b></div>
                <div style='color:#888;'>Дахин оролдоорой!</div>
            </div>
        `;
        feedback.style.color = '';
        submitBtn.textContent = 'Дахин оролдох';
        // Add one-time event for try again
        submitBtn.onclick = function() {
            // Pick a new random question
            currentIdx = Math.floor(Math.random() * questions.length);
            renderQuestion(currentIdx);
            // Restore submit logic
            submitBtn.onclick = null;
        };
    }

    function saveProgressIfLoggedIn() {
        fetch('/api/user').then(r=>r.json()).then(data => {
            if(data.username) {
                fetch('/api/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        skill: 'a1',
                        score: score,
                        questionsAnswered: questionsAnswered
                    })
                });
            }
        });
    }

    submitBtn.addEventListener('click', function() {
        if(selectedAnswer === null) {
            feedback.textContent = 'Хариултаа сонгоно уу!';
            feedback.style.color = '#1976d2';
            return;
        }
        questionsAnswered++;
        questionsAnsweredEl.textContent = questionsAnswered;
        if(selectedAnswer === questions[currentIdx].answer) {
            if (score < 100) score += 34;
            if (score > 100) score = 100;
            scoreEl.textContent = score;
            feedback.textContent = 'Зөв!';
            feedback.style.color = '#4caf50';
            submitBtn.textContent = 'Илгээх';
            saveProgressIfLoggedIn();
            if(score === 100) showCongrats();
            setTimeout(() => {
                if(score < 100) {
                    currentIdx = Math.floor(Math.random() * questions.length);
                    renderQuestion(currentIdx);
                }
            }, 1200);
        } else {
            score = 0;
            scoreEl.textContent = score;
            showWrongExplanation(questions[currentIdx], selectedAnswer);
            saveProgressIfLoggedIn();
        }
    });

    // Example button shows explanation
    exampleBtn.addEventListener('click', function() {
        const q = questions[currentIdx];
        const imgsHtml = Array(q.imgCount).fill(0).map(() => `<img src='${q.img}' alt='Starfish' style='width:40px;vertical-align:middle;margin:0 2px;'>`).join('');
        feedback.innerHTML = `
            <div style="background:#f9fbe7;border:1px solid #dce775;border-radius:10px;padding:18px 18px 10px 18px;margin-top:10px;">
                <div style="color:#689f38;font-size:1.3rem;font-weight:bold;margin-bottom:8px;">Тайлбар</div>
                <div style='margin-bottom:8px;'><span style='color:#1976d2;'>Асуулт:</span> ${q.question}</div>
                <div style='margin-bottom:8px;'><span style='color:#1976d2;'>Зураг:</span> ${imgsHtml}</div>
                <div style='margin-bottom:8px;'><span style='color:#4caf50;'>Зөв хариулт:</span> <b>${q.answer}</b></div>
                <div style='color:#888;'>Жишээгээр тайлбарлав.</div>
            </div>
        `;
        feedback.style.color = '';
        submitBtn.onclick = null;
    });

    // Voice reading logic
    function speakText(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'mn-MN'; // Mongolian
            window.speechSynthesis.speak(utter);
        }
    }
    document.getElementById('voiceBtn1').onclick = function() {
        speakText('Далайн оддыг тоолоорой. Тоолох бүрдээ дээр нь дарж болно.');
    };
    document.getElementById('voiceBtn2').onclick = function() {
        speakText('Хэдэн далайн од байна вэ?');
    };

    // Initial render
    renderQuestion(currentIdx);
})();
