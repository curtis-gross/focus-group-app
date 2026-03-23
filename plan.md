# QVC Acquisition Focus Group Plan

Targeting Gen-Z and Millennials for QVC Group Acquisition.

## Technical Approach
- Update the `SyntheticTesting` component to use QVC-specific acquisition offers (drops, AR, BNPL).
- Pass brand context (name, description) to GenAI simulation services.
- Refine the AI persona simulation prompt to better capture Gen-Z/Millennial "vibes".
- Add Gen-Z standard personas to the simulation data pool.

## File Changes
- `qvc-app/components/SyntheticTesting.tsx`: Update default `acquisitionOffers` state and simulation call arguments.
- `qvc-app/services/geminiService.ts`: Update `simulateAcquisitionFocusGroup` to use brand context and refined prompts.
- `qvc-app/data/simulationData.ts`: Add "The Savvy Social Shopper" (Gen-Z) persona.

## Potential Risks
- **Hallucination**: AI might invent product features not available at QVC.
- **Demographic Accuracy**: Persona simulation must be carefully prompted to avoid stereotypes.
- **Data Persistence**: Ensure new personas are saved correctly to the filesystem/json as per rules.

## Phase 2 Implementation (TDD)
- Spawn tests for `simulateAcquisitionFocusGroup` before implementation.
- Implement passing logic.
- Verify with 100% pass rate.
