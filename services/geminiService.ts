import { Schema, Video } from "@google/genai";
import { brandConfig } from "../config";
import type { GenerateVideoParams, GenerationMode, MarketingAssets, MarketingBriefData, FeasibilityReport, CombinedPersona, ABTestResult, InterviewResult } from "../types";
export type { MarketingAssets };

// --- Proxy Call Helper ---
const callGenAiProxy = async (endpoint: string, payload: any): Promise<any> => {
    const response = await fetch(`/api/genai/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to call GenAI proxy ${endpoint}: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
    }
    
    return response.json();
};

// --- Helper for Text Extraction ---
export const extractTextFromResponse = (response: any): string => {
    if (response?.text) return response.text; // SDK native
    const candidates = response?.candidates || response?.response?.candidates;
    if (candidates && candidates.length > 0) {
        const parts = candidates[0]?.content?.parts;
        if (parts && parts.length > 0) {
            return parts.map((p: any) => p.text || '').join('');
        }
    }
    return '';
};

// --- Helper for Image Extraction ---
const extractImageFromResponse = (response: any): string | null => {
    if (!response) {
        console.warn("Gemini response is null or undefined.");
        return null;
    }

    // Handle different SDK response structures. 
    // Prioritize direct candidates access as per user example for image model.
    const candidates = response?.candidates || response?.response?.candidates;

    if (!candidates || !candidates.length) {
        // Log the response keys to help debug if candidates are missing
        console.warn("No candidates found in Gemini response. Keys:", Object.keys(response));
        return null;
    }

    // Try to find an inline image part
    for (const candidate of candidates) {
        const parts = candidate?.content?.parts;
        if (parts) {
            for (const part of parts) {
                // Check for inlineData
                // @ts-ignore
                if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
                    // @ts-ignore
                    return part.inlineData.data;
                }
            }
        }
    }
    return null;
};

/**
 * Generates text using Gemini.
 */
export const generateText = async (prompt: string, model: string = "gemini-3-flash-preview"): Promise<string> => {
    try {
        
        const response = await callGenAiProxy("generateContent", {
            model: model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        return extractTextFromResponse(response) || "";
    } catch (error) {
        console.error("Error generating text:", error);
        throw error;
    }
};

/**
 * Generates JSON using Gemini with a schema.
 */
export const generateJson = async (prompt: string, schema: Schema, model: string = "gemini-3-flash-preview"): Promise<any> => {
    try {
        
        const response = await callGenAiProxy("generateContent", {
            model: model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        const text = extractTextFromResponse(response);
        return text ? JSON.parse(text) : null;
    } catch (error) {
        console.error("Error generating JSON:", error);
        throw error;
    }
};

/**
 * Generates an image using Gemini.
 * Returns base64 string of the image.
 */
export const generateImage = async (prompt: string, model: string = "gemini-3.1-flash-image-preview", aspectRatio: string = "1:1"): Promise<string | null> => {
    try {
        
        console.log(`Generating image with model ${model} and prompt: ${prompt}`);

        const response = await callGenAiProxy("generateContent", {
            model: model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseModalities: ["IMAGE", "TEXT"],
                tools: [{ googleSearch: {} }],
                // @ts-ignore
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: "1K"
                }
            }
        });

        const imageBase64 = extractImageFromResponse(response);
        if (imageBase64) return imageBase64;

        console.warn("No image found in response parts.");
        return null;
    } catch (error) {
        console.error("Error generating image:", error);
        return null;
    }
};

/**
 * Generates an image using Gemini with a reference image.
 */
export const generateImageWithReference = async (prompt: string, referenceImageBase64: string, mimeType: string = "image/png", model: string = "gemini-3.1-flash-image-preview", aspectRatio: string = "1:1"): Promise<string | null> => {
    try {
        
        console.log(`Generating image with reference, model ${model}. Prompt: ${prompt}, Aspect: ${aspectRatio}`);
        console.log(`Reference Image Base64 Length: ${referenceImageBase64 ? referenceImageBase64.length : '0'}`);

        const response = await callGenAiProxy("generateContent", {
            model: model,
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: mimeType, data: referenceImageBase64 } }
                ]
            }],
            config: {
                responseModalities: ["IMAGE"],
                // @ts-ignore
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: "1K"
                }
            }
        });

        const imageBase64 = extractImageFromResponse(response);
        if (imageBase64) return imageBase64;

        console.warn("No image found in response parts.");
        return null;
    } catch (error) {
        console.error("Error generating image with reference:", error);
        return null;
    }
};

/**
 * Helper to convert File to base64
 */
export const fileToGenerativePart = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- Nike Logic ---

export const generateRoomDesign = async (roomImage: string, productImage: string, style: string = "modern"): Promise<string> => {
    
    try {
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3.1-flash-image-preview',
            contents: {
                parts: [
                    { text: `Generate a photorealistic image of this room redesigned in a "${style}" style, with the provided product placed naturally within it. Maintain the perspective of the room but update the decor to match the requested style.` },
                    { inlineData: { mimeType: 'image/jpeg', data: roomImage } },
                    { inlineData: { mimeType: 'image/jpeg', data: productImage } }
                ]
            }
        });

        const imageBase64 = extractImageFromResponse(response);
        if (imageBase64) return `data:image/jpeg;base64,${imageBase64}`;
        throw new Error("No image generated.");

    } catch (error) {
        console.error("Room design generation error:", error);
        throw error;
    }
};

export const generateLifestyleVariations = async (productImage: string): Promise<{ type: string, image: string | null }[]> => {
    

    const variations = [
        {
            type: "Natural Setting",
            prompt: "Generate a photorealistic image of this product placed in a natural, appropriate setting. For example, if it's clothing, show it laid out on a bed or chair. If it's decor, show it on a shelf. Ensure high quality lighting. Return only the image."
        },
        {
            type: "Studio Model",
            prompt: "Generate a photorealistic image of a model wearing this product. The model should match the style of the product. The background must be a clean, flat white studio background. Full body or 3/4 shot depending on the item. Return only the image."
        },
        {
            type: "Lifestyle Model",
            prompt: "Generate a photorealistic image of a model wearing this product in a realistic, appropriate location (e.g. outdoors, in a living room, at a cafe). The setting should match the vibe of the item. Return only the image."
        }
    ];

    const generateSingle = async (variation: { type: string, prompt: string }): Promise<{ type: string, image: string | null }> => {
        try {
            const response = await callGenAiProxy("generateContent", {
                model: 'gemini-3.1-flash-image-preview',
                contents: {
                    parts: [
                        { text: variation.prompt },
                        { inlineData: { mimeType: 'image/jpeg', data: productImage } }
                    ]
                }
            });

            const imageBase64 = extractImageFromResponse(response);
            if (imageBase64) {
                return { type: variation.type, image: `data:image/jpeg;base64,${imageBase64}` };
            }
            return { type: variation.type, image: null };

        } catch (error) {
            console.error(`Failed to generate variation for ${variation.type}:`, error);
            return { type: variation.type, image: null };
        }
    };

    return Promise.all(variations.map(v => generateSingle(v)));
};

export const analyzeVibe = async (base64Image: string): Promise<{ mood: string, colors: string[] }> => {
    
    try {
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    {
                        text: `
                        Analyze this image and identify the aesthetic "mood" (e.g., "Boho Chic", "Modern Industrial", "Cozy Minimalist") and the top 5 dominant hex color codes.
                        
                        Return a JSON object with this structure:
                        {
                            "mood": "Mood Name",
                            "colors": ["#HEX1", "#HEX2", "#HEX3", "#HEX4", "#HEX5"]
                        }
                        Do not include markdown code blocks.
                    ` }
                ]
            }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Vibe analysis error:", error);
        return { mood: "Undetected", colors: ["#CCCCCC", "#999999", "#666666"] };
    }
};

export const generateVibeMatches = async (base64Image: string): Promise<any> => {
    

    // 1. Analyze Vibe & Generate Product Ideas
    try {
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    {
                        text: `
                        Analyze this image to determine its aesthetic mood and color palette.
                        Then, suggest 3 specific products, services, or focus areas that would appeal to a person with this lifestyle vibe based on the context of the requested application.
                        
                        For each recommendation, provide:
                        - A catchy name
                        - A realistic price or value metric (e.g. "$0", "$25/mo")
                        - A short description explaining why it fits
                        - A detailed image generation prompt to visualize a marketing asset for this benefit (lifestyle or abstract).
                        
                        Return a valid JSON object:
                        {
                            "mood": "e.g. Boho Chic",
                            "colors": ["#HEX1", "#HEX2", "#HEX3", "#HEX4", "#HEX5"],
                            "products": [
                                {
                                    "id": "1",
                                    "name": "Benefit Name",
                                    "price": "$0 copay",
                                    "description": "Why it fits...",
                                    "imagePrompt": "Photorealistic lifestyle shot of..."
                                }
                            ]
                        }
                        Do not use markdown.
                    ` }
                ]
            }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanText);

        // 2. Generate Images for each product in parallel
        if (data.products && Array.isArray(data.products)) {
            const productsWithImages = await Promise.all(data.products.map(async (prod: any) => {
                const imageUrl = await generateImage(prod.imagePrompt + ", professional marketing style, warm lighting, high resolution");
                // Convert to data uri format if raw base64 returned from generateImage
                return { ...prod, image: imageUrl ? `data:image/jpeg;base64,${imageUrl}` : null };
            }));

            return {
                mood: data.mood,
                colors: data.colors,
                suggestedProducts: productsWithImages
            };
        }

        return { mood: "Error", colors: [], suggestedProducts: [] };

    } catch (error) {
        console.error("Vibe match error:", error);
        return { mood: "Error", colors: [], suggestedProducts: [] };
    }
};



export const generateAudienceSegments = async (context: string): Promise<any[]> => {
    
    try {
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    You are an expert marketing analyst.
                    Company Context: ${context}
                    
                    Task: Create exactly 3 distinct, highly relevant Audience Segments for this company based on the provided context. Instead of generic archetypes, think critically about who would specifically benefit from these services.
                    
                    For each audience, provide:
                    1. A compelling Name (e.g., "The Digital Nomad", "The Holistic Parent")
                    2. A Brief Bio (2 sentences explaining their lifestyle and core values)
                    3. Key Demographics (Realistic age range and income bracket)
                    4. A prompt to generate a headshot for a persona representing this audience.
                       CRITICAL for Image Prompt: Ensure the prompt describes a realistic, relatable person in a natural setting (e.g., park, home, office). Avoid studio backgrounds. Ensure diversity.
                    5. A unique Full Name for a representative persona within this segment.
                    
                    Return a valid JSON array of objects:
                    [
                        {
                            "name": "Segment Name",
                            "personaName": "Full Name",
                            "bio": "Description...",
                            "demographics": "Age range...",
                            "imagePrompt": "Portrait of a..."
                        }
                    ]
                    Do not use markdown code blocks.
                ` }]
            },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "[]";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Audience generation error:", error);
        return [];
    }
};

