import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
    try {
        const { imageBase64, mimeType } = await request.json();

        if (!imageBase64) {
            return NextResponse.json(
                { status: 'error', message: 'No image provided' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are a nutrition expert specialized in Malaysian cuisine and the Malaysian Ministry of Health's "Suku-Suku Separuh" (Quarter-Quarter-Half) healthy plate guidelines.

Analyze the food image provided and evaluate it against the ideal ratio:
- 25% Carbohydrates (rice, noodles, bread, roti)
- 25% Protein (chicken, beef, fish, tofu, egg, legumes)
- 50% Fiber/Vegetables (leafy greens, cucumber, fruits, ulam)

NOTE: Ignore sauces (sambal, kuah, gravy) for volume estimation, but consider them for calorie context.

SCORING RULES:
- Perfect (9-10): Matches 25:25:50 within a 5% margin.
- Good (7-8): Close to ideal with minor adjustments needed.
- Average (5-6): One category is noticeably off.
- Poor (3-4): Two or more categories are significantly off (e.g., >50% carbs with no veggies).
- Very Poor (1-2): Almost entirely one food group or not a proper meal.

EDGE CASES:
- If the image is NOT food, return: {"status":"error","message":"No food detected. Please scan a meal."}
- If the food is fast food (burger, pizza, etc.), mention "This is a treat meal" in the feedback.
- For mixed dishes (Fried Rice, Laksa), estimate internal ingredient ratios by visible texture.

NutriCoin Reward Rules:
- Score >= 8: Award 10 coins
- Score >= 5: Award 5 coins
- Any scan: Award at least 1 coin

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "status": "success",
  "data": {
    "detected_dish_name": "Specific Malaysian dish name",
    "breakdown": {
      "carbs_percentage": 0,
      "protein_percentage": 0,
      "fiber_percentage": 0,
      "other_percentage": 0
    },
    "suku_score": 5,
    "feedback": {
      "title": "Short punchy title",
      "message": "1-2 sentence culturally relevant tip using Malaysian food examples",
      "tone": "Encouraging but firm"
    },
    "nutricoin_reward": 5
  }
}`;

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

        return NextResponse.json(parsed);
    } catch (error: any) {
        console.error('Vision analysis error:', error);

        if (error.message?.includes('JSON')) {
            return NextResponse.json(
                { status: 'error', message: 'AI returned invalid format. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { status: 'error', message: error.message || 'Analysis failed' },
            { status: 500 }
        );
    }
}
