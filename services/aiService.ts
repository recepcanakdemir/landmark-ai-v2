import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import { LandmarkAnalysis } from '@/types';

/**
 * AI Service for landmark analysis using Gemini via Supabase Edge Functions
 */

interface GeminiProxyPayload {
  contents: Array<{
    parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    >;
  }>;
}

/**
 * Analyze image using Gemini AI via Supabase Edge Function
 */
export async function analyzeImage(imageUri: string, locationCoords?: { lat: number; lng: number }, scanType: 'landmark' | 'museum' = 'landmark'): Promise<LandmarkAnalysis> {
  try {
    console.log('Starting AI analysis for image:', imageUri);
    
    // Step 1: Convert image to base64
    const base64Data = await convertImageToBase64(imageUri);
    
    // Step 2: Build the exact payload structure for gemini-proxy
    const payload: GeminiProxyPayload = {
      contents: [
        {
          parts: [
            {
              text: buildAnalysisPrompt(locationCoords, scanType)
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ]
    };
    
    console.log('Calling Gemini proxy with payload structure:', {
      contentsParts: payload.contents[0].parts.length,
      hasText: !!payload.contents[0].parts[0],
      hasImage: !!payload.contents[0].parts[1],
      imageSize: base64Data.length
    });
    
    // Step 3: Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: payload
    });
    
    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No response from AI service');
    }
    
    console.log('Raw AI response:', JSON.stringify(data, null, 2));
    
    // Step 4: Parse and validate the response
    const landmarkData = parseGeminiResponse(data, scanType);
    
    // Step 5: Add metadata
    const analysis: LandmarkAnalysis = {
      ...landmarkData,
      id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      imageUrl: imageUri,
      analyzedAt: new Date().toISOString(),
      accuracy: landmarkData.confidence || 0.85, // Use AI confidence or fallback
      scanType: scanType // Ensure scanType is preserved
    };
    
    console.log('Successfully analyzed landmark:', analysis.name);
    return analysis;
    
  } catch (error) {
    console.error('Error in analyzeImage:', error);
    throw error;
  }
}

/**
 * Convert image URI to base64 string
 */
