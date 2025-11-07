# Prompt Update: Repository Discovery Focus

## 🎯 Overview

The chat prompts have been updated to optimize the system for **repository discovery** - helping users find the most useful repositories for their specific tasks and projects.

## 🔄 Changes Made

### Previous Focus
The system was designed as a general Q&A interface:
- Answer questions about code
- Explain how things work
- General repository information

### New Focus
The system is now optimized for **repository discovery from indexed collection**:
- Help users find repositories from THEIR indexed database that match their needs
- ONLY recommend repositories that are actually indexed
- DO NOT suggest external repositories or generic solutions
- Explain why each indexed repository is relevant
- Provide actionable recommendations based on what's available
- Rank indexed repositories by usefulness for the task

### Critical Constraint ⚠️
**The AI can ONLY recommend repositories that exist in the user's database.**
- ✅ Recommendations based on indexed repositories
- ✅ Context from actual code analysis
- ✅ Searches through user's collection
- ❌ NO external repository suggestions
- ❌ NO recommendations from general knowledge
- ❌ NO generic library suggestions

## 📝 Updated Prompts

### Files Modified
- `lib/langchain-utils.ts`
  - `generateRAGResponse()` - Updated for repository discovery
  - `generateRAGResponseWithTranslation()` - Updated with translation support
  - `generateRAGResponseSync()` - Updated for consistency

### New Prompt Structure

The AI assistant now:

1. **Understands the User's Task**
   - Analyzes what the user is trying to accomplish
   - Identifies the user's specific needs or goals

2. **Identifies Relevant Repositories**
   - Searches through indexed repositories
   - Matches repositories to the user's requirements

3. **Explains Relevance**
   - What each repository does
   - Why it's useful for the user's task
   - Key features that match their needs
   - Practical use cases and examples

4. **Provides Recommendations**
   - Ranks repositories by relevance
   - Suggests which repository to use for what purpose
   - Mentions if repositories can be used together
   - Compares options when multiple are available

5. **Stays Practical**
   - Includes code examples when helpful
   - Provides setup instructions
   - Offers actionable next steps

6. **Remains Honest**
   - Clearly states if no repository matches the need
   - Suggests what to look for instead

## 💬 Example Interactions

### Before (Q&A Focus)
```
User: "How does authentication work?"
AI: "Based on the code, authentication uses JWT tokens..."
```

### After (Discovery Focus - INDEXED REPOS ONLY)

**Scenario 1: Match Found**
```
User: "I need authentication for my Node.js API"
AI: "Based on YOUR indexed repositories, I found 2 options:

**[auth-service](https://github.com/user/auth-service)** ⭐ Recommended
- Full-featured authentication system with JWT support
- Perfect for Node.js REST APIs
- Includes user management, password hashing, and session handling

Usage example from the code:
\`\`\`javascript
const auth = require('auth-service');
app.use(auth.middleware());
\`\`\`

**[simple-jwt](https://github.com/user/simple-jwt)**
- Lightweight JWT-only implementation
- Good if you only need token generation/verification
- No database required

I'd recommend **auth-service** for a complete solution, or **simple-jwt** if you want minimal dependencies.

Click the repository names above to view them on GitHub."
```

**Note**: Repository names are now **clickable markdown links** that take you directly to the repository.

**Scenario 2: No Match Found**
```
User: "I need a machine learning library for Python"
AI: "None of your currently indexed repositories match this need. 
Your indexed repositories focus on web development and APIs, 
but don't include machine learning tools.

You may need to index additional repositories that provide 
machine learning capabilities for Python, such as ML-focused 
projects from your organization or repositories you're evaluating."
```

**Key Difference**: AI ONLY recommends from indexed repositories, never suggests external tools.

## 🌍 Multi-Language Support

The updated prompts maintain full multi-language support:
- Questions can be asked in any language
- Responses are translated to the user's language
- Technical terms and repository names stay in English
- Code examples remain untranslated

