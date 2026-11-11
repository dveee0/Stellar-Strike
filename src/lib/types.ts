/**
 * Type definitions for Stellar Strike Next.js
 */

export type SkillType = 'special_shot' | 'utility' | 'buff' | 'ultimate';

export interface Skill {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  type: SkillType;
  scoreRequired: number;
  hotkey: string;       // e.g. "1", "2", "3", "4", "5", "6"
  cooldown: number;     // seconds
  currentCooldown: number;
  duration?: number;    // active duration for temporary buffs
  activeTimeRemaining?: number;
  isUnlocked: boolean;
  icon: string;
  color: string;
}

export interface PlayerStats {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  shields: number;
  maxShields: number;
  empEnergy: number;
  maxEmpEnergy: number;
  angle: number;
  tripleShotActive: boolean;
  orbitalDroneActive: boolean;
  droneAngle: number;
}

export interface GameMetrics {
  score: number;
  wave: number;
  combo: number;
  maxCombo: number;
  wpm: number;
  accuracy: number;
  totalCorrectChars: number;
  totalErrors: number;
  wordsDefeated: number;
}

export type FlightMode = 'auto' | 'manual';
export type Language = 'id' | 'en';
export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';
