<<<<<<< HEAD
(() => {
    'use strict';
    const Utils = {
        getById: (id) => document.getElementById(id),
        clamp: (n, a, b) => Math.max(a, Math.min(b, n)),
        shuffleArray: (arr) => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        },
        flashElement: (el) => {
            el.style.transition = 'transform 0.18s';
            el.style.transform = 'scale(1.06)';
            setTimeout(() => el.style.transform = '', 200);
        },
        formatTime: (seconds) => {
            const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
            const secs = String(seconds % 60).padStart(2, '0');
            return `${minutes}:${secs}`;
        },
        parseTime: (timeStr) => {
            const parts = timeStr.trim().split(':').map(Number);
            if (parts.length !== 2 || parts.some(isNaN)) {
                return 180;
            }
            return Utils.clamp(parts[0] * 60 + parts[1], 0, 5999);
        },
        setBodyClass: (className) => {
            document.body.className = className ? className : '';
        }
    };

    const DOM = {
        namesInput: Utils.getById('namesInput'),
        shuffleBtn: Utils.getById('shuffleBtn'),
        clearBtn: Utils.getById('clearBtn'),
        pairsContainer: Utils.getById('pairsContainer'),
        bgMusic: Utils.getById('bgMusic'),
        musicControl: Utils.getById('music-control'),
        champNameEl: Utils.getById('champName'),
        clearHallBtn: Utils.getById('clearHall'),
        bracketContainer: Utils.getById('bracketContainer'),
        confettiCanvas: Utils.getById('confettiCanvas'),
        startTimerBtn: Utils.getById('startTimer'),
        pauseTimerBtn: Utils.getById('pauseTimer'),
        resetTimerBtn: Utils.getById('resetTimer'),
        timerDigits: Utils.getById('timerDigits'),
        sfxClick: Utils.getById('sfx-click'),
        sfxStart: Utils.getById('sfx-start'),
        sfxWin: Utils.getById('sfx-win'),
        sfxFail: Utils.getById('sfx-fail'),
        themeButtons: document.querySelectorAll('.theme-btn'),
        streamerModeBtn: Utils.getById('streamerModeBtn')
    };

    const State = {
        participants: [],
        pairs: [],
        timer: {
            interval: null,
            remainingTime: 180,
            initialValue: 180
        },
        audio: {
            context: window.AudioContext ? new window.AudioContext() : null
        },
        confetti: {
            system: null,
            instances: [],
            timeoutId: null,
            isRunning: false
        },
        slotAnimationInterval: null
    };

    const Config = {
        MAX_PARTICIPANTS: 30,
        HALL_KEY: 'retro_tourney_champion_v1'
    };


    const AudioVisuals = {
        playSound: (soundId) => {
            const audioEl = DOM[soundId];
            if (audioEl) {
                audioEl.currentTime = 0;
                audioEl.play().catch(e => console.error(`Erro ao tocar o som (${soundId}):`, e));
            }
        },

        initConfetti: () => {
            if (!DOM.confettiCanvas) return;
            const ctxConf = DOM.confettiCanvas.getContext('2d');

            const resizeCanvas = () => {
                DOM.confettiCanvas.width = window.innerWidth;
                DOM.confettiCanvas.height = window.innerHeight;
            };
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();

            const launch = () => {
                State.confetti.instances = Array.from({ length: 200 }, () => ({
                    x: Math.random() * DOM.confettiCanvas.width,
                    y: Math.random() * DOM.confettiCanvas.height - DOM.confettiCanvas.height,
                    radius: 4 + Math.random() * 4,
                    color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                    velocity: 2 + Math.random() * 3
                }));

                if (State.confetti.timeoutId) clearTimeout(State.confetti.timeoutId);
                if (!State.confetti.isRunning) {
                    State.confetti.isRunning = true;
                    drawConfetti();
                }
                State.confetti.timeoutId = setTimeout(() => {
                    State.confetti.instances = [];
                }, 5000);
            };

            const drawConfetti = () => {
                if (!ctxConf) return;
                ctxConf.clearRect(0, 0, DOM.confettiCanvas.width, DOM.confettiCanvas.height);

                State.confetti.instances.forEach(p => {
                    ctxConf.beginPath();
                    ctxConf.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctxConf.fillStyle = p.color;
                    ctxConf.fill();
                    p.y += p.velocity;
                    if (p.y > DOM.confettiCanvas.height) p.y = -10;
                });

                if (State.confetti.instances.length > 0) {
                    requestAnimationFrame(drawConfetti);
                } else {
                    State.confetti.isRunning = false;
                    ctxConf.clearRect(0, 0, DOM.confettiCanvas.width, DOM.confettiCanvas.height);
                }
            };
            return { launch };
        },

        toggleMusic: () => {
            if (State.audio.context && State.audio.context.state === 'suspended') {
                State.audio.context.resume();
            }
            if (DOM.bgMusic.paused) {
                DOM.bgMusic.volume = 0.50;
                DOM.bgMusic.play().catch(e => console.error("Erro ao tocar a música:", e));
                DOM.musicControl.textContent = '🎵';
            } else {
                DOM.bgMusic.pause();
                DOM.musicControl.textContent = '🔇';
            }
        }
    };

    State.confetti.system = AudioVisuals.initConfetti();


    const HallOfFame = {
        load: () => {
            const champ = localStorage.getItem(Config.HALL_KEY);
            DOM.champNameEl.textContent = champ || '— Nenhum ainda —';
        },
        save: (name) => {
            if (!name) return;
            localStorage.setItem(Config.HALL_KEY, name);
            DOM.champNameEl.textContent = name;
            Utils.flashElement(DOM.champNameEl);
        },
        clear: () => {
            localStorage.removeItem(Config.HALL_KEY);
            DOM.champNameEl.textContent = '— Nenhum ainda —';
        }
    };


    const Tournament = {
        renderPairs: (list) => {
            DOM.pairsContainer.innerHTML = '';
            if (list.length === 0) {
                DOM.pairsContainer.innerHTML = `<div style="color:var(--muted)">Sem participantes.</div>`;
                return;
            }

            State.pairs.forEach((p, index) => {
                const card = document.createElement('div');
                card.className = 'pair-card';
                card.innerHTML = `
                    <div class="player">${p[0] ?? '—'}</div>
                    <div class="player vs">VS</div>
                    <div class="player">${p[1] ?? '—'}</div>
                `;
                DOM.pairsContainer.appendChild(card);
                card.animate([{ transform: 'translateY(6px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 300, delay: index * 30 });
            });
        },

        animatePairs: (duration) => {
            const players = State.participants.length > 0 ? State.participants : Array.from({ length: 4 }, () => `JOGADOR ${Math.floor(Math.random() * 100)}`);
            DOM.pairsContainer.innerHTML = '';
            const numPairs = Math.ceil(players.length / 2);

            for (let i = 0; i < numPairs; i++) {
                const card = document.createElement('div');
                card.className = 'pair-card';
                card.innerHTML = `
                    <div class="player slot-spin">???</div>
                    <div class="player vs">VS</div>
                    <div class="player slot-spin">???</div>
                `;
                DOM.pairsContainer.appendChild(card);
            }

            const slotSpins = document.querySelectorAll('.slot-spin');
            State.slotAnimationInterval = setInterval(() => {
                slotSpins.forEach(el => el.textContent = players[Math.floor(Math.random() * players.length)] || '???');
            }, 100);

            return new Promise(resolve => {
                setTimeout(() => {
                    clearInterval(State.slotAnimationInterval);
                    State.slotAnimationInterval = null;
                    resolve();
                }, duration);
            });
        },

        createBracket: (n) => {
            if (!DOM.bracketContainer) return;
            DOM.bracketContainer.innerHTML = '';
            let powerOfTwo = 1;
            while (powerOfTwo < n) {
                powerOfTwo *= 2;
            }
            const rounds = Math.ceil(Math.log2(powerOfTwo));
            let matchesInRound = powerOfTwo / 2;

            for (let r = 0; r < rounds; r++) {
                const roundEl = document.createElement('div');
                roundEl.className = 'round';
                roundEl.innerHTML = `<h3>Rodada ${r + 1}</h3>`;
                for (let m = 0; m < matchesInRound; m++) {
                    roundEl.innerHTML += `
                        <div class="match">
                            <div class="teams">
                                <div class="team team-a">—</div>
                                <div class="team team-b">—</div>
                            </div>
                            <div class="match-controls">
                                <button class="btn btn-win advance-btn set-a">Venceu</button>
                                <button class="btn btn-win advance-btn set-b">Venceu</button>
                            </div>
                        </div>`;
                }
                DOM.bracketContainer.appendChild(roundEl);
                matchesInRound = Math.floor(matchesInRound / 2);
            }
        },

        fillFirstRound: (list) => {
            const matches = Array.from(DOM.bracketContainer.querySelectorAll('.round:first-child .match'));
            const shuffledList = [...list];
            Utils.shuffleArray(shuffledList);
            const numPlayers = shuffledList.length;

            let powerOfTwo = 1;
            while (powerOfTwo < numPlayers) {
                powerOfTwo *= 2;
            }

            const numByes = powerOfTwo - numPlayers;
            const playersAndByes = [...shuffledList];
            for (let i = 0; i < numByes; i++) {
                playersAndByes.push('— (bye)');
            }
            Utils.shuffleArray(playersAndByes);
            const firstRoundMatches = matches.length;

            for (let i = 0; i < firstRoundMatches; i++) {
                const match = matches[i];
                const playerA = playersAndByes[i * 2] || '—';
                const playerB = playersAndByes[i * 2 + 1] || '—';

                match.querySelector('.team-a').textContent = playerA;
                match.querySelector('.team-b').textContent = playerB;
                match.querySelectorAll('.team').forEach(t => t.classList.remove('winner'));
            }
        },

        setupBracketHandlers: () => {
            const allRounds = Array.from(DOM.bracketContainer.querySelectorAll('.round')).map(r => Array.from(r.querySelectorAll('.match')));
            allRounds.forEach((roundMatches, roundIndex) => {
                const nextRoundMatches = allRounds[roundIndex + 1];
                roundMatches.forEach((matchEl, matchIndex) => {
                    const advanceWinner = (winnerSide) => {
                        const winnerEl = matchEl.querySelector(`.team-${winnerSide}`);
                        const winnerName = winnerEl.textContent.trim();
                        if (!winnerName || winnerName === '—' || winnerName.includes('(bye)')) {
                            if (winnerName.includes('(bye)')) {
                                const opponentSide = winnerSide === 'a' ? 'b' : 'a';
                                const opponentEl = matchEl.querySelector(`.team-${opponentSide}`);
                                const opponentName = opponentEl.textContent.trim();
                                if (!opponentName.includes('(bye)') && opponentName !== '—') {
                                    if (nextRoundMatches) {
                                        const nextMatchIndex = Math.floor(matchIndex / 2);
                                        const nextTeamEl = nextRoundMatches[nextMatchIndex].querySelector(matchIndex % 2 === 0 ? '.team-a' : '.team-b');
                                        nextTeamEl.textContent = opponentName;
                                        Utils.flashElement(nextTeamEl.closest('.match'));
                                    } else {
                                        Tournament.finalizeChampion(opponentName);
                                    }
                                }
                                return;
                            }
                            return;
                        }

                        matchEl.querySelectorAll('.team').forEach(t => t.classList.remove('winner'));
                        winnerEl.classList.add('winner');
                        AudioVisuals.playSound('sfxWin');

                        if (nextRoundMatches) {
                            const nextMatchIndex = Math.floor(matchIndex / 2);
                            const nextTeamEl = nextRoundMatches[nextMatchIndex].querySelector(matchIndex % 2 === 0 ? '.team-a' : '.team-b');
                            nextTeamEl.textContent = winnerName;
                            Utils.flashElement(nextTeamEl.closest('.match'));
                            nextTeamEl.classList.remove('winner');
                        } else {
                            Tournament.finalizeChampion(winnerName);
                        }
                    };

                    matchEl.querySelector('.set-a').onclick = () => advanceWinner('a');
                    matchEl.querySelector('.set-b').onclick = () => advanceWinner('b');

                    matchEl.querySelectorAll('.team').forEach(el => {
                        el.onclick = () => {
                            const currentName = el.textContent;
                            const newName = prompt('Editar nome:', currentName === '—' ? '' : currentName);
                            if (newName === null) return;
                            el.textContent = newName.trim() || '—';
                            el.classList.remove('winner');
                        };
                    });
                });
            });
        },

        finalizeChampion: (name) => {
            if (!name || !confirm(`Definir "${name}" como campeão?`)) return;
            HallOfFame.save(name);
            AudioVisuals.playSound('sfxWin');
            State.confetti.system.launch();
        }
    };


    const Timer = {
        updateDisplay: () => {
            DOM.timerDigits.textContent = Utils.formatTime(State.timer.remainingTime);
            DOM.timerDigits.style.animation = (State.timer.remainingTime > 0 && State.timer.remainingTime <= 10) ? 'blink 1s steps(1, end) infinite' : 'none';
        },
        start: () => {
            if (State.timer.interval) return;
            const timeToStart = State.timer.remainingTime <= 0 ? Utils.parseTime(DOM.timerDigits.textContent) : State.timer.remainingTime;
            if (timeToStart <= 0) return;

            DOM.timerDigits.contentEditable = false;
            DOM.startTimerBtn.textContent = 'Continuar';
            AudioVisuals.playSound('sfxStart');

            State.timer.interval = setInterval(() => {
                State.timer.remainingTime--;
                Timer.updateDisplay();
                if (State.timer.remainingTime <= 0) {
                    Timer.stop(true);
                }
            }, 1000);
        },
        pause: () => {
            if (State.timer.interval) {
                clearInterval(State.timer.interval);
                State.timer.interval = null;
                DOM.startTimerBtn.textContent = 'Continuar';
                DOM.timerDigits.contentEditable = true;
            }
        },
        reset: () => {
            clearInterval(State.timer.interval);
            State.timer.interval = null;
            State.timer.remainingTime = State.timer.initialValue;
            Timer.updateDisplay();
            DOM.startTimerBtn.textContent = 'Iniciar';
            DOM.timerDigits.contentEditable = true;
        },
        stop: (playFailSound = false) => {
            clearInterval(State.timer.interval);
            State.timer.interval = null;
            State.timer.remainingTime = 0;
            Timer.updateDisplay();
            if (playFailSound) {
                AudioVisuals.playSound('sfxFail');
                setTimeout(() => alert('Tempo esgotado!'), 100);
            }
            DOM.timerDigits.contentEditable = true;
            DOM.startTimerBtn.textContent = 'Iniciar';
        }
    };

    const setupEventListeners = () => {
        document.body.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('.btn')) {
                AudioVisuals.playSound('sfxClick');
            }
        });
        DOM.musicControl.addEventListener('click', AudioVisuals.toggleMusic);
        DOM.shuffleBtn.addEventListener('click', async () => {
            const rawNames = DOM.namesInput.value.split('\n').map(s => s.trim()).filter(Boolean);
            if (rawNames.length === 0) {
                alert('Por favor, insira pelo menos um nome.');
                return;
            }

            DOM.shuffleBtn.classList.add('shuffle-active');
            document.body.classList.add('flicker-animation');
            AudioVisuals.playSound('sfxStart');
            State.participants = rawNames.length > Config.MAX_PARTICIPANTS ? rawNames.slice(0, Config.MAX_PARTICIPANTS) : [...rawNames];
            await Tournament.animatePairs(2000);
            Utils.shuffleArray(State.participants);
            State.pairs = [];
            let powerOfTwo = 1;
            while (powerOfTwo < State.participants.length) {
                powerOfTwo *= 2;
            }
            const numByes = powerOfTwo - State.participants.length;

            const participantsWithByes = [...State.participants];
            for (let i = 0; i < numByes; i++) {
                participantsWithByes.push('— (bye)');
            }
            Utils.shuffleArray(participantsWithByes);

            for (let i = 0; i < participantsWithByes.length; i += 2) {
                State.pairs.push([participantsWithByes[i], participantsWithByes[i + 1] ?? '— (bye)']);
            }

            Tournament.renderPairs(State.pairs);
            Tournament.createBracket(State.participants.length);
            Tournament.fillFirstRound(State.participants);
            Tournament.setupBracketHandlers();
            DOM.shuffleBtn.classList.remove('shuffle-active');
            document.body.classList.remove('flicker-animation');
        });
        DOM.clearBtn.addEventListener('click', () => {
            DOM.namesInput.value = '';
            State.participants = [];
            State.pairs = [];
            Tournament.renderPairs([]);
            if (DOM.bracketContainer) {
                DOM.bracketContainer.innerHTML = '';
            }
        });

        DOM.startTimerBtn.addEventListener('click', Timer.start);
        DOM.pauseTimerBtn.addEventListener('click', Timer.pause);
        DOM.resetTimerBtn.addEventListener('click', Timer.reset);
        DOM.timerDigits.addEventListener('blur', () => {
            State.timer.remainingTime = Utils.parseTime(DOM.timerDigits.textContent);
            Timer.updateDisplay();
        });
        DOM.timerDigits.addEventListener('focus', () => {
            if (State.timer.interval) {
                Timer.pause();
            }
        });

        DOM.clearHallBtn.addEventListener('click', HallOfFame.clear);

        DOM.namesInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                DOM.shuffleBtn.click();
            }
        });

        DOM.themeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const theme = button.dataset.theme;
                Utils.setBodyClass(`theme-${theme}`);
            });
        });

        DOM.streamerModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('streamer-mode');
            const inStreamerMode = document.body.classList.contains('streamer-mode');
            DOM.streamerModeBtn.textContent = inStreamerMode ? 'Sair do Modo' : 'Modo Transmissão';
        });
    };
    const init = () => {
        setupEventListeners();
        HallOfFame.load();
        Timer.updateDisplay();
        Tournament.renderPairs([]);
        const champObserver = new MutationObserver(() => {
            DOM.champNameEl.setAttribute('aria-live', 'polite');
        });
        champObserver.observe(DOM.champNameEl, { childList: true });
    };

    init();

})();
=======
(() => {
    'use strict';
    const Utils = {
        getById: (id) => document.getElementById(id),
        clamp: (n, a, b) => Math.max(a, Math.min(b, n)),
        shuffleArray: (arr) => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        },
        flashElement: (el) => {
            el.style.transition = 'transform 0.18s';
            el.style.transform = 'scale(1.06)';
            setTimeout(() => el.style.transform = '', 200);
        },
        formatTime: (seconds) => {
            const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
            const secs = String(seconds % 60).padStart(2, '0');
            return `${minutes}:${secs}`;
        },
        parseTime: (timeStr) => {
            const parts = timeStr.trim().split(':').map(Number);
            if (parts.length !== 2 || parts.some(isNaN)) {
                return 180;
            }
            return Utils.clamp(parts[0] * 60 + parts[1], 0, 5999);
        },
        setBodyClass: (className) => {
            document.body.className = className ? className : '';
        }
    };

    const DOM = {
        namesInput: Utils.getById('namesInput'),
        shuffleBtn: Utils.getById('shuffleBtn'),
        clearBtn: Utils.getById('clearBtn'),
        pairsContainer: Utils.getById('pairsContainer'),
        bgMusic: Utils.getById('bgMusic'),
        musicControl: Utils.getById('music-control'),
        champNameEl: Utils.getById('champName'),
        clearHallBtn: Utils.getById('clearHall'),
        bracketContainer: Utils.getById('bracketContainer'),
        confettiCanvas: Utils.getById('confettiCanvas'),
        startTimerBtn: Utils.getById('startTimer'),
        pauseTimerBtn: Utils.getById('pauseTimer'),
        resetTimerBtn: Utils.getById('resetTimer'),
        timerDigits: Utils.getById('timerDigits'),
        sfxClick: Utils.getById('sfx-click'),
        sfxStart: Utils.getById('sfx-start'),
        sfxWin: Utils.getById('sfx-win'),
        sfxFail: Utils.getById('sfx-fail'),
        themeButtons: document.querySelectorAll('.theme-btn'),
        streamerModeBtn: Utils.getById('streamerModeBtn')
    };

    const State = {
        participants: [],
        pairs: [],
        timer: {
            interval: null,
            remainingTime: 180,
            initialValue: 180
        },
        audio: {
            context: window.AudioContext ? new window.AudioContext() : null
        },
        confetti: {
            system: null,
            instances: [],
            timeoutId: null,
            isRunning: false
        },
        slotAnimationInterval: null
    };

    const Config = {
        MAX_PARTICIPANTS: 30,
        HALL_KEY: 'retro_tourney_champion_v1'
    };


    const AudioVisuals = {
        playSound: (soundId) => {
            const audioEl = DOM[soundId];
            if (audioEl) {
                audioEl.currentTime = 0;
                audioEl.play().catch(e => console.error(`Erro ao tocar o som (${soundId}):`, e));
            }
        },

        initConfetti: () => {
            if (!DOM.confettiCanvas) return;
            const ctxConf = DOM.confettiCanvas.getContext('2d');

            const resizeCanvas = () => {
                DOM.confettiCanvas.width = window.innerWidth;
                DOM.confettiCanvas.height = window.innerHeight;
            };
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();

            const launch = () => {
                State.confetti.instances = Array.from({ length: 200 }, () => ({
                    x: Math.random() * DOM.confettiCanvas.width,
                    y: Math.random() * DOM.confettiCanvas.height - DOM.confettiCanvas.height,
                    radius: 4 + Math.random() * 4,
                    color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                    velocity: 2 + Math.random() * 3
                }));

                if (State.confetti.timeoutId) clearTimeout(State.confetti.timeoutId);
                if (!State.confetti.isRunning) {
                    State.confetti.isRunning = true;
                    drawConfetti();
                }
                State.confetti.timeoutId = setTimeout(() => {
                    State.confetti.instances = [];
                }, 5000);
            };

            const drawConfetti = () => {
                if (!ctxConf) return;
                ctxConf.clearRect(0, 0, DOM.confettiCanvas.width, DOM.confettiCanvas.height);

                State.confetti.instances.forEach(p => {
                    ctxConf.beginPath();
                    ctxConf.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctxConf.fillStyle = p.color;
                    ctxConf.fill();
                    p.y += p.velocity;
                    if (p.y > DOM.confettiCanvas.height) p.y = -10;
                });

                if (State.confetti.instances.length > 0) {
                    requestAnimationFrame(drawConfetti);
                } else {
                    State.confetti.isRunning = false;
                    ctxConf.clearRect(0, 0, DOM.confettiCanvas.width, DOM.confettiCanvas.height);
                }
            };
            return { launch };
        },

        toggleMusic: () => {
            if (State.audio.context && State.audio.context.state === 'suspended') {
                State.audio.context.resume();
            }
            if (DOM.bgMusic.paused) {
                DOM.bgMusic.volume = 0.50;
                DOM.bgMusic.play().catch(e => console.error("Erro ao tocar a música:", e));
                DOM.musicControl.textContent = '🎵';
            } else {
                DOM.bgMusic.pause();
                DOM.musicControl.textContent = '🔇';
            }
        }
    };

    State.confetti.system = AudioVisuals.initConfetti();


    const HallOfFame = {
        load: () => {
            const champ = localStorage.getItem(Config.HALL_KEY);
            DOM.champNameEl.textContent = champ || '— Nenhum ainda —';
        },
        save: (name) => {
            if (!name) return;
            localStorage.setItem(Config.HALL_KEY, name);
            DOM.champNameEl.textContent = name;
            Utils.flashElement(DOM.champNameEl);
        },
        clear: () => {
            localStorage.removeItem(Config.HALL_KEY);
            DOM.champNameEl.textContent = '— Nenhum ainda —';
        }
    };


    const Tournament = {
        renderPairs: (list) => {
            DOM.pairsContainer.innerHTML = '';
            if (list.length === 0) {
                DOM.pairsContainer.innerHTML = `<div style="color:var(--muted)">Sem participantes.</div>`;
                return;
            }

            State.pairs.forEach((p, index) => {
                const card = document.createElement('div');
                card.className = 'pair-card';
                card.innerHTML = `
                    <div class="player">${p[0] ?? '—'}</div>
                    <div class="player vs">VS</div>
                    <div class="player">${p[1] ?? '—'}</div>
                `;
                DOM.pairsContainer.appendChild(card);
                card.animate([{ transform: 'translateY(6px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 300, delay: index * 30 });
            });
        },

        animatePairs: (duration) => {
            const players = State.participants.length > 0 ? State.participants : Array.from({ length: 4 }, () => `JOGADOR ${Math.floor(Math.random() * 100)}`);
            DOM.pairsContainer.innerHTML = '';
            const numPairs = Math.ceil(players.length / 2);

            for (let i = 0; i < numPairs; i++) {
                const card = document.createElement('div');
                card.className = 'pair-card';
                card.innerHTML = `
                    <div class="player slot-spin">???</div>
                    <div class="player vs">VS</div>
                    <div class="player slot-spin">???</div>
                `;
                DOM.pairsContainer.appendChild(card);
            }

            const slotSpins = document.querySelectorAll('.slot-spin');
            State.slotAnimationInterval = setInterval(() => {
                slotSpins.forEach(el => el.textContent = players[Math.floor(Math.random() * players.length)] || '???');
            }, 100);

            return new Promise(resolve => {
                setTimeout(() => {
                    clearInterval(State.slotAnimationInterval);
                    State.slotAnimationInterval = null;
                    resolve();
                }, duration);
            });
        },

        createBracket: (n) => {
            if (!DOM.bracketContainer) return;
            DOM.bracketContainer.innerHTML = '';
            let powerOfTwo = 1;
            while (powerOfTwo < n) {
                powerOfTwo *= 2;
            }
            const rounds = Math.ceil(Math.log2(powerOfTwo));
            let matchesInRound = powerOfTwo / 2;

            for (let r = 0; r < rounds; r++) {
                const roundEl = document.createElement('div');
                roundEl.className = 'round';
                roundEl.innerHTML = `<h3>Rodada ${r + 1}</h3>`;
                for (let m = 0; m < matchesInRound; m++) {
                    roundEl.innerHTML += `
                        <div class="match">
                            <div class="teams">
                                <div class="team team-a">—</div>
                                <div class="team team-b">—</div>
                            </div>
                            <div class="match-controls">
                                <button class="btn btn-win advance-btn set-a">Venceu</button>
                                <button class="btn btn-win advance-btn set-b">Venceu</button>
                            </div>
                        </div>`;
                }
                DOM.bracketContainer.appendChild(roundEl);
                matchesInRound = Math.floor(matchesInRound / 2);
            }
        },

        fillFirstRound: (list) => {
            const matches = Array.from(DOM.bracketContainer.querySelectorAll('.round:first-child .match'));
            const shuffledList = [...list];
            Utils.shuffleArray(shuffledList);
            const numPlayers = shuffledList.length;

            let powerOfTwo = 1;
            while (powerOfTwo < numPlayers) {
                powerOfTwo *= 2;
            }

            const numByes = powerOfTwo - numPlayers;
            const playersAndByes = [...shuffledList];
            for (let i = 0; i < numByes; i++) {
                playersAndByes.push('— (bye)');
            }
            Utils.shuffleArray(playersAndByes);
            const firstRoundMatches = matches.length;

            for (let i = 0; i < firstRoundMatches; i++) {
                const match = matches[i];
                const playerA = playersAndByes[i * 2] || '—';
                const playerB = playersAndByes[i * 2 + 1] || '—';

                match.querySelector('.team-a').textContent = playerA;
                match.querySelector('.team-b').textContent = playerB;
                match.querySelectorAll('.team').forEach(t => t.classList.remove('winner'));
            }
        },

        setupBracketHandlers: () => {
            const allRounds = Array.from(DOM.bracketContainer.querySelectorAll('.round')).map(r => Array.from(r.querySelectorAll('.match')));
            allRounds.forEach((roundMatches, roundIndex) => {
                const nextRoundMatches = allRounds[roundIndex + 1];
                roundMatches.forEach((matchEl, matchIndex) => {
                    const advanceWinner = (winnerSide) => {
                        const winnerEl = matchEl.querySelector(`.team-${winnerSide}`);
                        const winnerName = winnerEl.textContent.trim();
                        if (!winnerName || winnerName === '—' || winnerName.includes('(bye)')) {
                            if (winnerName.includes('(bye)')) {
                                const opponentSide = winnerSide === 'a' ? 'b' : 'a';
                                const opponentEl = matchEl.querySelector(`.team-${opponentSide}`);
                                const opponentName = opponentEl.textContent.trim();
                                if (!opponentName.includes('(bye)') && opponentName !== '—') {
                                    if (nextRoundMatches) {
                                        const nextMatchIndex = Math.floor(matchIndex / 2);
                                        const nextTeamEl = nextRoundMatches[nextMatchIndex].querySelector(matchIndex % 2 === 0 ? '.team-a' : '.team-b');
                                        nextTeamEl.textContent = opponentName;
                                        Utils.flashElement(nextTeamEl.closest('.match'));
                                    } else {
                                        Tournament.finalizeChampion(opponentName);
                                    }
                                }
                                return;
                            }
                            return;
                        }

                        matchEl.querySelectorAll('.team').forEach(t => t.classList.remove('winner'));
                        winnerEl.classList.add('winner');
                        AudioVisuals.playSound('sfxWin');

                        if (nextRoundMatches) {
                            const nextMatchIndex = Math.floor(matchIndex / 2);
                            const nextTeamEl = nextRoundMatches[nextMatchIndex].querySelector(matchIndex % 2 === 0 ? '.team-a' : '.team-b');
                            nextTeamEl.textContent = winnerName;
                            Utils.flashElement(nextTeamEl.closest('.match'));
                            nextTeamEl.classList.remove('winner');
                        } else {
                            Tournament.finalizeChampion(winnerName);
                        }
                    };

                    matchEl.querySelector('.set-a').onclick = () => advanceWinner('a');
                    matchEl.querySelector('.set-b').onclick = () => advanceWinner('b');

                    matchEl.querySelectorAll('.team').forEach(el => {
                        el.onclick = () => {
                            const currentName = el.textContent;
                            const newName = prompt('Editar nome:', currentName === '—' ? '' : currentName);
                            if (newName === null) return;
                            el.textContent = newName.trim() || '—';
                            el.classList.remove('winner');
                        };
                    });
                });
            });
        },

        finalizeChampion: (name) => {
            if (!name || !confirm(`Definir "${name}" como campeão?`)) return;
            HallOfFame.save(name);
            AudioVisuals.playSound('sfxWin');
            State.confetti.system.launch();
        }
    };


    const Timer = {
        updateDisplay: () => {
            DOM.timerDigits.textContent = Utils.formatTime(State.timer.remainingTime);
            DOM.timerDigits.style.animation = (State.timer.remainingTime > 0 && State.timer.remainingTime <= 10) ? 'blink 1s steps(1, end) infinite' : 'none';
        },
        start: () => {
            if (State.timer.interval) return;
            const timeToStart = State.timer.remainingTime <= 0 ? Utils.parseTime(DOM.timerDigits.textContent) : State.timer.remainingTime;
            if (timeToStart <= 0) return;

            DOM.timerDigits.contentEditable = false;
            DOM.startTimerBtn.textContent = 'Continuar';
            AudioVisuals.playSound('sfxStart');

            State.timer.interval = setInterval(() => {
                State.timer.remainingTime--;
                Timer.updateDisplay();
                if (State.timer.remainingTime <= 0) {
                    Timer.stop(true);
                }
            }, 1000);
        },
        pause: () => {
            if (State.timer.interval) {
                clearInterval(State.timer.interval);
                State.timer.interval = null;
                DOM.startTimerBtn.textContent = 'Continuar';
                DOM.timerDigits.contentEditable = true;
            }
        },
        reset: () => {
            clearInterval(State.timer.interval);
            State.timer.interval = null;
            State.timer.remainingTime = State.timer.initialValue;
            Timer.updateDisplay();
            DOM.startTimerBtn.textContent = 'Iniciar';
            DOM.timerDigits.contentEditable = true;
        },
        stop: (playFailSound = false) => {
            clearInterval(State.timer.interval);
            State.timer.interval = null;
            State.timer.remainingTime = 0;
            Timer.updateDisplay();
            if (playFailSound) {
                AudioVisuals.playSound('sfxFail');
                setTimeout(() => alert('Tempo esgotado!'), 100);
            }
            DOM.timerDigits.contentEditable = true;
            DOM.startTimerBtn.textContent = 'Iniciar';
        }
    };

    const setupEventListeners = () => {
        document.body.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('.btn')) {
                AudioVisuals.playSound('sfxClick');
            }
        });
        DOM.musicControl.addEventListener('click', AudioVisuals.toggleMusic);
        DOM.shuffleBtn.addEventListener('click', async () => {
            const rawNames = DOM.namesInput.value.split('\n').map(s => s.trim()).filter(Boolean);
            if (rawNames.length === 0) {
                alert('Por favor, insira pelo menos um nome.');
                return;
            }

            DOM.shuffleBtn.classList.add('shuffle-active');
            document.body.classList.add('flicker-animation');
            AudioVisuals.playSound('sfxStart');
            State.participants = rawNames.length > Config.MAX_PARTICIPANTS ? rawNames.slice(0, Config.MAX_PARTICIPANTS) : [...rawNames];
            await Tournament.animatePairs(2000);
            Utils.shuffleArray(State.participants);
            State.pairs = [];
            let powerOfTwo = 1;
            while (powerOfTwo < State.participants.length) {
                powerOfTwo *= 2;
            }
            const numByes = powerOfTwo - State.participants.length;

            const participantsWithByes = [...State.participants];
            for (let i = 0; i < numByes; i++) {
                participantsWithByes.push('— (bye)');
            }
            Utils.shuffleArray(participantsWithByes);

            for (let i = 0; i < participantsWithByes.length; i += 2) {
                State.pairs.push([participantsWithByes[i], participantsWithByes[i + 1] ?? '— (bye)']);
            }

            Tournament.renderPairs(State.pairs);
            Tournament.createBracket(State.participants.length);
            Tournament.fillFirstRound(State.participants);
            Tournament.setupBracketHandlers();
            DOM.shuffleBtn.classList.remove('shuffle-active');
            document.body.classList.remove('flicker-animation');
        });
        DOM.clearBtn.addEventListener('click', () => {
            DOM.namesInput.value = '';
            State.participants = [];
            State.pairs = [];
            Tournament.renderPairs([]);
            if (DOM.bracketContainer) {
                DOM.bracketContainer.innerHTML = '';
            }
        });

        DOM.startTimerBtn.addEventListener('click', Timer.start);
        DOM.pauseTimerBtn.addEventListener('click', Timer.pause);
        DOM.resetTimerBtn.addEventListener('click', Timer.reset);
        DOM.timerDigits.addEventListener('blur', () => {
            State.timer.remainingTime = Utils.parseTime(DOM.timerDigits.textContent);
            Timer.updateDisplay();
        });
        DOM.timerDigits.addEventListener('focus', () => {
            if (State.timer.interval) {
                Timer.pause();
            }
        });

        DOM.clearHallBtn.addEventListener('click', HallOfFame.clear);

        DOM.namesInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                DOM.shuffleBtn.click();
            }
        });

        DOM.themeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const theme = button.dataset.theme;
                Utils.setBodyClass(`theme-${theme}`);
            });
        });

        DOM.streamerModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('streamer-mode');
            const inStreamerMode = document.body.classList.contains('streamer-mode');
            DOM.streamerModeBtn.textContent = inStreamerMode ? 'Sair do Modo' : 'Modo Transmissão';
        });
    };
    const init = () => {
        setupEventListeners();
        HallOfFame.load();
        Timer.updateDisplay();
        Tournament.renderPairs([]);
        const champObserver = new MutationObserver(() => {
            DOM.champNameEl.setAttribute('aria-live', 'polite');
        });
        champObserver.observe(DOM.champNameEl, { childList: true });
    };

    init();

})();
})();
>>>>>>> 02e8b007d3c70652577d3461f53f1d97bd090414
