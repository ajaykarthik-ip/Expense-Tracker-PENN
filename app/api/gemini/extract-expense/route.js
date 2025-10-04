import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const image = formData.get("image");

    if (!image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    // Initialize Gemini AI
    const ai = new GoogleGenAI({});

    // Create prompt for expense extraction
    const prompt = `You are an expense tracking assistant. Analyze this receipt or bill image and extract the following information:

1. Expense Name/Description (what was purchased - be specific but concise)
2. Total Amount (the final amount paid, as a number only without currency symbols)
3. Date (if visible, in YYYY-MM-DD format)
4. Merchant/Store name (if visible)

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just the JSON):
{
  "name": "expense description",
  "amount": numeric_value,
  "date": "YYYY-MM-DD or null",
  "merchant": "store name or null"
}

Important:
- For amount, return ONLY the number (e.g., 45.99 not "$45.99")
- If you cannot find certain information, use null
- Be precise with the total amount
- Make the name descriptive but brief`;

    // Generate content with vision model
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: image.type,
                data: base64Image,
              },
            },
          ],
        },
      ],
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    let extractedText = response.text;

    // Clean up the response - remove markdown code blocks if present
    extractedText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse the JSON response
    const expenseData = JSON.parse(extractedText);

    return NextResponse.json({
      success: true,
      data: expenseData,
    });

  } catch (error) {
    console.error("Error extracting expense from image:", error);
    return NextResponse.json(
      {
        error: "Failed to extract expense data",
        details: error.message
      },
      { status: 500 }
    );
  }
}