export const generateSyntheticPersona = async (personaName: string, audienceName: string, context: string): Promise<any> => {
    
    try {
        const prompt = `
        You are a creative marketing analyst. Based on the provided information, generate a detailed customer persona as a JSON object.

        **Company Context:**
        ${context}

        **Audience Segment:**
        ${audienceName}

        **DETAILED INSTRUCTIONS FOR THIS PERSONA:**
        Develop a deeply realistic and empathetic persona that perfectly embodies this audience segment. You must define their core values, beliefs, communication tone, and specific industry knowledge level appropriate for their demographic.

        **CHART & BRAND DATA REQUIREMENTS:**
        1. "preferred_products": Provide 3-4 specific, realistic ${context} plans, products, or services this persona would highly value.
        2. "charts.brand_affinity": Provide 12 months of affinity data (0-100 scale) for ${context}. Generate a realistic 12-month trend line.

        **Target Persona Name:**
        ${personaName}

        **Output Requirements:**
        Generate ONLY a valid JSON object with the following structure.
        {
            "name": "${personaName}",
            "age": 22,
            "job_title": "Job Title",
            "bio": "A 2-3 sentence, first-person bio that reflects your unique tone and beliefs.",
            "income": "Annual income (e.g., '$45,000')",
            "net_worth": "Estimated net worth",
            "household_size": "Number of people in household",
            "lifestyle_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
            "preferred_products": ["Product 1", "Product 2", "Product 3"],
            "pain_points": ["point 1", "point 2"],
            "goals": ["goal 1", "goal 2"],
            "charts": {
                "brand_affinity": {
                    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                    "data": [value1, value2, ...]
                }
            }
        }
        CRITICAL: The bio, tags, and trends must be highly creative and strictly align with the inferred traits of this audience segment.
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Persona generation error:", error);
        return null;
    }
};

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
    const imgData = await generateImage(prompt, 'gemini-3.1-flash-image-preview');
    if (imgData) {
        return `data:image/jpeg;base64,${imgData}`;
    }
    return "https://via.placeholder.com/400x400?text=Generation+Failed";
};

export const generateMarketingCampaignAssets = async (productName: string, targetAudience: string): Promise<MarketingAssets> => {
    

    // 1. Generate the Image Prompt and Copy concurrently
    const copyPromise = callGenAiProxy("generateContent", {
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [{
                text: `
                You are a creative director and marketing expert.
                Product: ${productName}
                Target Audience: ${targetAudience}
                
                Task: Create marketing assets for a multi-channel campaign.
                
                1. **Image Prompt**: A detailed prompt to generate a high-quality lifestyle image of the product/service that appeals to the target audience.
                   CRITICAL: Ensure the image is diverse and inclusive, showing happy people in natural settings relevant to the product.
                2. **Social Media Post**: An Instagram/Facebook style caption with relevant hashtags.
                3. **Search Ad**: A punchy Google Search ad headline (max 30 chars) and description (max 90 chars).
                4. **Email**: A catchy subject line, preheader text, and a short persuasive body paragraph.
                5. **YouTube Short**: A title and a brief 15-second script/hook.
                6. **Website Recommendations**: Suggest 3 distinct products, services, or perks that would be "frequently viewed together".
                   For each, provide a Name, Price (e.g. "$0"), and a detailed Image Prompt for a marketing icon or lifestyle shot.
                
                Return a valid JSON object with this structure:
                {
                    "imagePrompt": "Photorealistic shot of...",
                    "social": {
                        "caption": "...",
                        "hashtags": ["#marketing", "#campaign"]
                    },
                    "search": {
                        "headline": "...",
                        "description": "...",
                        "url": "example.com/products/${productName.replace(/\s+/g, '-').toLowerCase()}"
                    },
                    "email": {
                        "subject": "...",
                        "preheader": "...",
                        "body": "..."
                    },
                    "youtube": {
                        "title": "...",
                        "script": "..."
                    },
                    "recommendations": [
                        { "name": "Prod 1", "price": "$10.99", "imagePrompt": "..." },
                        { "name": "Prod 2", "price": "$25.00", "imagePrompt": "..." },
                        { "name": "Prod 3", "price": "$15.50", "imagePrompt": "..." }
                    ]
                }
                Do not use markdown code blocks.
            ` }]
        }
    });

    try {
        const copyResponse = await copyPromise;
        const copyText = extractTextFromResponse(copyResponse) || "{}";
        const cleanCopyText = copyText.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanCopyText);
        
        console.log("Parsed Marketing Brief Data:", JSON.stringify(data, null, 2));

        // 2 & 3. Generate Images Concurrently
        const imagePromises: Promise<any>[] = [];
        
        console.log("Queueing Main Campaign Image for prompt:", data.imagePrompt);
        const mainImagePromise = data.imagePrompt
            ? generateImageFromPrompt(data.imagePrompt + ", professional photography, high resolution, commercial lighting")
            : Promise.resolve(null);
        imagePromises.push(mainImagePromise);

        console.log("Queueing Recommendation Images. Count:", (data.recommendations || []).length);
        for (const rec of (data.recommendations || [])) {
            console.log("Queueing Rec Image for:", rec.name, rec.imagePrompt);
            const recPromise = generateImageFromPrompt(rec.imagePrompt + ", clean health marketing style, warm lighting").then(img => ({
                name: rec.name,
                price: rec.price,
                image: img
            }));
            imagePromises.push(recPromise);
        }
        
        console.log(`Waiting for ${imagePromises.length} image generation calls...`);
        const results = await Promise.all(imagePromises);
        console.log("Finished all image generation calls.");
        
        const mainImage = results[0];
        const recommendations = results.slice(1);

        return {
            image: mainImage,
            social: data.social || { caption: "Check out our new offering!", hashtags: [] },
            search: data.search || { headline: "New Offering", description: "Learn more today.", url: "healthco.com" },
            email: data.email || { subject: "New Update", preheader: "Learn more inside.", body: "Explore our new offerings." },
            youtube: data.youtube || { title: "Overview", script: "Learn about our offerings in 15 seconds." },
            website: { recommendations }
        };

    } catch (error) {
        console.error("Campaign generation error:", error);
        throw new Error("Failed to generate campaign assets.");
    }
};

export const generateMarketingCopy = async (productName: string, personaName: string): Promise<any> => {
    
    try {
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    Product: ${productName}
                    Target Persona: ${personaName}
                    
                    Write a catchy headline and a persuasive subheadline for a landing page targeting this persona.
                    Also provide a Spanish translation for both.
                    
                    Return JSON:
                    {
                        "headline": "English Headline",
                        "subheadline": "English Subhead",
                        "headline_es": "Spanish Headline",
                        "subheadline_es": "Spanish Subhead"
                    }
                    Do not use markdown.
                ` }]
            }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Copy generation error:", error);
        return { headline: "Welcome", subheadline: "Check out our products." };
    }
};

export const generateProductVariant = async (productImage: string, instruction: string): Promise<string> => {
    
    try {
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3.1-flash-image-preview',
            contents: {
                parts: [
                    { text: `Edit this product image: ${instruction}. Keep the background clean.` },
                    { inlineData: { mimeType: 'image/jpeg', data: productImage } }
                ]
            }
        });

        const imageBase64 = extractImageFromResponse(response);
        if (imageBase64) return `data:image/jpeg;base64,${imageBase64}`;
        throw new Error("No image generated.");

    } catch (error) {
        console.error("Product variant error:", error);
        throw error;
    }
};

export const LAMPSHADE_STYLES = [
    "Modern Drum Shade", "Vintage Bell Shade", "Industrial Cage Shade",
    "Pleated Empire Shade", "Geometric Patterned Shade", "Fabric Cone Shade",
    "Tiffany Style Shade", "Rattan Pendant Shade", "Metal Dome Shade"
];

export const generateMultipleProductVariants = async (baseImage: string, styles: string[]): Promise<{ style: string, image: string | null }[]> => {
    

    const generateSingle = async (style: string): Promise<{ style: string, image: string | null }> => {
        try {
            const prompt = `Given the lamp in the image, replace the lampshade with a ${style}.
            The rest of the lamp base should remain the same.
            The background should be a plain white studio background.
            Return ONLY the edited image.`;

            const response = await callGenAiProxy("generateContent", {
                model: 'gemini-3.1-flash-image-preview',
                contents: {
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: 'image/jpeg', data: baseImage } }
                    ]
                }
            });

            const imageBase64 = extractImageFromResponse(response);
            if (imageBase64) {
                return { style, image: `data:image/jpeg;base64,${imageBase64}` };
            }
            return { style, image: null };
        } catch (error) {
            console.error(`Failed to generate variant for ${style}:`, error);
            return { style, image: null };
        }
    };

    return Promise.all(styles.map(style => generateSingle(style)));
};

