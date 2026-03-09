# A/B Test Tab Implementation Plan

## Goal Description
Add an 'A/B Test' tab to the Synthetic Focus Group feature. The system will take existing marketing creative, generate regional-specific adaptations (e.g., West New York, Central PA, Health specific, Generic), and simulate an A/B test with 20 synthetic users per audience to determine the most preferred creative variant.

## User Review Required
Please review this plan to ensure the `simulateABTestFocusGroup` approach (asking the LLM to choose the best among all 10 variants for a persona) meets your expectations for "A/B test", as true A/B tests typically compare 2 variants. If you prefer a tournament-style bracket or pairwise comparison, please let me know. 

## Proposed Changes

### Types & Data layer
- `types.ts`:
  - Add `ABTestResult` interface to capture the persona's selected variant and rationale.
  - Add `AB_TEST_SIMULATION` to the `SavedSimulation` type union.

### Services Layer
- `geminiService.ts`:
  - Implement `generateRegionalVariants(baseImage: string)`: Uses Gemini Image Gen to adapt a base image into 10 specific regional/thematic variants:
    - West New York, Northeast New York, Across Pennsylvania, Central PA, West PA, Delaware, West Virginia, Ohio, Health specific, Generic (default).
  - Implement `simulateABTestFocusGroup(pool: any[], variants: { region: string, image: string }[])`: Passes the persona details and the variants to a language model to simulate which creative the persona prefers and why.

### UI / Component Layer
- `SyntheticTesting.tsx`:
  - Add `'AB_TEST'` to the `activeTab` state and render a new tab button.
  - Add states: `abTestResults`, `isABTestingLoading`, `regionalVariants`.
  - Implement `handleRunABTestSim()`:
    - Takes existing audience creatives.
    - Calls `generateRegionalVariants`.
    - Generates 20 users per audience (using the batch count multiplier).
    - Calls `simulateABTestFocusGroup`.
    - Auto-saves the run.
  - Build the UI to display the generated variants and simulation results (winning creatives and feedback).

## Verification Plan
1. Open the application and navigate to the "Synthetic Focus Group" hub.
2. Select audiences and generate a "Marketing Brief" to get base campaign assets.
3. Switch to the "A/B Test" tab.
4. Click "Run A/B Test Simulation".
5. Verify that 10 regional image variants are generated.
6. Verify that the simulation finishes and displays feedback from the synthetic users.
