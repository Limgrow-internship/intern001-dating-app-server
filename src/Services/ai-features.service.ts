import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AIRouterService } from './ai-router.service';
import { Profile, ProfileDocument } from '../Models/profile.model';
import { Match, MatchDocument } from '../Models/match.model';
import { PhotoService } from './photo.service';

@Injectable()
export class AIFeaturesService {
  private readonly logger = new Logger(AIFeaturesService.name);

  constructor(
    private aiRouter: AIRouterService,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    private photoService: PhotoService,
  ) {}

  /**
   * Generate conversation starter for a match
   */
  async generateConversationStarter(
    userId: string,
    matchedUserId: string,
  ): Promise<{ starter: string; provider: string; latency: number }> {
    // Get both profiles
    const [userProfile, matchProfile] = await Promise.all([
      this.profileModel.findOne({ userId }),
      this.profileModel.findOne({ userId: matchedUserId }),
    ]);

    if (!userProfile || !matchProfile) {
      throw new Error('Profile not found');
    }

    // Build prompt
    const prompt = `Generate a friendly, natural conversation starter for two people who just matched on a dating app.

Person 1: ${userProfile.firstName || 'User'}, ${userProfile.age} years old
Interests: ${userProfile.interests?.join(', ') || 'Not specified'}
Bio: ${userProfile.bio || 'Not specified'}

Person 2: ${matchProfile.firstName || 'Match'}, ${matchProfile.age} years old
Interests: ${matchProfile.interests?.join(', ') || 'Not specified'}
Bio: ${matchProfile.bio || 'Not specified'}

Generate ONE short, casual, friendly conversation starter (max 2 sentences) that references their common interests or something from their profiles. Make it warm and engaging.

Conversation starter:`;

    const response = await this.aiRouter.generate({
      prompt,
      temperature: 0.8,
      maxTokens: 100,
    });

    return {
      starter: response.text.trim(),
      provider: response.provider,
      latency: response.latency,
    };
  }

  /**
   * Generate profile enhancement suggestions
   */
  async generateProfileTips(
    userId: string,
  ): Promise<{ tips: string[]; provider: string }> {
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Check if user has photos via Photo service
    const photos = await this.photoService.getUserPhotos(userId);
    const hasPhotos = photos && photos.length > 0;

    const prompt = `Analyze this dating profile and provide 3 specific, actionable tips to improve it.

Profile:
- Name: ${profile.firstName || 'Not set'} ${profile.lastName || ''}
- Age: ${profile.age || 'Not set'}
- Gender: ${profile.gender || 'Not set'}
- Bio: ${profile.bio || 'Empty bio'}
- Interests: ${profile.interests?.join(', ') || 'No interests listed'}
- Has profile picture: ${hasPhotos ? 'Yes' : 'No'}

Provide exactly 3 tips in this format:
1. [Specific tip]
2. [Specific tip]
3. [Specific tip]

Focus on:
- What's missing or incomplete
- How to make the bio more engaging
- How to better showcase personality
- Adding more specific interests

Tips:`;

    const response = await this.aiRouter.generate({
      prompt,
      temperature: 0.7,
      maxTokens: 300,
    });

    // Parse tips from response
    const tips = response.text
      .split('\n')
      .filter((line) => /^\d+\./.test(line.trim()))
      .map((line) => line.replace(/^\d+\.\s*/, '').trim())
      .slice(0, 3);

    return {
      tips,
      provider: response.provider,
    };
  }

  /**
   * Generate compatibility explanation for a match
   */
  async generateCompatibilityInsight(
    userId: string,
    matchedUserId: string,
  ): Promise<{ insight: string; provider: string }> {
    const [userProfile, matchProfile] = await Promise.all([
      this.profileModel.findOne({ userId }),
      this.profileModel.findOne({ userId: matchedUserId }),
    ]);

    if (!userProfile || !matchProfile) {
      throw new Error('Profile not found');
    }

    // Find common interests
    const userInterests = new Set(
      (userProfile.interests || []).map((i) => i.toLowerCase()),
    );
    const matchInterests = new Set(
      (matchProfile.interests || []).map((i) => i.toLowerCase()),
    );
    const commonInterests = [...userInterests].filter((i) =>
      matchInterests.has(i),
    );

    const prompt = `Generate a warm, positive explanation of why these two people matched on a dating app.

Person 1: ${userProfile.firstName || 'User'}, ${userProfile.age} years old
Interests: ${userProfile.interests?.join(', ') || 'Not specified'}

Person 2: ${matchProfile.firstName || 'Match'}, ${matchProfile.age} years old
Interests: ${matchProfile.interests?.join(', ') || 'Not specified'}

Common interests: ${commonInterests.join(', ') || 'None directly listed'}

Write 2-3 sentences explaining what makes them compatible. Be positive, specific, and mention their common interests or complementary traits.

Explanation:`;

    const response = await this.aiRouter.generate({
      prompt,
      temperature: 0.7,
      maxTokens: 150,
    });

    return {
      insight: response.text.trim(),
      provider: response.provider,
    };
  }

