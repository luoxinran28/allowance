use lettre::SmtpTransport;
use lettre::message::Message;
use lettre::transport::smtp::authentication::Credentials;
use lettre::Transport;
use crate::utils::errors::{AppError, AppResult};

pub struct EmailService {
    sender: String,
    transport: Option<SmtpTransport>,
}

impl EmailService {
    /// Create new email service (with SMTP configuration)
    pub fn new(
        smtp_host: String,
        smtp_port: u16,
        smtp_user: String,
        smtp_password: String,
        sender: String,
    ) -> AppResult<Self> {
        let transport = SmtpTransport::builder_dangerous(smtp_host)
            .port(smtp_port)
            .credentials(Credentials::new(
                smtp_user.into(),
                smtp_password.into(),
            ))
            .build();

        Ok(EmailService {
            sender,
            transport: Some(transport),
        })
    }

    /// Create test instance (no actual email sending)
    pub fn test() -> Self {
        EmailService {
            sender: "noreply@test.com".to_string(),
            transport: None,
        }
    }

    /// Send activation email
    pub fn send_activation_email(
        &self,
        to_email: &str,
        activation_link: &str,
    ) -> AppResult<()> {
        let subject = "Activate your Allowance Account";
        let html_body = format!(
            r#"
            <html>
                <body>
                    <h2>Welcome to Allowance!</h2>
                    <p>Please click the link below to activate your account:</p>
                    <a href="{}">{}</a>
                    <p>This link will expire in 24 hours.</p>
                    <p>If you didn't sign up for this account, please ignore this email.</p>
                </body>
            </html>
            "#,
            activation_link, activation_link
        );

        self.send_email(to_email, subject, html_body)
    }

    /// Send password reset email
    pub fn send_password_reset_email(
        &self,
        to_email: &str,
        reset_link: &str,
    ) -> AppResult<()> {
        let subject = "Reset your Allowance Password";
        let html_body = format!(
            r#"
            <html>
                <body>
                    <h2>Password Reset Request</h2>
                    <p>Please click the link below to reset your password:</p>
                    <a href="{}">{}</a>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request a password reset, please ignore this email.</p>
                </body>
            </html>
            "#,
            reset_link, reset_link
        );

        self.send_email(to_email, subject, html_body)
    }

    /// Generic email sender
    fn send_email(&self, to: &str, subject: &str, html_body: String) -> AppResult<()> {
        // Skip actual sending in test mode
        if self.transport.is_none() {
            tracing::info!("Test email sent to {}: {}", to, subject);
            return Ok(());
        }

        let email = Message::builder()
            .from(self.sender.parse().map_err(|_| AppError::EmailServiceError("Invalid sender email".to_string()))?)
            .to(to.parse().map_err(|_| AppError::EmailServiceError("Invalid recipient email".to_string()))?)
            .subject(subject)
            .multipart(lettre::message::MultiPart::alternative()
                .singlepart(lettre::message::SinglePart::plain(html_body.clone()))
                .singlepart(lettre::message::SinglePart::html(html_body)))
            .map_err(|_| AppError::EmailServiceError("Failed to construct email".to_string()))?;

        if let Some(ref transport) = self.transport {
            transport.send(&email.into())
                .map_err(|e| AppError::EmailServiceError(format!("Failed to send email: {}", e)))?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_service_creation() {
        let service = EmailService::test();
        assert_eq!(service.sender, "noreply@test.com");
    }

    #[test]
    fn test_send_activation_email() {
        let service = EmailService::test();
        let result = service.send_activation_email(
            "user@example.com",
            "http://localhost:3030/activate/token123",
        );
        assert!(result.is_ok());
    }
}
