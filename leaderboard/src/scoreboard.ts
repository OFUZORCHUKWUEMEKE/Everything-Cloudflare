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

  // Add or update a player's score
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

    // Update profile
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
      profile.playerName = playerName; // Update name if changed
    }

    // Check achievements
    await this.checkAchievements(playerId);

    // Persist
    await this.persistData();

    return playerScore;
  }

  // Check and unlock achievements
  private async checkAchievements(playerId: string): Promise<void> {
    const profile = this.profiles.get(playerId);
    if (!profile) return;

    const achievementsToUnlock = [
      {
        id: 'first_blood',
        name: 'First Blood',
        description: 'Submit your first score',
        icon: '🩸',
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

  // Get top N players
  getTopPlayers(limit: number = 10): PlayerScore[] {
    const sorted = Array.from(this.scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return sorted.map((score, index) => ({
      ...score,
      rank: index + 1,
    }));
  }

  // Get player's current score and rank
  getPlayerStats(playerId: string): PlayerScore | null {
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

  // Get user profile
  getUserProfile(playerId: string): UserProfile | null {
    return this.profiles.get(playerId) || null;
  }

  // Update user profile
  async updateUserProfile(playerId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const profile = this.profiles.get(playerId);
    if (!profile) return null;

    const updated = { ...profile, ...updates, playerId };
    this.profiles.set(playerId, updated);
    await this.persistData();
    return updated;
  }

  // Get all players (sorted)
  getAllPlayers(): PlayerScore[] {
    return Array.from(this.scores.values())
      .sort((a, b) => b.score - a.score)
      .map((score, index) => ({
        ...score,
        rank: index + 1,
      }));
  }

  // Get player achievements
  getPlayerAchievements(playerId: string): Achievement[] {
    const profile = this.profiles.get(playerId);
    if (!profile) return [];

    return profile.achievements
      .map(id => this.achievements.get(id))
      .filter(Boolean) as Achievement[];
  }

  // Get all achievements
  getAllAchievements(): Map<string, Achievement> {
    return this.achievements;
  }

  // Reset all scores (admin only)
  async resetScores(): Promise<void> {
    this.scores.clear();
    this.profiles.clear();
    await this.persistData();
  }

  // Persist all data
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

  // Handle HTTP requests
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // GET /leaderboard
    if (method === 'GET' && pathname === '/leaderboard') {
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const topPlayers = this.getTopPlayers(limit);
      return Response.json({ success: true, data: topPlayers });
    }

    // GET /player/:playerId
    if (method === 'GET' && pathname.startsWith('/player/')) {
      const playerId = pathname.split('/')[2];
      const playerStats = this.getPlayerStats(playerId);
      return Response.json({
        success: true,
        data: playerStats || { error: 'Player not found' },
      });
    }

    // GET /profile/:playerId
    if (method === 'GET' && pathname.startsWith('/profile/')) {
      const playerId = pathname.split('/')[2];
      const profile = this.getUserProfile(playerId);
      return Response.json({
        success: true,
        data: profile || { error: 'Profile not found' },
      });
    }

    // PUT /profile/:playerId
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

    // GET /achievements/:playerId
    if (method === 'GET' && pathname.startsWith('/achievements/')) {
      const playerId = pathname.split('/')[2];
      const achievements = this.getPlayerAchievements(playerId);
      return Response.json({ success: true, data: achievements });
    }

    // GET /all-achievements
    if (method === 'GET' && pathname === '/all-achievements') {
      const achievements = Array.from(this.getAllAchievements().values());
      return Response.json({ success: true, data: achievements });
    }

    // POST /score
    if (method === 'POST' && pathname === '/score') {
      try {
        const body = await request.json() as { playerId: string; playerName: string; points: number };
        const newScore = await this.addScore(body.playerId, body.playerName, body.points);
        return Response.json({ success: true, data: newScore });
      } catch (e) {
        return Response.json({ success: false, error: 'Invalid request' }, { status: 400 });
      }
    }

    // GET /all
    if (method === 'GET' && pathname === '/all') {
      const allPlayers = this.getAllPlayers();
      return Response.json({ success: true, data: allPlayers });
    }

    // POST /reset
    if (method === 'POST' && pathname === '/reset') {
      await this.resetScores();
      return Response.json({ success: true, message: 'Scores reset' });
    }

    return Response.json({ success: false, error: 'Not found' }, { status: 404 });
  }
}
