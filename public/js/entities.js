/**
 * Stellar Strike: Cyber Typing Interceptor
 * Entity Models: Player, Enemies (Scout, Fighter, Destroyer, Asteroid, Boss),
 * Missiles, Projectiles, Particles, and Floating HUD Popups.
 */

// Safe rounded rectangle helper
function drawRoundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

// ==========================================
// PARTICLE SYSTEM
// ==========================================
class Particle {
  constructor(x, y, vx, vy, color, size, life, decay, type = "spark") {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.decay = decay;
    this.type = type; // spark, smoke, ring, debris
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.2;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.life -= this.decay * dt * 60;
    this.angle += this.spin;

    if (this.type === "ring") {
      this.size += 8 * dt * 60;
    } else if (this.type === "smoke") {
      this.size += 0.5 * dt * 60;
      this.vx *= 0.96;
      this.vy *= 0.96;
    } else {
      this.vx *= 0.97;
      this.vy *= 0.97;
    }
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();

    if (this.type === "ring") {
      ctx.strokeStyle = this.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(1, 3 * alpha);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === "debris") {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = alpha;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Removed ctx.shadowBlur/ shadowColor (expensive Gaussian blur per particle)
      // to prevent freeze during mass explosions.
      ctx.fillStyle = this.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.5, this.size * alpha), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// Floating Text Popup (e.g. "+150 PTS", "INTERCEPTED!")
class FloatingText {
  constructor(x, y, text, color = "#00f0ff", size = 16, life = 1.0) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.vy = -1.2;
  }

  update(dt) {
    this.y += this.vy * dt * 60;
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.font = `bold ${this.size}px 'Courier New', monospace, sans-serif`;
    ctx.fillStyle = this.color;
    // Removed ctx.shadowBlur/ shadowColor (expensive per-text Gaussian blur)
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// Laser Bolt from Ship to Target
class LaserBolt {
  constructor(startX, startY, targetX, targetY, color = "#00ffff") {
    this.startX = startX;
    this.startY = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.color = color;
    this.progress = 0; // 0 to 1
    this.speed = 8.0;  // very fast burst
    this.alive = true;
  }

  update(dt) {
    this.progress += this.speed * dt * 60;
    if (this.progress >= 1) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = Math.max(0, 1 - this.progress);
    // Removed ctx.shadowBlur/ shadowColor (expensive per-laser Gaussian blur)

    ctx.beginPath();
    ctx.moveTo(this.startX, this.startY);
    ctx.lineTo(this.targetX, this.targetY);
    ctx.stroke();

    ctx.restore();
  }
}

// ==========================================
// PLAYER SHIP
// ==========================================
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.radius = 24;
    this.angle = -Math.PI / 2; // Facing Upwards
    this.targetAngle = -Math.PI / 2;

    this.shields = 100;
    this.maxShields = 100;
    this.empEnergy = 0;
    this.maxEmpEnergy = 100;

    this.invulnerableTimer = 0;
    this.exhaustTimer = 0;
    this.banking = 0; // for roll animation

    // Laser weapon hardpoints
    this.wingOffset = 20;
    this.alternateFire = false;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.angle = -Math.PI / 2;
    this.targetAngle = -Math.PI / 2;
    this.shields = 100;
    this.empEnergy = 0;
    this.invulnerableTimer = 0;
  }

  takeDamage(amount) {
    if (this.invulnerableTimer > 0) return false;
    this.shields = Math.max(0, this.shields - amount);
    this.invulnerableTimer = 1.0; // 1s iframe
    window.soundEngine.playShieldHit();
    return true;
  }

  addEmp(amount) {
    this.empEnergy = Math.min(this.maxEmpEnergy, this.empEnergy + amount);
  }

  update(dt, lockedEnemy, controlMode, mousePos) {
    // If in Manual Pilot Mode, smoothly track mouse
    if (controlMode === "manual" && mousePos) {
      this.targetX = mousePos.x;
      this.targetY = Math.max(mousePos.y, window.innerHeight * 0.45); // Don't fly into enemy spawn zone
    }

    // Smooth movement interpolation
    const lerp = 0.15;
    this.x += (this.targetX - this.x) * lerp;
    this.y += (this.targetY - this.y) * lerp;

    // Banking roll effect based on horizontal speed
    this.banking = (this.targetX - this.x) * 0.05;

    // Rotation: aim at locked enemy or face upwards
    if (lockedEnemy && !lockedEnemy.isDead) {
      this.targetAngle = Math.atan2(lockedEnemy.y - this.y, lockedEnemy.x - this.x);
    } else {
      this.targetAngle = -Math.PI / 2;
    }

    // Smooth angle interpolation — NaN guard to prevent infinite while loop
    let diff = this.targetAngle - this.angle;
    if (isNaN(diff)) diff = 0;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.angle += diff * 0.2;

    // Invulnerability decay
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }
  }

