/**
 * Stellar Strike: Cyber Typing Interceptor
 * Main Game Loop, Starfield, Input Dispatcher, Wave Progression,
 * Multi-Target Locking, Interception, HUD, and State Engine.
 */

class GameEngine {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // Word Bank & Sound Engine
    this.wordBank = new WordBank("id"); // Default Indonesian
    this.sound = window.soundEngine;

    // Dimensions
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resizeCanvas();

    // Game States
    this.STATE_MENU = 0;
    this.STATE_PLAYING = 1;
    this.STATE_PAUSED = 2;
    this.STATE_GAMEOVER = 3;
    this.STATE_VICTORY = 4;
    this.state = this.STATE_MENU;

    // Entities
    this.player = new Player(this.width / 2, this.height - 90);
    this.enemies = [];
    this.missiles = [];
    this.lasers = [];
    this.particles = [];
    this.floatingTexts = [];
    this.boss = null;

    // Locked Target Reference
    this.lockedTarget = null; // Can be Enemy, Boss Core, or Boss Turret

    // Starfield Parallax Layers
    this.stars = [];
    this.initStarfield();

    // Flight & Control Mode: 'auto' (pure tactical typing) or 'manual' (mouse/arrow dodge)
    this.controlMode = "auto";
    this.mousePos = { x: this.width / 2, y: this.height - 90 };

    // Metrics & Performance Tracker
    this.score = 0;
    this.wave = 1;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalCorrectChars = 0;
    this.totalErrors = 0;
    this.totalWordsCompleted = 0;
    this.gameStartTime = 0;
    this.wpm = 0;
    this.accuracy = 100;
    this.screenShake = 0;

    // Wave Spawning Management
    this.waveState = "SPAWNING"; // SPAWNING, WAITING_CLEAR, CLEARED
    this.spawnTimer = 0;
    this.spawnInterval = 2.2;
    this.enemiesRemainingToSpawn = 6;
    this.waveClearTimer = 0;

    // CRT Scanlines Effect
    this.crtEnabled = true;

    // Skill System
    this.skillManager = window.skillManager;
    this.activeBuffs = { chrono: 0, spread: 0, drone: 0 };
    this.droneAngle = 0;
    this.droneShootTimer = 0;

    // Multiplayer System
    this.multiplayer = window.multiplayerClient;
    this.isMultiplayer = false;
    this.remotePlayer = null;

    if (this.skillManager) {
      this.skillManager.onSkillUnlocked = (skill) => {
        this.sound.playPowerup();
        this.sound.speak("Skill unlocked: " + skill.name);
        this.showSkillUnlockBanner(skill);
        this.updateSkillHUD();
      };
    }

    this.initMultiplayerHooks();

    // Timing
    this.lastTime = performance.now();

    // HUD throttle timer (only update DOM HUD max 10x/sec to avoid layout thrashing)
    this.hudUpdateTimer = 0;

    // Bind event listeners
    this.bindEvents();

