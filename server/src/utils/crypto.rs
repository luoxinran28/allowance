use argon2::{
    password_hash::{PasswordHasher, PasswordHash, PasswordVerifier, SaltString},
    Argon2,
};
use rand::Rng;
use uuid::Uuid;

use crate::utils::errors::{AppError, AppResult};

/// Hash password using Argon2
pub fn hash_password(password: &str) -> AppResult<String> {
    let argon2 = Argon2::default();
    let salt = SaltString::generate(rand::thread_rng());
    
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|_| AppError::InternalServerError)
}

/// Verify password against hash
pub fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
    let password_hash = PasswordHash::new(hash)
        .map_err(|_| AppError::InternalServerError)?;

    let argon2 = Argon2::default();
    match argon2.verify_password(password.as_bytes(), &password_hash) {
        Ok(_) => Ok(true),
        Err(argon2::password_hash::Error::Password) => Ok(false),
        Err(_) => Err(AppError::InternalServerError),
    }
}

/// Generate random UUID
pub fn generate_uuid() -> String {
    Uuid::new_v4().to_string()
}

/// Generate random token (for email verification, password reset)
pub fn generate_token(length: usize) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::thread_rng();
    
    (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let password = "test_password_123";
        let hash = hash_password(password).unwrap();
        
        assert!(!hash.is_empty());
        assert_ne!(hash, password);
        
        let is_valid = verify_password(password, &hash).unwrap();
        assert!(is_valid);
        
        let is_invalid = verify_password("wrong_password", &hash).unwrap();
        assert!(!is_invalid);
    }

    #[test]
    fn test_uuid_generation() {
        let uuid1 = generate_uuid();
        let uuid2 = generate_uuid();
        
        assert_ne!(uuid1, uuid2);
        assert_eq!(uuid1.len(), 36);  // UUID v4 format: 8-4-4-4-12
    }

    #[test]
    fn test_token_generation() {
        let token = generate_token(32);
        assert_eq!(token.len(), 32);
    }
}
