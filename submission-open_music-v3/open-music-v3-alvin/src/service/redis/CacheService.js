const redis = require('redis');

class CacheService {
  constructor() {
    this._client = redis.createClient({
      host: process.env.REDIS_SERVER,
    });

    this._client.on('error', (error) => {
      console.error('Redis Error:', error);
    });

    this._client.on('end', () => {
      console.error('Redis client connection closed');
    });
  }

  async set(key, value, expirationInSecond = 1800) {
    if (!this._client || !this._client.connected) {
      throw new Error('Redis client is not connected');
    }

    return new Promise((resolve, reject) => {
      this._client.set(key, value, 'EX', expirationInSecond, (error, ok) => {
        if (error) {
          return reject(error);
        }
        return resolve(ok);
      });
    });
  }

  async get(key) {
    if (!this._client || !this._client.connected) {
      throw new Error('Redis client is not connected');
    }

    return new Promise((resolve, reject) => {
      this._client.get(key, (error, reply) => {
        if (error) {
          return reject(error);
        }
        if (reply === null) {
          return reject(new Error('Cache tidak ditemukan'));
        }
        return resolve(reply.toString());
      });
    });
  }

  async delete(key) {
    if (!this._client || !this._client.connected) {
      throw new Error('Redis client is not connected');
    }

    return new Promise((resolve, reject) => {
      this._client.del(key, (error, count) => {
        if (error) {
          return reject(error);
        }
        return resolve(count);
      });
    });
  }


  close() {
    if (this._client) {
      this._client.quit();
    }
  }
}

module.exports = CacheService;
