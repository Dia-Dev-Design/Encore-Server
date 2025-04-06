export function getVerifyEmailTemplate(
    actionUrl: string,
    name?: string,
): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f9ff; background-image: url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;600&quot; height=&quot;800&quot;><rect width=&quot;100%&quot; height=&quot;100%&quot; fill=&quot;%23f4f9ff&quot;/><circle cx=&quot;300&quot; cy=&quot;400&quot; r=&quot;200&quot; fill=&quot;%23eef7ff&quot; /></svg>'); background-size: cover; background-position: center;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; padding: 20px; background-color: #eef7ff;">
                <img src="https://i.postimg.cc/7Z0dVC39/encore-svg.png" alt="Encore Logo" style="height: 40px;">
            </div>        
        <div style="padding: 30px; text-align: center;">
            <h1 style="font-size: 24px; color: #333333; margin-bottom: 20px;">Hello!</h1>
            <p style="font-size: 16px; color: #666666; margin-bottom: 30px;">Please verify your email by clicking the link below.</p>
            <a href="${actionUrl}" style="display: inline-block; padding: 12px 25px; font-size: 16px; color: #ffffff; background-color: #007bff; text-decoration: none; border-radius: 4px;">Verify Email</a>
            <p style="font-size: 16px; color: #666666; margin: 30px 0;">If you did not request this, please ignore this email.</p>
            <p style="font-size: 16px; color: #666666;">Thank you</p>
        </div>
        <div style="padding: 20px; text-align: center; font-size: 14px; color: #999999; background-color: #f8f9fa;">
            <p style="margin: 0;">7293 NW 2nd Ave, Miami, FL 33150</p>
            <p style="margin: 0;">You are receiving this email as you signed up at our website <a href="https://www.encoreai.com" style="color: #007bff; text-decoration: none;">www.encoreai.com</a>. <a href="#" style="color: #007bff; text-decoration: none;">Unsubscribe</a></p>
            <div style="margin-top: 10px;">
                <a href="#"><img src="https://via.placeholder.com/24" alt="Instagram" style="height: 24px; margin: 0 10px;"></a>
                <a href="#"><img src="https://via.placeholder.com/24" alt="LinkedIn" style="height: 24px; margin: 0 10px;"></a>
                <a href="#"><img src="https://via.placeholder.com/24" alt="WhatsApp" style="height: 24px; margin: 0 10px;"></a>
            </div>
        </div>
    </div>
</body>
</html>`;
}

export function getResetPasswordTemplate(
    actionUrl: string,
    name?: string,
): string {
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f9ff; background-image: url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;600&quot; height=&quot;800&quot;><rect width=&quot;100%&quot; height=&quot;100%&quot; fill=&quot;%23f4f9ff&quot;/><circle cx=&quot;300&quot; cy=&quot;400&quot; r=&quot;200&quot; fill=&quot;%23eef7ff&quot; /></svg>'); background-size: cover; background-position: center;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; padding: 20px; background-color: #eef7ff;">
                  <img src="https://i.postimg.cc/7Z0dVC39/encore-svg.png" alt="Encore Logo" style="height: 40px;">
              </div>        
          <div style="padding: 30px; text-align: center;">
              <h1 style="font-size: 24px; color: #333333; margin-bottom: 20px;">Hello ${name}!</h1>
              <p style="font-size: 16px; color: #666666; margin-bottom: 30px;">Please reset your password by clicking the link below:</p>
              <a href="${actionUrl}" style="display: inline-block; padding: 12px 25px; font-size: 16px; color: #ffffff; background-color: #007bff; text-decoration: none; border-radius: 4px;">Reset Password</a>
              <p style="font-size: 16px; color: #666666; margin: 30px 0;">If you did not request this, please ignore this email.</p>
              <p style="font-size: 16px; color: #666666;">Thank you</p>
          </div>
          <div style="padding: 20px; text-align: center; font-size: 14px; color: #999999; background-color: #f8f9fa;">
              <p style="margin: 0;">7293 NW 2nd Ave, Miami, FL 33150</p>
              <p style="margin: 0;">You are receiving this email as you signed up at our website <a href="https://www.encoreai.com" style="color: #007bff; text-decoration: none;">www.encoreai.com</a>. <a href="#" style="color: #007bff; text-decoration: none;">Unsubscribe</a></p>
              <div style="margin-top: 10px;">
                  <a href="#"><img src="https://via.placeholder.com/24" alt="Instagram" style="height: 24px; margin: 0 10px;"></a>
                  <a href="#"><img src="https://via.placeholder.com/24" alt="LinkedIn" style="height: 24px; margin: 0 10px;"></a>
                  <a href="#"><img src="https://via.placeholder.com/24" alt="WhatsApp" style="height: 24px; margin: 0 10px;"></a>
              </div>
          </div>
      </div>
  </body>
  </html>`;
}

