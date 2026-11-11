/**
 * Stellar Strike: Cyber Typing Interceptor
 * Word Dictionaries (Indonesian & English)
 * Organized by difficulty tiers and boss battle phrases.
 */

const WORD_DATABASE = {
  id: {
    // Tier 1: Kata pendek (3 - 4 huruf) - Untuk Scout Drone & Asteroid cepat
    easy: [
      "api", "air", "gas", "ion", "jet", "kru", "luz", "pos", "rel", "rok",
      "van", "zat", "arah", "awan", "bumi", "baja", "batu", "baut", "chip", "debu",
      "ener", "fusi", "gaya", "hulu", "inti", "jarak", "kaca", "kece", "kilo", "kode",
      "laju", "lensa", "list", "luas", "masa", "mega", "meta", "misi", "modo", "nada",
      "nano", "neon", "nukl", "orbit", "peta", "pipa", "plot", "poin", "pola", "pulsa",
      "puro", "radar", "radi", "rute", "sains", "sinar", "sirk", "suar", "suhu", "tank",
      "tata", "titik", "tuas", "turun", "unit", "visi", "volt", "zona", "warp", "bita",
      "chip", "data", "fase", "fasa", "grid", "hawa", "iklim", "kabel", "laba", "mini"
    ],

    // Tier 2: Kata sedang (5 - 7 huruf) - Untuk Fighter Interceptor & Hazard
    medium: [
      "armada", "astral", "atomik", "baterai", "cahaya", "celcius", "corong", "dinamo",
      "domain", "elektron", "frekuensi", "galaksi", "gravitasi", "haluan", "hologram", "impuls",
      "induksi", "inframerah", "isolasi", "jupiter", "kapsul", "komet", "kompas", "koneksi",
      "korona", "kosmik", "kosmonot", "kuantum", "landasan", "lapisan", "laserik", "lintas",
      "magnet", "mariner", "mekanik", "meteor", "modulasi", "monolit", "nebula", "neutron",
      "nuklir", "oksigen", "optikal", "partikel", "peluru", "pemancar", "penjelajah", "perisai",
      "piring", "plasma", "polaris", "propulsi", "proton", "radiasi", "reaktor", "refleks",
      "roketik", "satelit", "sektor", "sensor", "silinder", "sintesis", "sistem", "solaria",
      "spektrum", "stasiun", "subatom", "terminal", "teropong", "torpedo", "turbin", "vektor",
      "ventilasi", "vorteks", "wahana", "zenit", "anomali", "angkasa", "atmosfir", "detektor",
      "navigasi", "manuver", "kemudi", "kinetik", "pembakar", "rekayasa", "simulasi", "antena"
    ],

    // Tier 3: Kata panjang & teknis (8 - 12 huruf) - Untuk Heavy Destroyer
    hard: [
      "antariksa", "astronomi", "elektromagnetik", "eksoplanet", "gravitasional",
      "helisferik", "hiperdimensi", "interferometer", "interstelar", "karbonisasi",
      "kecepatan", "komunikasi", "konstelasi", "kronologis", "makrokosmos",
      "megastruktur", "mikroprosesor", "nanoteknologi", "observatorium", "paralaksis",
      "pembelokan", "pemindaian", "penghancur", "perjalanan", "petualangan",
      "rekristalisasi", "relativitas", "retropropulsi", "sekuensial", "sinkronisasi",
      "spektroskopi", "superkonduktor", "supermasif", "supernova", "telemetri",
      "teleportasi", "termonuklir", "transformasi", "transmiter", "triangulasi",
      "ultraungu", "universalis", "virtualitas", "propulsif", "stabilisator",
      "kristalisasi", "fotosintesis", "stratifikasi", "termalmeter", "bioluminesensi"
    ],

    // Tier 4: Boss phrases - Kalimat taktis multi-kata
    bossPhrases: [
      "PROTOKOL PENGHANCUR",
      "REAKTOR INTI OVERLOAD",
      "PERISAI KUANTUM AKTIF",
      "MERIAM HIPERPLASMA",
      "SERANGAN GELOMBANG ION",
      "DARURAT ANOMALI RUANG",
      "MATRIKS PERTAHANAN RUSAK",
      "SIKLUS REGENERASI MESIN",
      "TURBIN DAYA MAKSIMAL",
      "PANCARAN SINAR GAMMA"
    ]
  },

  en: {
    // Tier 1: Short words (3 - 4 chars)
    easy: [
      "aim", "air", "arc", "arm", "axe", "bay", "beam", "bolt", "burn", "core",
      "dash", "data", "dock", "drag", "drop", "dust", "echo", "edge", "emit", "fast",
      "fire", "flux", "fuel", "fuse", "gear", "glow", "grid", "halo", "hull", "heat",
      "helm", "hold", "host", "hull", "hype", "icon", "iron", "jump", "keen", "kill",
      "laser", "lens", "lock", "loop", "mark", "mars", "mask", "mass", "mesh`", "moon",
      "nano", "neon", "node", "nova", "null", "orbit", "pack", "path", "ping", "pipe",
      "plan", "plug", "pods", "port", "prop", "puls", "pyro", "quad", "raid", "rank",
      "ray", "ring", "roam", "scan", "ship", "shot", "skip", "slot", "solar", "spark",
      "spin", "star", "tank", "thrust", "time", "unit", "vent", "void", "volt", "warp",
      "wave", "wing", "wire", "zero", "zone"
    ],

    // Tier 2: Medium words (5 - 7 chars)
    medium: [
      "aerospace", "android", "antares", "apollon", "armored", "arsenal", "asteroid",
      "barrier", "battler", "beacon", "blaster", "booster", "cannon", "capsule", "carrier",
      "circuit", "cluster", "command", "comets", "condor", "corridor", "cruiser", "cyber",
      "decoders", "defense", "destroy", "disrupt", "drones", "dynamos", "eclipse", "engines",
      "fighters", "fission", "flanker", "fractal", "galaxies", "gateway", "gravity", "hangar",
      "hazard", "helmets", "holonet", "horizon", "igniter", "impact", "impulse", "infantry",
      "invader", "ionizer", "jupiter", "kinetic", "lasers", "launch", "matrix", "meteors",
      "missile", "modules", "monolith", "nebula", "neutron", "nuclear", "orbital", "outpost",
      "payload", "photons", "physics", "pilots", "plasma", "pulsar", "quantum", "radars",
      "radiant", "raptors", "reactor", "rockets", "satellite", "shields", "shuttle", "silicon",
      "specter", "starship", "stealth", "thruster", "torpedo", "tracker", "transit", "turbine",
      "vector", "velocity", "vortex", "warfare", "warping", "weapons", "zenith"
    ],

    // Tier 3: Hard words (8 - 12 chars)
    hard: [
      "accelerator", "annihilation", "antimatter", "astrophysics", "biohazard",
      "blackholes", "centrifugal", "chronosphere", "combustion", "constellation",
      "cosmonautic", "counterfire", "cybernetics", "destruction", "electromagnetic",
      "equilibrium", "exoplanetary", "gravitational", "hyperdrive", "infiltrator",
      "interceptor", "interstellar", "invulnerable", "luminescence", "macrocosm",
      "megastructure", "nanomaterial", "navigation", "neutralizer", "obliteration",
      "overcharged", "particlebeam", "reconnaissance", "relativity", "retrograde",
      "singularity", "spectroscopy", "stratosphere", "superconduct", "supermassive",
      "teleportation", "thermonuclear", "trajectory", "transponder", "ultraviolet",
      "vulnerability", "warpvelocity", "xenomorphs", "crystallize", "synchronize"
    ],

    // Tier 4: Boss phrases
    bossPhrases: [
      "DEATH STAR OVERDRIVE",
      "HYPERION LASER CHARGING",
      "QUANTUM CORE OVERLOAD",
      "ARMADA ASSAULT PROTOCOL",
      "DIMENSIONAL RIFT DETECTED",
      "VOID MATRIX PURGE",
      "OMEGA BLASTER CANNON",
      "STEALTH SQUADRON DEPLOYED",
      "MASSIVE ENERGY SURGE",
      "TITAN CLASS DREADNOUGHT"
    ]
  }
};

