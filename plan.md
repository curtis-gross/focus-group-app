# Marketing Brief Audit & Fix Plan

## Goal Description
Audit the "Marketing Hub > Marketing Brief" to ensure content (social, youtube, website, etc.) is being generated, fix the image generation that is currently failing, and add terminal logging to track the generation process.

### Root Cause Analysis
**Why did it work for Audience Generator but not here?**
The `AudienceGenerator` correctly utilizes the `extractTextFromResponse` helper function to parse the raw JSON payload returned by the `/api/genai` proxy.
In `services/geminiService.ts`, the `generateMarketingCampaignAssets` function was attempting to access `copyResponse?.text` directly. Because the proxy strips the Vertex SDK's `.text` getter during JSON serialization, this value is `undefined`. Consequently, the fallback `"{}"` was used, resulting in an empty `data` object. Without `data.imagePrompt`, the image generation steps were skipped entirely, and the text copy fell back to hardcoded defaults.

## Proposed Changes

### [MODIFY] `services/geminiService.ts`
- **Fix JSON Parsing**: Update `generateMarketingCampaignAssets` to use `extractTextFromResponse(copyResponse)` instead of `copyResponse?.text || "{}"`.
- **Add Logging**: Keep the `console.log` statements I've already added to track the parsed `data` object, the main image prompt, and the recommendation image prompts, so they appear in the browser console.

### [MODIFY] `server.js`
- **Add Terminal Logging**: Update the `/api/genai/generateContent` proxy route to log the incoming model and an excerpt of the payload to the terminal so backend generation requests can be tracked.

## Verification Plan
### Manual Verification
1. Start the frontend server (`npm run dev`).
2. Navigate to **Marketing Hub > Marketing Brief**.
3. Generate a new brief explicitly watching the terminal for the `/api/genai/generateContent` logs.
4. Verify all text content (Social, Search, Email, YouTube, Website) is generated comprehensively.
5. Verify the main image and recommendation images are generated and displayed without falling back to placeholders.
