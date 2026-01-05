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
 * Translation lookup for greeting messages
 */
const greetingTranslations = {
  en: [
    "Hello! I'm your expert guide for {{landmarkName}}. I have extensive knowledge about this landmark's history, architecture, and cultural significance. What would you like to learn?",
    "Welcome! I'm here to help you discover everything about {{landmarkName}}. Feel free to ask me anything about its construction, historical importance, or interesting facts!",
    "Hi there! I specialize in {{landmarkName}} and can share detailed insights about its design, history, and significance. What aspects interest you most?"
  ],
  tr: [
    "Merhaba! {{landmarkName}} için uzman rehberinizim. Bu anıtın tarihi, mimarisi ve kültürel önemi hakkında geniş bilgiye sahibim. Ne öğrenmek istersiniz?",
    "Hoş geldiniz! {{landmarkName}} hakkında her şeyi keşfetmenize yardım etmek için buradayım. İnşası, tarihi önemi veya ilginç gerçekleri hakkında istediğinizi sorabilirsiniz!",
    "Selam! {{landmarkName}} konusunda uzmanım ve tasarımı, tarihi ve önemi hakkında detaylı bilgiler paylaşabilirim. Hangi yönleri sizi en çok ilgilendiriyor?"
  ],
  es: [
    "¡Hola! Soy tu guía experto para {{landmarkName}}. Tengo amplios conocimientos sobre la historia, arquitectura e importancia cultural de este monumento. ¿Qué te gustaría aprender?",
    "¡Bienvenido! Estoy aquí para ayudarte a descubrir todo sobre {{landmarkName}}. ¡Siéntete libre de preguntarme sobre su construcción, importancia histórica o datos interesantes!",
    "¡Hola! Me especializo en {{landmarkName}} y puedo compartir conocimientos detallados sobre su diseño, historia e importancia. ¿Qué aspectos te interesan más?"
  ],
  fr: [
    "Bonjour ! Je suis votre guide expert pour {{landmarkName}}. J'ai une connaissance approfondie de l'histoire, l'architecture et l'importance culturelle de ce monument. Que souhaitez-vous apprendre ?",
    "Bienvenue ! Je suis ici pour vous aider à découvrir tout sur {{landmarkName}}. N'hésitez pas à me poser des questions sur sa construction, son importance historique ou des faits intéressants !",
    "Bonjour ! Je me spécialise dans {{landmarkName}} et peux partager des connaissances détaillées sur sa conception, son histoire et son importance. Quels aspects vous intéressent le plus ?"
  ],
  de: [
    "Hallo! Ich bin dein Expertenführer für {{landmarkName}}. Ich habe umfangreiches Wissen über die Geschichte, Architektur und kulturelle Bedeutung dieser Sehenswürdigkeit. Was möchtest du lernen?",
    "Willkommen! Ich bin hier, um dir alles über {{landmarkName}} zu zeigen. Frag mich gerne nach dem Bau, der historischen Bedeutung oder interessanten Fakten!",
    "Hallo! Ich spezialisiere mich auf {{landmarkName}} und kann detaillierte Einblicke in das Design, die Geschichte und Bedeutung teilen. Welche Aspekte interessieren dich am meisten?"
  ],
  it: [
    "Ciao! Sono la tua guida esperta per {{landmarkName}}. Ho una vasta conoscenza della storia, architettura e importanza culturale di questo monumento. Cosa vorresti imparare?",
    "Benvenuto! Sono qui per aiutarti a scoprire tutto su {{landmarkName}}. Sentiti libero di chiedermi della sua costruzione, importanza storica o fatti interessanti!",
    "Ciao! Mi specializzo in {{landmarkName}} e posso condividere approfondimenti dettagliati sul suo design, storia e significato. Quali aspetti ti interessano di più?"
  ],
  zh: [
    "你好！我是{{landmarkName}}的专家向导。我对这个地标的历史、建筑和文化意义有广泛的了解。您想学习什么？",
    "欢迎！我在这里帮助您发现关于{{landmarkName}}的一切。请随时询问其建造、历史意义或有趣的事实！",
    "你好！我专门研究{{landmarkName}}，可以分享关于其设计、历史和意义的详细见解。您最感兴趣的是哪些方面？"
  ],
  ja: [
    "こんにちは！私は{{landmarkName}}の専門ガイドです。このランドマークの歴史、建築、文化的意義について幅広い知識を持っています。何を学びたいですか？",
    "ようこそ！{{landmarkName}}についてのすべてを発見するお手伝いをします。建設、歴史的重要性、興味深い事実について、何でもお聞きください！",
    "こんにちは！私は{{landmarkName}}を専門としており、その設計、歴史、意義について詳細な洞察をお伝えできます。どの側面に最も興味がありますか？"
  ],
  pl: [
    "Cześć! Jestem Twoim ekspertem przewodnikiem po {{landmarkName}}. Mam szeroką wiedzę o historii, architekturze i znaczeniu kulturowym tego zabytku. Czego chciałbyś się nauczyć?",
    "Witaj! Jestem tutaj, aby pomóc Ci odkryć wszystko o {{landmarkName}}. Śmiało pytaj mnie o jego budowę, znaczenie historyczne lub ciekawe fakty!",
    "Cześć! Specjalizuję się w {{landmarkName}} i mogę podzielić się szczegółowymi informacjami o jego projekcie, historii i znaczeniu. Które aspekty najbardziej Cię interesują?"
  ],
  ru: [
    "Привет! Я твой эксперт-гид по {{landmarkName}}. У меня обширные знания об истории, архитектуре и культурном значении этой достопримечательности. Что бы ты хотел изучить?",
    "Добро пожаловать! Я здесь, чтобы помочь тебе открыть всё о {{landmarkName}}. Не стесняйся спрашивать меня о строительстве, историческом значении или интересных фактах!",
    "Привет! Я специализируюсь на {{landmarkName}} и могу поделиться подробной информацией о дизайне, истории и значении. Какие аспекты тебя больше всего интересуют?"
  ],
  pt: [
    "Olá! Sou o teu guia especialista em {{landmarkName}}. Tenho um vasto conhecimento sobre a história, arquitetura e significado cultural deste marco. O que gostarias de aprender?",
    "Bem-vindo! Estou aqui para te ajudar a descobrir tudo sobre {{landmarkName}}. Sente-te à vontade para me perguntar sobre a sua construção, importância histórica ou factos interessantes!",
    "Olá! Especializo-me em {{landmarkName}} e posso partilhar conhecimentos detalhados sobre o seu design, história e significado. Que aspetos te interessam mais?"
  ],
  ar: [
    "مرحبا! أنا دليلك الخبير في {{landmarkName}}. لدي معرفة واسعة بتاريخ وعمارة وأهمية هذا المعلم الثقافية. ماذا تود أن تتعلم؟",
    "أهلاً وسهلاً! أنا هنا لمساعدتك في اكتشاف كل شيء عن {{landmarkName}}. لا تتردد في سؤالي عن بنائه أو أهميته التاريخية أو الحقائق المثيرة للاهتمام!",
    "مرحبا! أتخصص في {{landmarkName}} ويمكنني مشاركة رؤى مفصلة حول تصميمه وتاريخه وأهميته. ما هي الجوانب التي تهمك أكثر؟"
  ],
  ko: [
    "안녕하세요! 저는 {{landmarkName}}의 전문 가이드입니다. 이 랜드마크의 역사, 건축, 문화적 의미에 대한 광범위한 지식을 가지고 있습니다. 무엇을 배우고 싶으세요?",
    "환영합니다! {{landmarkName}}에 대한 모든 것을 발견하는 데 도움을 드리겠습니다. 건설, 역사적 중요성, 흥미로운 사실에 대해 자유롭게 질문하세요!",
    "안녕하세요! 저는 {{landmarkName}}을 전문으로 하며 디자인, 역사, 의미에 대한 자세한 통찰력을 공유할 수 있습니다. 어떤 측면에 가장 관심이 있으세요?"
  ]
};

/**
 * Create initial greeting message from expert guide
 */
export function createGreetingMessage(landmark: LandmarkAnalysis, language = 'en'): ChatMessage {
  const lang = language in greetingTranslations ? language as keyof typeof greetingTranslations : 'en';
  const greetings = greetingTranslations[lang];
  
  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  const greetingWithName = randomGreeting.replace('{{landmarkName}}', landmark.name);
  
  return {
    id: `greeting_${landmark.id}`,
    role: 'assistant',
    content: greetingWithName,
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