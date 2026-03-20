# QVC AI Transformation: Branding, Navigation & Prompts

## Strategic Planning: Analysis
To complete the QVC transformation, we are auditing all AI prompts and application settings. This ensures that every AI-generated response, from the chat assistant to the marketing briefs, uses QVC's unique commerce language and strategic priorities (Live Broadcast, QCard, Daily Special Value) instead of the legacy medical or generic retail context.

## Proposed File Changes
- **`services/assistantService.ts`**: Rebrand the AI Assistant from "Healthco" to "QVC Commerce Advisor".
- **`services/geminiService.ts`**: Global audit of prompts to remove medical/generic retail terminology.
- **`config.ts`**: Finalize company metadata and logo scaling.
- **`components/Home.tsx`**: Redesign as a "Navigation Hub".
- **`public/data/`**: Rename and update `healthco_customer_data.json` to `qvc_customer_data.json`.

## Technical Approach
1.  **AI Assistant Persona**: Rewrite the `systemPrompt` in `assistantService.ts` to focus on commerce optimization and QVC-specific business metrics.
2.  **Prompt Refinement**: 
    - Use global search/replace for branding terms.
    - Manually refine complex prompts in `geminiService.ts` to include retail-specific examples (Jewelry, Electronics, Flash sales).
3.  **UI & Config**: 
    - Scale logo to `h-16`.
    - Implement the 3-column navigation grid in `Home.tsx`.

## Potential Risks
- **Prompt Regression**: Changing prompt wording might affect JSON parser reliability. We will verify this with Vitest.
- **Data Path Broken**: Renaming JSON files requires updating all `fetch` calls in the application.

## Status: COMPLETED
All branding, navigation, and prompt audit tasks have been successfully implemented. The application is now tailored as a QVC AI Lab with a commerce-first persona and data architecture.

### Final Verification Results
- Sidebar Logo: `h-16` (Doubled size)
- Home Page: 3-Column Navigation Hub
- AI Persona: QVC Commerce Advisor
- Customer Data: Sarah Jenkins (QCard Holder)
- Prompts: Retail/Commerce context enabled globally.
