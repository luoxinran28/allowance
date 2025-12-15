use redis::{Client, AsyncCommands, RedisResult, RedisError};
use serde::{Serialize, Deserialize};

#[derive(Clone, Debug)]
pub struct CacheService {
    client: Client,
}

impl CacheService {
    /// Create new cache service
    pub fn new(redis_url: &str) -> RedisResult<Self> {
        let client = Client::open(redis_url)?;
        Ok(CacheService { client })
    }

    /// Get cached value
    pub async fn get<T: for<'de> Deserialize<'de>>(
        &self,
        key: &str,
    ) -> RedisResult<Option<T>> {
        let mut conn = self.client.get_async_connection().await?;
        let value: Option<String> = conn.get(key).await?;
        
        Ok(value.and_then(|v| serde_json::from_str::<T>(&v).ok()))
    }

    /// Set cached value with TTL
    pub async fn set<T: Serialize>(
        &self,
        key: &str,
        value: &T,
        ttl_secs: usize,
    ) -> Result<(), RedisError> {
        let mut conn = self.client.get_async_connection().await?;
        let json = serde_json::to_string(value)
            .map_err(|_| redis::RedisError::from((redis::ErrorKind::TypeError, "Serialization failed")))?;
        
        conn.set_ex::<_, _, ()>(key, json, ttl_secs as u64).await?;
        Ok(())
    }

    /// Delete cached value
    pub async fn delete(&self, key: &str) -> RedisResult<()> {
        let mut conn = self.client.get_async_connection().await?;
        conn.del::<_, ()>(key).await?;
        Ok(())
    }

    /// Delete all keys matching pattern
    pub async fn delete_pattern(&self, pattern: &str) -> RedisResult<()> {
        let mut conn = self.client.get_async_connection().await?;
        let keys: Vec<String> = conn.keys(pattern).await?;
        
        if !keys.is_empty() {
            conn.del::<_, ()>(keys).await?;
        }
        Ok(())
    }

    /// Check if key exists
    pub async fn exists(&self, key: &str) -> RedisResult<bool> {
        let mut conn = self.client.get_async_connection().await?;
        let exists: bool = conn.exists(key).await?;
        Ok(exists)
    }

    /// Get with fallback and cache
    pub async fn get_or_set<T, F>(
        &self,
        key: &str,
        ttl_secs: usize,
        fallback: F,
    ) -> RedisResult<T>
    where
        T: Serialize + for<'de> Deserialize<'de> + Clone,
        F: std::future::Future<Output = Result<T, Box<dyn std::error::Error + Send + Sync>>>,
    {
        if let Ok(Some(cached)) = self.get::<T>(key).await {
            return Ok(cached);
        }

        let value = fallback
            .await
            .map_err(|_| redis::RedisError::from((redis::ErrorKind::TypeError, "Fallback failed")))?;

        let _ = self.set(&key, &value, ttl_secs).await;
        Ok(value)
    }

    /// Increment counter
    pub async fn increment(&self, key: &str, ttl_secs: usize) -> RedisResult<i64> {
        let mut conn = self.client.get_async_connection().await?;
        let count: i64 = conn.incr(key, 1).await?;
        
        if count == 1 {
            conn.expire::<_, ()>(key, ttl_secs as i64).await?;
        }
        
        Ok(count)
    }

    /// Decrement counter
    pub async fn decrement(&self, key: &str) -> RedisResult<i64> {
        let mut conn = self.client.get_async_connection().await?;
        let count: i64 = conn.decr(key, 1).await?;
        Ok(count)
    }

    /// Flush all cache (use with caution!)
    pub async fn flush_all(&self) -> RedisResult<()> {
        let mut conn = self.client.get_async_connection().await?;
        redis::cmd("FLUSHALL").query_async::<_, ()>(&mut conn).await?;
        Ok(())
    }

    /// Get cache stats
    pub async fn stats(&self) -> RedisResult<CacheStats> {
        let mut conn = self.client.get_async_connection().await?;
        
        let info: String = redis::cmd("INFO")
            .arg("stats")
            .query_async::<_, String>(&mut conn)
            .await?;

        let db_size: String = redis::cmd("DBSIZE")
            .query_async::<_, String>(&mut conn)
            .await?;

        Ok(CacheStats {
            info,
            db_size,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    pub info: String,
    pub db_size: String,
}

// Cache key builders for common entities
pub mod keys {
    pub fn subscription(user_id: i64) -> String {
        format!("sub:{}", user_id)
    }

    pub fn pricing(tier: &str) -> String {
        format!("price:{}", tier)
    }

    pub fn user_profile(user_id: i64) -> String {
        format!("user:{}", user_id)
    }

    pub fn product(product_id: &str) -> String {
        format!("product:{}", product_id)
    }

    pub fn all_pricing() -> String {
        "all_pricing".to_string()
    }
}