export const auditImage = async (generatedImage: string, referenceImage: string, type: 'couch' | 'table'): Promise<{ passed: boolean, reason: string }> => {
    
    try {
        const prompt = type === 'couch'
            ? `Analyze this generated room image alongside the reference couch image.
               Your task is to verify:
               1. The couch from the reference image is present and clearly visible in the room.
               2. The couch is appropriately placed and proportioned in the room.
               Respond with ONLY one of these exact phrases:
               - "PASS - reason" if the couch is properly placed.
               - "FAIL - reason" if the couch is missing, unclear, or unnatural.`
            : `Analyze this generated room image alongside the reference end table image.
               Your task is to verify:
               1. The end table from the reference image is present and clearly visible in the room.
               2. The end table is appropriately placed and proportioned.
               Respond with ONLY one of these exact phrases:
               - "PASS - reason" if the end table is properly placed.
               - "FAIL - reason" if the end table is missing or unnatural.`;

        // Strip base64 prefix if present
        const cleanGeneratedImage = generatedImage.replace(/^data:image\/\w+;base64,/, '');
        const cleanReferenceImage = referenceImage.replace(/^data:image\/\w+;base64,/, '');

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/jpeg', data: cleanGeneratedImage } },
                    { inlineData: { mimeType: 'image/jpeg', data: cleanReferenceImage } }
                ]
            }
        });

        const text = extractTextFromResponse(response) || "FAIL - No response";
        const passed = text.toUpperCase().includes("PASS");
        return { passed, reason: text };
    } catch (error) {
        console.error("Audit error:", error);
        return { passed: false, reason: "Audit failed due to error." };
    }
};

// Helper to save image to server
const saveImage = async (base64Data: string): Promise<string | null> => {
    try {
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 1000);
        const filename = `gen_${timestamp}_${random}.jpg`;

        const response = await fetch('/api/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Data, filename })
        });

        if (response.ok) {
            const data = await response.json();
            return data.url;
        }
        console.error('Failed to save image to server:', response.statusText);
        return null;
    } catch (error) {
        console.error('Error saving image:', error);
        return null;
    }
};

// Helper to save video to server
const saveVideoServe = async (base64Data: string | null, videoUrl?: string): Promise<string | null> => {
    try {
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 1000);
        const filename = `spin_${timestamp}_${random}.mp4`;

        const response = await fetch('/api/save-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video: base64Data, videoUrl, filename })
        });

        if (response.ok) {
            const data = await response.json();
            return data.url;
        }
        console.error('Failed to save video to server:', response.statusText);
        return null;
    } catch (error) {
        console.error('Error saving video:', error);
        return null;
    }
};

export const generateProductSpinVideo = async (imageB64s: string[]): Promise<string | null> => {
    
    try {
        console.log(`Generating product spin video with ${imageB64s.length} images...`);

        // Prepare reference images
        // Prepare image for Image-to-Video
        // We only use the first image for now as Veo likely supports single image input for generation
        const firstImageB64 = imageB64s[0];
        const cleanB64 = firstImageB64.replace(/^data:image\/\w+;base64,/, "");
        // Extract mime type if present or default
        const matches = firstImageB64.match(/^data:(image\/\w+);base64,/);
        const mimeType = matches ? matches[1] : "image/png";

        const response = await callGenAiProxy("generateVideos", {
            model: 'veo-3.1-generate-preview',
            prompt: "the product is on a pedestal spinning around",
            image: {
                imageBytes: cleanB64,
                mimeType: mimeType
            },
            config: {
                aspectRatio: "16:9",
                numberOfVideos: 1,
                durationSeconds: 8,
                resolution: "720p",
            }
        });

        // Polling loop for video generation
        let operation = response;
        const POLL_INTERVAL = 5000; // 5 seconds
        const MAX_POLLS = 60; // 5 minutes timeout

        console.log("Video generation operation started:", operation.name);

        for (let i = 0; i < MAX_POLLS; i++) {
            if (operation.done) {
                console.log("Video generation completed.");
                break;
            }
            console.log(`Waiting for video generation... attempt ${i + 1}/${MAX_POLLS}`);
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

            // Refresh operation status
            // The SDK likely has a method to get operation status, assuming client.operations.get exists
            // or we might need to use the operation object itself if it has a refresh method?
            // Based on user snippet: operation = client.operations.get(operation)
            // Let's assume client.operations exists in this SDK version.
            try {
                // @ts-ignore
                const op = await client.operations.get({ operation: operation });
                if (op) {
                    operation = op;
                }
            } catch (e) {
                console.warn("Retrying operation check...", e);
            }
        }

        if (!operation.done) {
            throw new Error("Video generation timed out.");
        }

        // @ts-ignore
        // result is likely nested in response or result property depending on SDK
        // User snippet says: response = operation.result
        // @ts-ignore
        const result = operation.result;
        // Check for URI in generatedVideos (Veo 3.1)
        // @ts-ignore
        const generatedVideo = operation.response?.generatedVideos?.[0] || result?.generatedVideos?.[0];

        if (generatedVideo?.video?.uri) {
            const videoUrl = await saveVideoServe(null, generatedVideo.video.uri);
            return videoUrl;
        }

        if (generatedVideo?.video?.encodedVideo) {
            const videoUrl = await saveVideoServe(generatedVideo.video.encodedVideo);
            return videoUrl;
        }

        console.error("No video data found in completed operation result:", operation);
        return null;

        console.error("No video generated in response");
        return null;

    } catch (error) {
        console.error("Product spin video generation error:", error);
        return null;
    }
};

export const generateMarketingBrief = async (context: string, goal: string, sourceAudiences?: any[]): Promise<any> => {
    
    try {
        const timestamp = new Date().toLocaleString();
        
        const audienceContext = sourceAudiences && sourceAudiences.length > 0 
            ? `\n**Target Demographic Constraint:** Your brief must specifically target the following ${sourceAudiences.length} personas. Focus your entire strategy on catering to these exact audiences.\n${sourceAudiences.map((aud, i) => `\n${i+1}. Name: ${aud.name}\n   Bio: ${aud.bio}\n   Demographics: ${aud.demographics}`).join('\n')}\n`
            : "";

        const prompt = `
        You are an expert Marketing Brief Agent. Create a comprehensive marketing brief based on the following:
        
        **Company Context:** ${context}
        **Campaign Goal:** ${goal}
        ${audienceContext}
        
        CRITICAL: Follow the exact 8-section structure below. Be detailed, professional, and data-driven.
        
        Return ONLY a valid JSON object with this structure:
        {
            "title": "Marketing Brief: [A Catchy Campaign Title]",
            "timestamp": "${timestamp}",
            "campaignGoal": "${goal}",
            "productName": "[Product/Service Name]",
            "companyName": "[Extracted Company Name from Context]",
            "assumptions": {
                "budget": "...",
                "timeline": "...",
                "primarySalesFocus": "...",
                "mitigationStrategy": "..."
            },
            "objective": {
                "goal": { "en": "...", "es": "..." },
                "targetKpi": { "en": "...", "es": "..." }
            },
            "audiences": [
                {
                    "name": "[Persona Name]",
                    "sourceSegment": "[Description of original segment]",
                    "ageRange": "...",
                    "painPoints": ["...", "..."],
                    "drivers": ["...", "..."],
                    "messagingAngle": { "en": "...", "es": "..." }
                }
            ],
            "kpis": [
                { "title": "[KPI Title]", "description": "..." }
            ],
            "valueProp": {
                "main": { "en": "...", "es": "..." },
                "againstCompetitors": "[How we beat competitors]",
                "addressingTrends": "[Relevant industry trends]"
            },
            "messaging": {
                "primaryHook": { "en": "...", "es": "..." },
                "supporting1": { "title": "[Message Title]", "content": { "en": "...", "es": "..." } },
                "supporting2": { "title": "[Message Title]", "content": { "en": "...", "es": "..." } }
            },
            "channels": [
                { "name": "[Channel Name]", "justification": "..." }
            ],
            "phases": [
                {
                    "title": "Phase 1: [Name]",
                    "dates": "[Start Date - End Date]",
                    "focus": "...",
                    "action": "...",
                    "goal": "..."
                }
            ]
        }
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        return JSON.parse(text);
    } catch (error) {
        console.error("Brief generation error:", error);
        return null;
    }
};

export const generatePersonaChatResponse = async (persona: any, brief: any, message: string, chatHistory: { role: string, parts: { text: string }[] }[], simulationContext?: any): Promise<string> => {
    
    try {
        // Find if the audience matches one of our archetypes for better instructions
        const archetype = Object.values(PERSONA_ARCHETYPES).find(a => (persona.bio && persona.bio.includes(a.name)) || (persona.job_title && persona.job_title.includes(a.name))) || PERSONA_ARCHETYPES.young_family;

        let memoryContext = "";
        if (simulationContext) {
            memoryContext = `
            **YOUR PREVIOUS SIMULATION FEEDBACK:**
            You have already reviewed this campaign in a focus group.
            - Your Score for Visual Appeal: ${simulationContext.visualAppeal}/100
            - Your Score for Brand Fit: ${simulationContext.brandFit}/100
            - Your Score for Stopping Power: ${simulationContext.stoppingPower}/100
            - Your Sentiment: ${simulationContext.sentiment}
            - Your Feedback: "${simulationContext.feedback}"
            - Your Suggestion: "${simulationContext.suggestedMessaging || simulationContext.suggestedImage || 'None'}"
            
            CRITICAL: You must be consistent with these scores. If you gave a low score, you must explain why you disliked it. Do not contradict your previous feedback.
            `;
        }

        const personaContext = `
        **WHO YOU ARE:**
        - Name: ${persona.name}
        - Age: ${persona.age}
        - Job: ${persona.job_title}
        - Bio: ${persona.bio}
        - Archetype: ${archetype.name}
        
        **YOUR DETAILED BEHAVIORAL INSTRUCTIONS:**
        - Representation: ${archetype.representation}
        - Objectives: ${archetype.objectives}
        - Belief: ${archetype.belief}
        - Value: ${archetype.value}
        - Tone: ${archetype.tone}
        - Knowledge: ${archetype.knowledge}
        
        **THE TASK:**
        You are a prospective or current member reviewing a health insurance marketing brief for Healthco's ${brief.productName}.
        - Campaign Goal: ${brief.campaignGoal}
        - Value Proposition: ${brief.valueProp?.main?.en || 'N/A'}

        ${memoryContext}
        
        **INSTRUCTIONS:**
        Respond to the user's message as this persona. Be realistic, highly selective, and authentic to your specific archetype. 
        If asking about your scores, explain the *reasoning* behind the numbers based on your values.
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: [
                { role: "user", parts: [{ text: personaContext }] },
                { role: "model", parts: [{ text: "Understood. I am now in character as " + persona.name + ". How can I help you today with the marketing brief?" }] },
                ...chatHistory,
                { role: "user", parts: [{ text: message }] }
            ]
        });

        return extractTextFromResponse(response) || "I'm sorry, I couldn't process that.";
    } catch (error) {
        console.error("Chat error:", error);
        return "I'm having trouble responding right now.";
    }
};

