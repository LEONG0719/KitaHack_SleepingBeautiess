import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { messages, buddyContext } = await req.json();
    const { name, mood, vitality, level, streak, goals, campus, favoriteCuisine } = buddyContext;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash', // Using stable 1.5-flash for reliability
      systemInstruction: `You are ${name}, a cute kawaii cat NutriBuddy for Malaysian students. 
      Speak in English + Manglish (lah, leh, jom, aiyo). Keep replies 1-2 sentences max.
      Current State: Mood is ${mood}, Vitality is ${vitality}/100.
      You are food-obsessed. Mention Malaysian dishes like Nasi Lemak or Teh Tarik.
      Be playful and always end with a cat emoji! 🐾`,
    });

    // 1. 🔥 THE ULTIMATE FILTER: Remove broken messages & errors
    const validMessages = messages.filter((m: any) => 
      m.content && 
      m.content.trim().length > 2 && // Ignore fragments
      !m.content.includes("brain buffering") // Never remember the error message
    );

    // 2. Map roles and ensure they alternate correctly
    let historyData = validMessages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // 3. 🔥 THE CRITICAL SDK FIX: Ensure the first message is ALWAYS 'user'
    // If history starts with the cat's greeting, the SDK will crash
    while (historyData.length > 0 && historyData[0].role === 'model') {
      historyData.shift(); 
    }

    if (historyData.length === 0) {
      return NextResponse.json({ reply: "Meow? Say something first lah! 🐾" });
    }

    // 4. ROLE GUARD: Pop the latest message to send as the current prompt
    const latestMessage = historyData.pop(); 
    
    // Check if history ends with 'user' before we send the new 'user' message
    // If it does, we remove it to maintain strict User -> Model -> User alternation
    if (historyData.length > 0 && historyData[historyData.length - 1].role === 'user') {
      historyData.pop(); 
    }

    const chat = model.startChat({
      history: historyData,
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.8,
      },
    });

    // 5. Send and get response
    const result = await chat.sendMessage(latestMessage.parts[0].text);
    const response = await result.response;
    const reply = response.text();

    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error('Buddy Chat Error:', err);
    return NextResponse.json(
      { reply: "Aiyo, my brain buffering leh... try again later! 😅" },
      { status: 500 }
    );
  }
}