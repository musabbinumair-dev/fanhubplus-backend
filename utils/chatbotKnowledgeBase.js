import Category from '../models/Category.js';
import Content from '../models/Content.js';
import Character from '../models/Character.js';
import Merchandise from '../models/Merchandise.js';

export const STATIC_FAQS = [
  {
    id: 'onboarding_tour',
    keywords: ['tour', 'show me around', 'new here', 'getting started', 'guide', 'how to use', 'what is fanhub', 'welcome', 'start'],
    response: `Welcome to **FanHubPlus**! 🎉 Here is a quick guide to what you can do on our platform:
• 📖 **Explore Fandoms:** Discover trending articles, video breakdowns, images, and audio across 8+ fandom categories.
• ✍️ **Submit Fan Content:** Share your own articles, art, and trailers with our community.
• 🦸 **Character Wiki:** Explore rich character lore and biographies.
• 🛍️ **Merchandise Store:** Discover collectibles and pre-orders.
• 👍 **Vote & Bookmark:** React to content and save items to your personal library.

Where would you like to start?`,
    quickReplies: ['🔥 Top Rated Content', '✍️ Submit Fan Content', '🦸 Characters Wiki', '🤖 Want suggestions?'],
    action: { label: 'Explore Home', path: '/' }
  },
  {
    id: 'submit_content',
    keywords: ['submit', 'upload', 'fan content', 'fan submission', 'post article', 'upload video', 'submit art', 'fanfiction'],
    response: `You can submit your own fan creations directly to FanHubPlus! 🎨
1. Navigate to the **Submit Content** page from the sidebar or click below.
2. Select your category and content type (Article with PDF document, Video URL/File, or Images).
3. Fill in your title, description, and tags.
4. Hit **Submit** — your post will enter the admin moderation queue for review!`,
    quickReplies: ['✍️ Submit Fan Content', '⏳ Admin Review Process', '🤖 Want suggestions?'],
    action: { label: 'Go to Submit Page', path: '/submit-content' }
  },
  {
    id: 'admin_review',
    keywords: ['admin review', 'approval', 'pending', 'how long review', 'moderation', 'rejected', 'approved'],
    response: `**How Content Moderation Works:**
When you submit fan content, our Admin team reviews it for quality and safety.
• **Pending Status:** Your submission is awaiting review.
• **Approved:** Your submission is published publicly and appears on the Explore feed. You will receive an instant notification!
• **Rejected:** Submissions that violate community guidelines will be declined with feedback.`,
    quickReplies: ['✍️ Submit Fan Content', '🔔 Notifications', '🤖 Want suggestions?'],
    action: { label: 'Check Submissions', path: '/submit-content' }
  },
  {
    id: 'categories_info',
    keywords: ['categories', 'fandoms', 'genre', 'what categories', 'category list', 'anime', 'gaming', 'movies', 'kpop', 'manga', 'cosplay'],
    response: `FanHubPlus supports multiple fandom categories:
• **Anime:** Japanese animated series, movies & lore.
• **Gaming:** Video games, mechanics & esports.
• **Movies:** Cinematic universes & feature films.
• **TV Shows:** Drama, sci-fi & streaming hits.
• **K-Pop:** Korean idol groups, music videos & news.
• **Comics:** Graphic novels & Western superheroes.
• **Manga:** Serialized Japanese comics & manhwa.
• **Cosplay:** Costume craft, props & conventions.`,
    quickReplies: ['🎬 Explore Anime', '🎮 Explore Gaming', '🍿 Explore Movies', '🤖 Want suggestions?'],
    action: { label: 'Browse Categories', path: '/category' }
  },
  {
    id: 'reactions_voting',
    keywords: ['vote', 'react', 'thumbs up', 'thumbs down', 'rating', 'popularity', 'ratio', 'like', 'dislike'],
    response: `**Voting & Ratings on FanHubPlus:**
• You can cast a **Thumbs Up 👍** or **Thumbs Down 👎** on published content.
• The platform computes a dynamic **Approval Ratio** based on real community feedback.
• Top-rated content is featured on the homepage **Trending Feed**!`,
    quickReplies: ['🔥 View Top Rated', '📖 Read Articles', '🤖 Want suggestions?'],
    action: { label: 'Explore Trending', path: '/' }
  },
  {
    id: 'merchandise_info',
    keywords: ['merchandise', 'shop', 'buy', 'store', 'collectibles', 'figures', 'hoodie', 'apparel', 'pre-order'],
    response: `Check out the **FanHub Merchandise** catalog! 🛍️
Browse limited-edition fandom apparel, collector prop replicas, spaceship diecast models, and upcoming pre-orders.`,
    quickReplies: ['🛍️ View Merchandise', '🔥 Top Articles', '🤖 Want suggestions?'],
    action: { label: 'Open Merchandise Store', path: '/merchandise' }
  },
  {
    id: 'events_info',
    keywords: ['events', 'conventions', 'meetup', 'comic-con', 'anime expo', 'calendar', 'dates'],
    response: `Explore upcoming fandom conventions, cosplay showcases, and gaming tournaments in the **Events** section! 📅
Stay updated on event dates, locations, and ticket availability.`,
    quickReplies: ['📅 View Events', '🎭 Cosplay Lore', '🤖 Want suggestions?'],
    action: { label: 'View Events Calendar', path: '/events' }
  },
  {
    id: 'characters_info',
    keywords: ['character', 'characters', 'lore', 'heroes', 'bio', 'wiki', 'pilot', 'detective', 'fandom character'],
    response: `Discover character profiles and official backstories in the **Character Wiki**! 🦸
Explore skillsets, associated fandoms, character artwork, and lore summaries.`,
    quickReplies: ['🦸 View Characters', '✍️ Submit Fan Content', '🤖 Want suggestions?'],
    action: { label: 'Explore Characters', path: '/characters' }
  },
  {
    id: 'bookmarks_info',
    keywords: ['bookmark', 'save', 'saved', 'saved items', 'favorites', 'reading list'],
    response: `Save any article or video to your **Saved Bookmarks** for quick offline reading and later viewing! 🔖
Access all your saved content anytime from the sidebar.`,
    quickReplies: ['🔖 View Saved Bookmarks', '🔥 Trending Content', '🤖 Want suggestions?'],
    action: { label: 'Open Bookmarks', path: '/saved' }
  },
  {
    id: 'profile_info',
    keywords: ['profile', 'avatar', 'account', 'settings', 'change avatar', 'password', 'user settings', 'logout'],
    response: `**Account & Profile Settings:**
• Click your profile avatar in the top right to open **Profile & Settings**.
• Customize your custom display name, bio, and upload high-res avatar photos.
• Manage your saved bookmarks and submission history seamlessly.`,
    quickReplies: ['👤 View Profile', '🔒 Account Settings', '🤖 Want suggestions?'],
    action: { label: 'My Profile', path: '/profile' }
  }
];

