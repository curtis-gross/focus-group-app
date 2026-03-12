# Marketing Brief Audience Integration Plan

## Goal Description
Move "Audiences" above "Marketing Brief" in the navigation. Add an introduction to the home page explaining the 3-step workflow. Integrate the personas generated from the Audience Generator into the Marketing Brief page, including ALL generated audiences in the brief generation by default.

## User Review Required
> [!IMPORTANT]
> Please review this plan. Once approved, I will proceed to implementation.

## Proposed Changes

### [MODIFY] `components/Navigation.tsx`
- Reorder `navItems` array so that `AppMode.AUDIENCE_GEN` is second, directly after `AppMode.HOME`, and before `AppMode.MARKETING_BRIEF`. (Completed)

### [MODIFY] `components/Home.tsx`
- Reorder the `tools` array to match the navigation order. (Completed)
- Add an introduction text section explaining the workflow. Update the language to say "Create a tailored marketing brief and assets for all your generated audiences." instead of selecting one.

### [MODIFY] `components/MarketingBrief.tsx`
- **State**: Fetch personas from `/api/load-run/audience_generator` on mount to populate an `availableAudiences` state array.
- **UI**: Display the "Audiences - from Audience Generator" section to show ALL included audiences by default. Remove the selection logic since all are included.
- **Submission**: Pass the entire `availableAudiences` array to `generateMarketingBrief`.

### [MODIFY] `services/geminiService.ts`
- **`generateMarketingBrief`**: Update the `sourceAudience` parameter to accept an array of Personas (`sourceAudiences?: any[]`). 
- **Prompt Update**: If `sourceAudiences` is provided, iterate through them and inject their localized details into the prompt. This forces the LLM to write the brief targeting all the included segments.

## Verification Plan
1. Check the Home page language.
2. Check the Marketing Brief page to see that audiences are displayed as included.
3. Generate a brief and verify the LLM encompasses all audiences.