/**
 * Single-character pool for point-defense missile interception.
 * Focused on accessible home row, top row, and common keys.
 */
const INTERCEPT_KEYS = [
  "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P",
  "A", "S", "D", "F", "G", "H", "J", "K", "L",
  "Z", "X", "C", "V", "B", "N", "M"
];

/**
 * Word Provider Helper
 */
class WordBank {
  constructor(lang = "id") {
    this.lang = lang;
    this.usedWords = new Set();
  }

  setLanguage(lang) {
    if (WORD_DATABASE[lang]) {
      this.lang = lang;
      this.usedWords.clear();
    }
  }

  /**
   * Get a random word for an enemy based on difficulty tier.
   * Avoids repeating words currently active on screen.
   * @param {string} tier - 'easy', 'medium', or 'hard'
   * @param {Array<string>} activeWords - words currently on screen
   * @param {string} excludePrefix - avoid words starting with this letter (for unique target lock)
   */
  getWord(tier = "easy", activeWords = [], excludePrefix = null) {
    const list = WORD_DATABASE[this.lang][tier] || WORD_DATABASE[this.lang].easy;
    const activeSet = new Set(activeWords.map(w => w.toUpperCase()));
    
    // Filter candidates
    let candidates = list.filter(w => {
      const upper = w.toUpperCase();
      if (activeSet.has(upper)) return false;
      if (excludePrefix && upper.startsWith(excludePrefix.toUpperCase())) return false;
      return true;
    });

    if (candidates.length === 0) {
      candidates = list; // fallback
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    return chosen.toUpperCase();
  }

  /**
   * Get a boss phrase
   */
  getBossPhrase() {
    const list = WORD_DATABASE[this.lang].bossPhrases;
    return list[Math.floor(Math.random() * list.length)];
  }

  /**
   * Get an interception character for incoming missiles
   */
  getInterceptKey(activeKeys = []) {
    const activeSet = new Set(activeKeys);
    const available = INTERCEPT_KEYS.filter(k => !activeSet.has(k));
    if (available.length === 0) return INTERCEPT_KEYS[Math.floor(Math.random() * INTERCEPT_KEYS.length)];
    return available[Math.floor(Math.random() * available.length)];
  }
}
