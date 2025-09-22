(() => {
    'use strict';

    // ===================================================================
    // Módulos de Suporte
    // ===================================================================

    const Utils = {
        getById: (id) => document.getElementById(id),
        shuffleArray: (arr) => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
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
            return parts.length === 2 && !parts.some(isNaN) ? (parts[0] * 60 + parts[1]) : 180;
        },
        setBodyClass: (className) => { document.body.className = className || ''; }
    };

    const DOM = {
        // Setup e Torneio
        namesInput: Utils.getById('namesInput'),
        startTournamentBtn: Utils.getById('startTournamentBtn'),
        clearBtn: Utils.getById('clearBtn'),
        editNamesBtn: Utils.getById('editNamesBtn'),
        setupPhaseEl: Utils.getById('setup-phase'),
        tournamentControlsEl: Utils.getById('tournament-controls'),
        drawBombermanBtn: Utils.getById('drawBomberman'),
        drawMarioKartBtn: Utils.getById('drawMarioKart'),
        drawStreetFighterBtn: Utils.getById('drawStreetFighter'),
        roundsContainer: Utils.getById('roundsContainer'),

        // Placar, Final e Memorial
        leaderboardList: Utils.getById('leaderboardList'),
        championMemorialEl: Utils.getById('championMemorial'),
        memorialChampNameEl: Utils.getById('memorialChampName'),
        finalSectionEl: Utils.getById('final-section'),
        finalist1El: Utils.getById('finalist1'),
        finalist2El: Utils.getById('finalist2'),
        champNameEl: Utils.getById('champName'),
        declareWinnerBtn: Utils.getById('declareWinnerBtn'),
        clearChampionBtn: Utils.getById('clearChampionBtn'),

        // Timer
        startTimerBtn: Utils.getById('startTimer'),
        pauseTimerBtn: Utils.getById('pauseTimer'),
        resetTimerBtn: Utils.getById('resetTimer'),
        timerDigits: Utils.getById('timerDigits'),

        // UI e Efeitos
        notificationOverlay: Utils.getById('notification-overlay'),
        rulesModal: Utils.getById('rulesModal'),
        rulesBtn: Utils.getById('rulesBtn'),
        closeRulesBtn: Utils.getById('closeRulesBtn'),
        bgMusic: Utils.getById('bgMusic'),
        musicControl: Utils.getById('music-control'),
        confettiCanvas: Utils.getById('confettiCanvas'),
        themeButtons: document.querySelectorAll('.theme-btn'),
        streamerModeBtn: Utils.getById('streamerModeBtn'),
        sfx: {
            click: Utils.getById('sfx-click'),
            start: Utils.getById('sfx-start'),
            win: Utils.getById('sfx-win'),
            fail: Utils.getById('sfx-fail'),
        }
    };

    const State = {
        players: [],
        currentPhase: null,
        timer: { interval: null, remainingTime: 180, initialValue: 180 },
        audio: { context: window.AudioContext ? new window.AudioContext() : null },
        confetti: { animationFrame: null, particles: [] },
        phaseConfig: {
            bomberman: { next: 'marioKart', btn: DOM.drawMarioKartBtn },
            marioKart: { next: 'streetFighter', btn: DOM.drawStreetFighterBtn },
            streetFighter: { next: 'final', btn: null },
        }
    };

    const Config = {
        MAX_PARTICIPANTS: 30,
        CHAMPION_KEY: 'retro_tech_champion',
        PARTICIPANTS_KEY: 'retro_tech_participants',
        CONFETTI_DURATION: 5000,
        CONFETTI_PARTICLES: 150
    };

    // ===================================================================
    // MÓDULOS DE FUNCIONALIDADE
    // ===================================================================

    const AudioVisuals = {
        playSound(soundId) {
            const audioEl = DOM.sfx[soundId];
            if (audioEl) {
                audioEl.currentTime = 0;
                audioEl.play().catch(e => console.error(`Error playing sound (${soundId}):`, e));
            }
        },
        toggleMusic() {
            if (State.audio.context && State.audio.context.state === 'suspended') {
                State.audio.context.resume();
            }
            if (DOM.bgMusic.paused) {
                DOM.bgMusic.volume = 0.3;
                DOM.bgMusic.play().catch(e => console.error("Error playing music:", e));
                DOM.musicControl.textContent = '🎵';
            } else {
                DOM.bgMusic.pause();
                DOM.musicControl.textContent = '🔇';
            }
        },
        launchConfetti() {
            const canvas = DOM.confettiCanvas;
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const colors = ["#ff4da6", "#33ccff", "#9d5cff", "#ffd700", "#c0c0c0"];
            State.confetti.particles = [];

            for (let i = 0; i < Config.CONFETTI_PARTICLES; i++) {
                State.confetti.particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height - canvas.height,
                    radius: Math.random() * 2 + 1,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    velocity: { x: Math.random() * 2 - 1, y: Math.random() * 5 + 2 }
                });
            }

            const animate = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                State.confetti.particles.forEach(p => {
                    p.y += p.velocity.y;
                    p.x += p.velocity.x;
                    ctx.beginPath();
                    ctx.fillStyle = p.color;
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fill();
                });
                State.confetti.animationFrame = requestAnimationFrame(animate);
            };

            if (State.confetti.animationFrame) {
                cancelAnimationFrame(State.confetti.animationFrame);
            }
            animate();

            setTimeout(() => {
                cancelAnimationFrame(State.confetti.animationFrame);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }, Config.CONFETTI_DURATION);
        },
        showNotification(message, duration = 3000) {
            DOM.notificationOverlay.querySelector('#notification-box').textContent = message;
            DOM.notificationOverlay.classList.remove('hidden');
            setTimeout(() => {
                DOM.notificationOverlay.classList.add('hidden');
            }, duration);
        }
    };

    const Timer = {
        updateDisplay() {
            DOM.timerDigits.textContent = Utils.formatTime(State.timer.remainingTime);
        },
        start() {
            if (State.timer.interval) return;
            DOM.timerDigits.contentEditable = false;
            AudioVisuals.playSound('start');
            State.timer.interval = setInterval(() => {
                State.timer.remainingTime--;
                this.updateDisplay();
                if (State.timer.remainingTime <= 0) {
                    this.stop(true);
                }
            }, 1000);
        },
        pause() {
            clearInterval(State.timer.interval);
            State.timer.interval = null;
            DOM.timerDigits.contentEditable = true;
        },
        reset() {
            this.pause();
            State.timer.remainingTime = State.timer.initialValue;
            this.updateDisplay();
        },
        stop(playFailSound = false) {
            this.pause();
            State.timer.remainingTime = 0;
            this.updateDisplay();
            if (playFailSound) {
                AudioVisuals.playSound('fail');
                AudioVisuals.showNotification('Tempo Esgotado!');
            }
        }
    };

    const ChampionMemorial = {
        save(name) {
            localStorage.setItem(Config.CHAMPION_KEY, name);
            this.load();
        },
        load() {
            const championName = localStorage.getItem(Config.CHAMPION_KEY);
            if (championName) {
                DOM.championMemorialEl.classList.remove('hidden');
                DOM.memorialChampNameEl.textContent = championName;
            } else {
                DOM.championMemorialEl.classList.add('hidden');
            }
        },
        clear() {
            if (confirm('Isso irá apagar o campeão atual do memorial. Deseja continuar?')) {
                localStorage.removeItem(Config.CHAMPION_KEY);
                this.load();
            }
        }
    };

    const ParticipantManager = {
        save() {
            localStorage.setItem(Config.PARTICIPANTS_KEY, DOM.namesInput.value);
        },
        load() {
            const names = localStorage.getItem(Config.PARTICIPANTS_KEY);
            if (names) {
                DOM.namesInput.value = names;
            }
        },
        clear() {
            localStorage.removeItem(Config.PARTICIPANTS_KEY);
            DOM.namesInput.value = '';
        }
    };

    const Tournament = {
        initialize() {
            const rawNames = DOM.namesInput.value.split('\n').map(s => s.trim()).filter(Boolean);

            if (rawNames.length < 2) {
                return alert('São necessários pelo menos 2 jogadores.');
            }

            if (rawNames.length % 2 !== 0) {
                return alert('O número de jogadores é ímpar. Por favor, adicione mais um jogador para continuar.');
            }

            AudioVisuals.playSound('start');
            State.players = rawNames.slice(0, Config.MAX_PARTICIPANTS).map(name => ({
                name, totalScore: 0, bombermanPts: 0, marioKartPts: 0, sfPts: 0, wins: 0
            }));

            DOM.setupPhaseEl.classList.add('hidden');
            DOM.tournamentControlsEl.classList.remove('hidden');
            this.updateLeaderboard();
        },

        editNames() {
            DOM.setupPhaseEl.classList.remove('hidden');
            DOM.tournamentControlsEl.classList.add('hidden');
        },

        updateLeaderboard() {
            State.players.sort((a, b) => b.totalScore - a.totalScore || b.wins - a.wins || b.sfPts - a.sfPts);
            DOM.leaderboardList.innerHTML = State.players.map(p =>
                `<li><span>${p.name}</span> <span class="neon">${p.totalScore} pts</span></li>`
            ).join('') || '<li>— Aguardando jogadores —</li>';
        },

        generateRounds(phase) {
            State.currentPhase = phase;
            const shuffled = Utils.shuffleArray([...State.players]);
            let rounds = [];

            if (phase === 'bomberman') {
                for (let i = 0; i < shuffled.length;) {
                    const remaining = shuffled.length - i;
                    const groupSize = (remaining <= 3 || remaining === 5) ? 3 : 4;
                    rounds.push(shuffled.slice(i, i + groupSize));
                    i += groupSize;
                }
            } else {
                for (let i = 0; i < shuffled.length; i += 2) {
                    rounds.push(shuffled.slice(i, i + 2));
                }
            }
            this.renderRounds(phase, rounds);
            DOM[`draw${phase.charAt(0).toUpperCase() + phase.slice(1)}Btn`].disabled = true;
        },

        renderRounds(phase, rounds) {
            DOM.roundsContainer.innerHTML = '';
            const existingTitle = DOM.roundsContainer.parentElement.querySelector('.rounds-title');
            if (existingTitle) existingTitle.remove();

            const titleEl = document.createElement('h3');
            titleEl.className = 'rounds-title';
            titleEl.textContent = `Rodadas: ${phase.replace(/^\w/, c => c.toUpperCase())}`;
            DOM.roundsContainer.before(titleEl);

            rounds.forEach((round) => {
                const card = document.createElement('div');
                card.className = 'round-card';
                card.dataset.completed = "false";

                let playersHtml = '';
                if (phase === 'bomberman') {
                    playersHtml = round.map(p => `
                        <div class="player-entry" data-player-name="${p.name}">
                            <span class="player-name">${p.name}</span>
                            <div class="player-score-controls">
                                <button class="score-btn pos-1" data-pos="1">🥇</button>
                                <button class="score-btn pos-2" data-pos="2">🥈</button>
                                <button class="score-btn pos-3" data-pos="3">🥉</button>
                                ${round.length === 4 ? '<button class="score-btn pos-4" data-pos="4">🟨</button>' : ''}
                            </div>
                        </div>
                    `).join('');
                } else {
                    playersHtml = round.map(p => `<div class="player-name">${p.name}</div>`).join('<div class="vs">VS</div>');
                    const controls = round.length === 2 ? `
                        <div class="controls round-controls">
                            <button class="btn" data-winner="${round[0].name}">${round[0].name.split(' ')[0]} Venceu</button>
                            <button class="btn" data-winner="${round[1].name}">${round[1].name.split(' ')[0]} Venceu</button>
                        </div>
                    ` : '';
                    playersHtml += controls;
                }
                card.innerHTML = playersHtml;
                DOM.roundsContainer.appendChild(card);
            });
        },

        assignBombermanResult(roundEl, playerName, position) {
            const points = { 1: 6, 2: 4, 3: 2, 4: 1 };
            const player = State.players.find(p => p.name === playerName);

            if (!player || player.bombermanPts > 0) return;

            player.bombermanPts = points[position];
            player.totalScore += points[position];
            if (position === 1) player.wins++;

            this.updateLeaderboard();

            const clickedButton = roundEl.querySelector(`[data-player-name="${playerName}"] .score-btn[data-pos="${position}"]`);
            if (clickedButton) clickedButton.classList.add('selected');

            const allPlayerRows = roundEl.querySelectorAll('.player-entry');
            allPlayerRows.forEach(row => {
                const rowPlayerName = row.dataset.playerName;
                if (rowPlayerName === playerName) {
                    row.querySelectorAll('.score-btn').forEach(btn => btn.disabled = true);
                } else {
                    const positionButton = row.querySelector(`.score-btn[data-pos="${position}"]`);
                    if (positionButton) positionButton.disabled = true;
                }
            });

            const allButtonsInCard = roundEl.querySelectorAll('.score-btn');
            const allDisabled = [...allButtonsInCard].every(btn => btn.disabled);
            if (allDisabled) {
                roundEl.dataset.completed = "true";
                AudioVisuals.playSound('win');
            }

            this.checkPhaseCompletion();
        },

        assign1v1Winner(cardEl, winnerName) {
            const roundPlayers = Array.from(cardEl.querySelectorAll('[data-winner]')).map(el => el.dataset.winner);
            const loserName = roundPlayers.find(name => name !== winnerName);

            const winner = State.players.find(p => p.name === winnerName);
            const loser = loserName ? State.players.find(p => p.name === loserName) : null;

            const points = State.currentPhase === 'marioKart' ? { w: 7, l: 3 } : { w: 8, l: 4 };
            const field = State.currentPhase === 'marioKart' ? 'marioKartPts' : 'sfPts';

            if (winner[field] > 0 || (loser && loser[field] > 0)) return alert('Este confronto já foi decidido.');

            winner[field] = points.w;
            winner.totalScore += points.w;
            winner.wins++;
            if (loser) {
                loser[field] = points.l;
                loser.totalScore += points.l;
            }

            this.updateLeaderboard();

            AudioVisuals.playSound('win');
            cardEl.querySelectorAll('.btn').forEach(b => b.disabled = true);
            cardEl.dataset.completed = "true";
            this.checkPhaseCompletion();
        },

        checkPhaseCompletion() {
            const allRoundsCompleted = ![...DOM.roundsContainer.querySelectorAll('.round-card')].some(c => c.dataset.completed === "false");

            if (allRoundsCompleted) {
                const nextPhaseData = State.phaseConfig[State.currentPhase];
                if (nextPhaseData.btn) {
                    nextPhaseData.btn.disabled = false;
                    alert(`Fase ${State.currentPhase} concluída! Próxima fase: ${nextPhaseData.next}`);
                } else {
                    this.showFinalists();
                }
            }
        },

        showFinalists() {
            DOM.tournamentControlsEl.classList.add('hidden');
            DOM.finalSectionEl.classList.remove('hidden');
            const [finalist1, finalist2] = State.players;
            DOM.finalist1El.textContent = finalist1.name;
            DOM.finalist2El.textContent = finalist2 ? finalist2.name : 'Vaga Aberta';
        },

        declareChampion() {
            const finalists = [DOM.finalist1El.textContent, DOM.finalist2El.textContent];
            let winnerName = prompt(`Quem é o campeão?\n1: ${finalists[0]}\n2: ${finalists[1]}`);

            let selectedWinner;
            if (winnerName === '1' || winnerName?.toLowerCase() === finalists[0].toLowerCase()) {
                selectedWinner = finalists[0];
            } else if (winnerName === '2' || winnerName?.toLowerCase() === finalists[1].toLowerCase()) {
                selectedWinner = finalists[1];
            } else {
                return alert("Seleção inválida.");
            }

            ChampionMemorial.save(selectedWinner);
            Utils.flashElement(DOM.memorialChampNameEl);
            AudioVisuals.playSound('win');
            AudioVisuals.launchConfetti();
            DOM.finalSectionEl.classList.add('hidden');
        },

        reset() {
            if (confirm('Tem certeza que deseja limpar todos os nomes e reiniciar o torneio?')) {
                ParticipantManager.clear();
                State.players = [];
                State.currentPhase = null;
                DOM.setupPhaseEl.classList.remove('hidden');
                DOM.tournamentControlsEl.classList.add('hidden');
                DOM.leaderboardList.innerHTML = '<li>— Aguardando jogadores —</li>';
                DOM.roundsContainer.innerHTML = '<p class="muted">Aguardando sorteio de fase...</p>';
                const existingTitle = document.querySelector('.rounds-title');
                if (existingTitle) existingTitle.remove();
                DOM.drawBombermanBtn.disabled = false;
                DOM.drawMarioKartBtn.disabled = true;
                DOM.drawStreetFighterBtn.disabled = true;
                DOM.finalSectionEl.classList.add('hidden');
            }
        }
    };

    // ===================================================================
    // INICIALIZAÇÃO E EVENT LISTENERS
    // ===================================================================

    const setupEventListeners = () => {
        // Participantes e Torneio
        DOM.namesInput.addEventListener('input', ParticipantManager.save);
        DOM.startTournamentBtn.addEventListener('click', () => Tournament.initialize());
        DOM.clearBtn.addEventListener('click', () => Tournament.reset());
        DOM.editNamesBtn.addEventListener('click', () => Tournament.editNames());

        // Modal de Regras
        DOM.rulesBtn.addEventListener('click', () => DOM.rulesModal.classList.remove('hidden'));
        DOM.closeRulesBtn.addEventListener('click', () => DOM.rulesModal.classList.add('hidden'));
        DOM.rulesModal.addEventListener('click', (e) => {
            if (e.target === DOM.rulesModal) {
                DOM.rulesModal.classList.add('hidden');
            }
        });

        // Fases
        DOM.drawBombermanBtn.addEventListener('click', () => Tournament.generateRounds('bomberman'));
        DOM.drawMarioKartBtn.addEventListener('click', () => Tournament.generateRounds('marioKart'));
        DOM.drawStreetFighterBtn.addEventListener('click', () => Tournament.generateRounds('streetFighter'));

        // Final
        DOM.declareWinnerBtn.addEventListener('click', () => Tournament.declareChampion());
        DOM.clearChampionBtn.addEventListener('click', () => ChampionMemorial.clear());

        // Rodadas (Delegação de evento)
        DOM.roundsContainer.addEventListener('click', (e) => {
            const scoreBtn = e.target.closest('.score-btn');
            if (scoreBtn) {
                const roundEl = scoreBtn.closest('.round-card');
                const playerName = scoreBtn.closest('.player-entry').dataset.playerName;
                const position = parseInt(scoreBtn.dataset.pos, 10);
                Tournament.assignBombermanResult(roundEl, playerName, position);
                return;
            }

            const winnerBtn = e.target.closest('[data-winner]');
            if (winnerBtn) {
                const cardEl = winnerBtn.closest('.round-card');
                Tournament.assign1v1Winner(cardEl, winnerBtn.dataset.winner);
            }
        });

        // Timer
        DOM.startTimerBtn.addEventListener('click', () => Timer.start());
        DOM.pauseTimerBtn.addEventListener('click', () => Timer.pause());
        DOM.resetTimerBtn.addEventListener('click', () => Timer.reset());
        DOM.timerDigits.addEventListener('blur', () => {
            State.timer.initialValue = Utils.parseTime(DOM.timerDigits.textContent);
            Timer.reset();
        });

        // UI e Misc
        DOM.musicControl.addEventListener('click', AudioVisuals.toggleMusic);
        DOM.themeButtons.forEach(button => button.addEventListener('click', () => Utils.setBodyClass(`theme-${button.dataset.theme}`)));
        DOM.streamerModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('streamer-mode');
            const inStreamerMode = document.body.classList.contains('streamer-mode');
            DOM.streamerModeBtn.textContent = inStreamerMode ? 'Sair do Modo' : 'Modo Transmissão';
        });
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('.btn') && !e.target.closest('#music-control')) AudioVisuals.playSound('click');
        });
    };

    const init = () => {
        setupEventListeners();
        Timer.updateDisplay();
        ChampionMemorial.load();
        ParticipantManager.load();
    };

    init();
})();