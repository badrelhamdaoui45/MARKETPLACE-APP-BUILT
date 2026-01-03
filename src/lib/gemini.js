import { GoogleGenerativeAI } from "@google/generative-ai";

// Access your API key as an environment variable (ensure it's in your .env or similar)
// In Vite projects, use import.meta.env.VITE_GEMINI_API_KEY

const fileToGenerativePart = async (arrayBuffer, mimeType) => {
    const base64 = await new Promise((resolve) => {
        const blob = new Blob([arrayBuffer], { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
    return {
        inlineData: {
            data: base64,
            mimeType
        },
    };
};

export const detectBibs = async (imageUrl) => {
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey || apiKey === "your_gemini_api_key_here") {
            console.error("VITE_GEMINI_API_KEY is not defined or is placeholder");
            return [];
        }

        // Initialize SDK inside the function to ensure it uses the latest env variable state
        const genAI = new GoogleGenerativeAI(apiKey);

        // For generative-ai, we need to fetch the image and convert it to base64 if not providing a URL directly
        // However, Gemini 1.5 Pro/Flash supports multimodal inputs.
        // We can use a simple fetch for the publicly accessible watermarked image.

        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();

        // Try the latest flash model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Identify all athlete bib numbers (race numbers) visible in this image. Return ONLY a comma-separated list of numbers found. If no numbers are found or it's unclear, return "none". Avoid any other text. Examples of good output: "123, 456" or "789" or "none".`;

        const imagePart = await fileToGenerativePart(buffer, "image/jpeg");

        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text().trim();

        if (text.toLowerCase() === "none") return [];

        // Clean up and parse comma separated values
        return text.split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !isNaN(s));
    } catch (error) {
        console.error("Error in Gemini Bib Detection:", error);
        return [];
    }
};