export async function matchRuleBasedIntent(userQuery = '') {
  const query = userQuery.toLowerCase().trim();

  // 1. Check for specific content recommendation requests
  const isRecommendation = query.includes('recommend') || query.includes('suggest') || query.includes('top') || query.includes('best') || query.includes('popular');

  if (isRecommendation) {
    try {
      let filter = { status: 'published' };

      // Check if user specifically requested a category
      const categories = await Category.find();
      const matchedCategory = categories.find(c => query.includes(c.name.toLowerCase()) || query.includes(c.slug.toLowerCase()));
      if (matchedCategory) {
        filter.categoryId = matchedCategory._id;
      }

      const topContents = await Content.find(filter)
        .populate('categoryId', 'name')
        .sort({ thumbsUpRatio: -1, popularityScore: -1 })
        .limit(3);

      if (topContents.length > 0) {
        const listText = topContents.map((item, idx) => {
          const catName = item.categoryId?.name || 'General';
          const type = (item.type || 'Article').toUpperCase();
          return `${idx + 1}. **${item.title}** (${catName} • ${type})`;
        }).join('\n');

        return {
          text: `Here are top recommendations from our database:\n\n${listText}\n\nWould you like more in-depth personalized suggestions? Click **"🤖 Want suggestions?"** below to activate Gemini AI mode!`,
          quickReplies: ['🔥 Top Articles', '🎬 Explore Categories', '🤖 Want suggestions?'],
          action: { label: 'Explore Content', path: matchedCategory ? `/category` : '/' },
          mode: 'rule_based'
        };
      }
    } catch (err) {
      console.error('Error fetching database recommendations:', err);
    }
  }

  // 2. Match against static FAQs with keyword scoring
  let bestMatch = null;
  let highestScore = 0;

  for (const faq of STATIC_FAQS) {
    let score = 0;
    for (const keyword of faq.keywords) {
      if (query.includes(keyword)) {
        score += keyword.length;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = faq;
    }
  }

  if (bestMatch && highestScore >= 3) {
    return {
      text: bestMatch.response,
      quickReplies: bestMatch.quickReplies,
      action: bestMatch.action,
      mode: 'rule_based'
    };
  }

  // 3. Fallback General Assistant Response
  return {
    text: `I'm your **FanHubPlus Navigator**! I can help you with:
• **Platform Navigation:** Finding articles, videos, merchandise, or events.
• **Submissions:** Guidelines for submitting your own fan content.
• **Database Recommendations:** Top rated content and fandom wikis.

You can also click **"🤖 Want suggestions?"** to ask open-ended questions powered by Gemini AI!`,
    quickReplies: ['🚀 Show Me Around', '🔥 Top Rated Content', '✍️ Submit Fan Content', '🤖 Want suggestions?'],
    action: { label: 'Explore Home', path: '/' },
    mode: 'rule_based'
  };
}