### Example (Chinese)
```
用户："我需要一个REST API框架"
AI：根据您索引的仓库，我找到了最适合的选项：

**express-starter** ⭐ 推荐
- 功能完整的Express.js REST API框架
- 包含路由、中间件和错误处理
- 非常适合快速搭建API

使用示例：
\`\`\`javascript
const app = require('express-starter');
app.listen(3000);
\`\`\`
```

## 🎨 UI Updates

### Welcome Message
Updated the chat interface to reflect the repository discovery focus:
- "🔍 Find the Perfect Repository"
- Task-oriented example queries
- Clear call to action

### Example Queries (Updated)
- "I need a library for authentication in Node.js"
- "Which repository can help me build a REST API?"
- "I'm looking for a tool to manage database migrations"
- "What's the best option for real-time communication?"

## 📊 Response Format

The AI now formats responses with:

### Structure
1. **Repository Names** (bold, clear)
2. **Relevance Ranking** (stars or priority indicators)
3. **Key Features** (bullet points)
4. **Code Examples** (syntax-highlighted)
5. **Recommendations** (actionable advice)

### Example Response Format
```markdown
Based on your needs, I found these repositories:

**repository-name** ⭐ Best Match
- Key feature 1
- Key feature 2
- Why it's useful

\`\`\`language
code example
\`\`\`

**Recommendation**: Use this one if [scenario]

**alternative-repo** ⚡ Alternative
- Different approach
- Lighter weight
- Good for [specific use case]

**When to use which**:
- Use **repository-name** for [scenario A]
- Use **alternative-repo** for [scenario B]
```

## 🧪 Testing the New Prompts

### Good Query Examples
✅ "I need to build a user authentication system"
✅ "Which tool is best for database migrations?"
✅ "I'm looking for a React component library"
✅ "What's available for API documentation?"
✅ "I need something for real-time chat"

### Query Types Optimized For
1. **Need-based**: "I need X for Y"
2. **Comparison**: "Which is better for Z?"
3. **Discovery**: "What do you have for X?"
4. **Recommendation**: "What should I use to do Y?"
5. **Task-based**: "I'm trying to build X"

## 🎯 Benefits

### For Users
- **Faster Discovery**: Find relevant repositories quickly
- **Better Matches**: AI understands intent and context
- **Practical Guidance**: Get setup instructions and examples
- **Informed Decisions**: Compare options with clear explanations
- **Multi-Language**: Ask in your preferred language

### For the System
- **Focused Purpose**: Clear role as a discovery tool
- **Better Responses**: Structured, actionable answers
- **Consistent Format**: Predictable response structure
- **Scalable**: Works well with growing repository collections

## 📚 Documentation Updates

### Files Updated
- `README.md` - Updated feature descriptions and examples
- `components/chat-interface.tsx` - New welcome message
- `PROMPT_UPDATE.md` - This documentation file

### Key Changes in README
- Main description emphasizes repository discovery
- Feature list highlights "Smart Repository Discovery"
- Example queries focus on finding tools for tasks
- Added section explaining what the AI does

## 🔮 Future Enhancements

Potential improvements to the discovery experience:

1. **Category Tagging**: Auto-tag repositories by type
2. **Popularity Metrics**: Show star counts or usage stats
3. **Compatibility Checks**: Warn about version requirements
4. **Similar Repos**: Suggest related repositories
5. **Learning Preferences**: Remember user's tech stack
6. **Integration Guides**: How to combine repositories
7. **Update Notifications**: Alert when repositories are outdated

## 📝 Notes

- Prompts maintain backward compatibility with existing queries
- Still works well for traditional Q&A about specific repositories
- Enhanced for discovery but not limited to it
- Translation quality maintained across languages
- Code examples and technical terms preserved in responses

## 🤝 Feedback

The new prompts are designed to make repository discovery:
- **Intuitive**: Natural language queries
- **Helpful**: Actionable recommendations
- **Accurate**: Based on actual repository content
- **Multilingual**: Works in any language
- **Practical**: Includes examples and instructions

---

*Last Updated: 2025-11-07*
*Version: 2.0 (Repository Discovery Focus)*