export function footer(): string {
    return `
    <div class="footer">
            <p>7293 NW 2nd Ave, Miami, FL 33150</p>
            <p>You are receiving this email as you signed up at our website <a href="https://www.encoreai.com">www.encoreai.com</a>. <a href="#">Unsubscribe</a></p>
            <div class="social-icons">
                <a href="#"><img src="https://via.placeholder.com/24" alt="Instagram"></a>
                <a href="#"><img src="https://via.placeholder.com/24" alt="LinkedIn"></a>
                <a href="#"><img src="https://via.placeholder.com/24" alt="WhatsApp"></a>
            </div>
        </div>
  `;
}

export function style(): string {
    return `
        <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f9ff;
            background-image: url('data:image/svg+xml,<svg width="647" height="406" viewBox="0 0 647 406" fill="none" xmlns="http://www.w3.org/2000/svg">
<g opacity="0.15">
<path d="M163.016 343.142C151.686 343.142 140.355 339.245 130.967 331.45C109.925 313.587 107.335 282.083 125.14 261.297L216.755 152.17C234.56 131.059 265.962 128.461 286.68 146.324C307.722 164.187 310.312 195.691 292.507 216.477L200.892 325.604C191.18 337.296 176.936 343.467 162.692 343.467L163.016 343.142Z" fill="#6EC9DE"/>
<path d="M49.7011 269.741C38.3706 269.741 27.0401 265.843 17.652 258.048C-3.39035 240.185 -5.98017 208.682 11.8249 187.895L154.913 17.7095C172.718 -3.40139 204.119 -5.99965 224.838 11.8634C245.88 29.7264 248.47 61.2303 230.665 82.0164L87.5772 252.202C77.8654 263.895 63.6214 270.065 49.3773 270.065L49.7011 269.741Z" fill="#D7E2EF"/>
<path d="M285.716 405.499C274.386 405.499 263.055 401.601 253.667 393.806C232.625 375.943 230.035 344.439 247.84 323.653L363.411 185.946C394.813 148.271 448.875 141.45 488.694 169.382L558.619 85.9126C576.424 64.8017 607.826 62.2034 628.544 80.0665C649.587 97.9295 652.177 129.433 634.372 150.219L560.885 237.586C529.484 275.261 475.421 282.081 435.602 254.15L323.269 387.635C313.557 399.328 299.313 405.499 285.069 405.499H285.716Z" fill="#9BE8CB"/>
</g>
</svg>
');
            background-size: cover;
            background-position: center;

        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding: 20px;
            background-color: #eef7ff;
        }
        .header img {
            height: 40px;
        }
        .content {
            padding: 30px;
            text-align: center;
        }
        .content h1 {
            font-size: 24px;
            color: #333333;
            margin-bottom: 20px;
        }
        .content p {
            font-size: 16px;
            color: #666666;
            margin-bottom: 30px;
        }
        .verify-button {
            display: inline-block;
            padding: 12px 25px;
            font-size: 16px;
            color: #ffffff;
            background-color: #007bff;
            text-decoration: none;
            border-radius: 4px;
        }
        .verify-button:hover {
            background-color: #0056b3;
        }
        .footer {
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #999999;
            background-color: #f8f9fa;
        }
        .footer a {
            color: #007bff;
            text-decoration: none;
        }
        .footer .social-icons img {
            height: 24px;
            margin: 0 10px;
        }
    </style>
  `;
}