export const generateRoomPersonalization = async (
    couchImage: string,
    tableImage: string,
    roomImage: string,
    onStepUpdate: (step: string, image: string | null, status: 'pending' | 'success' | 'error', message?: string) => void
): Promise<string | null> => {
    
    const MAX_RETRIES = 3;

    // --- Step 1: Place Couch ---
    let currentRoomImage = roomImage;
    let couchPlaced = false;

    for (let i = 0; i < MAX_RETRIES; i++) {
        onStepUpdate('couch', null, 'pending', `Placing Couch (Attempt ${i + 1})...`);
        try {
            const couchPrompt = `Generate an image: Using the provided couch and room images, place the couch in the room.
            Instructions:
            - Replace the couch in the room with the provided couch image.
            - The couch should be placed naturally.
            - Ensure the couch is scaled correctly and clearly visible.
            - Return ONLY the edited image.`;

            const response = await callGenAiProxy("generateContent", {
                model: 'gemini-3.1-flash-image-preview',
                contents: {
                    parts: [
                        { text: couchPrompt },
                        { inlineData: { mimeType: 'image/jpeg', data: currentRoomImage } },
                        { inlineData: { mimeType: 'image/jpeg', data: couchImage } }
                    ]
                }
            });

            const imageBase64 = extractImageFromResponse(response);
            if (imageBase64) {
                const fullBase64 = `data:image/jpeg;base64,${imageBase64}`;

                // Audit
                onStepUpdate('couch', null, 'pending', 'Auditing placement...');
                const audit = await auditImage(fullBase64, couchImage, 'couch');

                if (audit.passed) {
                    currentRoomImage = imageBase64;
                    couchPlaced = true;
                    // Save and update UI
                    const savedUrl = await saveImage(fullBase64);
                    onStepUpdate('couch', savedUrl || fullBase64, 'success', audit.reason);
                    break;
                } else {
                    // Save failed attempt for debugging? Optional. 
                    // For now just show "audit failed" and maybe the image if we wanted, but sticking to logic.
                    // Actually, user wants to see what happened.
                    const savedUrl = await saveImage(fullBase64);
                    onStepUpdate('couch', savedUrl || fullBase64, 'error', `Audit Failed: ${audit.reason}`);
                }
            } else {
                onStepUpdate('couch', null, 'error', 'No image generated.');
            }
        } catch (e) {
            console.error(e);
            onStepUpdate('couch', null, 'error', 'Generation failed.');
        }
    }

    if (!couchPlaced) return null;

    // --- Step 2: Add Table ---
    let tablePlaced = false;

    for (let i = 0; i < MAX_RETRIES; i++) {
        onStepUpdate('table', null, 'pending', `Adding Table (Attempt ${i + 1})...`);
        try {
            const tablePrompt = `Generate an image: Using the provided end table and room images, add the end table to the room.
            Instructions:
            - Add the provided end table to the room in an appropriate location.
            - Ensure the end table is clearly visible and appropriately sized.
            - Return ONLY the edited image.`;

            const response = await callGenAiProxy("generateContent", {
                model: 'gemini-3.1-flash-image-preview',
                contents: {
                    parts: [
                        { text: tablePrompt },
                        { inlineData: { mimeType: 'image/jpeg', data: currentRoomImage } },
                        { inlineData: { mimeType: 'image/jpeg', data: tableImage } }
                    ]
                }
            });

            const imageBase64 = extractImageFromResponse(response);
            if (imageBase64) {
                const fullBase64 = `data:image/jpeg;base64,${imageBase64}`;

                // Audit
                onStepUpdate('table', null, 'pending', 'Auditing placement...');
                const audit = await auditImage(fullBase64, tableImage, 'table');

                if (audit.passed) {
                    currentRoomImage = imageBase64;
                    tablePlaced = true;
                    const savedUrl = await saveImage(fullBase64);
                    onStepUpdate('table', savedUrl || fullBase64, 'success', audit.reason);
                    break;
                } else {
                    const savedUrl = await saveImage(fullBase64);
                    onStepUpdate('table', savedUrl || fullBase64, 'error', `Audit Failed: ${audit.reason}`);
                }
            } else {
                onStepUpdate('table', null, 'error', 'No image generated.');
            }

        } catch (e) {
            console.error(e);
            onStepUpdate('table', null, 'error', 'Generation failed.');
        }
    }

    return tablePlaced ? currentRoomImage : null;
};

export const SEASONAL_THEMES = ["Halloween", "Thanksgiving", "Christmas", "Valentines Day", "Spring", "Summer"];

export const generateSeasonalVariations = async (baseRoomImage: string): Promise<{ theme: string, image: string | null }[]> => {
    

    const generateSingle = async (theme: string): Promise<{ theme: string, image: string | null }> => {
        try {
            const prompt = `Generate an image: Take this room image and create a new version decorated for ${theme}.
            Instructions:
            - Keep the existing furniture (couch and end table) exactly as shown.
            - Add appropriate ${theme}-themed decorations, colors, and accessories throughout the room.
            - Maintain the same room layout and perspective.
            - Return ONLY the edited image.`;

            const response = await callGenAiProxy("generateContent", {
                model: 'gemini-3.1-flash-image-preview',
                contents: {
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: 'image/jpeg', data: baseRoomImage } }
                    ]
                }
            });

            const imageBase64 = extractImageFromResponse(response);
            if (imageBase64) {
                const fullBase64 = `data:image/jpeg;base64,${imageBase64}`;
                const savedUrl = await saveImage(fullBase64);
                return { theme, image: savedUrl || fullBase64 };
            }
            return { theme, image: null };

        } catch (error) {
            console.error(`Failed to generate variation for ${theme}:`, error);
            return { theme, image: null };
        }
    };

    return Promise.all(SEASONAL_THEMES.map(theme => generateSingle(theme)));
};

// --- Generative Site / Landing Page Logic ---

export const generatePersonalizedProducts = async (userProfile: any, audienceContext: any = null): Promise<any> => {
    
    try {
        let audiencePrompt = "";
        if (audienceContext) {
            audiencePrompt = `
            **AUDIENCE INSIGHTS (Use these to guide recommendations):**
            - Segment Name: ${audienceContext.name}
            - Bio: ${audienceContext.bio}
            - Goals: ${audienceContext.details?.goals?.join(', ') || audienceContext.goals?.join(', ') || 'N/A'}
            - Pain Points: ${audienceContext.details?.pain_points?.join(', ') || audienceContext.pain_points?.join(', ') || 'N/A'}
            - **CRITICAL - PREFERRED PRODUCTS**: ${audienceContext.details?.preferred_products?.join(', ') || 'N/A'}
            
            Instruction: Prioritize the "Preferred Products" listed above if they are relevant to the user's current needs.
            Also consider their goals and pain points when writing the "reason" for the recommendation.
            `;
        }

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    Task: Generate 6 personalized Health Plan or Wellness Program recommendations for the user based on their data.
                    The recommendations should be Healthco Health insurance products or related wellness services.

                    ${audiencePrompt}

                    For each product, provide: name, sku, short_description, cost, a reason for the recommendation, and a detailed prompt for an image generation model to create a visually appealing product photo.

                    IMPORTANT for image_prompt: The image will be displayed on a clean, modern website.
                    Each image_prompt MUST specify:
                    - Clean, professional imagery (lifestyle or abstract health concepts)
                    - Professional photography
                    - Style should match Healthco's brand aesthetic (Trust/Care/Vitality) and target audience
                    - Good contrast to make the product stand out
                    - Clean, premium atmosphere

                    Return ONLY the raw JSON object that conforms to this structure:
                    {
                        "products": [
                            {
                                "name": "...",
                                "sku": "...",
                                "short_description": "...",
                                "cost": "...",
                                "reason": "...",
                                "image_prompt": "..."
                            }
                        ]
                    }
                    User Data: ${JSON.stringify(userProfile)}
                ` }]
            },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        return JSON.parse(text);
    } catch (error) {
        console.error("Product generation error:", error);
        return { products: [] };
    }
};

export const translateProducts = async (products: any[]): Promise<any> => {
    
    try {
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview', // lightweight model for translation
            contents: {
                parts: [{
                    text: `
                    Task: Translate the 'name', 'short_description', and 'reason' fields for each product in the following JSON from English to Spanish.
                    Do not translate 'sku', 'cost', or 'image_prompt'. Keep the exact same JSON structure.
                    
                    Input JSON: { "products": ${JSON.stringify(products)} }
                ` }]
            },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        return JSON.parse(text);
    } catch (error) {
        console.error("Translation error:", error);
        return { products: products }; // Fallback to original
    }
};

export const generatePersonalizedHeadlines = async (userProfile: any, audienceContext: any = null): Promise<any> => {
    
    try {
        let audiencePrompt = "";
        if (audienceContext) {
            audiencePrompt = `
            **AUDIENCE CONTEXT:**
            - Segment: ${audienceContext.name}
            - Tone/Vibe: ${audienceContext.details?.bio || "Caring and reliable"}
            - Key Values: ${audienceContext.details?.goals?.join(', ') || "Peace of Mind"}
            
            Instruction: Adjust the headline tone to match the Audience Segment's specific vibe (e.g. "The Young Family" should sound reassuring/warm, "The Active Senior" should sound empowering/vibrant).
            `;
        }

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    Task: Based on the user's data, write a short, catchy headline and a slightly more detailed subheadline for their personalized Healthco Health landing page.

                    ${audiencePrompt}

                    - Focus on health coverage, peace of mind, and wellness.
                    - Use a professional, caring, yet modern and accessible tone appropriate for Healthco's brand
                    - Headlines should be concise, friendly, and make the user feel valued
                    - Focus on personalization and the user's specific interests
                    - Make it feel exclusive and curated for them

                    For the subheadline use some details about them to help them realize this page is personalized to them, create a full paragraph of text for the subheadline.
                    Provide the text in both English and Spanish.

                    Return JSON:
                    {
                        "en": { "headline": "...", "subheadline": "..." },
                        "es": { "headline": "...", "subheadline": "..." }
                    }
                    User Data: ${JSON.stringify(userProfile)}
                ` }]
            },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        return JSON.parse(text);
    } catch (error) {
        console.error("Headline generation error:", error);
        return {
            en: { headline: "A Partner in Your Health", subheadline: "Coverage that cares for you." },
            es: { headline: "Un Socio en Su Salud", subheadline: "Cobertura que se preocupa por usted." }
        };
    }
};

