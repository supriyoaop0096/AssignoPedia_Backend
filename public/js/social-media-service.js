import { SOCIAL_MEDIA_CONFIG, API_ENDPOINTS } from './social-media-config.js';

class SocialMediaService {
    constructor() {
        this.config = SOCIAL_MEDIA_CONFIG;
        this.endpoints = API_ENDPOINTS;
    }

    // Facebook API Methods
    async postToFacebook(caption, file) {
        try {
            // First, upload the media if a file is provided
            let mediaId = null;
            if (file) {
                const formData = new FormData();
                formData.append('source', file);
                formData.append('access_token', this.config.facebook.accessToken);
                formData.append('published', 'false');

                const uploadResponse = await fetch(
                    `${this.endpoints.facebook}/${this.config.facebook.pageId}/photos`,
                    {
                        method: 'POST',
                        body: formData
                    }
                );
                const uploadData = await uploadResponse.json();
                if (uploadData.error) throw new Error(uploadData.error.message);
                mediaId = uploadData.id;
            }

            // Create the post with caption and media
            const postData = {
                message: caption,
                access_token: this.config.facebook.accessToken
            };

            if (mediaId) {
                postData.attached_media = [{ media_fbid: mediaId }];
            }

            const response = await fetch(
                `${this.endpoints.facebook}/${this.config.facebook.pageId}/feed`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(postData)
                }
            );

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return { success: true, postId: data.id };
        } catch (error) {
            console.error('Facebook posting error:', error);
            throw new Error(`Failed to post to Facebook: ${error.message}`);
        }
    }

    // Instagram API Methods
    async postToInstagram(caption, file) {
        try {
            if (!file) {
                throw new Error('Instagram requires an image or video file');
            }

            // First, create a container for the media
            const containerData = {
                image_url: URL.createObjectURL(file),
                caption: caption,
                access_token: this.config.instagram.accessToken
            };

            const containerResponse = await fetch(
                `${this.endpoints.instagram}/${this.config.instagram.businessAccountId}/media`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(containerData)
                }
            );

            const containerResult = await containerResponse.json();
            if (containerResult.error) throw new Error(containerResult.error.message);

            // Publish the container
            const publishData = {
                creation_id: containerResult.id,
                access_token: this.config.instagram.accessToken
            };

            const publishResponse = await fetch(
                `${this.endpoints.instagram}/${this.config.instagram.businessAccountId}/media_publish`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(publishData)
                }
            );

            const publishResult = await publishResponse.json();
            if (publishResult.error) throw new Error(publishResult.error.message);
            return { success: true, postId: publishResult.id };
        } catch (error) {
            console.error('Instagram posting error:', error);
            throw new Error(`Failed to post to Instagram: ${error.message}`);
        }
    }

    // LinkedIn API Methods
    async postToLinkedIn(caption, file) {
        try {
            let mediaAsset = null;
            if (file) {
                // Upload media to LinkedIn
                const uploadUrl = `${this.endpoints.linkedin}/assets?action=registerUpload`;
                const uploadData = {
                    registerUploadRequest: {
                        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                        owner: `urn:li:organization:${this.config.linkedin.organizationId}`,
                        serviceRelationships: [{
                            relationshipType: 'OWNER',
                            identifier: 'urn:li:userGeneratedContent'
                        }]
                    }
                };

                const uploadResponse = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.config.linkedin.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(uploadData)
                });

                const uploadResult = await uploadResponse.json();
                if (uploadResult.error) throw new Error(uploadResult.error.message);

                // Upload the actual file
                const formData = new FormData();
                formData.append('file', file);

                await fetch(uploadResult.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.config.linkedin.accessToken}`
                    },
                    body: file
                });

                mediaAsset = uploadResult.value.asset;
            }

            // Create the post
            const postData = {
                author: `urn:li:organization:${this.config.linkedin.organizationId}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text: caption
                        },
                        shareMediaCategory: file ? 'IMAGE' : 'NONE'
                    }
                }
            };

            if (mediaAsset) {
                postData.specificContent['com.linkedin.ugc.ShareContent'].media = [{
                    status: 'READY',
                    description: {
                        text: caption
                    },
                    media: mediaAsset
                }];
            }

            const response = await fetch(`${this.endpoints.linkedin}/ugcPosts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.linkedin.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return { success: true, postId: data.id };
        } catch (error) {
            console.error('LinkedIn posting error:', error);
            throw new Error(`Failed to post to LinkedIn: ${error.message}`);
        }
    }

    // Main posting method
    async postToSocialMedia(caption, file, platforms) {
        const results = {
            success: [],
            failed: []
        };

        for (const platform of platforms) {
            try {
                let result;
                switch (platform) {
                    case 'facebook':
                        result = await this.postToFacebook(caption, file);
                        break;
                    case 'instagram':
                        result = await this.postToInstagram(caption, file);
                        break;
                    case 'linkedin':
                        result = await this.postToLinkedIn(caption, file);
                        break;
                }
                results.success.push({ platform, postId: result.postId });
            } catch (error) {
                results.failed.push({ platform, error: error.message });
            }
        }

        return results;
    }
}

export default new SocialMediaService(); 