using System.Net;
using System.Net.Mail;

namespace Backend.Services.Email
{
    public interface IEmailService
    {
        Task SendEmailAsync(string to, string subject, string body, bool isHtml = false);
        Task SendVerificationEmailAsync(string to, string verificationLink);
        Task SendPasswordResetEmailAsync(string to, string resetLink);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;
        private readonly SmtpClient _smtpClient;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;

            _smtpClient = new SmtpClient("smtp.gmail.com", 587)
            {
                Credentials = new NetworkCredential("alex.crisan.test@gmail.com", "zxxj uhko srpq ospq"),
                EnableSsl = true
            };
        }

        public async Task SendEmailAsync(string to, string subject, string body, bool isHtml = false)
        {
            try
            {
                var mailMessage = new MailMessage
                {
                    From = new MailAddress("alex.crisan.test@gmail.com"),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = isHtml
                };
                mailMessage.To.Add(to);

                await _smtpClient.SendMailAsync(mailMessage);
                _logger.LogInformation("Email sent successfully to {To}", to);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {To}", to);
                throw;
            }
        }

        //with verification link
        // public async Task SendVerificationEmailAsync(string to, string verificationLink)
        // {
        //     var subject = "Verifică-ți adresa de email";
        //     var body = $@"
        //         <h2>Bine ai venit!</h2>
        //         <p>Te rugăm să-ți verifici adresa de email făcând click pe link-ul de mai jos:</p>
        //         <p><a href='{verificationLink}'>Verifică email</a></p>
        //         <p>Dacă nu tu ai creat acest cont, te rugăm să ignori acest email.</p>
        //         <p>Link-ul va expira în 24 de ore.</p>";

        //     await SendEmailAsync(to, subject, body, true);
        // }

        //with verification code
        public async Task SendVerificationEmailAsync(string to, string verificationCode)
        {
            var subject = "Verifică-ți adresa de email";
            var body = $@"
                <h2>Bine ai venit!</h2>
                <p>Te rugăm să-ți verifici adresa de email folosind codul de mai jos:</p>
                <p style='font-size: 24px; font-weight: bold; text-align: center; padding: 20px;'>{verificationCode}</p>
                <p>Dacă nu tu ai creat acest cont, te rugăm să ignori acest email.</p>
                <p>Codul va expira în 10 minute.</p>";
            await SendEmailAsync(to, subject, body, true);
        }


        public async Task SendPasswordResetEmailAsync(string to, string verificationCode)
        {
            var subject = "Resetare parolă";
            var body = $@"
                <h2>Resetare parolă</h2>
                <p>Ai solicitat resetarea parolei. Folosind codul de mai jos pentru a-ți seta o nouă parolă:</p>
                <p style='font-size: 24px; font-weight: bold; text-align: center; padding: 20px;'>{verificationCode}</p>
                <p><a href='{verificationCode}'>Resetează parola</a></p>
                <p>Dacă nu tu ai solicitat resetarea parolei, te rugăm să ignori acest email.</p>
                <p>Codul va expira în 10 minute.</p>";

            await SendEmailAsync(to, subject, body, true);
        }
    }
}
