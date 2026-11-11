/**
 * Stellar Strike: Cyber Typing Interceptor
 * Score-Unlocked Special Skills System
 */

const SKILLS_CONFIG = [
  {
    id: 'nova',
    name: 'Plasma Nova',
    subtitle: 'Tembakan Penembus Lurus',
    description: 'Menembakkan berkas laser plasma raksasa yang menembus dan meledakkan seluruh musuh di jalur lurus!',
    type: 'special_shot',
    scoreRequired: 1000,
    hotkey: '1',
    cooldown: 8,
    currentCooldown: 0,
    icon: '💥',
    color: '#00f0ff',
    isUnlocked: false
  },
  {
    id: 'drone',
    name: 'Orbital Drone',
    subtitle: 'Drone Pertahanan Otonom',
    description: 'Memanggil drone otonom yang mengitari pesawat selama 15 detik, otomatis menembak jatuh rudal musuh!',
    type: 'utility',
    scoreRequired: 2500,
    hotkey: '2',
    cooldown: 20,
    currentCooldown: 0,
    duration: 15,
    activeTimeRemaining: 0,
    icon: '🛸',
    color: '#00ff88',
    isUnlocked: false
  },
  {
    id: 'chrono',
    name: 'Chrono Stasis',
    subtitle: 'Distorsi Waktu Gerak Lambat',
    description: 'Memperlambat armada musuh dan rudal sebesar 70% selama 6 detik. Beri ruang mengetik kata sulit dengan tenang!',
    type: 'utility',
    scoreRequired: 5000,
    hotkey: '3',
    cooldown: 25,
    currentCooldown: 0,
    duration: 6,
    activeTimeRemaining: 0,
    icon: '⏱️',
    color: '#b026ff',
    isUnlocked: false
  },
  {
    id: 'spread',
    name: 'Multi-Vector Spread',
    subtitle: 'Tembakan 5 Berkas Menyebar',
    description: 'Mengubah tembakan menjadi 5 berkas menyebar selama 10 detik, menyapu seluruh asteroid dan formasi drone!',
    type: 'buff',
    scoreRequired: 8500,
    hotkey: '4',
    cooldown: 30,
    currentCooldown: 0,
    duration: 10,
    activeTimeRemaining: 0,
    icon: '⚡',
    color: '#ffdd00',
    isUnlocked: false
  },
  {
    id: 'repair',
    name: 'Nanite Shield Repair',
    subtitle: 'Regenerasi Perisai Darurat',
    description: 'Melepaskan nanobot cerdas yang langsung memulihkan +50% integritas perisai armada!',
    type: 'utility',
    scoreRequired: 13000,
    hotkey: '5',
    cooldown: 35,
    currentCooldown: 0,
    icon: '🛡️',
    color: '#00e5ff',
    isUnlocked: false
  },
  {
    id: 'supernova',
    name: 'Supernova Annihilator',
    subtitle: 'Ledakan Nuklir Layar Penuh',
    description: 'Ultimate: Ledakan bintang kosmik yang melenyapkan seluruh armada musuh seketika dan merusak 50% HP Bos!',
    type: 'ultimate',
    scoreRequired: 20000,
    hotkey: '6',
    cooldown: 45,
    currentCooldown: 0,
    icon: '🌌',
    color: '#ff0055',
    isUnlocked: false
  }
];

class SkillManager {
  constructor() {
    this.skills = JSON.parse(JSON.stringify(SKILLS_CONFIG));
    this.onSkillUnlocked = null;
    this.onSkillActivated = null;
  }

  reset() {
    this.skills = JSON.parse(JSON.stringify(SKILLS_CONFIG));
  }

  update(dt, currentScore) {
    for (const skill of this.skills) {
      // Check score unlock
      if (!skill.isUnlocked && currentScore >= skill.scoreRequired) {
        skill.isUnlocked = true;
        if (this.onSkillUnlocked) {
          this.onSkillUnlocked(skill);
        }
      }

      // Cooldown timer decay
      if (skill.currentCooldown > 0) {
        skill.currentCooldown = Math.max(0, skill.currentCooldown - dt);
      }

      // Buff duration decay
      if (skill.activeTimeRemaining && skill.activeTimeRemaining > 0) {
        skill.activeTimeRemaining = Math.max(0, skill.activeTimeRemaining - dt);
      }
    }
  }

  getNextLockedSkill(currentScore) {
    const locked = this.skills.filter(s => !s.isUnlocked);
    if (locked.length === 0) return null;
    locked.sort((a, b) => a.scoreRequired - b.scoreRequired);
    return locked[0];
  }

  activateSkill(hotkey) {
    const skill = this.skills.find(s => s.hotkey === hotkey);
    if (!skill) return null;
    if (!skill.isUnlocked) return { status: 'LOCKED', skill };
    if (skill.currentCooldown > 0) return { status: 'COOLDOWN', skill };

    skill.currentCooldown = skill.cooldown;
    if (skill.duration) {
      skill.activeTimeRemaining = skill.duration;
    }

    if (this.onSkillActivated) {
      this.onSkillActivated(skill);
    }
    return { status: 'SUCCESS', skill };
  }
}

window.skillManager = new SkillManager();