async function convertImageToBase64(imageUri: string): Promise<string> {
  try {
    console.log('Converting image to base64:', imageUri);
    
    // Check if the file exists first
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    console.log('File info:', fileInfo);
    
    if (!fileInfo.exists) {
      throw new Error('Image file does not exist');
    }
    
    // Use the proper enum from legacy API
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('Base64 conversion successful, length:', base64.length);
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    console.error('Image URI was:', imageUri);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build the analysis prompt for Gemini
 */
function buildAnalysisPrompt(locationCoords?: { lat: number; lng: number }, scanType: 'landmark' | 'museum' = 'landmark'): string {
  const locationContext = locationCoords 
    ? `\n\nCONTEXT: The image was captured at GPS coordinates: Latitude ${locationCoords.lat}, Longitude ${locationCoords.lng}. You MUST use this location data to filter your identification results and prioritize ${scanType === 'museum' ? 'artworks and museum pieces' : 'landmarks'} geographically located near these coordinates.`
    : '';

  if (scanType === 'museum') {
    return buildMuseumAnalysisPrompt(locationContext);
  }

  return `Analyze this landmark image and return ONLY a valid JSON object with no markdown formatting or code blocks.${locationContext}

The JSON must have this exact structure:
{
  "name": "Landmark name",
  "description": "2-3 sentence description of the landmark",
  "history": "Detailed historical background (3-4 sentences)",
  "architect": "Architect name or 'Unknown'",
  "yearBuilt": 1500,
  "funFacts": [
    "Interesting fact 1",
    "Interesting fact 2", 
    "Interesting fact 3"
  ],
  "faq": [
    {
      "question": "How tall is this landmark?",
      "answer": "Provide specific height and context"
    },
    {
      "question": "When was it built?",
      "answer": "Construction timeline and historical context"
    },
    {
      "question": "Who designed it?",
      "answer": "Architect or designer information"
    }
  ],
  "culturalSignificance": "Cultural and historical importance",
  "architecturalStyle": "Architectural style (e.g., Gothic, Renaissance)",
  "visitingTips": [
    "Tip 1 for visitors",
    "Tip 2 for visitors"
  ],
  "city": "City name where landmark is located",
  "country": "Country name where landmark is located",
  "coordinates": {
    "latitude": 41.0256,
    "longitude": 28.9744
  },
  "nearbySearchQueries": [
    "Museum near landmark name city",
    "Historical museum near landmark name",
    "Art gallery near landmark name city", 
    "Church near landmark name city",
    "Park near landmark name city",
    "Garden near landmark name city",
    "Square near landmark name city",
    "Restaurant near landmark name city",
    "Cafe near landmark name city",
    "Historic restaurant near landmark name"
  ],
  "confidence": 0.95
}

Requirements:
- Return ONLY the JSON object, no additional text
- Do not use markdown code blocks or formatting
- All text fields must be in English
- If you cannot identify the landmark, use "Unknown Landmark" as the name
- Provide your best estimates for missing information
- Keep descriptions concise but informative
- Include at least 2-3 fun facts
- Coordinates should be approximate if known
- city and country fields are REQUIRED - provide your best estimate
- For nearbySearchQueries: Provide exactly 10 diverse search queries following this pattern:
  * 4 cultural/historical places: museums, churches, galleries, historical sites
  * 3 scenic spots: parks, gardens, squares, viewpoints
  * 3 culinary spots: restaurants, cafes, historic dining establishments
- nearby place names should be actual establishment names or specific venue types
- Include the landmark's city name in search queries for better accuracy
- Focus on places within walking distance (0.5-2km) of the landmark
- confidence: Provide your confidence level as a decimal (0.0-1.0) based on how certain you are about the landmark identification

Analyze the image now:`;
}

/**
 * Build specialized analysis prompt for museum pieces and artworks
 */
function buildMuseumAnalysisPrompt(locationContext: string): string {
  return `You are an EXPERT ART GUIDE and MUSEUM CURATOR. Analyze this artwork, sculpture, historical artifact, or museum piece and return ONLY a valid JSON object with no markdown formatting or code blocks.

This is a specialized ART GUIDE analysis for: Paintings, Sculptures, Murals, Historical Artifacts (weapons, uniforms, tools), Museum Machines, Ancient Artifacts, and Cultural Objects.

ACT LIKE A KNOWLEDGEABLE MUSEUM GUIDE who can explain any piece to visitors with expert knowledge about art history, techniques, historical context, and cultural significance.

The JSON must have this exact structure:
{
  "name": "Artwork/Artifact name",
  "artist": "Artist name or 'Unknown Artist' for historical artifacts",
  "estimatedValue": "€2-5 million" or "Priceless museum collection" or "Not for sale - Historical artifact" or "Public monument - Not applicable",
  "artStyle": "Cubism / Realism / Baroque / Art Nouveau / Military Historic / Ancient Craftsmanship",
  "historicalEra": "Renaissance Period (1400-1600)" or "WWII Era" or "Victorian Period",
  "medium": "Oil on canvas / Bronze sculpture / Historical steel / Ancient pottery",
  "technique": "Impasto brushwork / Lost-wax casting / Hand-forged metalwork / Traditional pottery",
  "museumExplanation": "Detailed expert explanation of the piece's artistic/technical significance, composition, symbolism, and craftsmanship (3-4 sentences like a museum guide would explain)",
  "historicalContext": "Historical period background and significance of this piece in its era (3-4 sentences)",
  "description": "Clear description of what visitors see when looking at this piece",
  "history": "Creation story and historical journey of this specific piece",
  "yearBuilt": 1889,
  "location": "Museum name or monument location where this piece is housed/displayed",
  "city": "City where the piece is located",
  "country": "Country where the piece is located",
  "funFacts": [
    "Fascinating artistic or historical fact 1",
    "Intriguing technical or cultural fact 2", 
    "Surprising historical detail 3"
  ],
  "faq": [
    {
      "question": "What makes this piece historically significant?",
      "answer": "Historical importance and lasting impact explanation"
    },
    {
      "question": "What technique or style is this?",
      "answer": "Technical and artistic style analysis"
    },
    {
      "question": "When and why was this created?",
      "answer": "Creation context and historical purpose"
    }
  ],
  "culturalSignificance": "Why this piece matters in art history/cultural heritage (focus on artistic/historical importance)",
  "architecturalStyle": "Artistic movement or historical period style",
  "confidence": 0.95,
  "scanType": "museum",
  "dimensions": "Height x Width or object dimensions if determinable"
}

EXPERT GUIDE REQUIREMENTS:
- Analyze like a museum expert who can identify art movements, techniques, and historical periods
- For ARTWORKS: Focus on artist, style, technique, art movement, value, composition analysis
- For HISTORICAL ARTIFACTS: Focus on period, craftsmanship, military/cultural purpose, historical significance
- For SCULPTURES: Focus on material, technique, artistic movement, symbolic meaning
- For ANCIENT PIECES: Focus on culture, period, craftsmanship, historical importance
- LOCATION IDENTIFICATION: Identify WHERE this piece is typically housed or displayed
  * Famous artworks: "Louvre Museum" / "Metropolitan Museum of Art" / "Uffizi Gallery"
  * Public sculptures: "Central Park, New York" / "Trafalgar Square, London"  
  * Monument art: "Sistine Chapel, Vatican" / "Notre-Dame Cathedral, Paris"
  * Historical artifacts: "British Museum" / "Smithsonian Institution"
- Provide educational content that helps visitors understand and appreciate the piece
- estimatedValue: Use nuanced assessment based on ownership and market status:
  * Market artworks: "€2-5 million" / "$10-20 million"
  * Museum collections: "Priceless museum collection" / "Museum permanent collection"
  * Historical artifacts: "Not for sale - Historical artifact"
  * Public monuments: "Public monument - Not applicable"
- artStyle: Be specific (not just "Renaissance" but "High Renaissance" or "Venetian Renaissance")
- historicalEra: Provide specific periods with date ranges when possible
- museumExplanation: Write as if personally guiding a visitor through detailed analysis
- location, city, country: Required fields for context - identify the museum, gallery, or public location where visitors can see this piece

PIECE TYPES TO EXCEL AT:
✓ Famous paintings (Van Gogh, Picasso, Da Vinci, etc.)
✓ Classical and modern sculptures  
✓ Historical weapons and armor
✓ Military uniforms and regalia
✓ Ancient pottery and artifacts
✓ Historical machines and tools
✓ Murals and frescoes
✓ Cultural and religious artifacts
✓ Archaeological finds

Be the expert guide that makes any museum visit educational and fascinating!

Analyze the museum piece now:`;
}

/**
 * Parse and validate Gemini response
 */
function parseGeminiResponse(response: any, scanType: 'landmark' | 'museum' = 'landmark'): Partial<LandmarkAnalysis> {
  try {
    // Handle different possible response structures
    let jsonText: string;
    
    if (typeof response === 'string') {
      jsonText = response;
    } else if (response.candidates && response.candidates[0]) {
      // Standard Gemini API response structure
      jsonText = response.candidates[0].content?.parts?.[0]?.text || '';
    } else if (response.text) {
      jsonText = response.text;
    } else if (response.content) {
      jsonText = response.content;
    } else {
      throw new Error('Unexpected response format from AI service');
    }
    
    // Clean the response text
    jsonText = cleanJsonResponse(jsonText);
    
    console.log('Cleaned JSON text for parsing:', jsonText);
    
    // Parse the JSON
    const parsed = JSON.parse(jsonText);
    
    // Validate required fields
    if (!parsed.name) {
      throw new Error('AI response missing required field: name');
    }
    
    // Ensure arrays exist
    parsed.funFacts = parsed.funFacts || [];
    parsed.faq = parsed.faq || [];
    parsed.visitingTips = parsed.visitingTips || [];
    
    // Ensure coordinates exist
    if (!parsed.coordinates || typeof parsed.coordinates.latitude !== 'number') {
      parsed.coordinates = null;
    }
    
    // Validate confidence score
    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
      console.warn('Invalid confidence score in AI response, using default:', parsed.confidence);
      parsed.confidence = 0.85; // Fallback to our current default
    }
    
    return parsed;
    
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    console.error('Raw response was:', response);
    
    // Return fallback data if parsing fails
    return {
      name: scanType === 'museum' ? 'Unknown Artwork' : 'Unknown Landmark',
      description: scanType === 'museum' 
        ? 'This artwork or museum piece could not be identified by our AI system.'
        : 'This landmark could not be identified by our AI system.',
      history: 'Unable to retrieve historical information for this location.',
      architect: 'Unknown',
      yearBuilt: undefined,
      funFacts: [scanType === 'museum' ? 'This artwork requires manual identification.' : 'This landmark requires manual identification.'],
      faq: [
        {
          question: scanType === 'museum' ? 'What is this artwork?' : 'What is this landmark?',
          answer: scanType === 'museum' 
            ? 'This artwork could not be automatically identified. Please try scanning a clearer image or search manually.'
            : 'This landmark could not be automatically identified. Please try scanning a clearer image or search manually.'
        }
      ],
      culturalSignificance: 'Unknown cultural significance.',
      architecturalStyle: 'Unknown',
      visitingTips: ['Consider researching this location manually.'],
      city: 'Unknown',
      country: 'Unknown',
      coordinates: undefined,
      confidence: 0.10, // Low confidence for fallback data
      scanType: scanType
    };
  }
}

/**
 * Clean JSON response by removing markdown formatting and extra text
 */
function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks
  text = text.replace(/```json\s*/gi, '');
  text = text.replace(/```\s*/gi, '');
  
  // Remove any text before the first {
  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    text = text.substring(firstBrace);
  }
  
  // Remove any text after the last }
  const lastBrace = text.lastIndexOf('}');
  if (lastBrace !== -1) {
    text = text.substring(0, lastBrace + 1);
  }
  
  // Remove any trailing text after JSON
  text = text.trim();
  
  return text;
}

/**
 * Validate that a landmark analysis is complete
 */
export function validateLandmarkAnalysis(analysis: Partial<LandmarkAnalysis>): analysis is LandmarkAnalysis {
  return !!(
    analysis.name &&
    analysis.description &&
    analysis.history &&
    Array.isArray(analysis.funFacts)
  );
}