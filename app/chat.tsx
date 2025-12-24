import { StyleSheet, View, Pressable, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatMessage, ChatSession, LandmarkAnalysis } from '@/types';
import { 
  sendMessage, 
  createGreetingMessage, 
  getOrCreateSession, 
  addMessageToSession,
  createUserMessage,
  validateMessage
} from '@/services/chatService';

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { landmarkId, landmarkName, landmarkData } = useLocalSearchParams<{ 
    landmarkId?: string; 
    landmarkName?: string;
    landmarkData?: string;
  }>();
  
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const landmark = landmarkData ? JSON.parse(landmarkData) as LandmarkAnalysis : null;

  useEffect(() => {
    const initializeChat = async () => {
      if (!landmarkId || !landmarkName) {
        setError('Missing landmark information');
        return;
      }

      try {
        setIsLoading(true);
        
        // Get or create session
        const chatSession = await getOrCreateSession(landmarkId, landmarkName);
        setSession(chatSession);
        
        // If no messages, create greeting
        if (chatSession.messages.length === 0 && landmark) {
          const greetingMessage = createGreetingMessage(landmark);
          const updatedSession = await addMessageToSession(chatSession, greetingMessage);
          setSession(updatedSession);
          setMessages(updatedSession.messages);
        } else {
          setMessages(chatSession.messages);
        }
        
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError('Failed to load chat session');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [landmarkId, landmarkName, landmarkData]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleBack = () => {
    router.back();
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !session || !landmark || isLoading) return;

    const validation = validateMessage(inputText);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid message');
      return;
    }

    try {
      setError(null);
      
      // Create user message
      const userMessage = createUserMessage(inputText.trim(), landmarkId!);
      const tempMessages = [...messages, userMessage];
      setMessages(tempMessages);
      setInputText('');
      
      // Update session with user message
      const sessionWithUserMessage = await addMessageToSession(session, userMessage);
      setSession(sessionWithUserMessage);
      
      // Show typing indicator
      setIsTyping(true);
      setIsLoading(true);
      
      // Send to AI
      const response = await sendMessage({
        landmark,
        messages: sessionWithUserMessage.messages,
        userMessage: userMessage.content
      });
      
      if (response.success && response.message) {
        // Add AI response
        const finalMessages = [...tempMessages, response.message];
        setMessages(finalMessages);
        
        // Update session with AI response
        const finalSession = await addMessageToSession(sessionWithUserMessage, response.message);
        setSession(finalSession);
      } else {
        setError(response.error || 'Failed to get AI response');
      }
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const messageTime = new Date(item.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
          { backgroundColor: isUser ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].card }
        ]}>
          <ThemedText style={[
            styles.messageText,
            { color: isUser ? 'white' : Colors[colorScheme ?? 'light'].text }
          ]}>
            {item.content}
          </ThemedText>
          <ThemedText style={[
            styles.messageTime,
            { color: isUser ? 'rgba(255,255,255,0.7)' : Colors[colorScheme ?? 'light'].icon }
          ]}>
            {messageTime}
          </ThemedText>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    
    return (
      <View style={[styles.messageContainer, styles.aiMessageContainer]}>
        <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
          <View style={styles.typingIndicator}>
            <View style={[styles.typingDot, { backgroundColor: Colors[colorScheme ?? 'light'].icon }]} />
            <View style={[styles.typingDot, { backgroundColor: Colors[colorScheme ?? 'light'].icon }]} />
            <View style={[styles.typingDot, { backgroundColor: Colors[colorScheme ?? 'light'].icon }]} />
          </View>
        </View>
      </View>
    );
  };

  if (isLoading && messages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        
        {/* Header */}
        <View style={[styles.header, { 
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          paddingTop: insets.top + 10
        }]}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <IconSymbol name="chevron.left" size={24} color={Colors[colorScheme ?? 'light'].text} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Loading Chat...</ThemedText>
          <View style={styles.backButton} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Setting up your conversation...</ThemedText>
        </View>
      </View>
    );
  }

  if (error && messages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        
        {/* Header */}
        <View style={[styles.header, { 
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          paddingTop: insets.top + 10
        }]}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <IconSymbol name="chevron.left" size={24} color={Colors[colorScheme ?? 'light'].text} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Chat Error</ThemedText>
          <View style={styles.backButton} />
        </View>
        
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle.fill" size={60} color={Colors[colorScheme ?? 'light'].error} />
          <ThemedText style={styles.errorTitle}>Chat Unavailable</ThemedText>
          <ThemedText style={styles.errorMessage}>{error}</ThemedText>
          <Pressable style={[styles.retryButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} onPress={handleBack}>
            <ThemedText style={styles.retryButtonText}>Go Back</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].chatBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: Colors[colorScheme ?? 'light'].background,
        paddingTop: insets.top + 10
      }]}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <IconSymbol name="chevron.left" size={24} color={Colors[colorScheme ?? 'light'].text} />
        </Pressable>
        <View style={styles.headerInfo}>
          <ThemedText style={styles.headerTitle} numberOfLines={1}>{landmarkName}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>AI Assistant</ThemedText>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        style={styles.messagesList}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={renderTypingIndicator}
      />

      {/* Error Banner */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: Colors[colorScheme ?? 'light'].error }]}>
          <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
          <Pressable onPress={() => setError(null)}>
            <IconSymbol name="xmark" size={16} color="white" />
          </Pressable>
        </View>
      )}

      {/* Input Bar */}
      <View style={[styles.inputContainer, { 
        backgroundColor: Colors[colorScheme ?? 'light'].background,
        paddingBottom: insets.bottom + 10
      }]}>
        <View style={[styles.inputBar, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
          <TextInput
            style={[styles.textInput, { color: Colors[colorScheme ?? 'light'].text }]}
            placeholder="Type your question..."
            placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <Pressable
            style={[
              styles.sendButton,
              { 
                backgroundColor: inputText.trim() && !isLoading 
                  ? Colors[colorScheme ?? 'light'].tint 
                  : Colors[colorScheme ?? 'light'].secondary
              }
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <IconSymbol 
              name="arrow.up" 
              size={20} 
              color="white"
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },

  // MESSAGES
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.8,
  },

  // TYPING INDICATOR
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
    opacity: 0.6,
  },

  // INPUT BAR
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 12,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ERROR STATES
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorBannerText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 12,
    lineHeight: 24,
  },
  retryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 32,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});