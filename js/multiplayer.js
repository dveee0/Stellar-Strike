/**
 * Stellar Strike: Cyber Typing Interceptor
 * Client-side Real-time Multiplayer (Room Codes & Fleet Co-Op)
 * Automatically connects to Node.js server or BroadcastChannel fallback.
 */

class MultiplayerClient {
  constructor(playerName = 'Pilot Alfa') {
    this.roomCode = '';
    this.isHost = false;
    this.isConnected = false;

    this.localPlayer = {
      id: Math.random().toString(36).substring(2, 9),
      name: playerName,
      color: '#00f0ff',
      x: window.innerWidth / 2 - 80,
      y: window.innerHeight - 90,
      angle: -Math.PI / 2,
      shields: 100,
      score: 0,
      wpm: 0,
      combo: 0,
      isReady: true
    };

    this.remotePlayer = null;
    this.ws = null;
    this.bc = null;
    this.syncInterval = null;

    // Event hooks
    this.onRemotePlayerJoined = null;
    this.onRemotePlayerLeft = null;
    this.onRemotePlayerSync = null;
    this.onRemoteLaser = null;
    this.onRemoteSkill = null;
    this.onRemoteIntercept = null;
    this.onGameStart = null;
  }

  generateRoomCode() {
    const prefixes = ["GALAXY", "CYBER", "ASTRO", "TITAN", "INTERCEPT", "VECTOR"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${num}`;
  }

  createRoom() {
    const code = this.generateRoomCode();
    this.joinRoom(code, true);
    return code;
  }

  joinRoom(code, isHost = false) {
    this.roomCode = code.toUpperCase().trim();
    this.isHost = isHost;
    this.localPlayer.color = isHost ? '#00f0ff' : '#ff007f';
    this.localPlayer.name = isHost ? 'Pilot Alfa (Host)' : 'Pilot Beta (Co-Op)';

    this.initWebSocket();
    this.initBroadcastChannel();

    this.isConnected = true;
    this.startSyncLoop();
  }

  initWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      const port = window.location.port || '3001';
      const wsUrl = `${protocol}//${host}:${port}`;

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
          const msg = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch (e) {}
      };

      this.ws.onerror = () => {
        // BroadcastChannel will seamlessly handle local play
      };
    } catch (e) {
      console.warn("WebSocket fallback to BroadcastChannel", e);
    }
  }

  initBroadcastChannel() {
    if (!('BroadcastChannel' in window)) return;
    try {
      this.bc = new BroadcastChannel(`stellar_strike_${this.roomCode}`);
      this.bc.onmessage = (event) => {
        this.handleIncomingMessage(event.data);
      };

      // Announce arrival to other open browser windows
      setTimeout(() => {
        this.send({
          type: 'JOIN_ROOM',
          roomCode: this.roomCode,
          player: this.localPlayer
        });
      }, 100);
    } catch (e) {}
  }

  send(msg) {
    const data = JSON.stringify(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
    if (this.bc) {
      this.bc.postMessage(msg);
    }
  }

  handleIncomingMessage(msg) {
    if (!msg) return;

    switch (msg.type) {
      case 'JOIN_ROOM':
        if (msg.player && msg.player.id !== this.localPlayer.id) {
          this.remotePlayer = msg.player;
          if (this.onRemotePlayerJoined) {
            this.onRemotePlayerJoined(msg.player);
          }
          // Reply with local player info
          this.send({
            type: 'PLAYER_SYNC',
            player: this.localPlayer
          });
        }
        break;

      case 'PLAYER_SYNC':
        if (msg.player && msg.player.id !== this.localPlayer.id) {
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
    }
  }

  startSyncLoop() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'PLAYER_SYNC',
          player: this.localPlayer
        });
      }
    }, 45); // ~22 updates/sec
  }

  disconnect() {
    this.isConnected = false;
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.ws) this.ws.close();
    if (this.bc) this.bc.close();
    this.remotePlayer = null;
  }
}

window.multiplayerClient = new MultiplayerClient();