export const generatePersonalizedPDPContent = async (audience: string, productName: string): Promise<any> => {
    
    try {
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    Task: Write personalized product detail page (PDP) content for "${productName}" targeting the audience: "${audience}".
                    
                    Return a JSON object with:
                    1. "whyPerfect": A single, punchy sentence (max 15 words) explaining why this product is perfect for this specific audience.
                    2. "description": A modified version of the standard product description that highlights features relevant to this audience. Keep it concise.
                    3. "imagePrompt": A detailed prompt to generate a photorealistic image of "${productName}" being used by or placed in a setting typical for this audience. The product should be clearly visible.
                    
                    Input Product: ${productName}
                    Target Audience: ${audience}
                    
                    Return JSON:
                    {
                        "whyPerfect": "...",
                        "description": "...",
                        "imagePrompt": "..."
                    }
                ` }]
            },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        return JSON.parse(text);
    } catch (error) {
        console.error("PDP content generation error:", error);
        return {
            whyPerfect: "Great for everyone!",
            description: "High quality detergent.",
            imagePrompt: `Photorealistic shot of ${productName} on a clean background.`
        };
    }
};

// Helper to fetch URL and convert to raw base64
const urlToRawBase64 = async (url: string): Promise<{ data: string, mimeType: string }> => {
    console.log(`Fetching image from URL: ${url}`);

    // Resolve relative URL to absolute if in browser
    let fetchUrl = url;
    if (url.startsWith('/') && typeof window !== 'undefined') {
        fetchUrl = `${window.location.origin}${url}`;
        console.log(`Resolved relative URL to absolute: ${fetchUrl}`);
    }

    // Use proxy for external URLs to avoid CORS
    if (fetchUrl.startsWith('http') && !fetchUrl.includes(window.location.host)) {
        try {
            const proxyRes = await fetch('/api/proxy-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: fetchUrl.includes('?') ? `${fetchUrl}&t=${Date.now()}` : `${fetchUrl}?t=${Date.now()}` })
            });

            if (proxyRes.ok) {
                const proxyData = await proxyRes.json();
                if (proxyData.base64 && proxyData.mimeType) {
                    console.log("Successfully fetched image via proxy.");
                    return { data: proxyData.base64, mimeType: proxyData.mimeType };
                }
            } else {
                console.warn(`Proxy fetch failed (${proxyRes.status}), falling back to direct fetch.`);
            }
        } catch (e) {
            console.error("Error using image proxy:", e);
        }
    }

    // Direct fetch (local or fallback)
    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image from ${fetchUrl}: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                // Strip data:image/xyz;base64, prefix
                const base64 = result.split(',')[1];
                // Extract mime type from data URI if possible, or fallback to blob type
                const mimeType = result.match(/data:([^;]+);/)?.[1] || blob.type || 'image/png';
                resolve({ data: base64, mimeType });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`Error fetching image from ${fetchUrl}:`, error);
        throw error;
    }
};
export const generateLifestyleScene = async (productImage: string, sceneDescription: string, mimeType: string = 'image/png'): Promise<string | null> => {
    
    try {
        // Always fetch image to base64 (client-side compatible)
        let imageBytes = productImage;
        let actualMimeType = mimeType;

        if (productImage.startsWith('/') || productImage.startsWith('http')) {
            try {
                const result = await urlToRawBase64(productImage);
                imageBytes = result.data;
                actualMimeType = result.mimeType;
            } catch (e) {
                console.error("Failed to fetch product image for lifestyle scene:", e);
                return null;
            }
        } else if (productImage.startsWith('data:')) {
            const matches = productImage.match(/^data:([^;]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                actualMimeType = matches[1];
                imageBytes = matches[2];
            } else {
                imageBytes = productImage.split(',')[1];
            }
        }

        const model = 'gemini-3.1-flash-image-preview';

        // Config from user example (simplified) + safety
        const config = {
            responseModalities: ['IMAGE', 'TEXT'],
            imageConfig: {
                imageSize: '1K',
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
            ]
        };

        const contents = [
            {
                role: 'user',
                parts: [
                    { inlineData: { mimeType: actualMimeType, data: imageBytes } },
                    { text: sceneDescription }
                ],
            },
        ];

        console.log("Generating lifestyle scene (local base64)...");
        // @ts-ignore
        const response = await callGenAiProxy("generateContent", {
            model,
            config,
            contents,
        });

        const imageBase64 = extractImageFromResponse(response);
        if (imageBase64) {
            return `data:image/jpeg;base64,${imageBase64}`;
        }

        return null;

    } catch (error) {
        console.error("Lifestyle scene generation error:", error);
        return null;
    }
};

/**
 * @deprecated Use generatePersonalizedPDPContent and generateLifestyleScene separately.
 */
export const generatePersonalizedPDPCombined = async (audience: string, productName: string, referenceImageSource: string): Promise<{ image: string | null, content: any }> => {
    
    try {
        console.log(`Generating combined PDP asset for ${audience} using gemini-3-pro-image-preview...`);

        let imageBytes = referenceImageSource;
        let mimeType = 'image/png';

        // If it looks like a URL or path, fetch it
        if (referenceImageSource.startsWith('/') || referenceImageSource.startsWith('http')) {
            console.log(`Fetching reference image from URL: ${referenceImageSource}`);
            try {
                const result = await urlToRawBase64(referenceImageSource);
                imageBytes = result.data;
                mimeType = result.mimeType;
                console.log(`Image fetched successfully. Mime: ${mimeType}, Size: ${imageBytes.length}`);
            } catch (fetchError) {
                console.error("Error fetching reference image:", fetchError);
                // Fallback or rethrow? If reference is missing, generation will fail or be generic.
                // Let's assume we proceed without image or throw? 
                // Proceeding might be better to at least get text, but the prompt relies on the image.
                throw fetchError;
            }
        } else if (referenceImageSource.startsWith('data:')) {
            // Strip prefix if a full data URI was passed
            const matches = referenceImageSource.match(/^data:([^;]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                mimeType = matches[1];
                imageBytes = matches[2];
            } else {
                imageBytes = referenceImageSource.split(',')[1];
            }
        }

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3.1-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: imageBytes } },
                    {
                        text: `
                        You are a marketing expert and visual designer.
                        
                        Task 1: Generate a photorealistic image of the product (reference provided) placed in a setting typical for the audience: "${audience}". 
                        - CRITICAL: The product in the output must be the EXACT same bottle from the reference image. Maintain the logo, text, colors, and shape exactly.
                        - Do not generate a new bottle. Composite the reference bottle naturally into the scene.
                        
                        Task 2: Write personalized PDP content for this audience.
                        - "whyPerfect": A single, punchy sentence (max 15 words) explaining why this product is perfect for them.
                        - "description": A short, tailored description (2-3 sentences) highlighting relevant features.
                        
                        Output Requirement:
                        Return BOTH the generated image and a text response containing the JSON for Task 2.
                        The text output MUST be a valid JSON object:
                        {
                            "whyPerfect": "...",
                            "description": "..."
                        }
                    ` }
                ]
            },
            config: {
                responseModalities: ["IMAGE", "TEXT"],
                // @ts-ignore
                imageConfig: {
                    aspectRatio: "1:1",
                    imageSize: "1K"
                }
            }
        });

        const imageBase64 = extractImageFromResponse(response);

        let content = { whyPerfect: "Perfect for you.", description: "High quality laundry detergent." };
        const candidates = response?.candidates || response?.response?.candidates;

        if (candidates && candidates.length > 0) {
            for (const part of candidates[0].content.parts) {
                if (part.text) {
                    try {
                        const cleanText = part.text.replace(/```json|```/g, '').trim();
                        // Find the JSON object within the text if there's extra chatter
                        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            content = JSON.parse(jsonMatch[0]);
                        } else {
                            content = JSON.parse(cleanText);
                        }
                    } catch (e) {
                        console.warn("Failed to parse JSON from combined response text:", part.text);
                    }
                }
            }
        }

        return {
            image: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : null,
            content: content
        };

    } catch (error) {
        console.error("Combined PDP generation error:", error);
        return {
            image: null,
            content: { whyPerfect: "Error generating content.", description: "Please try again." }
        };
    }
};



/**
 * Generates a video using Veo.
 */
export const generateVideo = async (
    params: GenerateVideoParams,
): Promise<{ objectUrl: string; blob: Blob; uri: string; video: Video }> => {
    console.log('Starting video generation with params:', params);

    const key = await getApiKey();
    const ai = await getClient();

    const config: any = {
        numberOfVideos: 1,
        resolution: params.resolution,
        durationSeconds: params.durationSeconds,
        personGeneration: params.personGeneration || PersonGeneration.ALLOW_ADULT,
    };

    if (params.mode !== GenerationMode.EXTEND_VIDEO) {
        config.aspectRatio = params.aspectRatio;
    }

    const generateVideoPayload: any = {
        model: params.model,
        config: config,
    };

    if (params.prompt) {
        generateVideoPayload.prompt = params.prompt;
    }

    if (params.mode === GenerationMode.FRAMES_TO_VIDEO) {
        if (params.startFrame) {
            generateVideoPayload.image = {
                imageBytes: params.startFrame.base64,
                mimeType: params.startFrame.file.type,
            };
            console.log(`Generating with start frame: ${params.startFrame.file.name}`);
        }

        const finalEndFrame = params.isLooping ? params.startFrame : params.endFrame;
        if (finalEndFrame) {
            generateVideoPayload.config.lastFrame = {
                imageBytes: finalEndFrame.base64,
                mimeType: finalEndFrame.file.type,
            };
            if (params.isLooping) {
                console.log(`Generating a looping video using start frame as end frame: ${finalEndFrame.file.name}`);
            } else {
                console.log(`Generating with end frame: ${finalEndFrame.file.name}`);
            }
        }
    } else if (params.mode === GenerationMode.REFERENCES_TO_VIDEO) {
        const referenceImagesPayload: VideoGenerationReferenceImage[] = [];

        if (params.referenceImages) {
            for (const img of params.referenceImages) {
                console.log(`Adding reference image: ${img.file.name}`);
                referenceImagesPayload.push({
                    image: {
                        imageBytes: img.base64,
                        mimeType: img.file.type,
                    },
                    referenceType: VideoGenerationReferenceType.ASSET,
                });
            }
        }

        if (params.styleImage) {
            console.log(`Adding style image as a reference: ${params.styleImage.file.name}`);
            referenceImagesPayload.push({
                image: {
                    imageBytes: params.styleImage.base64,
                    mimeType: params.styleImage.file.type,
                },
                referenceType: VideoGenerationReferenceType.STYLE,
            });
        }

        if (referenceImagesPayload.length > 0) {
            generateVideoPayload.config.referenceImages = referenceImagesPayload;
        }
    } else if (params.mode === GenerationMode.EXTEND_VIDEO) {
        if (params.inputVideoObject) {
            generateVideoPayload.video = params.inputVideoObject;
            console.log(`Generating extension from input video object.`);
        } else {
            throw new Error('An input video object is required to extend a video.');
        }
    }

    console.log('Submitting video generation request...', generateVideoPayload);
    // @ts-ignore
    let operation = await ai.models.generateVideos(generateVideoPayload);
    console.log('Video generation operation started:', operation);

    while (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        console.log('...Generating...');
        // @ts-ignore
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation?.response) {
        const videos = operation.response.generatedVideos;

        if (!videos || videos.length === 0) {
            throw new Error('No videos were generated.');
        }

        const firstVideo = videos[0];
        if (!firstVideo?.video?.uri) {
            throw new Error('Generated video is missing a URI.');
        }
        const videoObject = firstVideo.video;

        const url = decodeURIComponent(videoObject.uri);
        console.log('Fetching video from:', url);

        const res = await fetch(`${url}&key=${key}`);

        if (!res.ok) {
            throw new Error(`Failed to fetch video: ${res.status} ${res.statusText}`);
        }

        const videoBlob = await res.blob();
        const objectUrl = URL.createObjectURL(videoBlob);

        return { objectUrl, blob: videoBlob, uri: url, video: videoObject };
    } else {
        console.error('Operation failed:', operation);
        throw new Error('No videos generated.');
    }
};

// --- Synthetic Focus Group & Simulation Logic ---

export const generateEmailBodies = async (headlines: string[], brief: MarketingBriefData): Promise<{ [headline: string]: string }> => {
    
    try {
        const prompt = `
        You are an expert email marketer for ${brandConfig.companyName}.
        
        **Product:** ${brief.productName}
        **Target Audience:** ${brief.audiences[0]?.name || "General Audience"}
        **Key Goal:** Drive clicks, health plan enrollments, or health action engagement.

        **Task:**
        For EACH of the provided subject lines, write a short, persuasive email body (max 100 words).
        The tone should be consistent with the subject line.

        **Subject Lines:**
        ${JSON.stringify(headlines)}

        **Output:**
        Return a valid JSON object where keys are the subject lines and values are the generated email bodies.
        {
            "Subject Line 1": "Email body text...",
            "Subject Line 2": "Email body text..."
        }
        Do not use markdown.
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Email body generation error:", error);
        const fallback: any = {};
        headlines.forEach(h => fallback[h] = `Discover our latest deals and exclusive savings just for you. Shop now at ${brandConfig.companyName}.`);
        return fallback;
    }
};

