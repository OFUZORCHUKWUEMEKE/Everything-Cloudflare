export interface Database {
  addScore(playerId: string, playerName: string, points: number): Promise<any>;
  getPlayerStats(playerId: string): Promise<any>;
  getTopPlayers(limit: number): Promise<any[]>;
  getArchivedLeaderboard(date: string): Promise<any>;
  archiveLeaderboard(date: string, topPlayers: any[]): Promise<void>;
  updateUserProfile(playerId: string, updates: any): Promise<any>;
  query(sql: string, params?: any[]): Promise<any>;
}

export class PostgresDatabase implements Database {
  private endpoint: string;
  private apiToken: string;

  constructor(endpoint: string, apiToken: string) {
    this.endpoint = endpoint;
    this.apiToken = apiToken;
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    const response = await fetch(`${this.endpoint}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      throw new Error(`Database query failed: ${response.statusText}`);
    }

    return response.json();
  }

  async addScore(
    playerId: string,
    playerName: string,
    points: number
  ): Promise<any> {
    const result = await this.query(
      `INSERT INTO scores (playerId, playerName, score, timestamp)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (playerId) DO UPDATE SET
       score = scores.score + $3,
       timestamp = NOW()
       RETURNING *`,
      [playerId, playerName, points]
    );

    return result.rows[0];
  }

  async getPlayerStats(playerId: string): Promise<any> {
    const result = await this.query(
      `SELECT playerId, playerName, score, timestamp FROM scores WHERE playerId = $1`,
      [playerId]
    );

    if (result.rows.length === 0) return null;

    const player = result.rows[0];

    // Get rank
    const rankResult = await this.query(
      `SELECT COUNT(*) as rank FROM scores WHERE score > $1`,
      [player.score]
    );

    return {
      ...player,
      rank: rankResult.rows[0].rank + 1,
    };
  }

  async getTopPlayers(limit: number = 10): Promise<any[]> {
    const result = await this.query(
      `SELECT 
        ROW_NUMBER() OVER (ORDER BY score DESC) as rank,
        playerId, playerName, score, timestamp
       FROM scores
       ORDER BY score DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  async getArchivedLeaderboard(date: string): Promise<any> {
    const result = await this.query(
      `SELECT * FROM archived_leaderboards WHERE date = $1`,
      [date]
    );

    return result.rows[0] || null;
  }

  async archiveLeaderboard(date: string, topPlayers: any[]): Promise<void> {
    await this.query(
      `INSERT INTO archived_leaderboards (date, topPlayers, timestamp)
       VALUES ($1, $2, NOW())`,
      [date, JSON.stringify(topPlayers)]
    );
  }

  async updateUserProfile(playerId: string, updates: any): Promise<any> {
    const fields = Object.keys(updates)
      .map((key, idx) => `${key} = $${idx + 2}`)
      .join(', ');

    const values = [playerId, ...Object.values(updates)];

    const result = await this.query(
      `UPDATE profiles SET ${fields} WHERE playerId = $1 RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }
}

// Mock database for local development
export class MockDatabase implements Database {
  private data = new Map<string, any>();

  async query(sql: string, params: any[] = []): Promise<any> {
    console.log(`[MOCK] Query: ${sql}`, params);
    return { rows: [] };
  }

  async addScore(playerId: string, playerName: string, points: number): Promise<any> {
    return { playerId, playerName, score: points, timestamp: Date.now() };
  }

  async getPlayerStats(playerId: string): Promise<any> {
    return null;
  }

  async getTopPlayers(limit: number = 10): Promise<any[]> {
    return [];
  }

  async getArchivedLeaderboard(date: string): Promise<any> {
    return null;
  }

  async archiveLeaderboard(date: string, topPlayers: any[]): Promise<void> {
    console.log(`[MOCK] Archived ${topPlayers.length} players for ${date}`);
  }

  async updateUserProfile(playerId: string, updates: any): Promise<any> {
    return updates;
  }
}
