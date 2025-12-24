import { supabase } from './supabase';
import { LandmarkAnalysis, ChatMessage, ChatSession } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Chat Service for AI conversations with landmarks
 */

// Edge Function interfaces (matching the backend)
interface LandmarkInfo {
  name: string;
  description: string;
  location: string;
  yearBuilt?: string;
  architecture?: string;
  significance?: string;
  funFacts?: string[];
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatServiceParams {
  landmark: LandmarkAnalysis;
  messages: ChatMessage[];
  userMessage: string;
  language?: string;
}

interface SendMessageResponse {
  success: boolean;
  message?: ChatMessage;
  error?: string;
}

/**
 * Convert LandmarkAnalysis to LandmarkInfo format expected by Edge Function
 */
function landmarkToInfo(landmark: LandmarkAnalysis): LandmarkInfo {
  return {
    name: landmark.name,
    description: landmark.description,
    location: landmark.coordinates 
      ? `${landmark.coordinates.latitude}, ${landmark.coordinates.longitude}`
      : 'Location unknown',
    yearBuilt: landmark.yearBuilt?.toString(),
    architecture: landmark.architecturalStyle,
    significance: landmark.culturalSignificance,
    funFacts: landmark.funFacts
  };
}

/**
 * Convert ChatMessage to ConversationMessage format
 */
function chatToConversation(messages: ChatMessage[]): ConversationMessage[] {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp
  }));
}

/**
 * Send a message to the AI and get response
 */
export async function sendMessage(params: ChatServiceParams): Promise<SendMessageResponse> {
  try {
    const { landmark, messages, userMessage, language = 'en' } = params;
    
    console.log('Sending message to AI:', userMessage);
    
    // Convert data to Edge Function format
    const landmarkInfo = landmarkToInfo(landmark);
    const conversationHistory = chatToConversation(messages);
    
    // Call the chat Edge Function
    const { data, error } = await supabase.functions.invoke('chat-with-landmark', {
      body: {
        landmarkInfo,
        conversationHistory,
        userMessage,
        language
      }
    });
    
    if (error) {
      console.error('Chat service error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message'
      };
    }
    
    // Parse the Gemini API response
    let aiResponseText = '';
    
    if (data.response) {
      // If Edge Function already processed the response
      aiResponseText = data.response;
    } else if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      // Handle raw Gemini API response format
      const content = data.candidates[0].content;
      if (content.parts && content.parts[0] && content.parts[0].text) {
        aiResponseText = content.parts[0].text;
      } else if (Array.isArray(content) && content[0] && content[0].text) {
        aiResponseText = content[0].text;
      } else {
        console.error('Unexpected Gemini response structure:', content);
        return {
          success: false,
          error: 'Unable to parse AI response'
        };
      }
    } else {
      console.error('Invalid response from chat service:', data);
      return {
        success: false,
        error: 'Invalid response from AI service'
      };
    }
    
    if (!aiResponseText || aiResponseText.trim().length === 0) {
      console.error('Empty response from AI');
      return {
        success: false,
        error: 'Received empty response from AI'
      };
    }
    
    // Create AI response message
    const aiMessage: ChatMessage = {
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: aiResponseText.trim(),
      timestamp: new Date().toISOString(),
      landmarkId: landmark.id
    };
    
    console.log('AI response received:', aiMessage.content.substring(0, 100) + '...');
    
    return {
      success: true,
      message: aiMessage
    };
    
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Create initial greeting message from expert guide
 */
export function createGreetingMessage(landmark: LandmarkAnalysis): ChatMessage {
  const greetings = [
    `Hello! I'm your expert guide for ${landmark.name}. I have extensive knowledge about this landmark's history, architecture, and cultural significance. What would you like to learn?`,
    `Welcome! I'm here to help you discover everything about ${landmark.name}. Feel free to ask me anything about its construction, historical importance, or interesting facts!`,
    `Hi there! I specialize in ${landmark.name} and can share detailed insights about its design, history, and significance. What aspects interest you most?`
  ];
  
  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  return {
    id: `greeting_${landmark.id}`,
    role: 'assistant',
    content: randomGreeting,
    timestamp: new Date().toISOString(),
    landmarkId: landmark.id
  };
}

/**
 * Get or create a chat session
 */
export async function getOrCreateSession(landmarkId: string, landmarkName: string): Promise<ChatSession> {
  try {
    const sessionKey = `chat_session_${landmarkId}`;
    const existingSession = await AsyncStorage.getItem(sessionKey);
    
    if (existingSession) {
      const session: ChatSession = JSON.parse(existingSession);
      console.log('Loaded existing chat session:', session.id);
      return session;
    }
    
    // Create new session
    const newSession: ChatSession = {
      id: `session_${landmarkId}_${Date.now()}`,
      landmarkId,
      landmarkName,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await AsyncStorage.setItem(sessionKey, JSON.stringify(newSession));
    console.log('Created new chat session:', newSession.id);
    
    return newSession;
    
  } catch (error) {
    console.error('Error managing chat session:', error);
    // Return fallback session
    return {
      id: `fallback_${landmarkId}`,
      landmarkId,
      landmarkName,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

/**
 * Save chat session to storage
 */
export async function saveSession(session: ChatSession): Promise<boolean> {
  try {
    const sessionKey = `chat_session_${session.landmarkId}`;
    const updatedSession = {
      ...session,
      updatedAt: new Date().toISOString()
    };
    
    await AsyncStorage.setItem(sessionKey, JSON.stringify(updatedSession));
    console.log('Saved chat session:', session.id);
    return true;
    
  } catch (error) {
    console.error('Error saving chat session:', error);
    return false;
  }
}

/**
 * Add message to session and save
 */
export async function addMessageToSession(
  session: ChatSession, 
  message: ChatMessage
): Promise<ChatSession> {
  const updatedSession = {
    ...session,
    messages: [...session.messages, message],
    updatedAt: new Date().toISOString()
  };
  
  await saveSession(updatedSession);
  return updatedSession;
}

/**
 * Clear chat session (for debugging or reset)
 */
export async function clearSession(landmarkId: string): Promise<boolean> {
  try {
    const sessionKey = `chat_session_${landmarkId}`;
    await AsyncStorage.removeItem(sessionKey);
    console.log('Cleared chat session for landmark:', landmarkId);
    return true;
  } catch (error) {
    console.error('Error clearing chat session:', error);
    return false;
  }
}

/**
 * Create user message
 */
export function createUserMessage(content: string, landmarkId: string): ChatMessage {
  return {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
    landmarkId
  };
}

/**
 * Validate message content
 */
export function validateMessage(content: string): { isValid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }
  
  if (content.length > 500) {
    return { isValid: false, error: 'Message too long (max 500 characters)' };
  }
  
  return { isValid: true };
}