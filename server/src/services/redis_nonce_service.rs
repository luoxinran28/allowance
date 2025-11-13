use crate::utils::nonce::verify_sign;
use anyhow::Result;
use chrono::Utc;
use redis::aio::Connection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NonceRecord {
    pub nonce: String,
    pub timestamp: i64,
    pub signature: String,
    pub used_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    pub total_cached_nonces: u32,
    pub oldest_timestamp: Option<i64>,
    pub newest_timestamp: Option<i64>,
}

/// RedisNonceService handles nonce validation, caching, and replay detection
pub struct RedisNonceService {
    conn: Connection,
}

impl RedisNonceService {
    /// Create a new Redis nonce service
    pub async fn new(redis_url: &str) -> Result<Self> {
        let client = redis::Client::open(redis_url)?;
        let conn = client.get_aio_connection().await?;
        Ok(RedisNonceService { conn })
    }

    /// Validate and cache a nonce with signature verification
    pub async fn validate_and_cache(
        &mut self,
        timestamp: &str,
        nonce: &str,
        signature: &str,
        secret: &str,
    ) -> Result<bool> {
        // Verify signature using existing verify_sign function
        let body_hash = "";
        if !verify_sign(timestamp, nonce, body_hash, signature, secret) {
            anyhow::bail!("Invalid nonce signature");
        }

        // Check timestamp is recent
        let ts: i64 = timestamp.parse()?;
        let now = Utc::now().timestamp();
        if (now - ts).abs() > 300 {
            anyhow::bail!("Nonce timestamp outside 5-minute window");
        }

        // Check for replay attack
        let key = format!("nonce:{}", nonce);
        let used: bool = redis::cmd("EXISTS")
            .arg(&key)
            .query_async(&mut self.conn)
            .await?;

        if used {
            return Ok(false);
        }

        // Cache the nonce
        let record = NonceRecord {
            nonce: nonce.to_string(),
            timestamp: ts,
            signature: signature.to_string(),
            used_at: Some(Utc::now().timestamp()),
        };

        let serialized = serde_json::to_string(&record)?;
        redis::cmd("SET")
            .arg(&key)
            .arg(&serialized)
            .arg("EX")
            .arg(3600)
            .query_async(&mut self.conn)
            .await?;

        Ok(true)
    }

    /// Check if nonce is already used
    pub async fn is_nonce_used(&mut self, nonce: &str) -> Result<bool> {
        let key = format!("nonce:{}", nonce);
        let exists: bool = redis::cmd("EXISTS")
            .arg(&key)
            .query_async(&mut self.conn)
            .await?;
        Ok(exists)
    }

    /// Get cache statistics
    pub async fn get_stats(&mut self) -> Result<CacheStats> {
        let keys: Vec<String> = redis::cmd("KEYS")
            .arg("nonce:*")
            .query_async(&mut self.conn)
            .await?;

        let mut oldest_timestamp: Option<i64> = None;
        let mut newest_timestamp: Option<i64> = None;

        for key in &keys {
            let value: Option<String> = redis::cmd("GET")
                .arg(key)
                .query_async(&mut self.conn)
                .await?;

            if let Some(v) = value {
                if let Ok(record) = serde_json::from_str::<NonceRecord>(&v) {
                    if oldest_timestamp.is_none() || record.timestamp < oldest_timestamp.unwrap()
                    {
                        oldest_timestamp = Some(record.timestamp);
                    }
                    if newest_timestamp.is_none() || record.timestamp > newest_timestamp.unwrap()
                    {
                        newest_timestamp = Some(record.timestamp);
                    }
                }
            }
        }

        Ok(CacheStats {
            total_cached_nonces: keys.len() as u32,
            oldest_timestamp,
            newest_timestamp,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore]
    async fn test_nonce_validation() {
        // Requires Redis running
    }
}
