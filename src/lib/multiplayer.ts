/**
 * Real-time Multiplayer Room & Fleet Synchronization Client
 * Supports both WebSocket Server and local BroadcastChannel fallback.
 */

export interface RemotePlayer {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  angle: number;
  shields: number;
  score: number;
  wpm: number;
  combo: number;
  isReady: boolean;
  activeSkill?: string;
}

export type NetworkMessage =
  | { type: 'JOIN_ROOM'; roomCode: string; player: RemotePlayer }
  | { type: 'PLAYER_SYNC'; player: RemotePlayer }
  | { type: 'FIRE_LASER'; fromX: number; fromY: number; toX: number; toY: number; color: string }
  | { type: 'SKILL_TRIGGERED'; skillId: string; playerName: string }
  | { type: 'ENEMY_DAMAGE'; enemyIndex: number; charIndex: number; damage: number }
  | { type: 'MISSILE_INTERCEPT'; interceptChar: string; playerName: string }
  | { type: 'CHAT'; sender: string; text: string }
  | { type: 'START_COOP_MISSION' };

export class MultiplayerClient {
  roomCode: string = '';
  localPlayer: RemotePlayer;
  remotePlayer: RemotePlayer | null = null;
  isConnected: boolean = false;
  isHost: boolean = false;

  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private syncInterval: any = null;

  onRemotePlayerJoined?: (player: RemotePlayer) => void;
  onRemotePlayerSync?: (player: RemotePlayer) => void;
  onRemoteLaser?: (laser: { fromX: number; fromY: number; toX: number; toY: number; color: string }) => void;
  onRemoteSkill?: (skillId: string, playerName: string) => void;
  onRemoteIntercept?: (char: string, playerName: string) => void;
  onGameStart?: () => void;
  onChatMessage?: (sender: string, text: string) => void;

  constructor(playerName: string = 'Pilot Alfa') {
    this.localPlayer = {
      id: Math.random().toString(36).substring(2, 9),
      name: playerName,
      color: '#00f0ff',
      x: 0,
      y: 0,
      angle: -Math.PI / 2,
      shields: 100,
      score: 0,
      wpm: 0,
      combo: 0,
      isReady: false
    };
  }

  createRoom(): string {
    const code = 'GALAXY-' + Math.floor(1000 + Math.random() * 9000);
    this.joinRoom(code, true);
    return code;
  }

  joinRoom(code: string, isHost: boolean = false) {
    this.roomCode = code.toUpperCase().trim();
    this.isHost = isHost;
    this.localPlayer.color = isHost ? '#00f0ff' : '#ff007f';
    this.localPlayer.name = isHost ? 'Pilot Alfa (Host)' : 'Pilot Beta (Co-Op)';

    // Try WebSocket connection first, fallback to BroadcastChannel
    this.initWebSocket();
    this.initBroadcastChannel();

    this.isConnected = true;
    this.startSyncLoop();
  }

  private initWebSocket() {
    try {
      const wsUrl = (typeof window !== 'undefined' && window.location.protocol === 'https:')
        ? `wss://${window.location.host}/ws`
        : `ws://${(typeof window !== 'undefined' && window.location.hostname) || 'localhost'}:3001`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.send({
          type: 'JOIN_ROOM',
          roomCode: this.roomCode,
          player: this.localPlayer
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as NetworkMessage;
          this.handleIncomingMessage(msg);
        } catch (e) {}
      };
    } catch (e) {
      console.warn("WebSocket not available, relying on BroadcastChannel", e);
    }
  }

  private initBroadcastChannel() {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    this.bc = new BroadcastChannel(`stellar_strike_${this.roomCode}`);
    this.bc.onmessage = (event) => {
      this.handleIncomingMessage(event.data);
    };

    // Announce presence to other tabs/windows
    this.bc.postMessage({
      type: 'JOIN_ROOM',
      roomCode: this.roomCode,
      player: this.localPlayer
    });
  }

  send(msg: NetworkMessage) {
    const data = JSON.stringify(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
    if (this.bc) {
      this.bc.postMessage(msg);
    }
  }

  private handleIncomingMessage(msg: NetworkMessage) {
    if (!msg) return;

    switch (msg.type) {
      case 'JOIN_ROOM':
        if (msg.player.id !== this.localPlayer.id) {
          this.remotePlayer = msg.player;
          if (this.onRemotePlayerJoined) {
            this.onRemotePlayerJoined(msg.player);
          }
          // Respond back with local player profile
          this.send({
            type: 'PLAYER_SYNC',
            player: this.localPlayer
          });
        }
        break;

      case 'PLAYER_SYNC':
        if (msg.player.id !== this.localPlayer.id) {
          this.remotePlayer = msg.player;
          if (this.onRemotePlayerSync) {
            this.onRemotePlayerSync(msg.player);
          }
        }
        break;

      case 'FIRE_LASER':
        if (this.onRemoteLaser) {
          this.onRemoteLaser(msg);
        }
        break;

      case 'SKILL_TRIGGERED':
        if (this.onRemoteSkill) {
          this.onRemoteSkill(msg.skillId, msg.playerName);
        }
        break;

      case 'MISSILE_INTERCEPT':
        if (this.onRemoteIntercept) {
          this.onRemoteIntercept(msg.interceptChar, msg.playerName);
        }
        break;

      case 'START_COOP_MISSION':
        if (this.onGameStart) {
          this.onGameStart();
        }
        break;

      case 'CHAT':
        if (this.onChatMessage) {
          this.onChatMessage(msg.sender, msg.text);
        }
        break;
    }
  }

  private startSyncLoop() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'PLAYER_SYNC',
          player: this.localPlayer
        });
      }
    }, 50); // 20 times per second
  }

  disconnect() {
    this.isConnected = false;
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.ws) this.ws.close();
    if (this.bc) this.bc.close();
    this.remotePlayer = null;
  }
}