  getGunPositions() {
    // Return world positions of left and right laser wings
    const cos = Math.cos(this.angle + Math.PI / 2);
    const sin = Math.sin(this.angle + Math.PI / 2);

    const leftX = this.x - cos * this.wingOffset;
    const leftY = this.y - sin * this.wingOffset;
    const rightX = this.x + cos * this.wingOffset;
    const rightY = this.y + sin * this.wingOffset;

    return { left: { x: leftX, y: leftY }, right: { x: rightX, y: rightY } };
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2); // default ship art points up

    // Flashing when damaged/invulnerable
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // 1. Engine Plasma Flame
    const flameSize = 14 + Math.sin(Date.now() * 0.03) * 5;
    const flameGrad = ctx.createLinearGradient(0, 16, 0, 16 + flameSize);
    flameGrad.addColorStop(0, "#00ffff");
    flameGrad.addColorStop(0.5, "#0066ff");
    flameGrad.addColorStop(1, "transparent");

    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-8, 16);
    ctx.lineTo(0, 16 + flameSize);
    ctx.lineTo(8, 16);
    ctx.closePath();
    ctx.fill();

    // 2. Shield Glow Aura if shields are healthy
    if (this.shields > 25) {
      ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Futuristic Hull Geometry — removed shadowBlur/ shadowColor (expensive per-frame Gaussian blur)
    ctx.fillStyle = "#0c1527";
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2;

    ctx.beginPath();
    // Nose
    ctx.moveTo(0, -26);
    // Right wing tip
    ctx.lineTo(24, 16);
    // Right engine recess
    ctx.lineTo(12, 12);
    // Center engine block
    ctx.lineTo(0, 16);
    // Left engine recess
    ctx.lineTo(-12, 12);
    // Left wing tip
    ctx.lineTo(-24, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Cockpit Canopy — removed shadowBlur/ shadowColor
    ctx.fillStyle = "#ff007f";
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(5, -4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, -4);
    ctx.closePath();
    ctx.fill();

    // 5. Wing cannons
    ctx.strokeStyle = "#ff007f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, 12);
    ctx.lineTo(-18, -4);
    ctx.moveTo(18, 12);
    ctx.lineTo(18, -4);
    ctx.stroke();

    ctx.restore();
  }
}

// ==========================================
// ENEMY BASE & VARIANTS
// ==========================================
class Enemy {
  constructor(x, y, word, type = "scout") {
    this.x = x;
    this.y = y;
    this.word = word.toUpperCase();
    this.type = type; // scout, fighter, destroyer, asteroid, boss
    this.typedIndex = 0;
    this.isLocked = false;
    this.isDead = false;

    // Movement physics
    this.vx = 0;
    this.vy = 40; // baseline downward speed
    this.radius = 22;
    this.maxHealth = word.length;
    this.health = this.maxHealth;
    this.scoreValue = 100;
    this.empYield = 10;
    this.color = "#ffaa00";

    // Attack cooldowns
    this.attackTimer = 0;
    this.attackInterval = 4.0;

    this.initTypeAttributes();
  }