  /**
   * Enhance user bio with AI
   */
  async enhanceBio(
    userId: string,
  ): Promise<{ originalBio: string; enhancedBio: string; provider: string }> {
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }
  
    if (!profile.bio || profile.bio.trim().length === 0) {
      throw new Error('No bio to enhance');
    }
  
    this.logger.log(
      `EnhanceBio request user=${userId}, bio="${(profile.bio || '').slice(
        0,
        200,
      )}"`,
    );

    const prompt = `Bạn là chuyên gia viết hồ sơ hẹn hò. Hãy viết lại đoạn bio dưới đây thành phiên bản mới, súc tích và lôi cuốn hơn. Giữ nguyên thông tin và cá tính, dùng đúng ngôn ngữ của bio gốc (nếu bio gốc là tiếng Việt, hãy viết tiếng Việt).

Bio gốc:
"""${profile.bio}"""

Sở thích: ${profile.interests?.join(', ') || 'Không nêu'}

Yêu cầu:
- Viết 1-2 câu (40-80 từ), mở đầu bắt tai và tích cực
- Diễn đạt KHÁC so với bio gốc (đổi cấu trúc câu, dùng từ mới, tránh lặp lại câu/ý cũ)
- Giọng tự nhiên, chân thật, ngôi thứ nhất
- Có thể lồng 1-2 sở thích nếu phù hợp
- Không bịa thêm thông tin
- Không trả về tiêu đề, nhãn, hay dấu ngoặc kép

Bio đã viết lại:`;
  
    const response = await this.aiRouter.generate({
      prompt,
      temperature: 0.9,
      maxTokens: 140,
    });
  
    this.logger.log(
      `EnhanceBio response user=${userId}, provider=${response.provider}, raw="${response.text?.slice(
        0,
        200,
      )}"`,
    );

    return {
      originalBio: profile.bio,
      enhancedBio: response.text.trim().replace(/^["']|["']$/g, ''),
      provider: response.provider,
    };
  }

  /**
   * Generate bio from user prompt/ideas
   */
  async generateBio(
    userId: string,
    userPrompt: string,
  ): Promise<{ generatedBio: string; provider: string }> {
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }
  
    const prompt = `You are a dating-profile copywriter. Create a SHORT, CONCISE, and HIGHLY ENGAGING bio that matches the language of the user's ideas. Detect the language from the user's prompt: reply in that language. If the language is unclear, default to Vietnamese. Use only one language consistently.

User's ideas/prompt: "${userPrompt}"

User information:
- Name: ${profile.firstName || 'User'} ${profile.lastName || ''}
- Age: ${profile.age || 'Not specified'}
- Gender: ${profile.gender || 'Not specified'}
- Interests: ${profile.interests?.join(', ') || 'Not specified'}

Guidelines:
- 1-2 sentences, 30-70 words
- Start with a hook that grabs attention immediately
- Be punchy, witty, and memorable
- Show personality in few words
- Use active voice and strong verbs
- Use the information from the user's prompt
- Make it attractive but not overly promotional
- Do not add information that wasn't in the user's prompt
- Write in first person
- Keep a single language; do not mix languages
- Make every word count - remove filler words

Generated bio:`;
  
    const response = await this.aiRouter.generate({
      prompt,
      temperature: 0.85,
      maxTokens: 150,
    });
  
    return {
      generatedBio: response.text.trim().replace(/^["']|["']$/g, ''),
      provider: response.provider,
    };
  }
  

  /**
   * Generate date ideas based on common interests
   */
  async generateDateIdeas(
    userId: string,
    matchedUserId: string,
  ): Promise<{ ideas: string[]; provider: string }> {
    const [userProfile, matchProfile] = await Promise.all([
      this.profileModel.findOne({ userId }),
      this.profileModel.findOne({ userId: matchedUserId }),
    ]);

    if (!userProfile || !matchProfile) {
      throw new Error('Profile not found');
    }

    const userInterests = new Set(
      (userProfile.interests || []).map((i) => i.toLowerCase()),
    );
    const matchInterests = new Set(
      (matchProfile.interests || []).map((i) => i.toLowerCase()),
    );
    const commonInterests = [...userInterests].filter((i) =>
      matchInterests.has(i),
    );
    const allInterests = [...new Set([...userInterests, ...matchInterests])];

    const prompt = `Suggest 3 creative first date ideas for two people based on their interests.

Common interests: ${commonInterests.join(', ') || 'None'}
All interests: ${allInterests.join(', ')}

Provide exactly 3 date ideas in this format:
1. [Specific date idea with brief description]
2. [Specific date idea with brief description]
3. [Specific date idea with brief description]

Make them:
- Specific and actionable
- Fun and engaging
- Related to their interests
- Good for getting to know each other

Date ideas:`;

    const response = await this.aiRouter.generate({
      prompt,
      temperature: 0.9,
      maxTokens: 300,
    });

    const ideas = response.text
      .split('\n')
      .filter((line) => /^\d+\./.test(line.trim()))
      .map((line) => line.replace(/^\d+\.\s*/, '').trim())
      .slice(0, 3);

    return {
      ideas,
      provider: response.provider,
    };
  }
}