export const generateWildcardAudience = async (context: string, existingAudiences: string[]): Promise<any> => {
    
    try {
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    You are a creative strategist looking for "Blue Ocean" opportunities.

                    **Company Context:**
                    ${context}

                    **Existing Segments:**
                    ${JSON.stringify(existingAudiences)}

                    **Task:**
                    Identify 1 COMPLETELY DIFFERENT "Wildcard" Audience Segment that is distinct from the existing ones.
                    Think of an outlier demographic, a surprising use-case, or an underserved niche that might actually buy this.
                    It should be realistic but creative.

                    Return a valid JSON object:
                    {
                        "name": "Creative Segment Name",
                        "personaName": "Full Name",
                        "bio": "Description...",
                        "demographics": "Age range...",
                        "imagePrompt": "Portrait of a..."
                    }
                    Do not use markdown code blocks.
                ` }]
            },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Wildcard generation error:", error);
        return null;
    }
};

export const generateAudienceFromCriteria = async (context: string, criteria: string): Promise<any> => {
    
    try {
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    You are a creative strategist.

                    **Company Context:**
                    ${context}

                    **User Request:**
                    The user wants to target an audience matching these criteria:
                    "${criteria}"

                    **Task:**
                    Develop a detailed target audience segment that PRECISELY matches the user's criteria.
                    Flesh it out into a specific persona.

                    Return a valid JSON object:
                    {
                        "name": "Segment Name",
                        "personaName": "Representative Name",
                        "bio": "A rich description of who they are, their lifestyle, and why they fit the criteria...",
                        "demographics": "Age, Location, Income...",
                        "imagePrompt": "Photorealistic portrait of..."
                    }
                    Do not use markdown code blocks.
                ` }]
            },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Audience generation error:", error);
        return null;
    }
};

export const simulateMarketingFocusGroup = async (
    personas: any[],
    brief: any,
    productsList: string[],
    emailCampaigns: { subject: string, body: string }[],
    marketingMessages: string[] = []
): Promise<any[]> => {
    
    const BATCH_SIZE = 10;
    const results: any[] = [];

    const processBatch = async (batchPersonas: any[]) => {
        try {
            console.log(`Processing batch of ${batchPersonas.length} users...`);
            const prompt = `
            You are a hyper-realistic consumer simulator.

            **CONTEXT:**
            You are simulating the behavior of ${batchPersonas.length} distinct synthetic personas.
            
            **CRITICAL INSTRUCTION - MAXIMIZE VARIANCE:**
            - **DO NOT** make everyone polite or rational.
            - Include **irrational bias**, **moodiness**, and **skepticism**.
            - Some users should HATE the campaign for petty reasons.
            - Some should LOVE it for random reasons.
            - **Enrollment decisions must be strict.** Most people DO NOT enroll in new health plans or add-ons unless they really need them or it's an amazing benefit.
            
            **THE MARKETING MATERIAL:**
            Campaign Goal: ${brief.campaignGoal}
            Value Proposition: ${brief.valueProp?.main?.en || "Great value"}
            
            **THE PRODUCTS TO EVALUATE:**
            ${JSON.stringify(productsList)}

            **THE EMAIL CAMPAIGNS TO TEST:**
            ${JSON.stringify(emailCampaigns)}

            **MARKETING MESSAGES TO TEST:**
            ${JSON.stringify(marketingMessages)}

            **YOUR TASK:**
            For EACH participant, simulate their authentic reaction to these materials. 
            
            1. **Brief Score**: Rate Interest, Clarity, and Relevance (0-100). 
               - **VARIANCE:** Scores should range widely. Do not average around 80. Use 20s, 40s, 90s.
            2. **Negative Feedback**: What would this specific persona dislike? Be blunt.
            3. **Cart Selection**: Which of the provided Healthco plans or benefits would they ACTUALLY enroll in right now? (True/False) and a short reason.
            4. **Email Engagement**: 
               - Only OPEN if the SUBJECT resonates.
               - Only CLICK if the BODY persuades them.
            5. **Message Testing**:
               - Rate each "Marketing Message" (0-100) on resonance.
               - Sentiment: "Positive", "Neutral", "Negative".

            **OUTPUT FORMAT:**
            Return a JSON array with exactly ${batchPersonas.length} objects:
            [
                {
                    "personaId": "id from input",
                    "personaName": "name from input",
                    "briefMetrics": { 
                        "interestScore": 85, 
                        "clarityScore": 90, 
                        "relevanceScore": 0-100, 
                        "feedback": "...",
                        "negativeFeedback": "..." 
                    },
                    "cart": [
                        { "productName": "Product 1", "purchased": true, "reason": "..." },
                        ...
                    ],
                    "emailEngagement": [
                        { "subjectLine": "Headline 1", "opened": true, "clicked": false },
                        ...
                    ],
                    "messageReactions": [
                        { "message": "Msg 1", "score": 85, "sentiment": "Positive" },
                        ...
                    ]
                }
            ]
            Do not use markdown.
            `;

            const response = await callGenAiProxy("generateContent", {
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        {
                            text: JSON.stringify(batchPersonas.map(p => ({
                                id: p.id,
                                name: p.name,
                                bio: p.bio,
                                demographics: p.demographics,
                                brands: p.preferred_brands,
                                traits: p.details?.lifestyle_tags || []
                            })))
                        },
                        { text: prompt }
                    ]
                },
                config: { responseMimeType: "application/json" }
            });

            const text = extractTextFromResponse(response) || "[]";
            const cleanText = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleanText);

        } catch (error) {
            console.error("Batch simulation error:", error);
            return batchPersonas.map(p => ({
                personaId: p.id,
                personaName: p.name,
                briefMetrics: { interestScore: 0, clarityScore: 0, relevanceScore: 0, feedback: "Simulation failed", negativeFeedback: "" },
                cart: [],
                emailEngagement: [],
                messageReactions: []
            }));
        }
    };

    const batches = [];
    for (let i = 0; i < personas.length; i += BATCH_SIZE) {
        batches.push(personas.slice(i, i + BATCH_SIZE));
    }

    const batchPromises = batches.map(batch => processBatch(batch));
    const allResults = await Promise.all(batchPromises);
    results.push(...allResults.flat());

    return results;
};

