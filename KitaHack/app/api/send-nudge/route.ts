import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { adminMessaging, adminDb } from '@/lib/firebaseAdmin';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { userId, displayName, nutricoinBalance, sukuScore, timeOfDay, nearbyArea } = await request.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const context = `
User Info:
- Name: ${displayName || 'User'}
- NutriCoin Balance: ${nutricoinBalance || 0}
- Latest Suku-Suku Score: ${sukuScore || 'None yet'}
- Time of Day: ${timeOfDay || new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
- Nearby Area: ${nearbyArea || 'Unknown'}

Generate a short, friendly, actionable push notification for this Malaysian student about healthy eating. The nudge should be:
1. Culturally relevant (mention specific Malaysian food like Tandoori Chicken, Nasi Campur, etc.)
2. Contextual to the time of day (breakfast tips in morning, dinner tips in evening)
3. Encouraging and fun (use 1 emoji max)
4. Budget-conscious (mention RM savings if applicable)

Respond ONLY with valid JSON:
{
  "notification": {
    "title": "Short catchy title (max 6 words)",
    "body": "1-2 sentence actionable tip (max 100 chars)"
  },
  "data": {
    "nudge_type": "health or budget or location",
    "action_url": "/plan or /scanner or /leaderboard"
  }
}`;

    const result = await model.generateContent(context);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const parsed = JSON.parse(text);

    // Attempt to send via FCM if user has a registered token
    let sentViaFCM = false;
    if (userId) {
      try {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const fcmToken = userDoc.exists ? userDoc.data()?.fcmToken : null;

        if (fcmToken) {
          await adminMessaging.send({
            token: fcmToken,
            notification: {
              title: parsed.notification.title,
              body: parsed.notification.body,
            },
            data: {
              nudge_type: parsed.data.nudge_type,
              action_url: parsed.data.action_url,
            },
          });
          sentViaFCM = true;
          console.log('FCM: Push sent to', userId);
        }
      } catch (fcmErr) {
        console.warn('FCM send failed (falling back to in-app):', fcmErr);
      }
    }

    return NextResponse.json({ ...parsed, sentViaFCM });
  } catch (error: any) {
    console.error('Nudge generation error:', error);

    // Fallback nudge
    return NextResponse.json({
      notification: {
        title: 'Stay on Track! 💪',
        body: 'Log your next meal to earn NutriCoins and climb the leaderboard!',
      },
      data: {
        nudge_type: 'health',
        action_url: '/scanner',
      },
    });
  }
}
