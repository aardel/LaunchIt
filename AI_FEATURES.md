# AI Features with Groq

Launchpad now includes AI-powered features using Groq's free API (14,400 requests/day free tier).

## Getting Started

### 1. Get a Groq API Key

1. Visit [Groq Cloud Console](https://console.groq.com)
2. Sign up for a free account (no credit card required)
3. Go to API Keys section
4. Click "Create API Key"
5. Copy your API key

### 2. Enable AI in Launchpad

1. Open Launchpad Settings
2. Go to "AI Features" section
3. Paste your Groq API key
4. Toggle "Enable AI Features" ON
5. Click "Test Connection" to verify

## Available Features

### 1. Smart Categorization
When creating a new item, AI can suggest which group it belongs to based on the name, URL, and description.

**How to use:**
- Create a new item
- Click "AI Suggest Category" button
- AI will suggest the best group

### 2. Auto-Description Generation
Generate helpful descriptions for bookmarks automatically.

**How to use:**
- When adding a bookmark, click "AI Generate Description"
- AI creates a brief, relevant description

### 3. Smart Tagging
Get AI-suggested tags for your items.

**How to use:**
- In the add/edit item modal, click "AI Suggest Tags"
- AI suggests 3-5 relevant tags

### 4. Duplicate Detection
Find similar or duplicate items before creating new ones.

**How to use:**
- When adding an item, AI checks for similar existing items
- Shows suggestions if duplicates found
- Option to merge or skip

### 5. Semantic Search
Search by meaning, not just keywords.

**How to use:**
- Use the search bar as normal
- AI understands context and meaning
- Finds relevant items even without exact keyword matches

## API Limits

Groq's free tier includes:
- **14,400 requests per day**
- Fast inference (uses LPU - Language Processing Unit)
- No credit card required
- OpenAI-compatible API

## Privacy

- API key is stored encrypted in your settings
- All AI processing happens via Groq's API
- No data is stored by Groq (stateless API)
- You can disable AI features anytime

## Troubleshooting

**"AI service not enabled"**
- Make sure you've entered your API key
- Toggle "Enable AI Features" ON
- Test the connection

**"Connection failed"**
- Check your internet connection
- Verify API key is correct
- Check Groq status page

**Slow responses**
- Groq is usually very fast, but may be slower during high traffic
- Try again in a few seconds

## Future Features

Planned AI enhancements:
- Auto-organization of items
- Usage pattern analysis
- Smart suggestions based on time/context
- Natural language commands

## Cost

**Free tier:** 14,400 requests/day (more than enough for personal use)
**Paid tier:** Available if you need more (very affordable)

For most users, the free tier is more than sufficient!