export function getLawyerChatRequestTemplate(
    name?: string,
): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lawyer Chat Request</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f9ff; background-image: url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;600&quot; height=&quot;800&quot;><rect width=&quot;100%&quot; height=&quot;100%&quot; fill=&quot;%23f4f9ff&quot;/><circle cx=&quot;300&quot; cy=&quot;400&quot; r=&quot;200&quot; fill=&quot;%23eef7ff&quot; /></svg>'); background-size: cover; background-position: center;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; padding: 20px; background-color: #eef7ff;">
                <img src="https://i.postimg.cc/7Z0dVC39/encore-svg.png" alt="Encore Logo" style="height: 40px;">
            </div>        
        <div style="padding: 30px; text-align: center;">
            <h1 style="font-size: 24px; color: #333333; margin-bottom: 20px;">Hello ${name || 'there'}!</h1>
            <p style="font-size: 16px; color: #666666; margin-bottom: 30px;">We've received your request to chat with a lawyer. Our legal team will review your request and respond as soon as possible.</p>
            <p style="font-size: 16px; color: #666666; margin: 30px 0;">Our typical response time is within 24 hours during business days.</p>
            <p style="font-size: 16px; color: #666666;">Thank you for your patience</p>
        </div>
        <div style="padding: 20px; text-align: center; font-size: 14px; color: #999999; background-color: #f8f9fa;">
            <p style="margin: 0;">7293 NW 2nd Ave, Miami, FL 33150</p>
            <p style="margin: 0;">You are receiving this email as you signed up at our website <a href="https://www.encoreai.com" style="color: #007bff; text-decoration: none;">www.encoreai.com</a>. <a href="#" style="color: #007bff; text-decoration: none;">Unsubscribe</a></p>
            <div style="margin-top: 10px;">
                <a href="#"><img src="https://via.placeholder.com/24" alt="Instagram" style="height: 24px; margin: 0 10px;"></a>
                <a href="#"><img src="https://via.placeholder.com/24" alt="LinkedIn" style="height: 24px; margin: 0 10px;"></a>
                <a href="#"><img src="https://via.placeholder.com/24" alt="WhatsApp" style="height: 24px; margin: 0 10px;"></a>
            </div>
        </div>
    </div>
</body>
</html>`;
}

export function getLawyerResponseNotificationTemplate(
    name?: string,
    lawyerName?: string,
): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lawyer Response Notification</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f9ff; background-image: url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;600&quot; height=&quot;800&quot;><rect width=&quot;100%&quot; height=&quot;100%&quot; fill=&quot;%23f4f9ff&quot;/><circle cx=&quot;300&quot; cy=&quot;400&quot; r=&quot;200&quot; fill=&quot;%23eef7ff&quot; /></svg>'); background-size: cover; background-position: center;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; padding: 20px; background-color: #eef7ff;">
                <img src="https://i.postimg.cc/7Z0dVC39/encore-svg.png" alt="Encore Logo" style="height: 40px;">
            </div>        
        <div style="padding: 30px; text-align: center;">
            <h1 style="font-size: 24px; color: #333333; margin-bottom: 20px;">Hello ${name || 'there'}!</h1>
            <p style="font-size: 16px; color: #666666; margin-bottom: 30px;">${lawyerName ? `${lawyerName} has` : 'A lawyer has'} responded to your chat request.</p>
            <p style="font-size: 16px; color: #666666; margin: 30px 0;">For the best experience, please respond within 24 hours to keep the conversation active.</p>
            <p style="font-size: 16px; color: #666666;">Thank you for using Encore</p>
        </div>
        <div style="padding: 20px; text-align: center; font-size: 14px; color: #999999; background-color: #f8f9fa;">
            <p style="margin: 0;">7293 NW 2nd Ave, Miami, FL 33150</p>
            <p style="margin: 0;">You are receiving this email as you signed up at our website <a href="https://www.encoreai.com" style="color: #007bff; text-decoration: none;">www.encoreai.com</a>. <a href="#" style="color: #007bff; text-decoration: none;">Unsubscribe</a></p>
            <div style="margin-top: 10px;">
                <a href="#"><img src="https://via.placeholder.com/24" alt="Instagram" style="height: 24px; margin: 0 10px;"></a>
                <a href="#"><img src="https://via.placeholder.com/24" alt="LinkedIn" style="height: 24px; margin: 0 10px;"></a>
                <a href="#"><img src="https://via.placeholder.com/24" alt="WhatsApp" style="height: 24px; margin: 0 10px;"></a>
            </div>
        </div>
    </div>
</body>
</html>`;
}

