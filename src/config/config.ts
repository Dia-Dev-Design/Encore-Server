export interface Config {
  port: number;
  frontendUrl: string;
  database: {
    connectionString: string;
    logging: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  jwtStaff: {
    secret: string;
    expiresIn: string;
  };
  sendgrid: {
    apiKey: string;
    templates: {
      verifyEmail: string;
      resetPassword: string;
    };
  };
  mail: {
    address: string;
    name: string;
    replyTo: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
    redirectUrl: string;
  };
  langchain: {
    chatModel: string;
    openAiApiKey: string;
  };
  s3: {
    bucketName: string;
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
}

export default (): Config => ({
  port: parseInt(process.env.PORT, 10) || 8080,
  frontendUrl: process.env.FRONTEND_URL || 'https://dev.startupencore.ai',
  database: {
    connectionString: process.env.DATABASE_URL,
    logging: process.env.NODE_ENV === 'development',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
  jwtStaff: {
    secret: process.env.JWT_STAFF_SECRET,
    expiresIn: process.env.JWT_STAFF_EXPIRES_IN,
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    templates: {
      verifyEmail: process.env.SENDGRID_VERIFY_EMAIL_TEMPLATE,
      resetPassword: process.env.SENDGRID_RESET_PASSWORD_TEMPLATE,
    },
  },
  mail: {
    address: process.env.MAIL_SENDER,
    name: process.env.MAIL_SENDER_NAME,
    replyTo: process.env.MAIL_SENDER_REPLY_TO,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUrl: process.env.GOOGLE_REDIRECT_URL,
  },
  langchain: {
    openAiApiKey: '',
    chatModel: process.env.LANGCHAIN_CHAT_MODEL,
  },
  s3: {
    bucketName: process.env.S3_BUCKET_NAME,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  },
});
