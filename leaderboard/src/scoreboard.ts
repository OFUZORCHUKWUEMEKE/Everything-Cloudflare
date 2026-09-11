export interface PlayerScore {
  playerId: string;
  playerName: string;
  score: number;
  timestamp: number;
  rank?: number;
}

export interface UserProfile {
  playerId: string;
  playerName: string;
  avatar?: string;
  bio?: string;
  joinedAt: number;
  totalScore: number;
  gamesPlayed: number;
  highestScore: number;
  achievements: string[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  requirement: number;
}

export interface LeaderboardState {
  scores: Map<string, PlayerScore>;
  profiles: Map<string, UserProfile>;
  achievements: Map<string, Achievement>;
  version: number;
}

export class ScoreBoard {
  state: DurableObjectState;
  env: any;
  scores: Map<string, PlayerScore>;
  profiles: Map<string, UserProfile>;
  achievements: Map<string, Achievement>;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    this.scores = new Map();
    this.profiles = new Map();
    this.achievements = new Map();
  }

  async initialize() {
    const storedScores = await this.state.storage?.get<string>('scores');
    const storedProfiles = await this.state.storage?.get<string>('profiles');
    const storedAchievements = await this.state.storage?.get<string>('achievements');

    if (storedScores) {
      this.scores = new Map(Object.entries(JSON.parse(storedScores)));
    }
    if (storedProfiles) {
      this.profiles = new Map(Object.entries(JSON.parse(storedProfiles)));
    }
    if (storedAchievements) {
      this.achievements = new Map(Object.entries(JSON.parse(storedAchievements)));
    }
  }

  // ==================== PUBLIC RPC METHODS ====================
  // These can be called directly from Workers via Class RPC

  async addScore(playerId: string, playerName: string, points: number): Promise<PlayerScore> {
    const existing = this.scores.get(playerId);
    const newScore = existing ? existing.score + points : points;

    const playerScore: PlayerScore = {
      playerId,
      playerName,
      score: newScore,
      timestamp: Date.now(),
    };

    this.scores.set(playerId, playerScore);

    if (!this.profiles.has(playerId)) {
      this.profiles.set(playerId, {
        playerId,
        playerName,
        joinedAt: Date.now(),
        totalScore: newScore,
        gamesPlayed: 1,
        highestScore: points,
        achievements: [],
      });
    } else {
      const profile = this.profiles.get(playerId)!;
      profile.totalScore = newScore;
      profile.gamesPlayed += 1;
      profile.highestScore = Math.max(profile.highestScore, points);
      profile.playerName = playerName;
    }

    await this.checkAchievements(playerId);
    await this.persistData();

    return playerScore;
  }