export const simulateAcquisitionFocusGroup = async (
    personas: any[],
    offers: string[]
): Promise<any[]> => {
    
    const BATCH_SIZE = 10;
    const results: any[] = [];

    const processBatch = async (batchPersonas: any[]) => {
        try {
            console.log(`Processing acquisition batch of ${batchPersonas.length} users...`);
            const prompt = `
            You are a hyper-realistic consumer simulator.
            
            **CONTEXT:**
            You are simulating ${batchPersonas.length} distinct synthetic personas.
            **CRITICAL:** For this simulation, assume these personas are **NEW PROSPECTS** who are considering switching their health insurance to ${brandConfig.companyName}.
            
            **THE ACQUISITION OFFERS:**
            ${JSON.stringify(offers)}

            **YOUR TASK:**
            For EACH participant, evaluate the offers and decide if they would join.
            
            1. **Likelihood to Join**: (0-100). Be realistic.
            2. **Perceived Value**: (0-100).
            3. **Barriers**: What is stopping them?
            4. **Winning Offer**: Which offer (if any) tempted them the most?
            5. **Feedback**: Their internal monologue.

            **OUTPUT FORMAT:**
            Return a JSON array with exactly ${batchPersonas.length} objects:
            [
                {
                    "personaId": "...",
                    "personaName": "...",
                    "likelihoodToJoin": 0-100,
                    "perceivedValue": 0-100,
                    "barriers": "...",
                    "winningOffer": "Offer Text or None",
                    "feedback": "..."
                }
            ]
            Do not use markdown.
            `;

            const response = await callGenAiProxy("generateContent", {
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        {
                            text: JSON.stringify(batchPersonas.map(p => ({
                                id: p.id,
                                name: p.name,
                                bio: p.bio,
                                demographics: p.demographics,
                                brands: p.preferred_brands,
                                traits: p.details?.lifestyle_tags || []
                            })))
                        },
                        { text: prompt }
                    ]
                },
                config: { responseMimeType: "application/json" }
            });

            const text = extractTextFromResponse(response) || "[]";
            const cleanText = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleanText);

        } catch (error) {
            console.error("Batch acquisition simulation error:", error);
            return batchPersonas.map(p => ({
                personaId: p.id,
                personaName: p.name,
                likelihoodToJoin: 0,
                perceivedValue: 0,
                barriers: "Simulation Failed",
                winningOffer: "None",
                feedback: "Error"
            }));
        }
    };

    const batches = [];
    for (let i = 0; i < personas.length; i += BATCH_SIZE) {
        batches.push(personas.slice(i, i + BATCH_SIZE));
    }

    const batchPromises = batches.map(batch => processBatch(batch));
    const allResults = await Promise.all(batchPromises);
    results.push(...allResults.flat());

    return results;
};

export const simulateCreativeFocusGroup = async (
    personas: any[],
    assets: MarketingAssets
): Promise<any[]> => {
    
    const BATCH_SIZE = 5; // Smaller batch for multimodal
    const results: any[] = [];

    // Helper to fetch image data for the prompt
    // We need to pass the base64 data if it exists
    let mainImagePart: any = null;
    if (assets.image && assets.image.startsWith('data:')) {
        const matches = assets.image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            mainImagePart = { inlineData: { mimeType: matches[1], data: matches[2] } };
        }
    }

    const processBatch = async (batchPersonas: any[]) => {
        try {
            console.log(`Processing creative focus group batch of ${batchPersonas.length} users...`);
            const prompt = `
            You are a hyper-realistic consumer simulator.
            
            **CONTEXT:**
            You are simulating ${batchPersonas.length} distinct synthetic personas.
            
            **THE CREATIVE ASSETS TO EVALUATE:**
            1. **Main Campaign Image**: (Attached)
            2. **Social Caption**: "${assets.social.caption}" (#${assets.social.hashtags.join(' #')})
            3. **Search Ad**: "${assets.search.headline}" - "${assets.search.description}"
            4. **Email Subject**: "${assets.email.subject}"
            
            **YOUR TASK:**
            For EACH participant, evaluate these creative assets.
            
            1. **Visual Appeal**: (0-100). Does the image look good to THEM?
            2. **Brand Fit**: (0-100). Does it feel perfectly aligned with Healthco's brand identity and values?
               - **Explanation**: Why/Why not?
            3. **Resonance**: (0-100). How much would this persona care?
               - **Explanation**: Specific triggers.
            4. **Constructive Feedback**: Specific ways to improve the image or copy to better fit the persona.
               - **Suggested Product**: If they don't like this product, what specific Healthco health plan or service would they prefer? (e.g. "Aha! Plan", "Blue Flex").
               - **Suggested Messaging**: What angle would work better? (e.g. "Focus on coverage", "Focus on savings").
               - **Suggested Image**: Describe a specific alternative image concept that would resonate better with THIS specific persona.
               - **Copy Edit**: Rewrite the Social Caption or Search Headline to better appeal to them.
            
            **OUTPUT FORMAT:**
            Return a JSON array with exactly ${batchPersonas.length} objects:
            [
                {
                    "personaId": "...",
                    "personaName": "...",
                    "visualAppeal": 0-100,
                    "brandFit": 0-100,
                    "stoppingPower": 0-100,
                    "conversionLikelihood": 0-100,
                    "sentiment": "Positive",
                    "feedback": "...",
                    "suggestedProduct": "...",
                    "suggestedMessaging": "...",
                    "suggestedImage": "...",
                    "copyEdit": "..."
                }
            ]
            Do not use markdown.
            `;

            const parts: any[] = [
                {
                    text: JSON.stringify(batchPersonas.map(p => ({
                        id: p.id,
                        name: p.name,
                        bio: p.bio,
                        demographics: p.demographics,
                        brands: p.preferred_brands,
                        traits: p.details?.lifestyle_tags || []
                    })))
                },
                { text: prompt }
            ];

            if (mainImagePart) {
                // Insert image before prompt
                parts.splice(1, 0, mainImagePart);
            }

            const response = await callGenAiProxy("generateContent", {
                model: 'gemini-3-flash-preview',
                contents: { parts },
                config: { responseMimeType: "application/json" }
            });

            const text = extractTextFromResponse(response) || "[]";
            const cleanText = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleanText);

        } catch (error) {
            console.error("Batch creative simulation error:", error);
            return batchPersonas.map(p => ({
                personaId: p.id,
                personaName: p.name,
                visualAppeal: 0,
                brandFit: 0,
                stoppingPower: 0,
                sentiment: "Neutral",
                feedback: "Simulation Failed",
                conversionLikelihood: 0,
                suggestedProduct: "None",
                suggestedMessaging: "None",
                copyEdit: "None"
            }));
        }
    };

    const batches = [];
    for (let i = 0; i < personas.length; i += BATCH_SIZE) {
        batches.push(personas.slice(i, i + BATCH_SIZE));
    }

    const batchPromises = batches.map(batch => processBatch(batch));
    const allResults = await Promise.all(batchPromises);
    results.push(...allResults.flat());

    return results;
};

/**
 * Generates a Feasibility Report based on aggregated data.
 */
export const generateFeasibilityReport = async (aggregatedData: any): Promise<FeasibilityReport> => {
    const prompt = `
    Role: Senior Executive Consultant & Data Analyst.
    Task: Assess the feasibility and likelihood of success for a marketing campaign based on the provided data components.

    Data Components:
    1. Marketing Brief: ${JSON.stringify(aggregatedData.brief || "Not Available")}
    2. Focus Group Feedback: ${JSON.stringify(aggregatedData.focusGroup || "Not Available")}

    Analysis Requirements:
    - **Score**: Calculate a success probability score (0-100) based on alignment between the brief, customer feedback, and product fit.
      - High alignment & positive feedback = High Score.
      - Contradictions or negative feedback = Low Score.
    - **Summary**: A concise executive summary (2-3 sentences) of the overall viability.
    - **Risks**: List specific risks or blockers identified in the data (e.g., negative sentiment, misalignment).
    - **Opportunities**: List specific growth areas or strengths.
    - **Tactical Improvements**: Concrete, actionable steps to improve the score. Prioritize them (High/Medium/Low).

    Output Schema:
    Return pure JSON matching this structure:
    {
      "score": number,
      "summary": string,
      "risks": string[],
      "opportunities": string[],
      "tactical_improvements": [
        { "area": "Messaging" | "Targeting" | "Product" | "Creative", "suggestion": string, "priority": "High" | "Medium" | "Low" }
      ]
    }
    `;

    const schema: Schema = {
        type: "OBJECT",
        properties: {
            score: { type: "NUMBER" },
            summary: { type: "STRING" },
            risks: { type: "ARRAY", items: { type: "STRING" } },
            opportunities: { type: "ARRAY", items: { type: "STRING" } },
            tactical_improvements: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        area: { type: "STRING" },
                        suggestion: { type: "STRING" },
                        priority: { type: "STRING", enum: ["High", "Medium", "Low"] }
                    },
                    required: ["area", "suggestion", "priority"]
                }
            }
        },
        required: ["score", "summary", "risks", "opportunities", "tactical_improvements"]
    };

    const modelsToTry = [
        "gemini-3-pro-preview",
        "gemini-3-flash-preview",
        "gemini-2.5-pro",
        "gemini-2.5-flash"
    ];

    for (const model of modelsToTry) {
        try {
            console.log(`Generating Feasibility Report with ${model}...`);
            const result = await generateJson(prompt, schema, model);
            return result as FeasibilityReport;
        } catch (error) {
            console.warn(`${model} failed, trying next fallback...`, error);
        }
    }

    throw new Error("Failed to generate feasibility report with all available models.");
};