  initTypeAttributes() {
    switch (this.type) {
      case "scout":
        this.color = "#ffaa00";
        this.vy = 65 + Math.random() * 25; // fast kamikaze
        this.radius = 20;
        this.scoreValue = 80;
        this.empYield = 8;
        break;

      case "fighter":
        this.color = "#00f0ff";
        this.vy = 40 + Math.random() * 15;
        this.radius = 26;
        this.scoreValue = 150;
        this.empYield = 15;
        this.attackInterval = 3.5;
        break;

      case "destroyer":
        this.color = "#b026ff";
        this.vy = 18 + Math.random() * 10; // slow armored behemoth
        this.radius = 38;
        this.scoreValue = 350;
        this.empYield = 25;
        this.attackInterval = 3.0; // fires lettered missiles!
        break;

      case "asteroid":
        this.color = "#a0a5b5";
        this.vy = 45 + Math.random() * 30;
        this.vx = (Math.random() - 0.5) * 30;
        this.radius = 24;
        this.scoreValue = 60;
        this.empYield = 6;
        this.spin = (Math.random() - 0.5) * 0.05;
        this.rotation = Math.random() * Math.PI * 2;
        break;
    }
  }

  update(dt, player, onShootMissile) {
    this.y += this.vy * dt;
    this.x += this.vx * dt;

    if (this.type === "asteroid") {
      this.rotation += this.spin;
    }

    // Sine-wave drift for fighter
    if (this.type === "fighter") {
      this.x += Math.sin(this.y * 0.02) * 1.5;
    }

    // Periodic missile attacks (for destroyer and fighter)
    this.attackTimer += dt;
    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      if (onShootMissile && this.y > 60 && this.y < window.innerHeight * 0.6) {
        onShootMissile(this);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Draw Target Reticle if locked — removed shadowBlur/ shadowColor
    if (this.isLocked) {
      ctx.strokeStyle = "#ff0055";
      ctx.lineWidth = 2;

      // Rotating targeting brackets
      const reticleAngle = Date.now() * 0.003;
      ctx.save();
      ctx.rotate(reticleAngle);
      const r = this.radius + 12;
      ctx.beginPath();
      // 4 corner arcs
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.arc(0, 0, r, a - 0.25, a + 0.25);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Ship / Asteroid Graphic
    if (this.type === "scout") {
      this.drawScout(ctx);
    } else if (this.type === "fighter") {
      this.drawFighter(ctx);
    } else if (this.type === "destroyer") {
      this.drawDestroyer(ctx);
    } else if (this.type === "asteroid") {
      this.drawAsteroid(ctx);
    }

    ctx.restore();

    // 3. Draw Word Label Above / Below Ship
    this.drawWord(ctx);
  }

  drawScout(ctx) {
    ctx.fillStyle = "#161124";
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, 18); // Nose pointed down
    ctx.lineTo(16, -14);
    ctx.lineTo(0, -6);
    ctx.lineTo(-16, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Core light
    ctx.fillStyle = "#ffdd00";
    ctx.beginPath();
    ctx.arc(0, 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFighter(ctx) {
    ctx.fillStyle = "#0c1a2d";
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.lineTo(22, -10);
    ctx.lineTo(16, -20);
    ctx.lineTo(0, -12);
    ctx.lineTo(-16, -20);
    ctx.lineTo(-22, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wings glow
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-18, -6, 4, 8);
    ctx.strokeRect(14, -6, 4, 8);
  }

  drawDestroyer(ctx) {
    ctx.fillStyle = "#1e0b2e";
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;

    // Heavy Cruiser Diamond Hexagon
    ctx.beginPath();
    ctx.moveTo(0, 32);
    ctx.lineTo(32, 10);
    ctx.lineTo(26, -26);
    ctx.lineTo(0, -18);
    ctx.lineTo(-26, -26);
    ctx.lineTo(-32, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Heavy glowing power vents
    ctx.fillStyle = "#ff007f";
    ctx.fillRect(-14, -10, 8, 14);
    ctx.fillRect(6, -10, 8, 14);

    // Front cannon tip
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(-3, 24, 6, 8);
  }

  drawAsteroid(ctx) {
    ctx.save();
    ctx.rotate(this.rotation);
    ctx.fillStyle = "#1d202d";
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    const sides = 7;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const r = this.radius * (0.8 + ((i * 37) % 5) * 0.08);
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crater dots
    ctx.fillStyle = "#2c3144";
    ctx.beginPath();
    ctx.arc(6, -4, 4, 0, Math.PI * 2);
    ctx.arc(-8, 5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawWord(ctx) {
    ctx.save();
    const wordY = this.y - this.radius - 16;
    ctx.font = "bold 15px 'Courier New', monospace, sans-serif";
    ctx.textAlign = "center";

    const typedPart = this.word.substring(0, this.typedIndex);
    const nextChar = this.word.charAt(this.typedIndex);
    const remainPart = this.word.substring(this.typedIndex + 1);

    // Background pill for contrast against stars
    const fullTextWidth = ctx.measureText(this.word).width;
    ctx.fillStyle = "rgba(10, 14, 26, 0.85)";
    ctx.strokeStyle = this.isLocked ? "#ff0055" : "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    drawRoundRect(ctx, this.x - fullTextWidth / 2 - 8, wordY - 14, fullTextWidth + 16, 20, 4);
    ctx.fill();
    ctx.stroke();

    // Measure widths to position character segments cleanly
    const typedWidth = ctx.measureText(typedPart).width;
    const nextWidth = ctx.measureText(nextChar).width;
    const startX = this.x - fullTextWidth / 2;

    ctx.textAlign = "left";

    // 1. Typed Characters (Cyan/Green - Completed) — removed shadowBlur/ shadowColor
    if (typedPart) {
      ctx.fillStyle = "#00ff88";
      ctx.fillText(typedPart, startX, wordY);
    }

    // 2. Next Key to Type (Flashing Gold/Magenta) — removed shadowBlur/ shadowColor
    if (nextChar) {
      ctx.fillStyle = this.isLocked ? "#ff0055" : "#ffdd00";
      ctx.fillText(nextChar, startX + typedWidth, wordY);
    }

    // 3. Remaining Characters (Muted Silver)
    if (remainPart) {
      ctx.fillStyle = "#8a99ad";
      ctx.shadowBlur = 0;
      ctx.fillText(remainPart, startX + typedWidth + nextWidth, wordY);
    }

    ctx.restore();
  }
}

// ==========================================
// POINT-DEFENSE INTERCEPTION MISSILE
// ==========================================
class InterceptMissile {
  constructor(x, y, interceptChar, targetX, targetY) {
    this.x = x;
    this.y = y;
    this.interceptChar = interceptChar.toUpperCase();
    this.targetX = targetX;
    this.targetY = targetY;

    // Movement angle towards player
    const angle = Math.atan2(targetY - y, targetX - x);
    this.speed = 110;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.angle = angle;

    this.radius = 14;
    this.isDead = false;
    this.trailTimer = 0;
  }

  update(dt, player) {
    // Gentle homing drift — NaN guard to prevent infinite while loop
    const currentAngle = Math.atan2(player.y - this.y, player.x - this.x);
    let diff = currentAngle - this.angle;
    if (isNaN(diff)) diff = 0;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.angle += diff * 0.04;

    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Glowing warning diamond — removed shadowBlur/ shadowColor
    const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.15;
    ctx.strokeStyle = "#ff0044";
    ctx.fillStyle = "rgba(40, 0, 10, 0.9)";
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(0, -18 * pulse);
    ctx.lineTo(18 * pulse, 0);
    ctx.lineTo(0, 18 * pulse);
    ctx.lineTo(-18 * pulse, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Intercept Character inside
    ctx.font = "bold 16px 'Courier New', monospace, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ff0055";
    ctx.shadowBlur = 8;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.interceptChar, 0, 1);

    ctx.restore();
  }
}

// ==========================================
// BOSS: OMEGA DREADNOUGHT
// ==========================================
class Boss {
  constructor(x, y, bossPhrase, wordBank) {
    this.x = x;
    this.y = -120; // spawns from above top screen
    this.targetY = 120; // descends to upper arena
    this.bossPhrase = bossPhrase.toUpperCase();
    this.wordBank = wordBank;

    this.type = "boss";
    this.typedIndex = 0;
    this.isLocked = false;
    this.isDead = false;

    this.radius = 80;
    this.width = 280;
    this.height = 100;

    // Turret Sub-units
    this.turrets = [
      {
        id: "turretLeft",
        relX: -100,
        relY: 30,
        word: wordBank.getWord("medium", []),
        typedIndex: 0,
        isDead: false,
        isLocked: false
      },
      {
        id: "turretRight",
        relX: 100,
        relY: 30,
        word: wordBank.getWord("medium", []),
        typedIndex: 0,
        isDead: false,
        isLocked: false
      }
    ];

    this.shieldActive = true; // Core is invulnerable until turrets fall
    this.megaBeamCharge = 0;  // 0 to 100%
    this.missileTimer = 0;
    this.maxHealth = this.bossPhrase.length;
    this.health = this.maxHealth;
    this.scoreValue = 3000;
  }

  update(dt, onShootMissile) {
    // Entrance descent
    if (this.y < this.targetY) {
      this.y += 35 * dt;
    } else {
      // Gentle horizontal hovering
      this.x = window.innerWidth / 2 + Math.sin(Date.now() * 0.001) * 80;
    }

    // Check if turrets are destroyed
    const livingTurrets = this.turrets.filter(t => !t.isDead);
    this.shieldActive = livingTurrets.length > 0;

    // If turrets are active, shoot missiles periodically
    if (this.shieldActive) {
      this.missileTimer += dt;
      if (this.missileTimer >= 2.5 && onShootMissile) {
        this.missileTimer = 0;
        livingTurrets.forEach(turret => {
          onShootMissile({
            x: this.x + turret.relX,
            y: this.y + turret.relY
          });
        });
      }
    } else {
      // Core vulnerable: Mega-Beam Charges!
      this.megaBeamCharge += 10 * dt; // 10 seconds to type phrase
      if (this.megaBeamCharge >= 100) {
        // Fires mega beam hazard!
        this.megaBeamCharge = 0;
        window.soundEngine.playWarning();
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Boss Flagship Geometry
    ctx.fillStyle = "#120824";
    ctx.strokeStyle = "#ff007f";
    ctx.shadowColor = "#ff007f";
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(0, 50);
    ctx.lineTo(70, 30);
    ctx.lineTo(140, 10);
    ctx.lineTo(120, -40);
    ctx.lineTo(40, -30);
    ctx.lineTo(0, -45);
    ctx.lineTo(-40, -30);
    ctx.lineTo(-120, -40);
    ctx.lineTo(-140, 10);
    ctx.lineTo(-70, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Core Sphere
    ctx.fillStyle = this.shieldActive ? "#00ffff" : "#ff0055";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 5, 24, 0, Math.PI * 2);
    ctx.fill();

    // Core Forcefield rings if shield is active
    if (this.shieldActive) {
      ctx.strokeStyle = "rgba(0, 255, 255, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 5, 32 + Math.sin(Date.now() * 0.005) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Draw Turret pods
    this.turrets.forEach(turret => {
      if (!turret.isDead) {
        ctx.save();
        ctx.translate(turret.relX, turret.relY);

        ctx.fillStyle = "#220d3a";
        ctx.strokeStyle = turret.isLocked ? "#ff0055" : "#ffaa00";
        // Removed shadowBlur/ shadowColor (expensive per-turret Gaussian blur)
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffaa00";
        ctx.fillRect(-3, 10, 6, 12); // Turret barrel
        ctx.restore();
      }
    });

    ctx.restore();

    // 4. Render Turret Words
    this.turrets.forEach(turret => {
      if (!turret.isDead) {
        this.drawTurretWord(ctx, turret);
      }
    });

    // 5. Render Core Phrase (if turrets are down)
    if (!this.shieldActive) {
      this.drawCorePhrase(ctx);
    }
  }

  drawTurretWord(ctx, turret) {
    const wx = this.x + turret.relX;
    const wy = this.y + turret.relY + 36;
    ctx.save();
    ctx.font = "bold 14px 'Courier New', monospace, sans-serif";
    ctx.textAlign = "center";

    const fullWidth = ctx.measureText(turret.word).width;
    ctx.fillStyle = "rgba(10, 14, 26, 0.9)";
    ctx.strokeStyle = turret.isLocked ? "#ff0055" : "#ffaa00";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    drawRoundRect(ctx, wx - fullWidth / 2 - 6, wy - 14, fullWidth + 12, 18, 4);
    ctx.fill();
    ctx.stroke();

    const typedPart = turret.word.substring(0, turret.typedIndex);
    const nextChar = turret.word.charAt(turret.typedIndex);
    const remainPart = turret.word.substring(turret.typedIndex + 1);

    const typedWidth = ctx.measureText(typedPart).width;
    const nextWidth = ctx.measureText(nextChar).width;
    const startX = wx - fullWidth / 2;

    ctx.textAlign = "left";
    if (typedPart) {
      ctx.fillStyle = "#00ff88";
      ctx.fillText(typedPart, startX, wy);
    }
    if (nextChar) {
      ctx.fillStyle = turret.isLocked ? "#ff0055" : "#ffdd00";
      ctx.fillText(nextChar, startX + typedWidth, wy);
    }
    if (remainPart) {
      ctx.fillStyle = "#8a99ad";
      ctx.fillText(remainPart, startX + typedWidth + nextWidth, wy);
    }

    ctx.restore();
  }

  drawCorePhrase(ctx) {
    const wx = this.x;
    const wy = this.y + 70;
    ctx.save();
    ctx.font = "bold 16px 'Courier New', monospace, sans-serif";
    ctx.textAlign = "center";

    const fullWidth = ctx.measureText(this.bossPhrase).width;
    ctx.fillStyle = "rgba(20, 0, 10, 0.95)";
    ctx.strokeStyle = "#ff0055";
    ctx.lineWidth = 2;
    ctx.beginPath();
    drawRoundRect(ctx, wx - fullWidth / 2 - 12, wy - 16, fullWidth + 24, 24, 6);
    ctx.fill();
    ctx.stroke();

    const typedPart = this.bossPhrase.substring(0, this.typedIndex);
    const nextChar = this.bossPhrase.charAt(this.typedIndex);
    const remainPart = this.bossPhrase.substring(this.typedIndex + 1);

    const typedWidth = ctx.measureText(typedPart).width;
    const nextWidth = ctx.measureText(nextChar).width;
    const startX = wx - fullWidth / 2;

    ctx.textAlign = "left";
    if (typedPart) {
      ctx.fillStyle = "#00ff88";
      // Removed shadowBlur/ shadowColor (expensive per-enemy text blur)
      ctx.fillText(typedPart, startX, wy);
    }
    if (nextChar) {
      ctx.fillStyle = "#ff0055";
      // Removed shadowBlur/ shadowColor (expensive per-enemy text blur)
      ctx.fillText(nextChar, startX + typedWidth, wy);
    }
    if (remainPart) {
      ctx.fillStyle = "#ffffff";
      ctx.fillText(remainPart, startX + typedWidth + nextWidth, wy);
    }

    ctx.restore();
  }
}

// ==========================================
// TACTICAL POWER-UP BEACON
// ==========================================
class PowerUp {
  constructor(x, y, type, letter) {
    this.x = x;
    this.y = y;
    this.type = type; // shield, chrono, triple, nuke
    this.letter = letter.toUpperCase();
    this.vy = 38;
    this.radius = 18;
    this.isDead = false;
    this.pulse = Math.random() * Math.PI * 2;
    this.spin = 0;

    switch (this.type) {
      case "shield":
        this.color = "#00ff88";
        this.label = "SHIELD +30%";
        break;
      case "chrono":
        this.color = "#b026ff";
        this.label = "CHRONO WARP";
        break;
      case "triple":
        this.color = "#ffdd00";
        this.label = "TRIPLE LASER";
        break;
      case "nuke":
        this.color = "#ff0055";
        this.label = "SMART NUKE";
        break;
      default:
        this.color = "#00f0ff";
        this.label = "ENERGY CORE";
    }
  }

  update(dt) {
    this.y += this.vy * dt;
    this.pulse += dt * 4;
    this.spin += dt * 1.5;

    if (this.y > window.innerHeight + 50) {
      this.isDead = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const glow = 1 + Math.sin(this.pulse) * 0.18;

    // 1. Outer Hexagonal Aura — removed shadowBlur/ shadowColor (expensive per-powerup blur)
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.fillStyle = "rgba(10, 20, 35, 0.85)";

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + this.spin;
      const r = this.radius * glow;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Letter to Type — removed shadowBlur/ shadowColor
    ctx.font = "bold 15px 'Courier New', monospace, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.letter, 0, 1);

    ctx.restore();

    // 3. Small label underneath — removed shadowBlur/ shadowColor
    ctx.save();
    ctx.font = "bold 10px 'Share Tech Mono', monospace, sans-serif";
    ctx.fillStyle = this.color;
    ctx.textAlign = "center";
    ctx.fillText(this.label, this.x, this.y + this.radius + 14);
    ctx.restore();
  }
}