  async getTopPlayers(limit: number = 10): Promise<PlayerScore[]> {
    const sorted = Array.from(this.scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return sorted.map((score, index) => ({
      ...score,
      rank: index + 1,
    }));
  }

  async getPlayerStats(playerId: string): Promise<PlayerScore | null> {
    const player = this.scores.get(playerId);
    if (!player) return null;

    const sorted = Array.from(this.scores.values())
      .sort((a, b) => b.score - a.score);

    const rank = sorted.findIndex(p => p.playerId === playerId) + 1;

    return {
      ...player,
      rank,
    };
  }

  async getUserProfile(playerId: string): Promise<UserProfile | null> {
    return this.profiles.get(playerId) || null;
  }

  async updateUserProfile(playerId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const profile = this.profiles.get(playerId);
    if (!profile) return null;

    const updated = { ...profile, ...updates, playerId };
    this.profiles.set(playerId, updated);
    await this.persistData();
    return updated;
  }

  async getAllPlayers(): Promise<PlayerScore[]> {
    return Array.from(this.scores.values())
      .sort((a, b) => b.score - a.score)
      .map((score, index) => ({
        ...score,
        rank: index + 1,
      }));
  }

  async getPlayerAchievements(playerId: string): Promise<Achievement[]> {
    const profile = this.profiles.get(playerId);
    if (!profile) return [];

    return profile.achievements
      .map(id => this.achievements.get(id))
      .filter(Boolean) as Achievement[];
  }

  async getAllAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values());
  }

  async resetScores(): Promise<void> {
    this.scores.clear();
    this.profiles.clear();
    await this.persistData();
  }

  async getResetStats(): Promise<any> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(24, 0, 0, 0);
    const msUntilReset = tomorrow.getTime() - now.getTime();
    const hoursUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60));
    const minutesUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));

    return {
      nextReset: tomorrow.toISOString(),
      hoursUntilReset,
      minutesUntilReset,
      totalPlayers: this.scores.size,
      topScore: Array.from(this.scores.values()).reduce((max, p) => Math.max(max, p.score), 0),
    };
  }

  // ==================== PRIVATE METHODS ====================

  private async checkAchievements(playerId: string): Promise<void> {
    const profile = this.profiles.get(playerId);
    if (!profile) return;

    const achievementsToUnlock = [
      {
        id: 'first_blood',
        name: 'First Blood',
        description: 'Submit your first score',
        icon: '💧',
        requirement: 1,
        check: () => profile.gamesPlayed >= 1,
      },
      {
        id: 'century',
        name: 'Century',
        description: 'Reach 100 points',
        icon: '💯',
        requirement: 100,
        check: () => profile.totalScore >= 100,
      },
      {
        id: 'thousand',
        name: 'Thousand',
        description: 'Reach 1000 points',
        icon: '🎉',
        requirement: 1000,
        check: () => profile.totalScore >= 1000,
      },
      {
        id: 'hot_streak',
        name: 'Hot Streak',
        description: 'Submit 5 scores',
        icon: '🔥',
        requirement: 5,
        check: () => profile.gamesPlayed >= 5,
      },
      {
        id: 'high_roller',
        name: 'High Roller',
        description: 'Score 100 points in one submission',
        icon: '💰',
        requirement: 100,
        check: () => profile.highestScore >= 100,
      },
    ];

    for (const ach of achievementsToUnlock) {
      if (!profile.achievements.includes(ach.id) && ach.check()) {
        profile.achievements.push(ach.id);
        if (!this.achievements.has(ach.id)) {
          this.achievements.set(ach.id, {
            id: ach.id,
            name: ach.name,
            description: ach.description,
            icon: ach.icon,
            unlockedAt: Date.now(),
            requirement: ach.requirement,
          });
        }
      }
    }
  }

  private async persistData(): Promise<void> {
    const scoresData = Object.fromEntries(this.scores);
    const profilesData = Object.fromEntries(this.profiles);
    const achievementsData = Object.fromEntries(this.achievements);

    await Promise.all([
      this.state.storage?.put('scores', JSON.stringify(scoresData)),
      this.state.storage?.put('profiles', JSON.stringify(profilesData)),
      this.state.storage?.put('achievements', JSON.stringify(achievementsData)),
    ]);
  }

  // ==================== HTTP FETCH (Fallback) ====================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    if (method === 'GET' && pathname === '/leaderboard') {
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const topPlayers = await this.getTopPlayers(limit);
      return Response.json({ success: true, data: topPlayers });
    }

    if (method === 'GET' && pathname.startsWith('/player/')) {
      const playerId = pathname.split('/')[2];
      const playerStats = await this.getPlayerStats(playerId);
      return Response.json({
        success: true,
        data: playerStats || { error: 'Player not found' },
      });
    }

    if (method === 'GET' && pathname.startsWith('/profile/')) {
      const playerId = pathname.split('/')[2];
      const profile = await this.getUserProfile(playerId);
      return Response.json({
        success: true,
        data: profile || { error: 'Profile not found' },
      });
    }

    if (method === 'PUT' && pathname.startsWith('/profile/')) {
      try {
        const playerId = pathname.split('/')[2];
        const body = await request.json() as Partial<UserProfile>;
        const updated = await this.updateUserProfile(playerId, body);
        return Response.json({ success: !!updated, data: updated });
      } catch (e) {
        return Response.json({ success: false, error: 'Invalid request' }, { status: 400 });
      }
    }

    if (method === 'GET' && pathname.startsWith('/achievements/')) {
      const playerId = pathname.split('/')[2];
      const achievements = await this.getPlayerAchievements(playerId);
      return Response.json({ success: true, data: achievements });
    }

    if (method === 'GET' && pathname === '/all-achievements') {
      const achievements = await this.getAllAchievements();
      return Response.json({ success: true, data: achievements });
    }

    if (method === 'POST' && pathname === '/score') {
      try {
        const body = await request.json() as { playerId: string; playerName: string; points: number };
        const newScore = await this.addScore(body.playerId, body.playerName, body.points);
        return Response.json({ success: true, data: newScore });
      } catch (e) {
        return Response.json({ success: false, error: 'Invalid request' }, { status: 400 });
      }
    }

    if (method === 'GET' && pathname === '/all') {
      const allPlayers = await this.getAllPlayers();
      return Response.json({ success: true, data: allPlayers });
    }

    if (method === 'POST' && pathname === '/reset') {
      await this.resetScores();
      return Response.json({ success: true, message: 'Scores reset' });
    }

    return Response.json({ success: false, error: 'Not found' }, { status: 404 });
  }
}

