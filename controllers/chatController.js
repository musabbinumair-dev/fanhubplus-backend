import { GoogleGenerativeAI } from '@google/generative-ai';
import ChatSession from '../models/ChatSession.js';
import { matchRuleBasedIntent } from '../utils/chatbotKnowledgeBase.js';

const SYSTEM_PROMPT = `You are the FanHubPlus Fandom Navigator, an enthusiastic, knowledgeable, and helpful AI assistant for FanHubPlus.
FanHubPlus is a community platform for fandom enthusiasts spanning Anime, Gaming, Movies, TV Shows, K-Pop, Comics, Manga, and Cosplay.
Key platform features:
1. Exploring multimedia content (Articles, Videos, Audio, Images).
2. Submitting user-created fan content for admin review.
3. Reacting to content with Thumbs Up/Down to influence community approval ratings.
4. Exploring Character lore wikis and Fandom merchandise collections.
5. Fandom events and conventions calendar.

Your tone should be friendly, fandom-savvy, concise, and structured with clean markdown bullet points. Suggest exploring relevant categories and invite users to submit content or check out trending articles.`;

export const handleChatMessage = async (req, res) => {
  try {
    const { message, sessionId, useAiMode } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let session = await ChatSession.findOne({ sessionId: currentSessionId });
    if (!session) {
      session = new ChatSession({
        sessionId: currentSessionId,
        userId: req.user ? req.user._id : null,
        messages: []
      });
    } else if (req.user && !session.userId) {
      session.userId = req.user._id;
    }

    const userMessageObj = {
      sender: 'user',
      text: message.trim(),
      mode: useAiMode ? 'ai_suggestion' : 'rule_based',
      timestamp: new Date()
    };
    session.messages.push(userMessageObj);

    let botResponse = null;

    // Check if user explicitly asked for AI mode or if useAiMode flag is set
    const wantsAiMode = Boolean(useAiMode || message.toLowerCase().includes('want suggestions') || message.toLowerCase().includes('ask ai'));

    if (wantsAiMode) {
      const apiKey = req.body.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

      if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY') {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const candidateModels = [
            'gemini-3.8-flash',
            'gemini-3.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-flash-latest'
          ];

          // Build conversational context with alternating roles
          const rawHistory = session.messages.slice(-8, -1);
          const cleanHistory = [];
          for (const m of rawHistory) {
            if (!m.text || !m.text.trim()) continue;
            const role = m.sender === 'user' ? 'user' : 'model';
            if (cleanHistory.length === 0) {
              if (role === 'user') {
                cleanHistory.push({ role, parts: [{ text: m.text }] });
              }
            } else {
              const lastRole = cleanHistory[cleanHistory.length - 1].role;
              if (lastRole !== role) {
                cleanHistory.push({ role, parts: [{ text: m.text }] });
              }
            }
          }
          if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
            cleanHistory.pop();
          }

          let responseText = null;
          let lastErr = null;

          for (const modelName of candidateModels) {
            try {
              const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: SYSTEM_PROMPT
              });
              const chat = model.startChat({
                history: cleanHistory
              });
              const result = await chat.sendMessage(message);
              responseText = result.response.text();
              if (responseText) break;
            } catch (err) {
              lastErr = err;
            }
          }

          if (!responseText) {
            throw lastErr || new Error('Failed to generate response from Gemini models');
          }

          botResponse = {
            sender: 'bot',
            text: responseText,
            mode: 'ai_suggestion',
            quickReplies: ['🔥 Top Articles', '✍️ Submit Fan Content', '🛍️ Browse Merchandise'],
            action: { label: 'Explore Fandoms', path: '/category' },
            timestamp: new Date()
          };
        } catch (aiErr) {
          console.error('Gemini API call failed, falling back:', aiErr.message);
          const fallback = await matchRuleBasedIntent(message);
          botResponse = {
            sender: 'bot',
            text: `${fallback.text}\n\n*(Note: External AI is currently operating in offline mode).*`,
            mode: 'rule_based',
            quickReplies: fallback.quickReplies,
            action: fallback.action,
            timestamp: new Date()
          };
        }
      } else {
        // Missing or default API key fallback for AI suggestions
        const q = message.toLowerCase();
        let fallbackText = null;

        if (q.includes("spoiler") || q.includes("plot")) {
          fallbackText = "Here is a spoiler-free plot overview:\n\nIn a world where ancient elemental technologies lie dormant, an outcast traveler discovers a celestial signal. As competing factions mobilize to claim it, difficult choices between survival and solidarity shape the fate of the realm. Strong pacing and rich worldbuilding drive the journey without giving away late-game twists.";
        } else if (q.includes("idea") || q.includes("story") || q.includes("fiction")) {
          fallbackText = "Here is a story concept for you: **'The Echo Protocol'**\n\nPremise: In a neon-lit cyber metropolis, memories can be extracted and sold as virtual experiences. When an unlicensed memory runner finds a sequence predicting an impending blackout, they must ally with a disgraced pilot to stop it before the timeline collapses.";
        } else if (q.includes("compare") || q.includes("versus") || q.includes("vs")) {
          fallbackText = "Comparing **Cyberpunk** vs **Dark Fantasy**:\n\n• **Core Themes**: Cyberpunk delves into high-tech societal decay and corporate control, while Dark Fantasy explores grim moral ambiguity and supernatural ruin.\n• **Visual Style**: Neon lights, rain-slicked skyscrapers, and neural jacks vs crumbling castles, shadowed forests, and ancient arcane relics.";
        } else if (q.includes("review") || q.includes("write")) {
          fallbackText = "Here is an outline for writing an engaging fandom review:\n\n1. **Hook & Premise**: Start with your initial expectations and the core premise.\n2. **Worldbuilding & Pacing**: Discuss the atmosphere, art style, or soundtrack.\n3. **Character Dynamics**: Critique character motivations and key arcs.\n4. **Final Verdict**: State what kind of fans will enjoy it most and give a rating.";
        }

        if (fallbackText) {
          botResponse = {
            sender: 'bot',
            text: `${fallbackText}\n\n*(To connect live Gemini AI generation, add your \`GEMINI_API_KEY\` in \`Backend/.env\`)*`,
            mode: 'ai_suggestion',
            quickReplies: ['🔥 Top Articles', '✍️ Submit Fan Content', '🛍️ Browse Merchandise'],
            action: { label: 'Explore Fandoms', path: '/category' },
            timestamp: new Date()
          };
        } else {
          const fallback = await matchRuleBasedIntent(message);
          botResponse = {
            sender: 'bot',
            text: fallback.text,
            mode: 'rule_based',
            quickReplies: fallback.quickReplies,
            action: fallback.action,
            timestamp: new Date()
          };
        }
      }
    } else {
      // Rule-based and local database knowledge engine
      const ruleMatch = await matchRuleBasedIntent(message);
      botResponse = {
        sender: 'bot',
        text: ruleMatch.text,
        mode: 'rule_based',
        quickReplies: ruleMatch.quickReplies,
        action: ruleMatch.action,
        timestamp: new Date()
      };
    }

    session.messages.push(botResponse);
    session.lastActive = new Date();
    await session.save();

    return res.status(200).json({
      success: true,
      botMessage: botResponse,
      sessionId: currentSessionId
    });
  } catch (error) {
    console.error('Chat controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process chat message'
    });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;

    let query = { sessionId };
    if (req.user) {
      query = { $or: [{ sessionId }, { userId: req.user._id }] };
    }

    const session = await ChatSession.findOne(query);

    return res.status(200).json({
      success: true,
      messages: session ? session.messages : []
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve chat history'
    });
  }
};

export const clearChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;

    await ChatSession.findOneAndUpdate(
      { sessionId },
      { $set: { messages: [], lastActive: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: 'Chat history cleared successfully'
    });
  } catch (error) {
    console.error('Clear chat history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear chat history'
    });
  }
};