    // Load High Scores
    this.highScores = this.loadHighScores();
  }

  resizeCanvas() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    if (this.player) {
      this.player.targetX = this.width / 2;
      this.player.targetY = this.height - 90;
    }
  }

  initStarfield() {
    this.stars = [];
    const count = 180;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: Math.random() * 3 + 1, // depth factor: 1 (far), 2 (mid), 3 (close)
        size: Math.random() * 1.8 + 0.5,
        color: ["#ffffff", "#00f0ff", "#ff007f", "#ffeeaa"][Math.floor(Math.random() * 4)]
      });
    }
  }

  bindEvents() {
    window.addEventListener("resize", () => {
      this.resizeCanvas();
      this.initStarfield();
    });

    // Keystroke typing handler
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));

    // Mouse movement for manual pilot mode
    window.addEventListener("mousemove", (e) => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
    });

    // Handle audio unlock on first user gesture
    window.addEventListener("pointerdown", () => {
      this.sound.init();
      this.sound.resume();
    }, { once: true });
  }

  loadHighScores() {
    try {
      const data = localStorage.getItem("stellar_strike_highscores");
      const list = data ? JSON.parse(data) : [];
      this.updateHighScoreBanner(list);
      return list;
    } catch (e) {
      return [];
    }
  }

  updateHighScoreBanner(list = this.highScores) {
    const el = document.getElementById("topScoreDisplay");
    if (el && list && list.length > 0) {
      const top = list[0];
      el.textContent = `${top.score.toLocaleString()} PTS (${top.wpm} WPM - Wave ${top.wave})`;
    }
  }

  saveHighScore(entry) {
    this.highScores.push(entry);
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 5); // top 5
    try {
      localStorage.setItem("stellar_strike_highscores", JSON.stringify(this.highScores));
    } catch (e) {}
    this.updateHighScoreBanner(this.highScores);
  }

  // ==========================================
  // GAME LIFECYCLE
  // ==========================================

  startGame() {
    this.sound.init();
    this.sound.resume();
    this.sound.startBGM();

    this.score = 0;
    this.wave = 1;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalCorrectChars = 0;
    this.totalErrors = 0;
    this.totalWordsCompleted = 0;
    this.gameStartTime = performance.now();
    this.wpm = 0;
    this.accuracy = 100;

    if (this.skillManager) this.skillManager.reset();
    this.activeBuffs = { chrono: 0, spread: 0, drone: 0 };
    this.droneAngle = 0;
    this.droneShootTimer = 0;

    const startX = this.isMultiplayer
      ? (this.multiplayer && this.multiplayer.isHost ? this.width / 2 - 90 : this.width / 2 + 90)
      : this.width / 2;
    this.player.reset(startX, this.height - 90);

    const cpPanel = document.getElementById("copilotPanel");
    if (cpPanel && !this.isMultiplayer) cpPanel.classList.add("hidden");

    this.enemies = [];
    this.missiles = [];
    this.lasers = [];
    this.particles = [];
    this.floatingTexts = [];
    this.boss = null;
    this.lockedTarget = null;

    this.initWave(1);
    this.state = this.STATE_PLAYING;

    this.updateHUD();
    this.updateSkillHUD();
    document.getElementById("startMenu").classList.add("hidden");
    document.getElementById("gameOverModal").classList.add("hidden");
    document.getElementById("pauseModal").classList.add("hidden");
    document.getElementById("multiplayerModal").classList.add("hidden");
  }

  initWave(waveNum) {
    this.wave = waveNum;
    this.lockedTarget = null;
    this.missiles = [];

    // Boss wave every 5 waves
    if (this.wave % 5 === 0) {
      this.boss = new Boss(this.width / 2, -100, this.wordBank.getBossPhrase(), this.wordBank);
      this.enemiesRemainingToSpawn = 0;
      this.waveState = "BOSS_FIGHT";
      this.sound.playWarning();
      this.addFloatingText(this.width / 2, this.height * 0.35, `PERINGATAN: BOS FLAGSHIP TIBA!`, "#ff0055", 28, 2.5);
    } else {
      this.boss = null;
      this.enemiesRemainingToSpawn = 5 + this.wave * 2;
      this.spawnInterval = Math.max(0.9, 2.4 - this.wave * 0.15);
      this.spawnTimer = 0.5;
      this.waveState = "SPAWNING";
      this.sound.playChime(true);
      this.addFloatingText(this.width / 2, this.height * 0.4, `SEKTOR GELOMBANG ${this.wave}`, "#00f0ff", 26, 2.0);
    }

    this.updateHUD();
  }

  // ==========================================
  // INPUT & TARGET LOCKING
  // ==========================================

  handleKeyDown(e) {
    // Special Action: TAB key toggles Leaderboard at any time (even during gameplay!)
    if (e.key === "Tab") {
      e.preventDefault();
      if (window.leaderboardManager) {
        window.leaderboardManager.toggleModal();
      }
      return;
    }

    // Global pause toggling & modal dismissal
    if (e.key === "Escape") {
      const lbModal = document.getElementById("leaderboardModal");
      if (lbModal && !lbModal.classList.contains("hidden")) {
        if (window.leaderboardManager) window.leaderboardManager.closeModal();
        return;
      }
      if (this.state === this.STATE_PLAYING) {
        this.pauseGame();
        return;
      } else if (this.state === this.STATE_PAUSED) {
        this.resumeGame();
        return;
      }
    }

    if (this.state !== this.STATE_PLAYING) return;

    // Special Action: Break current target lock with BACKSPACE
    if (e.key === "Backspace") {
      if (this.lockedTarget) {
        this.lockedTarget.isLocked = false;
        this.lockedTarget = null;
        this.addFloatingText(this.player.x, this.player.y - 45, "LOCK RELEASED", "#ffaa00", 14, 0.8);
      }
      return;
    }

    // Special Action: SPACEBAR = EMP Shockwave
    if (e.code === "Space") {
      e.preventDefault();
      this.triggerEmpBlast();
      return;
    }

    // Special Action: Number Keys [1] - [6] for Score-Unlocked Skills!
    if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
      const res = this.activateSkill(e.key);
      if (res && res.handled) return;
    }

    // Process character typing (single letters or digits)
    const key = e.key.toUpperCase();
    if (key.length !== 1) return;

    // ----------------------------------------------------
    // PRIORITY 1: POINT-DEFENSE MISSILE COUNTER-TYPING!
    // ----------------------------------------------------
    // If an incoming missile matches the key, vaporize it immediately!
    const hitMissileIndex = this.missiles.findIndex(m => m.interceptChar === key);
    if (hitMissileIndex !== -1) {
      const missile = this.missiles[hitMissileIndex];
      this.missiles.splice(hitMissileIndex, 1);

      this.sound.playInterception();
      this.createExplosion(missile.x, missile.y, "#ff0055", false);
      this.addFloatingText(missile.x, missile.y - 10, "INTERCEPTED! +120", "#00ff88", 16, 1.0);

      this.score += 120 * this.getMultiplier();
      this.incrementCombo();
      this.player.addEmp(10);
      this.totalCorrectChars++;
      this.updateHUD();
      this.updateSkillHUD();
      return;
    }

    // ----------------------------------------------------
    // PRIORITY 2: LOCKED TARGET PROGRESSION
    // ----------------------------------------------------
    if (this.lockedTarget) {
      const target = this.lockedTarget;
      const targetWord = target.word || target.bossPhrase;
      const expectedChar = targetWord.charAt(target.typedIndex);

      if (key === expectedChar) {
        // Correct letter!
        target.typedIndex++;
        this.totalCorrectChars++;
        this.player.addEmp(3);

        // Auto-skip spaces in multi-word phrases so SPACE is reserved for EMP
        while (target.typedIndex < targetWord.length && targetWord.charAt(target.typedIndex) === ' ') {
          target.typedIndex++;
        }

        // Fire laser bolt
        this.fireLaserAtTarget(target);
        this.sound.playLaser(this.player.alternateFire);
        this.sound.playCombo(this.combo);
        this.incrementCombo();

        // Check if word completed
        if (target.typedIndex >= targetWord.length) {
          this.handleTargetDestroyed(target);
          this.lockedTarget = null;
        }
      } else {
        // Typo!
        this.handleTypo();
      }
      this.updateHUD();
      return;
    }

    // ----------------------------------------------------
    // PRIORITY 3: ACQUIRE NEW TARGET LOCK
    // ----------------------------------------------------
    // Find all enemies on screen whose next (first) letter matches the pressed key
    let candidate = null;
    let closestDist = Infinity;

    // Check Boss Turrets / Core first if Boss is present
    if (this.boss && !this.boss.isDead) {
      if (this.boss.shieldActive) {
        // Check Turrets
        for (const turret of this.boss.turrets) {
          if (!turret.isDead && turret.word.charAt(0) === key) {
            candidate = turret;
            break;
          }
        }
      } else {
        // Core is exposed
        if (this.boss.bossPhrase.charAt(0) === key) {
          candidate = this.boss;
        }
      }
    }

    // Check standard enemies
    if (!candidate) {
      for (const enemy of this.enemies) {
        if (!enemy.isDead && enemy.word.charAt(0) === key) {
          const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
          if (dist < closestDist) {
            closestDist = dist;
            candidate = enemy;
          }
        }
      }
    }

    if (candidate) {
      // Lock target and register first letter
      this.lockedTarget = candidate;
      candidate.isLocked = true;
      candidate.typedIndex = 1;
      const candWord = candidate.word || candidate.bossPhrase;
      while (candidate.typedIndex < candWord.length && candWord.charAt(candidate.typedIndex) === ' ') {
        candidate.typedIndex++;
      }
      this.totalCorrectChars++;
      this.player.addEmp(3);

      this.fireLaserAtTarget(candidate);
      this.sound.playLaser(false);
      this.sound.playCombo(this.combo);
      this.incrementCombo();

      // In case of a 1-letter word (rare/asteroid)
      const w = candidate.word || candidate.bossPhrase;
      if (candidate.typedIndex >= w.length) {
        this.handleTargetDestroyed(candidate);
        this.lockedTarget = null;
      }
    } else {
      // Typed a letter that matches nothing on screen
      this.handleTypo();
    }

    this.updateHUD();
  }

  fireLaserAtTarget(target) {
    const guns = this.player.getGunPositions();
    const gun = this.player.alternateFire ? guns.right : guns.left;
    this.player.alternateFire = !this.player.alternateFire;

    const targetX = target.x + (target.relX || 0);
    const targetY = target.y + (target.relY || 0);

    const laserColor = this.combo >= 20 ? "#ff00ff" : "#00ffff";

    if (this.activeBuffs && this.activeBuffs.spread > 0) {
      // 5-Way Multi-Vector Spread Cannons
      const baseAngle = Math.atan2(targetY - gun.y, targetX - gun.x);
      const spreadAngles = [-0.28, -0.14, 0, 0.14, 0.28];
      spreadAngles.forEach(offset => {
        const a = baseAngle + offset;
        const tx = gun.x + Math.cos(a) * 600;
        const ty = gun.y + Math.sin(a) * 600;
        this.lasers.push(new LaserBolt(gun.x, gun.y, tx, ty, "#ffdd00"));
      });
    } else {
      this.lasers.push(new LaserBolt(gun.x, gun.y, targetX, targetY, laserColor));
    }

    // Spawn tiny hit spark on target
    this.createSparks(targetX, targetY, 4, laserColor);

    // Sync to multiplayer friend
    if (this.multiplayer && this.multiplayer.isConnected) {
      this.multiplayer.send({
        type: 'FIRE_LASER',
        fromX: gun.x,
        fromY: gun.y,
        toX: targetX,
        toY: targetY,
        color: laserColor
      });
    }
  }

  handleTypo() {
    this.totalErrors++;
    this.combo = 0; // Break streak
    this.sound.playTypo();
    this.screenShake = 6;
    this.addFloatingText(this.player.x, this.player.y - 30, "MISS!", "#ff3355", 14, 0.6);
  }

  incrementCombo() {
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    if (this.combo % 10 === 0) {
      this.addFloatingText(this.player.x, this.player.y - 60, `COMBO x${this.getMultiplier()}!`, "#ff00ff", 20, 1.2);
    }
  }

  getMultiplier() {
    if (this.combo >= 30) return 5;
    if (this.combo >= 20) return 4;
    if (this.combo >= 10) return 3;
    if (this.combo >= 5) return 2;
    return 1;
  }

  handleTargetDestroyed(target) {
    this.totalWordsCompleted++;
    const mult = this.getMultiplier();

    // Check if target is a Turret
    if (target.id && (target.id === "turretLeft" || target.id === "turretRight")) {
      target.isDead = true;
      const wx = this.boss.x + target.relX;
      const wy = this.boss.y + target.relY;
      this.createExplosion(wx, wy, "#ffaa00", true);
      this.sound.playExplosion(true);
      this.score += 500 * mult;
      this.addFloatingText(wx, wy, `TURRET DESTROYED! +${500 * mult}`, "#00ff88", 18, 1.5);
      this.updateSkillHUD();
      return;
    }

    // Check if target is Boss Core
    if (target.type === "boss") {
      target.isDead = true;
      this.createExplosion(target.x, target.y, "#ff007f", true);
      this.sound.playExplosion(true);
      this.score += target.scoreValue * mult;
      this.addFloatingText(target.x, target.y, `BOS HANCUR! +${target.scoreValue * mult}`, "#ffdd00", 28, 3.0);
      this.screenShake = 20;
      this.updateSkillHUD();

      // Advance wave after boss defeat
      setTimeout(() => {
        this.initWave(this.wave + 1);
      }, 2500);
      return;
    }

    // Standard enemy
    target.isDead = true;
    this.createExplosion(target.x, target.y, target.color, target.type === "destroyer");
    this.sound.playExplosion(target.type === "destroyer");

    const pts = target.scoreValue * mult;
    this.score += pts;
    this.player.addEmp(target.empYield);
    this.addFloatingText(target.x, target.y, `+${pts}`, "#00ffff", 16, 1.0);

    // Update skill HUD on score change
    this.updateSkillHUD();

    // Remove from array
    const idx = this.enemies.indexOf(target);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }
  }

  triggerEmpBlast() {
    if (this.player.empEnergy < 50) {
      this.sound.playTypo();
      this.addFloatingText(this.player.x, this.player.y - 30, "EMP BELUM SIAP!", "#ffaa00", 14, 0.8);
      return;
    }

    this.player.empEnergy -= 50;
    this.sound.playEmp();
    this.screenShake = 15;

    // Create expanding EMP shockwave ring
    this.particles.push(new Particle(this.player.x, this.player.y, 0, 0, "#00ffff", 20, 1.2, 0.03, "ring"));

    // Obliterate all incoming missiles
    const clearedMissiles = this.missiles.length;
    this.missiles.forEach(m => {
      this.createExplosion(m.x, m.y, "#ff007f", false);
    });
    this.missiles = [];

    // Push back and stun living enemies
    this.enemies.forEach(e => {
      e.y = Math.max(30, e.y - 70);
      this.createSparks(e.x, e.y, 10, "#00ffff");
    });

    this.addFloatingText(this.player.x, this.player.y - 70, `EMP SHOCKWAVE ACTIVATED!`, "#00ffff", 22, 1.8);
    this.updateHUD();
  }

  // ==========================================
  // SPAWNER & ENEMY ATTACKS
  // ==========================================

  updateSpawning(dt) {
    if (this.waveState === "SPAWNING") {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnRandomEnemy();
        this.enemiesRemainingToSpawn--;

        if (this.enemiesRemainingToSpawn <= 0) {
          this.waveState = "WAITING_CLEAR";
        }
      }
    } else if (this.waveState === "WAITING_CLEAR") {
      // Check if all enemies on screen are defeated
      if (this.enemies.length === 0 && (!this.boss || this.boss.isDead)) {
        this.waveClearTimer += dt;
        if (this.waveClearTimer >= 1.5) {
          this.waveClearTimer = 0;
          this.initWave(this.wave + 1);
        }
      }
    }
  }

  spawnRandomEnemy() {
    const activeWords = this.enemies.map(e => e.word);
    const lockedPrefix = this.lockedTarget ? (this.lockedTarget.word || this.lockedTarget.bossPhrase || "").charAt(0) : null;

    // Choose enemy type based on wave difficulty
    const roll = Math.random();
    let type = "scout";
    let tier = "easy";

    if (this.wave >= 3 && roll < 0.25) {
      type = "destroyer";
      tier = "hard";
    } else if (this.wave >= 2 && roll < 0.6) {
      type = "fighter";
      tier = "medium";
    } else if (roll < 0.75) {
      type = "scout";
      tier = "easy";
    } else {
      type = "asteroid";
      tier = "easy";
    }

    const word = this.wordBank.getWord(tier, activeWords, lockedPrefix);
    const spawnPadding = 80;
    const x = spawnPadding + Math.random() * (this.width - spawnPadding * 2);
    const y = -40;

    const enemy = new Enemy(x, y, word, type);
    this.enemies.push(enemy);
  }

  onEnemyShootMissile(source) {
    // Generate an interception character that isn't already active
    const activeKeys = this.missiles.map(m => m.interceptChar);
    const key = this.wordBank.getInterceptKey(activeKeys);

    const missile = new InterceptMissile(source.x, source.y, key, this.player.x, this.player.y);
    this.missiles.push(missile);
    this.sound.playWarning();
  }

  // ==========================================
  // MAIN UPDATE & RENDER LOOP
  // ==========================================

  update(dt) {
    if (this.state !== this.STATE_PLAYING) return;

    // 1. Calculate continuous WPM & Accuracy
    const elapsedMinutes = (performance.now() - this.gameStartTime) / 60000;
    if (elapsedMinutes > 0.05) {
      this.wpm = Math.round((this.totalCorrectChars / 5) / elapsedMinutes);
      const totalAttempts = this.totalCorrectChars + this.totalErrors;
      this.accuracy = totalAttempts > 0 ? Math.round((this.totalCorrectChars / totalAttempts) * 100) : 100;
      this.sound.setBpmFromWpm(this.wpm);
    }

    // 2. Starfield update (warp speed factor from high WPM)
    const warpSpeed = Math.min(6, 1 + this.wpm / 40);
    this.stars.forEach(star => {
      star.y += star.z * 1.2 * warpSpeed;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    });

    // 3. Player update
    this.player.update(dt, this.lockedTarget, this.controlMode, this.mousePos);

    // 4. Enemy Spawning & Progression
    this.updateSpawning(dt);

    // Skill Buff timers decay & effects
    if (this.activeBuffs) {
      if (this.activeBuffs.chrono > 0) this.activeBuffs.chrono = Math.max(0, this.activeBuffs.chrono - dt);
      if (this.activeBuffs.spread > 0) this.activeBuffs.spread = Math.max(0, this.activeBuffs.spread - dt);
      if (this.activeBuffs.drone > 0) {
        this.activeBuffs.drone = Math.max(0, this.activeBuffs.drone - dt);
        this.droneAngle += 3.8 * dt;
        this.droneShootTimer += dt;
        if (this.droneShootTimer >= 0.7 && this.missiles.length > 0) {
          this.droneShootTimer = 0;
          const dX = this.player.x + Math.cos(this.droneAngle) * 58;
          const dY = this.player.y + Math.sin(this.droneAngle) * 58;
          const targetMissile = this.missiles[0];
          this.lasers.push(new LaserBolt(dX, dY, targetMissile.x, targetMissile.y, "#00ff88"));
          this.sound.playInterception();
          this.createExplosion(targetMissile.x, targetMissile.y, "#00ff88", false);
          this.missiles.shift();
          this.addFloatingText(dX, dY - 15, "DRONE INTERCEPT!", "#00ff88", 14, 0.8);
        }
      }
    }

    // Skill Manager cooldown decay & milestone checks
    if (this.skillManager) {
      this.skillManager.update(dt, this.score);
      // NOTE: updateSkillHUD() is intentionally NOT called here every frame.
      // It's called only on score-change events (handleTargetDestroyed, triggerEmpBlast,
      // missile intercept, activateSkill) to avoid 60fps DOM thrashing which causes freezes.
    }

    // Multiplayer State Sync
    if (this.multiplayer && this.multiplayer.isConnected) {
      this.multiplayer.localPlayer.x = this.player.x;
      this.multiplayer.localPlayer.y = this.player.y;
      this.multiplayer.localPlayer.shields = this.player.shields;
      this.multiplayer.localPlayer.score = this.score;
      this.multiplayer.localPlayer.wpm = this.wpm;
      this.multiplayer.localPlayer.combo = this.combo;
    }

    // Chrono Stasis Time-Dilation
    const effectiveDt = (this.activeBuffs && this.activeBuffs.chrono > 0) ? dt * 0.3 : dt;

    // 5. Enemies update
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(effectiveDt, this.player, (src) => this.onEnemyShootMissile(src));

      // Check collision with player or bottom breach
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist < enemy.radius + this.player.radius || enemy.y > this.height - 20) {
        // Breach! Player takes shield damage
        this.player.takeDamage(20);
        this.createExplosion(enemy.x, enemy.y, "#ff3355", true);
        this.screenShake = 12;

        if (this.lockedTarget === enemy) {
          this.lockedTarget = null;
        }
        this.enemies.splice(i, 1);
        this.combo = 0;
        this.addFloatingText(this.player.x, this.player.y - 50, "SHIELD HIT! -20%", "#ff0055", 18, 1.2);
        this.checkGameOver();
      }
    }

    // 6. Boss update
    if (this.boss && !this.boss.isDead) {
      this.boss.update(effectiveDt, (src) => this.onEnemyShootMissile(src));
    }

    // 7. Missiles update & collision with player
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const missile = this.missiles[i];
      missile.update(effectiveDt, this.player);

      // Trail particles
      if (Math.random() < 0.4) {
        this.particles.push(new Particle(missile.x, missile.y, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, "#ff0055", 3, 0.4, 0.05, "smoke"));
      }

      // Check collision with player
      const dist = Math.hypot(missile.x - this.player.x, missile.y - this.player.y);
      if (dist < missile.radius + this.player.radius) {
        this.player.takeDamage(15);
        this.createExplosion(missile.x, missile.y, "#ff0055", false);
        this.screenShake = 10;
        this.missiles.splice(i, 1);
        this.combo = 0;
        this.addFloatingText(this.player.x, this.player.y - 40, "MISSILE IMPACT! -15%", "#ff3300", 16, 1.0);
        this.checkGameOver();
      }
    }

    // 8. Laser bolts update
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      this.lasers[i].update(dt);
      if (!this.lasers[i].alive) {
        this.lasers.splice(i, 1);
      }
    }
    // Hard cap on laser bolts (spread skill can fire 5x per keypress)
    if (this.lasers.length > 60) {
      this.lasers.splice(0, this.lasers.length - 60);
    }

    // 9. Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update(dt)) {
        this.particles.splice(i, 1);
      }
    }
    // Hard cap on particles to prevent freeze from mass explosions
    if (this.particles.length > 300) {
      this.particles.splice(0, this.particles.length - 300);
    }

    // 10. Floating text popups update
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      if (!this.floatingTexts[i].update(dt)) {
        this.floatingTexts.splice(i, 1);
      }
    }
    // Hard cap on floating texts
    if (this.floatingTexts.length > 30) {
      this.floatingTexts.splice(0, this.floatingTexts.length - 30);
    }

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - 20 * dt);
    }
  }

  render() {
    this.ctx.save();

    // Screen Shake effect
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(shakeX, shakeY);
    }

    // Clear Canvas with deep void background
    this.ctx.fillStyle = "#060913";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 1. Draw Starfield
    this.drawStarfield();

    // 2. Draw CRT Grid Floor
    this.drawCyberGrid();

    // 3. Draw Laser Bolts
    this.lasers.forEach(laser => laser.draw(this.ctx));

    // 4. Draw Particles (Smoke & Debris under ships)
    this.particles.forEach(p => p.draw(this.ctx));

    // 5. Draw Enemies
    this.enemies.forEach(enemy => enemy.draw(this.ctx));

    // 6. Draw Boss
    if (this.boss && !this.boss.isDead) {
      this.boss.draw(this.ctx);
    }

    // 7. Draw Interception Missiles
    this.missiles.forEach(missile => missile.draw(this.ctx));

    // 8. Draw Player Ship
    this.player.draw(this.ctx);

    // 8b. Draw Orbital Defense Drone
    if (this.activeBuffs && this.activeBuffs.drone > 0) {
      const dX = this.player.x + Math.cos(this.droneAngle) * 58;
      const dY = this.player.y + Math.sin(this.droneAngle) * 58;
      this.drawDrone(this.ctx, dX, dY);
    }

    // 8c. Draw Co-Op Friend's Ship (Player 2)
    if (this.remotePlayer && this.isMultiplayer) {
      this.drawRemotePlayer(this.ctx, this.remotePlayer);
    }

    // 9. Draw Floating Combat Text
    this.floatingTexts.forEach(ft => ft.draw(this.ctx));

    this.ctx.restore();

    // CRT Scanlines are now handled by the CSS .crt-overlay div (zero canvas cost).
    // The canvas drawScanlines() method is kept for reference but no longer called.
  }

  drawStarfield() {
    this.ctx.save();
    // Note: no shadowBlur on stars — it's expensive and barely visible at star sizes
    const warp = this.wpm > 60;
    this.stars.forEach(s => {
      this.ctx.fillStyle = s.color;
      if (warp) {
        // Hyperspace streak lines
        const streak = (this.wpm / 20) * s.z;
        this.ctx.fillRect(s.x, s.y, s.size, streak);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
    this.ctx.restore();
  }

  drawCyberGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(0, 240, 255, 0.04)";
    this.ctx.lineWidth = 1;

    const gridSize = 60;
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawScanlines() {
    // Use a single semi-transparent overlay stripe pattern instead of per-row fillRect
    // This avoids hundreds of fillRect calls per frame which are very expensive
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.10)";
    // Draw every 4th row as a 2px dark stripe (batch into one pattern via createPattern if available)
    for (let y = 0; y < this.height; y += 4) {
      ctx.fillRect(0, y, this.width, 2);
    }
    ctx.restore();
  }

  // ==========================================
  // FX HELPERS
  // ==========================================

  createExplosion(x, y, color = "#ff007f", isLarge = false) {
    const count = isLarge ? 45 : 22;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isLarge ? 7 : 4) + 1;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = Math.random() * (isLarge ? 6 : 4) + 2;
      const life = Math.random() * 0.5 + 0.4;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 0.02, "spark"));
    }
    // Shockwave ring
    this.particles.push(new Particle(x, y, 0, 0, color, 10, isLarge ? 0.7 : 0.4, 0.04, "ring"));
  }

  createSparks(x, y, count = 5, color = "#00ffff") {
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 6;
      const vy = (Math.random() - 0.5) * 6;
      this.particles.push(new Particle(x, y, vx, vy, color, 2.5, 0.3, 0.06, "spark"));
    }
  }

  addFloatingText(x, y, text, color, size, life) {
    this.floatingTexts.push(new FloatingText(x, y, text, color, size, life));
  }

  // ==========================================
  // HUD & UI UPDATES
  // ==========================================

  updateHUD() {
    // Throttle: only update DOM elements at most 10 times per second (every 100ms)
    // This prevents layout thrashing from 60fps DOM writes
    const now = performance.now();
    if (now - (this._lastHudUpdate || 0) < 100) return;
    this._lastHudUpdate = now;

    const scoreEl = document.getElementById("hudScore");
    const waveEl = document.getElementById("hudWave");
    const wpmEl = document.getElementById("hudWpm");
    const accEl = document.getElementById("hudAccuracy");
    const comboEl = document.getElementById("hudCombo");
    const multiplierEl = document.getElementById("hudMultiplier");
    const shieldBar = document.getElementById("shieldBarFill");
    const shieldText = document.getElementById("shieldText");
    const empBar = document.getElementById("empBarFill");
    const empText = document.getElementById("empText");

    if (scoreEl) scoreEl.textContent = this.score.toLocaleString();
    if (waveEl) waveEl.textContent = this.wave;
    if (wpmEl) wpmEl.textContent = this.wpm;
    if (accEl) accEl.textContent = `${this.accuracy}%`;
    if (comboEl) comboEl.textContent = this.combo;

    const mult = this.getMultiplier();
    if (multiplierEl) {
      multiplierEl.textContent = `x${mult}`;
      multiplierEl.className = mult >= 5 ? "overdrive" : "";
    }

    if (shieldBar) {
      shieldBar.style.width = `${Math.max(0, this.player.shields)}%`;
      if (this.player.shields < 30) {
        shieldBar.style.backgroundColor = "#ff0055";
      } else {
        shieldBar.style.backgroundColor = "#00f0ff";
      }
    }
    if (shieldText) shieldText.textContent = `${Math.round(this.player.shields)}%`;

    if (empBar) empBar.style.width = `${this.player.empEnergy}%`;
    if (empText) {
      empText.textContent = this.player.empEnergy >= 50 ? "EMP SIAP! [SPACE]" : `${Math.round(this.player.empEnergy)}%`;
      empText.className = this.player.empEnergy >= 50 ? "emp-ready" : "";
    }
  }

  // ==========================================
  // SKILL SYSTEM LOGIC & HUD
  // ==========================================

  activateSkill(hotkey) {
    if (!this.skillManager) return { handled: false };
    const result = this.skillManager.activateSkill(hotkey);
    if (!result) return { handled: false };

    const skill = result.skill;
    if (result.status === 'LOCKED') {
      this.sound.playTypo();
      this.addFloatingText(this.player.x, this.player.y - 30, `${skill.name.toUpperCase()} TERKUNCI! (${skill.scoreRequired.toLocaleString()} PTS)`, "#ff3355", 14, 0.8);
      return { handled: true };
    }
    if (result.status === 'COOLDOWN') {
      this.sound.playTypo();
      this.addFloatingText(this.player.x, this.player.y - 30, `COOLDOWN: ${Math.ceil(skill.currentCooldown)}s`, "#ffaa00", 14, 0.6);
      return { handled: true };
    }

    // Activated successfully!
    this.sound.playPowerup();

    if (hotkey === '1') {
      // 1. Plasma Nova (Piercing beam straight ahead)
      this.sound.speak("Plasma Nova!");
      this.screenShake = 16;
      this.lasers.push(new LaserBolt(this.player.x, this.player.y, this.player.x, 0, "#00ffff"));
      // Pierce all enemies in forward column
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const en = this.enemies[i];
        if (Math.abs(en.x - this.player.x) < 85) {
          this.handleTargetDestroyed(en);
        }
      }
      this.addFloatingText(this.player.x, this.player.y - 70, "PLASMA NOVA PIERCING BLAST!", "#00ffff", 22, 1.5);
    } else if (hotkey === '2') {
      // 2. Orbital Drone (15s duration)
      this.sound.speak("Orbital Drone online!");
      this.activeBuffs.drone = 15;
      this.addFloatingText(this.player.x, this.player.y - 70, "ORBITAL DEFENSE DRONE ONLINE!", "#00ff88", 22, 1.5);
    } else if (hotkey === '3') {
      // 3. Chrono Stasis (6s duration, 70% slow)
      this.sound.speak("Chrono Stasis engaged!");
      this.activeBuffs.chrono = 6;
      this.addFloatingText(this.player.x, this.player.y - 70, "CHRONO WARP (70% SLOW-MO)!", "#b026ff", 22, 1.5);
    } else if (hotkey === '4') {
      // 4. Multi-Vector Spread (10s duration)
      this.sound.speak("Multi-vector cannons active!");
      this.activeBuffs.spread = 10;
      this.addFloatingText(this.player.x, this.player.y - 70, "MULTI-VECTOR 5-WAY SPREAD!", "#ffdd00", 22, 1.5);
    } else if (hotkey === '5') {
      // 5. Nanite Shield Repair (+50%)
      this.sound.speak("Nanite shields restored!");
      this.player.shields = Math.min(this.player.maxShields, this.player.shields + 50);
      this.createSparks(this.player.x, this.player.y, 25, "#00ff88");
      this.addFloatingText(this.player.x, this.player.y - 70, "PERISAI REPARASI +50%!", "#00ff88", 22, 1.5);
    } else if (hotkey === '6') {
      // 6. Supernova Annihilator (Screen-wide nuke)
      this.sound.speak("Supernova Annihilator!");
      this.screenShake = 25;
      this.particles.push(new Particle(this.width / 2, this.height / 2, 0, 0, "#ff0055", 35, 1.8, 0.02, "ring"));
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        this.handleTargetDestroyed(this.enemies[i]);
      }
      this.missiles.forEach(m => this.createExplosion(m.x, m.y, "#ff0055", false));
      this.missiles = [];
      if (this.boss && !this.boss.isDead) {
        this.boss.turrets.forEach(t => t.isDead = true);
        this.addFloatingText(this.boss.x, this.boss.y, "CRITICAL HIT BOS!", "#ff0055", 26, 2.0);
      }
      this.addFloatingText(this.player.x, this.player.y - 80, "SUPERNOVA ANNIHILATION!", "#ff0055", 28, 2.0);
    }

    if (this.multiplayer && this.multiplayer.isConnected) {
      this.multiplayer.send({
        type: 'SKILL_TRIGGERED',
        skillId: skill.id,
        playerName: this.multiplayer.localPlayer.name
      });
    }

    this.updateSkillHUD();
    return { handled: true };
  }

  showSkillUnlockBanner(skill) {
    const banner = document.getElementById("skillUnlockBanner");
    const nameEl = document.getElementById("bannerSkillName");
    const hintEl = document.getElementById("bannerSkillHint");

    if (!banner || !nameEl || !hintEl) return;
    nameEl.textContent = skill.name.toUpperCase();
    hintEl.textContent = `TEKAN [${skill.hotkey}] UNTUK MENGAKTIFKAN ${skill.subtitle.toUpperCase()}!`;

    banner.classList.remove("hidden");
    banner.style.animation = 'none';
    banner.offsetHeight; // trigger reflow
    banner.style.animation = 'bannerPop 3.2s forwards';

    setTimeout(() => {
      banner.classList.add("hidden");
    }, 3200);
  }

  updateSkillHUD() {
    if (!this.skillManager) return;
    const skills = this.skillManager.skills;

    // 1. Update each slot
    skills.forEach((skill, idx) => {
      const slotEl = document.getElementById(`skillSlot${idx + 1}`);
      const cdEl = document.getElementById(`skillCd${idx + 1}`);
      if (!slotEl || !cdEl) return;

      if (skill.isUnlocked) {
        slotEl.classList.remove("locked");
        slotEl.classList.add("unlocked");

        if (skill.activeTimeRemaining && skill.activeTimeRemaining > 0) {
          slotEl.classList.add("active-buff");
        } else {
          slotEl.classList.remove("active-buff");
        }

        if (skill.currentCooldown > 0) {
          cdEl.classList.remove("hidden");
          cdEl.textContent = Math.ceil(skill.currentCooldown);
          slotEl.classList.remove("ready");
        } else {
          cdEl.classList.add("hidden");
          slotEl.classList.add("ready");
        }
      } else {
        slotEl.classList.add("locked");
        slotEl.classList.remove("unlocked", "ready", "active-buff");
        cdEl.classList.add("hidden");
      }
    });

    // 2. Update Progress Bar to next skill
    const nextSkill = this.skillManager.getNextLockedSkill(this.score);
    const progressLabel = document.getElementById("skillProgressLabel");
    const progressFill = document.getElementById("skillProgressBarFill");
    const nextName = document.getElementById("nextSkillName");

    if (nextSkill) {
      const prevScore = nextSkill.hotkey === '1' ? 0 : skills[parseInt(nextSkill.hotkey) - 2].scoreRequired;
      const progressPct = Math.min(100, Math.max(0, ((this.score - prevScore) / (nextSkill.scoreRequired - prevScore)) * 100));
      if (progressLabel) progressLabel.textContent = `PROGRESS: ${this.score.toLocaleString()} / ${nextSkill.scoreRequired.toLocaleString()} PTS`;
      if (progressFill) progressFill.style.width = `${progressPct}%`;
      if (nextName) nextName.textContent = `[${nextSkill.hotkey}] ${nextSkill.name}`;
    } else {
      if (progressLabel) progressLabel.textContent = `SEMUA SKILL TERBUKA! MAX POWER`;
      if (progressFill) progressFill.style.width = `100%`;
      if (nextName) nextName.textContent = `🌟 OVERDRIVE ELITE`;
    }
  }

  drawDrone(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#0c2826";
    ctx.strokeStyle = "#00ff88";
    ctx.shadowColor = "#00ff88";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#00ff88";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ==========================================
  // MULTIPLAYER ROOM & CO-PILOT SYSTEM
  // ==========================================

  initMultiplayerHooks() {
    if (!this.multiplayer) return;

    this.multiplayer.onRemotePlayerJoined = (player) => {
      this.remotePlayer = player;
      this.sound.playChime(true);
      this.sound.speak("Co pilot connected!");

      const p2Name = document.getElementById("rosterP2Name");
      const p2Status = document.getElementById("rosterP2Status");
      const launchBtn = document.getElementById("launchCoopBtn");
      const roomStatus = document.getElementById("roomStatusText");

      if (p2Name) p2Name.textContent = player.name;
      if (p2Status) {
        p2Status.textContent = "TERHUBUNG ✅";
        p2Status.style.color = "#00ff88";
      }
      if (roomStatus) {
        roomStatus.textContent = "PILOT 2 SIAP! TEKAN LUNCURKAN!";
        roomStatus.style.color = "#00ff88";
      }
      if (launchBtn) launchBtn.style.display = "block";
    };

    this.multiplayer.onRemotePlayerSync = (player) => {
      this.remotePlayer = player;
      const cpPanel = document.getElementById("copilotPanel");
      const cpName = document.getElementById("copilotName");
      const cpShields = document.getElementById("copilotShields");
      const cpWpm = document.getElementById("copilotWpm");

      if (cpPanel && this.isMultiplayer) cpPanel.classList.remove("hidden");
      if (cpName) cpName.textContent = player.name;
      if (cpShields) cpShields.textContent = `${Math.round(player.shields)}%`;
      if (cpWpm) cpWpm.textContent = `${player.wpm} WPM`;
    };

    this.multiplayer.onRemoteLaser = (laser) => {
      this.lasers.push(new LaserBolt(laser.fromX, laser.fromY, laser.toX, laser.toY, "#ff007f"));
    };

    this.multiplayer.onRemoteSkill = (skillId, playerName) => {
      const skill = this.skillManager.skills.find(s => s.id === skillId);
      if (skill) {
        this.sound.speak("Co pilot activated " + skill.name);
        this.addFloatingText(this.width / 2, this.height * 0.45, `KAWAN MENGAKTIFKAN: ${skill.name.toUpperCase()}!`, "#ff007f", 24, 2.0);
        // Shared benefit
        if (skillId === 'chrono') this.activeBuffs.chrono = 6;
        if (skillId === 'repair') this.player.shields = Math.min(100, this.player.shields + 30);
      }
    };

    this.multiplayer.onRemoteIntercept = (char, playerName) => {
      this.addFloatingText(this.player.x, this.player.y - 45, `INTERSEPSI KAWAN: [${char}]!`, "#00ff88", 16, 1.2);
    };

    this.multiplayer.onGameStart = () => {
      this.startMultiplayerGame();
    };
  }

  openMultiplayerLobby() {
    const modal = document.getElementById("multiplayerModal");
    if (!modal) return;
    modal.classList.remove("hidden");

    this.selectMultiplayerTab("create");
    const code = this.multiplayer.createRoom();
    const displayCode = document.getElementById("displayRoomCode");
    if (displayCode) displayCode.textContent = code;

    const p1Name = document.getElementById("rosterP1Name");
    if (p1Name) p1Name.textContent = "PILOT ALFA (HOST)";
  }

  selectMultiplayerTab(tab) {
    const createSection = document.getElementById("createRoomSection");
    const joinSection = document.getElementById("joinRoomSection");
    const tabCreate = document.getElementById("tabCreateRoom");
    const tabJoin = document.getElementById("tabJoinRoom");

    if (tab === "create") {
      if (createSection) createSection.classList.remove("hidden");
      if (joinSection) joinSection.classList.add("hidden");
      if (tabCreate) tabCreate.classList.add("primary");
      if (tabJoin) tabJoin.classList.remove("primary");
    } else {
      if (createSection) createSection.classList.add("hidden");
      if (joinSection) joinSection.classList.remove("hidden");
      if (tabCreate) tabCreate.classList.remove("primary");
      if (tabJoin) tabJoin.classList.add("primary");
    }
  }

  joinExistingRoom(code) {
    if (!code) return;
    this.multiplayer.joinRoom(code, false);
    const statusText = document.getElementById("roomStatusText");
    if (statusText) statusText.textContent = `TERHUBUNG KE RUANG ${code}!`;
    this.selectMultiplayerTab("create");
    const displayCode = document.getElementById("displayRoomCode");
    if (displayCode) displayCode.textContent = code;

    const p1Status = document.getElementById("rosterP1Status");
    const p2Status = document.getElementById("rosterP2Status");
    const p2Name = document.getElementById("rosterP2Name");
    if (p1Status) p1Status.textContent = "HOST TERHUBUNG ✅";
    if (p2Name) p2Name.textContent = "PILOT BETA (KAMU)";
    if (p2Status) {
      p2Status.textContent = "KAMU (SIAP) ✅";
      p2Status.style.color = "#00ff88";
    }

    const launchBtn = document.getElementById("launchCoopBtn");
    if (launchBtn) launchBtn.style.display = "block";
  }

  startMultiplayerGame() {
    this.isMultiplayer = true;
    document.getElementById("multiplayerModal").classList.add("hidden");
    document.getElementById("copilotPanel").classList.remove("hidden");

    if (this.multiplayer.isHost) {
      this.multiplayer.send({ type: 'START_COOP_MISSION' });
    }

    this.startGame();
    this.sound.speak("Co-Op mission launched! Defend the fleet!");
    this.addFloatingText(this.width / 2, this.height * 0.4, "MISI ARMADA CO-OP DIMULAI!", "#ff007f", 28, 2.5);
  }

  drawRemotePlayer(ctx, rp) {
    ctx.save();
    ctx.translate(rp.x, rp.y);
    ctx.rotate(rp.angle + Math.PI / 2);

    // Engine flame
    const flameSize = 12 + Math.sin(Date.now() * 0.03) * 4;
    ctx.fillStyle = "#ff007f";
    ctx.shadowColor = "#ff007f";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(0, 14 + flameSize);
    ctx.lineTo(6, 14);
    ctx.closePath();
    ctx.fill();

    // Magenta Hull
    ctx.fillStyle = "#200924";
    ctx.strokeStyle = "#ff007f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(22, 14);
    ctx.lineTo(10, 10);
    ctx.lineTo(0, 14);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-22, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Pilot Tag
    ctx.save();
    ctx.font = "bold 11px 'Share Tech Mono', monospace";
    ctx.fillStyle = "#ff007f";
    ctx.textAlign = "center";
    ctx.fillText(rp.name || "PILOT BETA", rp.x, rp.y + 32);
    ctx.restore();
  }

  checkGameOver() {
    if (this.player.shields <= 0) {
      this.state = this.STATE_GAMEOVER;
      this.sound.stopBGM();
      this.sound.playChime(false);

      // Pilot Rank Assessment
      let rank = "Kadet Antariksa (Novice)";
      if (this.wpm >= 90 && this.accuracy >= 95) rank = "LEGENDA GALAKSI (Cyber Ace)";
      else if (this.wpm >= 70) rank = "Komandan Armada (Commander)";
      else if (this.wpm >= 50) rank = "Letnan Tempur (Interceptor)";
      else if (this.wpm >= 35) rank = "Prajurit Udara (Scout)";

      // Save high score
      this.saveHighScore({
        score: this.score,
        wave: this.wave,
        wpm: this.wpm,
        acc: this.accuracy,
        date: new Date().toLocaleDateString()
      });

      // Save last game record for Supabase leaderboard submission
      this.lastGameOverStats = {
        score: this.score,
        wave: this.wave,
        wpm: this.wpm,
        accuracy: this.accuracy,
        rank_title: rank
      };

      // Populate Game Over Modal
      document.getElementById("goScore").textContent = this.score.toLocaleString();
      document.getElementById("goWave").textContent = this.wave;
      document.getElementById("goWpm").textContent = `${this.wpm} WPM`;
      document.getElementById("goAcc").textContent = `${this.accuracy}%`;
      document.getElementById("goRank").textContent = rank;
      document.getElementById("goWords").textContent = this.totalWordsCompleted;
      const goComboEl = document.getElementById("goCombo");
      if (goComboEl) goComboEl.textContent = `x${this.maxCombo}`;

      // Reset leaderboard submission UI in Game Over
      const pilotInput = document.getElementById("goPilotName");
      const submitStatus = document.getElementById("goSubmitStatus");
      const submitBtn = document.getElementById("goSubmitScoreBtn");
      if (pilotInput && window.leaderboardManager) {
        pilotInput.value = window.leaderboardManager.pilotName || 'PILOT_CYBER';
      }
      if (submitStatus) submitStatus.textContent = '';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '📤 KIRIM SKOR';
      }

      document.getElementById("gameOverModal").classList.remove("hidden");
    }
  }

  pauseGame() {
    this.state = this.STATE_PAUSED;
    document.getElementById("pauseModal").classList.remove("hidden");
  }

  resumeGame() {
    this.state = this.STATE_PLAYING;
    this.lastTime = performance.now();
    document.getElementById("pauseModal").classList.add("hidden");
  }

  setLanguage(lang) {
    this.wordBank.setLanguage(lang);
    const btn = document.getElementById("langToggleBtn");
    if (btn) btn.textContent = lang === "id" ? "BAHASA: INDONESIA" : "LANG: ENGLISH";
  }

  setControlMode(mode) {
    this.controlMode = mode;
    const btn = document.getElementById("controlModeBtn");
    if (btn) {
      btn.textContent = mode === "auto" ? "PILOT: AUTO-STABILIZER" : "PILOT: MANUAL (MOUSE)";
    }
  }

  toggleCrt() {
    this.crtEnabled = !this.crtEnabled;
    const btn = document.getElementById("crtToggleBtn");
    if (btn) btn.textContent = this.crtEnabled ? "CRT FX: ON" : "CRT FX: OFF";
    // Toggle CSS overlay (zero canvas cost — GPU composited)
    const overlay = document.getElementById("crtOverlay");
    if (overlay) overlay.classList.toggle("hidden", !this.crtEnabled);
  }

  // ==========================================
  // ENGINE LOOP (RAF)
  // ==========================================

  run() {
    const loop = (currentTime) => {
      // Cap dt to 100ms max (prevents huge jumps after tab switch / focus return)
      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
      this.lastTime = currentTime;

      this.update(dt);
      this.render();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

// Global initialization
window.addEventListener("DOMContentLoaded", () => {
  window.game = new GameEngine();
  window.game.run();

  // Attach UI button handlers
  const startBtn = document.getElementById("startBtn");
  if (startBtn) startBtn.addEventListener("click", () => window.game.startGame());

  const restartBtn = document.getElementById("restartBtn");
  if (restartBtn) restartBtn.addEventListener("click", () => window.game.startGame());

  const resumeBtn = document.getElementById("resumeBtn");
  if (resumeBtn) resumeBtn.addEventListener("click", () => window.game.resumeGame());

  const langToggleBtn = document.getElementById("langToggleBtn");
  if (langToggleBtn) {
    langToggleBtn.addEventListener("click", () => {
      const nextLang = window.game.wordBank.lang === "id" ? "en" : "id";
      window.game.setLanguage(nextLang);
    });
  }

  const controlModeBtn = document.getElementById("controlModeBtn");
  if (controlModeBtn) {
    controlModeBtn.addEventListener("click", () => {
      const nextMode = window.game.controlMode === "auto" ? "manual" : "auto";
      window.game.setControlMode(nextMode);
    });
  }

  const crtToggleBtn = document.getElementById("crtToggleBtn");
  if (crtToggleBtn) {
    crtToggleBtn.addEventListener("click", () => window.game.toggleCrt());
  }

  const muteBtn = document.getElementById("muteBtn");
  if (muteBtn) {
    muteBtn.addEventListener("click", () => {
      const isMuted = window.soundEngine.toggleMute();
      muteBtn.textContent = isMuted ? "🔇 SUARA: MATI" : "🔊 SUARA: NYALA";
    });
  }

  const tutorialBtn = document.getElementById("tutorialBtn");
  const tutorialModal = document.getElementById("tutorialModal");
  const closeTutorialBtn = document.getElementById("closeTutorialBtn");
  if (tutorialBtn && tutorialModal) {
    tutorialBtn.addEventListener("click", () => tutorialModal.classList.remove("hidden"));
  }
  if (closeTutorialBtn && tutorialModal) {
    closeTutorialBtn.addEventListener("click", () => tutorialModal.classList.add("hidden"));
  }

  // Multiplayer Room Lobby Handlers
  const multiplayerBtn = document.getElementById("multiplayerBtn");
  const closeMultiplayerBtn = document.getElementById("closeMultiplayerBtn");
  const tabCreateRoom = document.getElementById("tabCreateRoom");
  const tabJoinRoom = document.getElementById("tabJoinRoom");
  const submitJoinRoomBtn = document.getElementById("submitJoinRoomBtn");
  const launchCoopBtn = document.getElementById("launchCoopBtn");
  const roomCodeInput = document.getElementById("roomCodeInput");

  if (multiplayerBtn) {
    multiplayerBtn.addEventListener("click", () => window.game.openMultiplayerLobby());
  }
  if (closeMultiplayerBtn) {
    closeMultiplayerBtn.addEventListener("click", () => {
      document.getElementById("multiplayerModal").classList.add("hidden");
    });
  }
  if (tabCreateRoom) {
    tabCreateRoom.addEventListener("click", () => window.game.selectMultiplayerTab("create"));
  }
  if (tabJoinRoom) {
    tabJoinRoom.addEventListener("click", () => window.game.selectMultiplayerTab("join"));
  }
  if (submitJoinRoomBtn && roomCodeInput) {
    submitJoinRoomBtn.addEventListener("click", () => {
      const code = roomCodeInput.value.trim();
      if (code) window.game.joinExistingRoom(code);
    });
  }
  if (launchCoopBtn) {
    launchCoopBtn.addEventListener("click", () => window.game.startMultiplayerGame());
  }

  // Leaderboard Modal & Submission Event Listeners
  const openLeaderboardBtn = document.getElementById("openLeaderboardBtn");
  const closeLeaderboardBtn = document.getElementById("closeLeaderboardBtn");
  const refreshLeaderboardBtn = document.getElementById("refreshLeaderboardBtn");
  const tabGlobalLeaderboard = document.getElementById("tabGlobalLeaderboard");
  const tabLocalLeaderboard = document.getElementById("tabLocalLeaderboard");
  const goViewLeaderboardBtn = document.getElementById("goViewLeaderboardBtn");
  const goSubmitScoreBtn = document.getElementById("goSubmitScoreBtn");
  const goPilotName = document.getElementById("goPilotName");
  const goSubmitStatus = document.getElementById("goSubmitStatus");

  if (openLeaderboardBtn) {
    openLeaderboardBtn.addEventListener("click", () => {
      if (window.leaderboardManager) window.leaderboardManager.openModal();
    });
  }
  if (closeLeaderboardBtn) {
    closeLeaderboardBtn.addEventListener("click", () => {
      if (window.leaderboardManager) window.leaderboardManager.closeModal();
    });
  }
  if (refreshLeaderboardBtn) {
    refreshLeaderboardBtn.addEventListener("click", () => {
      if (window.leaderboardManager) window.leaderboardManager.renderLeaderboard();
    });
  }
  if (tabGlobalLeaderboard) {
    tabGlobalLeaderboard.addEventListener("click", () => {
      tabGlobalLeaderboard.classList.add("primary");
      if (tabLocalLeaderboard) tabLocalLeaderboard.classList.remove("primary");
      if (window.leaderboardManager) window.leaderboardManager.renderLeaderboard("global");
    });
  }
  if (tabLocalLeaderboard) {
    tabLocalLeaderboard.addEventListener("click", () => {
      tabLocalLeaderboard.classList.add("primary");
      if (tabGlobalLeaderboard) tabGlobalLeaderboard.classList.remove("primary");
      if (window.leaderboardManager) window.leaderboardManager.renderLeaderboard("local");
    });
  }
  if (goViewLeaderboardBtn) {
    goViewLeaderboardBtn.addEventListener("click", () => {
      if (window.leaderboardManager) window.leaderboardManager.openModal();
    });
  }
  if (goSubmitScoreBtn) {
    goSubmitScoreBtn.addEventListener("click", async () => {
      if (!window.leaderboardManager || !window.game || !window.game.lastGameOverStats) return;
      const name = (goPilotName ? goPilotName.value : '').trim() || 'PILOT_CYBER';

      goSubmitScoreBtn.disabled = true;
      goSubmitScoreBtn.textContent = '⏳ MENGIRIM...';
      if (goSubmitStatus) goSubmitStatus.textContent = 'Menyimpan skor...';

      const entry = {
        player_name: name,
        ...window.game.lastGameOverStats
      };

      try {
        const result = await window.leaderboardManager.submitScore(entry);
        if (goSubmitStatus) {
          if (result.isOnline) {
            goSubmitStatus.textContent = '✅ Berhasil disimpan ke Supabase Cloud!';
            goSubmitStatus.style.color = '#00ff88';
          } else {
            goSubmitStatus.textContent = '💾 Tersimpan di rekor lokal (isi .env untuk Supabase)';
            goSubmitStatus.style.color = '#ffdd00';
          }
        }
        goSubmitScoreBtn.textContent = '✅ TERSIMPAN';
      } catch (err) {
        if (goSubmitStatus) {
          goSubmitStatus.textContent = '⚠️ Gagal kirim: ' + err.message;
          goSubmitStatus.style.color = '#ff3355';
        }
        goSubmitScoreBtn.disabled = false;
        goSubmitScoreBtn.textContent = '📤 COBA LAGI';
      }
    });
  }

  const hudLeaderboardPill = document.getElementById("hudLeaderboardPill");
  if (hudLeaderboardPill) {
    hudLeaderboardPill.addEventListener("click", () => {
      if (window.leaderboardManager) window.leaderboardManager.toggleModal();
    });
  }

  const pauseLeaderboardBtn = document.getElementById("pauseLeaderboardBtn");
  if (pauseLeaderboardBtn) {
    pauseLeaderboardBtn.addEventListener("click", () => {
      if (window.leaderboardManager) window.leaderboardManager.openModal();
    });
  }

  // Hotbar Skill Slot Click Handlers
  for (let i = 1; i <= 6; i++) {
    const slot = document.getElementById(`skillSlot${i}`);
    if (slot) {
      slot.addEventListener("click", () => {
        if (window.game.state === window.game.STATE_PLAYING) {
          window.game.activateSkill(`${i}`);
        }
      });
    }
  }
});
