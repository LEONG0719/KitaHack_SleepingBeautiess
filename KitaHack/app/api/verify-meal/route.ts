import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
    try {
        const { imageBase64, mimeType, planned_dish_name } = await request.json();

        if (!imageBase64) {
            return NextResponse.json(
                { status: 'error', message: 'No image provided' },
                { status: 400 }
            );
        }

        if (!planned_dish_name) {
            return NextResponse.json(
                { status: 'error', message: 'No planned dish name provided' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are a "Proof of Meal" verification engine for NutriBalance AI, a Malaysian student health app. You must perform THREE sequential checks on this food image.

CONTEXT: The user's PLANNED MEAL is: "${planned_dish_name}"

═══════════════════════════════════════════
STEP 1: ANTI-CHEAT (Is this actually food?)
═══════════════════════════════════════════
- Verify the image contains a REAL, plated meal or drink.
- REJECT if: the image shows a keyboard, pet, empty plate, blurry unrecognizable photo, screenshot of food, or anything that is clearly NOT a real meal in front of the user.
- If rejected, set is_valid_food=false and provide a clear error_message.

═══════════════════════════════════════════
STEP 2: CONTEXT MATCH (Does it match the plan?)
═══════════════════════════════════════════
- Compare the visual contents to "${planned_dish_name}".
- Be LENIENT: Malaysian dishes vary in presentation. Nasi Lemak can look different at different stalls.
- If the planned meal is "Nasi Ayam", any chicken-and-rice dish should pass.
- If the planned meal is "Curry Mee" but the photo clearly shows an apple or a burger, FAIL the match.
- PASS if the food is reasonably in the same category/cuisine as the planned dish.
- If the match fails, set is_context_match=false.

═══════════════════════════════════════════
STEP 3: PORTION ANALYSIS (Suku-Suku Separuh)
═══════════════════════════════════════════
Based on Malaysian Ministry of Health "Suku-Suku Separuh" (Quarter-Quarter-Half) guidelines:
- IDEAL: 25% Carbohydrates, 25% Protein, 50% Fiber/Vegetables
- Visually estimate the plate ratios for carbs (rice, noodles, bread), protein (chicken, fish, tofu, egg), and fiber (vegetables, fruit, ulam).
- For mixed dishes (Fried Rice, Laksa, Nasi Goreng), estimate internal ingredient ratios.
- Ignore sauces/gravy for volume but consider them for context.

SCORING (suku_suku_score, 1-10):
- 9-10: Within 5% of ideal ratio
- 7-8: Close, minor adjustments needed
- 5-6: One category noticeably off
- 3-4: Two+ categories significantly off
- 1-2: Almost entirely one food group

COIN REWARDS (earned_coins):
- Score 8-10: 15 coins
- Score 5-7: 10 coins
- Score 1-4: 5 coins (just for logging)

═══════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════
Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "verification": {
    "is_valid_food": true,
    "is_context_match": true,
    "error_message": null
  },
  "analysis": {
    "detected_items": ["Rice", "Fried Egg", "Cucumber"],
    "carbs_pct": 50,
    "protein_pct": 25,
    "fiber_pct": 25
  },
  "scoring": {
    "suku_suku_score": 5,
    "earned_coins": 10,
    "feedback_message": "Good protein, but your rice portion is a bit high. Try adding more cucumber to hit that 50% fiber goal!"
  }
}

RULES:
- error_message must be null (not the string "null") when verification passes.
- If is_valid_food is false, still fill analysis with zeros and scoring with score=0, earned_coins=0.
- If is_valid_food is true but is_context_match is false, still do the portion analysis and scoring.
- feedback_message should be culturally relevant, mentioning Malaysian foods as suggestions.
- Keep feedback_message to 1-2 sentences, encouraging but firm.`;

        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: mimeType || 'image/jpeg',
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text();

        // Clean any markdown formatting
        text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        const parsed = JSON.parse(text);

        // Flatten the nested response into our PoMVerificationResult shape
        const pomResult = {
            is_valid_food: parsed.verification?.is_valid_food ?? false,
            is_context_match: parsed.verification?.is_context_match ?? false,
            error_message: parsed.verification?.error_message ?? null,
            detected_items: parsed.analysis?.detected_items ?? [],
            carbs_pct: parsed.analysis?.carbs_pct ?? 0,
            protein_pct: parsed.analysis?.protein_pct ?? 0,
            fiber_pct: parsed.analysis?.fiber_pct ?? 0,
            suku_suku_score: parsed.scoring?.suku_suku_score ?? 0,
            earned_coins: parsed.scoring?.earned_coins ?? 0,
            feedback_message: parsed.scoring?.feedback_message ?? '',
        };

        // If anti-cheat fails, return 400
        if (!pomResult.is_valid_food) {
            return NextResponse.json(
                {
                    status: 'rejected',
                    reason: 'anti_cheat',
                    message: pomResult.error_message || 'This does not look like food. Please try again with a real meal photo.',
                    data: pomResult,
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            status: 'success',
            data: pomResult,
        });
    } catch (error: any) {
        console.error('PoM verification error:', error);

        if (error.message?.includes('JSON')) {
            return NextResponse.json(
                { status: 'error', message: 'AI returned invalid format. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { status: 'error', message: error.message || 'Verification failed' },
            { status: 500 }
        );
    }
}