export const scoreAudienceSegments = async (personas: CombinedPersona[], context: string): Promise<{ propensity: number, value: number, reason: string }[]> => {
    
    try {
        const prompt = `
        You are a strategic marketing analyst.
        Company Context: ${context}
        
        Task: Analyze the following Audience Personas and score them on two dimensions:
        1. **Propensity to Purchase Now vs Later (X-Axis)**: 
           - 0 = "Will buy later / never" (Low urgency)
           - 100 = "Will buy immediately" (High urgency)
           - Consider: Need state, impulse drivers, and current pain points.
           
        2. **Potential Customer Value (Y-Axis)**:
           - 0 = "Low Value" (One-off purchase, low affinity)
           - 100 = "High Value" (Loyal, high spend, brand advocate)
           - Consider: Income, brand loyalty, lifestyle fit, and retention likelihood.

        Audience Personas:
        ${JSON.stringify(personas.map(p => ({
            name: p.name,
            personaName: p.personaName,
            bio: p.bio || p.details?.bio,
            income: p.details?.income,
            goals: p.details?.goals
        })), null, 2)}

        Return a JSON array of objects, one for each persona in the same order:
        [
            {
                "propensity": 85,
                "value": 90,
                "reason": "High urgency due to..."
            }
        ]
        Do not use markdown code blocks.
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{ text: prompt }]
            },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "[]";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Audience scoring error:", error);
        // Return random scores as fallback for demo if API fails
        return personas.map(() => ({
            propensity: Math.floor(Math.random() * 100),
            value: Math.floor(Math.random() * 100),
            reason: "Scoring unavailable, using estimate."
        }));
    }
};

export const conductQualitativeInterview = async (persona: CombinedPersona, context: string, initialQuestion: string): Promise<InterviewResult> => {
    
    try {
        const prompt = `
        You are simulating a qualitative user interview regarding health insurance, preventative care, and the "Healthco" brand. Let your answers reflect your specific healthcare needs and financial concerns.
        
        **Role**: act as ${persona.name} (${persona.personaName}), with the following details:
        - Bio: ${persona.bio || persona.details?.bio || "No bio available"}
        - Job: ${persona.details?.job_title || "Unknown"}
        - Age: ${persona.details?.age || "Unknown"}
        - Context: ${context}

        **Task**: 
        1. Answer the Initial Question from the interviewer.
        2. Then, simulate a "Researcher" asking you a follow-up question based on your answer.
        3. Answer the follow-up.
        4. Simulate one final follow-up from the Researcher.
        5. Answer the final follow-up.

        **Initial Question**: "${initialQuestion}"

        **Output Format**:
        Return a JSON object with this exact structure:
        {
            "transcript": [
                { "role": "interviewer", "content": "${initialQuestion}" },
                { "role": "interviewee", "content": "..." },
                { "role": "interviewer", "content": "..." },
                { "role": "interviewee", "content": "..." },
                { "role": "interviewer", "content": "..." },
                { "role": "interviewee", "content": "..." }
            ],
            "summary": "Brief 1-sentence summary of the key insight from this user.",
            "quote": "The most impactful sentence said by the user.",
            "sentiment": "Positive" | "Neutral" | "Negative"
        }
        
        Do not output markdown code blocks. Just the raw JSON.
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanText);

        return {
            personaId: persona.id || `p_${Date.now()}`,
            personaName: persona.name,
            transcript: data.transcript || [],
            summary: data.summary || "No summary generated.",
            quote: data.quote || "No quote generated.",
            sentiment: data.sentiment || "Neutral"
        };
    } catch (error) {
        console.error("Interview simulation error:", error);
        return {
            personaId: persona.id || `p_err`,
            personaName: persona.name,
            transcript: [],
            summary: "Error during interview simulation.",
            quote: "Error.",
            sentiment: "Neutral"
        };
    }
};

export const generateRegionalVariants = async (basePrompt: string): Promise<{ region: string, imagePrompt: string, image: string | null }[]> => {
    
    try {
        const regions = ["Generic", "Health-Focused (Condition Specific)", "Regional (Local Community)", "Value-Based (Pricing/Benefits)", "Emotional (Peace of Mind)"];

        const prompt = `
        Take the following base health insurance marketing concept for Healthco: "${basePrompt}"
        
        Adapt this concept for the following variations/themes, adding specific imagery or cultural cues relevant to each:
        ${regions.join(", ")}
        
        Return a JSON object mapping each region name exactly as written to a highly detailed image generation prompt. Include health insurance and wellness context in the prompts.
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanText);

        const results = [];
        for (const region of regions) {
            const promptForRegion = data[region] || basePrompt;
            // Generate the image using the existing utility (gemini-3-pro-image-preview)
            const imageUrl = await generateImageFromPrompt(promptForRegion + ", professional marketing photography, high resolution");
            results.push({
                region,
                imagePrompt: promptForRegion,
                image: imageUrl
            });
        }
        return results;
    } catch (error) {
        console.error("Regional variants error:", error);
        return [{ region: "Generic", imagePrompt: basePrompt, image: null }];
    }
};

export const simulateABTestFocusGroup = async (pool: any[], variants: { region: string, image: string | null }[]): Promise<ABTestResult[]> => {
    
    if (!variants || variants.length === 0) return [];

    // Process each persona in parallel
    const promises = pool.map(async (persona) => {
        try {
            const prompt = `
            You are evaluating health insurance marketing creative variants for Healthco as a synthetic user.
            
            Persona Profile:
            Name: ${persona.name}
            Bio: ${persona.bio}
            Pain Points: ${persona.pain_points?.join(", ")}
            Goals: ${persona.goals?.join(", ")}

            Variants presented to you:
            ${variants.map(v => `- Variant: ${v.region}`).join("\n\n")}

            Task: Review the variants presented. 
            For EACH variant, provide a score from 1 to 10 on how strongly it resonates with your persona (e.g., would you click this ad more or less?). Explain your rationale for that score.
            Then, determine the overall best variant.

            Return ONLY a JSON object:
            {
                "rankings": [
                    { "variantName": "Variant Name", "score": 8, "rationale": "Why you gave this score..." }
                ],
                "selectedVariant": "The top scoring variant name",
                "overallFeedback": "Overall thoughts on the options presented.",
                "sentiment": "Positive/Neutral/Critical"
            }
            `;

            const response = await callGenAiProxy("generateContent", {
                model: 'gemini-3-flash-preview',
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: { responseMimeType: "application/json" }
            });

            const text = extractTextFromResponse(response) || "{}";
            const cleanText = text.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanText);

            return {
                personaId: persona.id,
                personaName: persona.name,
                rankings: data.rankings || [],
                selectedVariant: data.selectedVariant || "Generic",
                overallFeedback: data.overallFeedback || "No rationale provided.",
                sentiment: data.sentiment || "Neutral"
            };
        } catch (err) {
            console.error(`Simulation error for persona ${persona.name}:`, err);
            return {
                personaId: persona.id,
                personaName: persona.name,
                selectedVariant: "Error",
                rationale: "Simulation failed.",
                sentiment: "Neutral"
            };
        }
    });

    return Promise.all(promises);
};

export const generateAgentSummary = async (customerText: string): Promise<any> => {
    try {
        const prompt = `
        You are an expert health concierge assistant.
        Analyze the following raw customer data and chat telemetry.
        Extract the information into a highly structured JSON dashboard payload for a live health concierge to review during an incoming call.

        RAW DATA:
        ${customerText}

        INSTRUCTIONS:
        Output ONLY a valid JSON object matching this schema exactly:
        {
            "profile": {
                "name": "Full Name",
                "initials": "First & Last Initials",
                "email": "Email Address",
                "phone": "Phone Number",
                "totalSaved": "Formatted string, e.g. $24,500",
                "income": "Formatted string, e.g. $8,500/yr"
            },
            "familySummary": [
                { "name": "Name", "relation": "Relation" }
            ],
            "recent_purchases": [
                { "name": "Purchase/Claim Name", "brand": "e.g. In-Network", "price": 450, "type": "e.g. Provider Visit" }
            ],
            "upcoming_events": [
                { "event_name": "Event Name", "target_date": "Upcoming", "notes": "High priority" }
            ],
            "aiSummary": "A 3-4 sentence engaging executive summary for the concierge. Describe the user's current health insurance needs, plan tier, and their immediate intent based on the chat logs.",
            "nextActions": [
                { "title": "Action Title", "description": "Action Details" }
            ],
            "marketingActivity": [
                { "type": "Web|Email|App", "event": "Event Name", "time": "e.g. 2026-03-02", "details": "Viewed New Plans" }
            ],
            "engagementChart": {
                "title": "Recent Digital Engagement",
                "data": [
                    { "name": "e.g. Web", "visits": 0, "clicks": 0 }
                ]
            }
        }
        
        Ensure "nextActions" provides at least 2 distinct recommendations based on user intent in the logs.
        Ensure "engagementChart.data" correctly tallies their recent online behavior (like Web Visits, Emails, App Usage).
        Ensure "upcoming_events" provides context for the customer's health goals.
        Extract "recent_purchases" and "upcoming_events" explicitly from the JSON payload. Format prices as integers.
        Ensure "marketingActivity" includes a "type" field of either "Web", "Email", or "App".
        Do not use markdown.
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanText);
        
        console.log("Parsed Concierge Data:", JSON.stringify(data, null, 2));
        
        return data;

    } catch (error) {
        console.error("Agent summary generation error:", error);
        throw error;
    }
};