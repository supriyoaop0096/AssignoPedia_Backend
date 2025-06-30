// Social Media API Configuration
const SOCIAL_MEDIA_CONFIG = {
    facebook: {
        appId: 'YOUR_FACEBOOK_APP_ID',
        appSecret: 'YOUR_FACEBOOK_APP_SECRET',
        accessToken: 'YOUR_FACEBOOK_ACCESS_TOKEN',
        apiVersion: 'v18.0',
        pageId: 'YOUR_FACEBOOK_PAGE_ID'
    },
    instagram: {
        appId: 'YOUR_INSTAGRAM_APP_ID',
        appSecret: 'YOUR_INSTAGRAM_APP_SECRET',
        accessToken: 'YOUR_INSTAGRAM_ACCESS_TOKEN',
        apiVersion: 'v18.0',
        businessAccountId: 'YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID'
    },
    linkedin: {
        clientId: 'YOUR_LINKEDIN_CLIENT_ID',
        clientSecret: 'YOUR_LINKEDIN_CLIENT_SECRET',
        accessToken: 'YOUR_LINKEDIN_ACCESS_TOKEN',
        organizationId: 'YOUR_LINKEDIN_ORGANIZATION_ID'
    }
};

// API Endpoints
const API_ENDPOINTS = {
    facebook: `https://graph.facebook.com/${SOCIAL_MEDIA_CONFIG.facebook.apiVersion}`,
    instagram: `https://graph.facebook.com/${SOCIAL_MEDIA_CONFIG.instagram.apiVersion}`,
    linkedin: 'https://api.linkedin.com/v2'
};

// Export configuration
export { SOCIAL_MEDIA_CONFIG, API_ENDPOINTS }; 