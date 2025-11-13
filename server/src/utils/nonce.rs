use sha2::{Sha256, Digest};
use hmac::{Hmac, Mac};

type HmacSha256 = Hmac<Sha256>;

/// Hash request body using SHA256
pub fn hash_body(body: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(body);
    format!("{:x}", hasher.finalize())
}

/// Verify HMAC-SHA256 signature
/// Signature formula: sign = HMAC-SHA256(timestamp + nonce + body_hash, secret_key)
pub fn verify_sign(
    timestamp: &str,
    nonce: &str,
    body_hash: &str,
    provided_sign: &str,
    secret_key: &str,
) -> bool {
    let message = format!("{}{}{}", timestamp, nonce, body_hash);
    
    let mut mac = HmacSha256::new_from_slice(secret_key.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(message.as_bytes());
    
    let computed_sign = format!("{:x}", mac.finalize().into_bytes());
    computed_sign == provided_sign
}

/// Check if nonce is expired (3 minutes = 180 seconds)
pub fn is_nonce_expired(timestamp: i64) -> bool {
    let now = chrono::Utc::now().timestamp();
    now - timestamp > 180
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_body() {
        let body = b"test";
        let hash = hash_body(body);
        assert!(!hash.is_empty());
    }

    #[test]
    fn test_verify_sign() {
        let timestamp = "1700000000";
        let nonce = "abcdef1234567890";
        let body_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        let secret = "test-secret";
        
        let message = format!("{}{}{}", timestamp, nonce, body_hash);
        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(message.as_bytes());
        let correct_sign = format!("{:x}", mac.finalize().into_bytes());
        
        assert!(verify_sign(timestamp, nonce, body_hash, &correct_sign, secret));
        assert!(!verify_sign(timestamp, nonce, body_hash, "wrong_sign", secret));
    }
}
