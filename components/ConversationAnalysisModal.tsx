'use client';

import { useState } from 'react';
import ConversationVisualAnalysis from './ConversationVisualAnalysis';
import type { Conversation } from '@/types';

interface ConversationAnalysisModalProps {
  conversation: Conversation;
  onClose: () => void;
}

export default function ConversationAnalysisModal({ conversation, onClose }: ConversationAnalysisModalProps) {
  const [analysisContent, setAnalysisContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'text' | 'visual'>('overview');

  const analyzeConversation = async () => {
    setIsAnalyzing(true);
    setAnalysisContent('');

    try {
      // Prepare conversation content for analysis
      const conversationText = conversation.messages
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n\n');

      const analysisPrompt = `Analyze this entire conversation comprehensively. Provide insights on:

1. **Conversation Flow & Structure**
   - How the conversation developed
   - Key topics and transitions
   - Communication patterns

2. **Content Analysis**
   - Main themes and subjects discussed
   - Technical accuracy and depth
   - Problem-solving approaches used

3. **User Intent & Goals**
   - What the user was trying to achieve
   - Whether goals were met
   - Unresolved questions or issues

4. **AI Performance**
   - Quality of responses provided
   - Helpfulness and relevance
   - Areas where responses could be improved

5. **Key Insights & Patterns**
   - Notable patterns in the conversation
   - Learning opportunities
   - Suggestions for future similar conversations

6. **Summary & Recommendations**
   - Concise summary of the entire conversation
   - Actionable recommendations for the user
   - Follow-up suggestions

Here is the conversation:

${conversationText}`;

      const response = await fetch('/api/chat/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: analysisPrompt,
            },
          ],
          modelId: 'llama-3.3-70b-versatile', // Best Groq model for analysis
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = line.slice(6);
                if (data.trim()) {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    setAnalysisContent((prev) => prev + parsed.content);
                  }
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisContent('Failed to analyze conversation. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{
              margin: 0,
              color: 'var(--text)',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Conversation Analysis
            </h3>
            <p style={{
              margin: '4px 0 0 0',
              color: 'var(--gray-med)',
              fontSize: '14px'
            }}>
&quot;{conversation.title}&quot; • {conversation.messages.length} messages
            </p>
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gray-light)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'var(--darker-bg)'
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: 'overview' },
            { id: 'visual', label: 'Visual Analysis', icon: 'visual' },
            { id: 'text', label: 'Text Analysis', icon: 'text' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              style={{
                padding: '12px 20px',
                background: activeView === tab.id ? 'var(--bg)' : 'transparent',
                border: 'none',
                borderBottom: activeView === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeView === tab.id ? 'var(--primary)' : 'var(--gray-med)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                flex: 1,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {tab.icon === 'overview' && (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
              {tab.icon === 'visual' && (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              )}
              {tab.icon === 'text' && (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto'
        }}>
          {/* Overview Tab */}
          {activeView === 'overview' && (
            <div style={{ padding: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  padding: '16px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', color: 'var(--primary)', fontWeight: '700' }}>
                    {conversation.messages.length}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-med)', marginTop: '4px' }}>
                    Total Messages
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(0, 230, 230, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 230, 230, 0.2)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', color: 'var(--teal-bright)', fontWeight: '700' }}>
                    {conversation.messages.filter(m => m.role === 'user').length}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-med)', marginTop: '4px' }}>
                    User Messages
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', color: 'rgba(34, 197, 94, 0.8)', fontWeight: '700' }}>
                    {conversation.messages.filter(m => m.role === 'assistant').length}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-med)', marginTop: '4px' }}>
                    AI Responses
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(251, 146, 60, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(251, 146, 60, 0.2)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', color: 'rgba(251, 146, 60, 0.8)', fontWeight: '700' }}>
                    {[...new Set(conversation.messages.filter(m => m.modelId).map(m => m.modelId))].length}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-med)', marginTop: '4px' }}>
                    Models Used
                  </div>
                </div>
              </div>
              
              <div style={{
                textAlign: 'center',
                padding: '40px 20px'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'var(--primary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  opacity: 0.8
                }}>
                  <svg width="28" height="28" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 style={{
                  margin: '0 0 12px 0',
                  color: 'var(--text)',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  Explore Your Conversation
                </h4>
                <p style={{
                  margin: '0 0 24px 0',
                  color: 'var(--gray-med)',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  Use the tabs above to dive deep into visual charts or get comprehensive text analysis of this conversation.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setActiveView('visual')}
                    style={{
                      background: 'var(--teal-bright)',
                      border: 'none',
                      color: 'white',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    See Charts
                  </button>
                  <button
                    onClick={() => setActiveView('text')}
                    style={{
                      background: 'var(--primary)',
                      border: 'none',
                      color: 'white',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Start Analysis
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Visual Analysis Tab */}
          {activeView === 'visual' && (
            <div style={{ padding: '20px' }}>
              <ConversationVisualAnalysis conversation={conversation} />
            </div>
          )}

          {/* Text Analysis Tab */}
          {activeView === 'text' && (
            <div style={{ padding: '20px' }}>
              {!analysisContent && !isAnalyzing && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: 'var(--primary)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    opacity: 0.8
                  }}>
                    <svg width="28" height="28" fill="none" stroke="white" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 style={{
                    margin: '0 0 8px 0',
                    color: 'var(--text)',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>
                    AI-Powered Text Analysis
                  </h4>
                  <p style={{
                    margin: '0 0 24px 0',
                    color: 'var(--gray-med)',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}>
                    Get comprehensive insights about this conversation including themes, patterns, and recommendations.
                  </p>
                  <button
                    onClick={analyzeConversation}
                    style={{
                      background: 'var(--primary)',
                      border: 'none',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Start Text Analysis
                  </button>
                </div>
              )}

              {isAnalyzing && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '20px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(139, 92, 246, 0.3)',
                    borderTop: '2px solid var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span style={{
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}>
                    Analyzing conversation...
                  </span>
                </div>
              )}

              {analysisContent && (
                <div style={{
                  background: 'var(--darker-bg)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '16px',
                  whiteSpace: 'pre-wrap',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: 'var(--gray-light)',
                  fontFamily: 'inherit'
                }}>
                  {analysisContent}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}