export function getLawyerNotificationTemplate(
    userName: string,
    companyName?: string,
    threadId?: string,
): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Chat Request</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f9ff; background-image: url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;600&quot; height=&quot;800&quot;><rect width=&quot;100%&quot; height=&quot;100%&quot; fill=&quot;%23f4f9ff&quot;/><circle cx=&quot;300&quot; cy=&quot;400&quot; r=&quot;200&quot; fill=&quot;%23eef7ff&quot; /></svg>'); background-size: cover; background-position: center;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; padding: 20px; background-color: #eef7ff;">
                <img src="https://i.postimg.cc/7Z0dVC39/encore-svg.png" alt="Encore Logo" style="height: 40px;">
            </div>        
        <div style="padding: 30px; text-align: center;">
            <div style="background-color: #f8f9fa; border-radius: 4px; padding: 15px; margin-bottom: 20px;">
                <h2 style="font-size: 18px; color: #007bff; margin: 0;">New Chat Request</h2>
            </div>
            <h1 style="font-size: 24px; color: #333333; margin-bottom: 20px;">Chat Request Details</h1>
            <div style="text-align: left; background-color: #f8f9fa; border-radius: 4px; padding: 20px; margin-bottom: 30px;">
                <p style="font-size: 16px; color: #666666; margin: 10px 0;"><strong>User:</strong> ${userName}</p>
                ${companyName ? `<p style="font-size: 16px; color: #666666; margin: 10px 0;"><strong>Company:</strong> ${companyName}</p>` : ''}
                ${threadId ? `<p style="font-size: 16px; color: #666666; margin: 10px 0;"><strong>Thread ID:</strong> ${threadId}</p>` : ''}
                <p style="font-size: 16px; color: #666666; margin: 10px 0;"><strong>Request Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="font-size: 16px; color: #666666; margin-bottom: 30px;">Please review and respond to this chat request within 24 hours.</p>
            <p style="font-size: 16px; color: #666666;">You can access the chat through your Encore dashboard.</p>
        </div>
        <div style="padding: 20px; text-align: center; font-size: 14px; color: #999999; background-color: #f8f9fa;">
            <p style="margin: 0;">7293 NW 2nd Ave, Miami, FL 33150</p>
            <p style="margin: 0;">This is an automated message from <a href="https://www.encoreai.com" style="color: #007bff; text-decoration: none;">www.encoreai.com</a></p>
            <div style="margin-top: 10px;">
                <a href="#"><img src="https://via.placeholder.com/24" alt="Instagram" style="height: 24px; margin: 0 10px;"></a>
                <a href="#"><img src="https://via.placeholder.com/24" alt="LinkedIn" style="height: 24px; margin: 0 10px;"></a>
                <a href="#"><img src="https://via.placeholder.com/24" alt="WhatsApp" style="height: 24px; margin: 0 10px;"></a>
            </div>
        </div>
    </div>
</body>
</html>`;
}

export function getBugReportTemplate(
    name: string,
    email: string,
    subject: string,
    message: string,
): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bug Report</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f9ff; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="padding: 20px; text-align: center; background-color: #eef7ff;">
          <img src="https://i.postimg.cc/7Z0dVC39/encore-svg.png" alt="Encore Logo" style="height: 40px;">
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #333;">New Bug Report Submitted</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-line;">${message}</p>
        </div>
        <div style="padding: 10px; text-align: center; background-color: #f8f9fa; color: #999;">
          <p>Encore Support Team</p>
          <p>7293 NW 2nd Ave, Miami, FL 33150</p>
        </div>
      </div>
    </body>
    </html>
    `;
}

export function getFeatureRequestTemplate(
    name: string,
    email: string,
    subject: string,
    message: string,
): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Feature Request</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f9ff; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="padding: 20px; text-align: center; background-color: #eef7ff;">
          <img src="https://i.postimg.cc/7Z0dVC39/encore-svg.png" alt="Encore Logo" style="height: 40px;">
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #333;">New Feature Request Submitted</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-line;">${message}</p>
        </div>
        <div style="padding: 10px; text-align: center; background-color: #f8f9fa; color: #999;">
          <p>Encore Support Team</p>
          <p>7293 NW 2nd Ave, Miami, FL 33150</p>
        </div>
      </div>
    </body>
    </html>
    `;
}

export function getFeedbackTemplate(
    name: string,
    email: string,
    subject: string,
    message: string,
): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Feedback</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f9ff; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="padding: 20px; text-align: center; background-color: #eef7ff;">
          <img src="https://i.postimg.cc/7Z0dVC39/encore-svg.png" alt="Encore Logo" style="height: 40px;">
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #333;">New Feedback Submitted</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-line;">${message}</p>
        </div>
        <div style="padding: 10px; text-align: center; background-color: #f8f9fa; color: #999;">
          <p>Encore Support Team</p>
          <p>7293 NW 2nd Ave, Miami, FL 33150</p>
        </div>
      </div>
    </body>
    </html>
    `;
}