// ==================== TRANSACTIONAL OPERATIONS ====================
// Critical multi-step operations with ACID guarantees

async addScoreTransactional(
  playerId: string,
  playerName: string,
  points: number
): Promise<PlayerScore> {
  // Use transaction for atomic score + profile update
  return await this.state.storage.transaction(async (txn) => {
    // Step 1: Read current scores
    const scoresData = await txn.get<string>('scores') || '{}';
    const scores = Object.entries(JSON.parse(scoresData)) as [string, PlayerScore][];
    
    // Step 2: Update player score
    const existing = scores.find(([id]) => id === playerId)?.[1];
    const newScore = existing ? existing.score + points : points;
    
    const playerScore: PlayerScore = {
      playerId,
      playerName,
      score: newScore,
      timestamp: Date.now(),
    };
    
    // Step 3: Update in-memory cache
    this.scores.set(playerId, playerScore);
    
    // Step 4: Read and update profile
    const profilesData = await txn.get<string>('profiles') || '{}';
    const profiles = JSON.parse(profilesData);
    
    if (!profiles[playerId]) {
      profiles[playerId] = {
        playerId,
        playerName,
        joinedAt: Date.now(),
        totalScore: newScore,
        gamesPlayed: 1,
        highestScore: points,
        achievements: [],
      };
    } else {
      profiles[playerId].totalScore = newScore;
      profiles[playerId].gamesPlayed += 1;
      profiles[playerId].highestScore = Math.max(profiles[playerId].highestScore, points);
      profiles[playerId].playerName = playerName;
    }
    
    // Step 5: Check achievements
    await this.checkAchievements(playerId);
    const achievementsData = await txn.get<string>('achievements') || '{}';
    
    // Step 6: Write all data atomically
    const updatedScores = Object.fromEntries(scores);
    updatedScores[playerId] = playerScore;
    
    await txn.put('scores', JSON.stringify(updatedScores));
    await txn.put('profiles', JSON.stringify(profiles));
    await txn.put('achievements', JSON.stringify(Object.fromEntries(this.achievements)));
    
    // Transaction commits automatically
    return playerScore;
  });
}

async transferPointsTransactional(
  fromPlayerId: string,
  toPlayerId: string,
  amount: number
): Promise<{ from: PlayerScore; to: PlayerScore }> {
  // Atomic transfer: reduce from, increase to, or fail entirely
  return await this.state.storage.transaction(async (txn) => {
    const scoresData = await txn.get<string>('scores') || '{}';
    const scores = JSON.parse(scoresData);
    
    const fromScore = scores[fromPlayerId];
    const toScore = scores[toPlayerId];
    
    if (!fromScore || fromScore.score < amount) {
      throw new Error('Insufficient points');
    }
    
    // Atomic: both happen together or neither
    scores[fromPlayerId].score -= amount;
    scores[toPlayerId].score += amount;
    
    await txn.put('scores', JSON.stringify(scores));
    
    return {
      from: scores[fromPlayerId],
      to: scores[toPlayerId],
    };
  });
}

async archiveAndResetTransactional(): Promise<void> {
  // Archive current leaderboard and reset scores atomically
  await this.state.storage.transaction(async (txn) => {
    // Read current data
    const currentScores = await txn.get<string>('scores') || '{}';
    const archives = (await txn.get<string>('archived')) || '{}';
    
    // Archive with today's date
    const today = new Date().toISOString().split('T')[0];
    const archivedData = JSON.parse(archives);
    archivedData[today] = JSON.parse(currentScores);
    
    // Get profiles and reset game counts
    const profilesData = await txn.get<string>('profiles') || '{}';
    const profiles = JSON.parse(profilesData);
    
    Object.values(profiles).forEach((p: any) => {
      p.gamesPlayed = 0;
      p.totalScore = 0;
      p.highestScore = 0;
    });
    
    // Write all changes atomically
    await txn.put('scores', '{}');
    await txn.put('profiles', JSON.stringify(profiles));
    await txn.put('archived', JSON.stringify(archivedData));
    
    // Update in-memory cache
    this.scores.clear();
    this.profiles.forEach(profile => {
      profile.gamesPlayed = 0;
      profile.totalScore = 0;
      profile.highestScore = 0;
    });
  });
}
