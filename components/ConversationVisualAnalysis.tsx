'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { Conversation } from '@/types';

interface ConversationVisualAnalysisProps {
  conversation: Conversation;
}

export default function ConversationVisualAnalysis({ conversation }: ConversationVisualAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'flow' | 'models' | 'patterns' | 'quality'>('flow');

  const colors = {
    primary: 'var(--primary)',
    teal: 'var(--teal-bright)',
    purple: 'rgba(139, 92, 246, 0.8)',
    green: 'rgba(34, 197, 94, 0.8)',
    orange: 'rgba(251, 146, 60, 0.8)',
    pink: 'rgba(236, 72, 153, 0.8)',
    blue: 'rgba(59, 130, 246, 0.8)',
  };

  // Conversation flow analysis
  const flowData = useMemo(() => {
    const messages = conversation.messages;
    const flowPoints: { index: number; userLength: number; aiLength: number; responseTime: number; timestamp: string }[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'user') {
        const nextMsg = messages[i + 1];
        if (nextMsg && nextMsg.role === 'assistant') {
          flowPoints.push({
            index: flowPoints.length + 1,
            userLength: msg.content.length,
            aiLength: nextMsg.content.length,
            responseTime: nextMsg.performance?.responseTime || 0,
            timestamp: new Date(msg.timestamp).toLocaleTimeString()
          });
        }
      }
    }
    return flowPoints;
  }, [conversation.messages]);

  // Model usage analysis
  const modelData = useMemo(() => {
    const modelStats: Record<string, { count: number; tokens: number; time: number; name: string }> = {};
    
    conversation.messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.modelId) {
        const modelName = msg.modelName || msg.modelId;
        if (!modelStats[msg.modelId]) {
          modelStats[msg.modelId] = { count: 0, tokens: 0, time: 0, name: modelName };
        }
        modelStats[msg.modelId].count += 1;
        modelStats[msg.modelId].tokens += msg.performance?.tokenCount || 0;
        modelStats[msg.modelId].time += msg.performance?.responseTime || 0;
      }
    });

    return Object.entries(modelStats).map(([id, stats]) => ({
      model: stats.name.length > 15 ? stats.name.slice(0, 15) + '...' : stats.name,
      count: stats.count,
      avgTokens: stats.count > 0 ? Math.round(stats.tokens / stats.count) : 0,
      avgTime: stats.count > 0 ? Math.round(stats.time / stats.count) : 0,
      totalTokens: stats.tokens,
    }));
  }, [conversation.messages]);

  // Communication patterns
  const patternsData = useMemo(() => {
    const userMessages = conversation.messages.filter(m => m.role === 'user');
    const aiMessages = conversation.messages.filter(m => m.role === 'assistant');
    
    const avgUserLength = userMessages.length > 0 ? 
      Math.round(userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length) : 0;
    
    const avgAiLength = aiMessages.length > 0 ? 
      Math.round(aiMessages.reduce((sum, m) => sum + m.content.length, 0) / aiMessages.length) : 0;

    // Message type distribution
    const typeDistribution = [
      { name: 'User Messages', value: userMessages.length, color: colors.blue },
      { name: 'AI Responses', value: aiMessages.length, color: colors.teal },
    ];

    // Message length patterns
    const lengthPatterns = [
      { category: 'Short (< 100)', user: 0, ai: 0 },
      { category: 'Medium (100-500)', user: 0, ai: 0 },
      { category: 'Long (500-1500)', user: 0, ai: 0 },
      { category: 'Very Long (> 1500)', user: 0, ai: 0 },
    ];

    userMessages.forEach(msg => {
      const length = msg.content.length;
      if (length < 100) lengthPatterns[0].user++;
      else if (length < 500) lengthPatterns[1].user++;
      else if (length < 1500) lengthPatterns[2].user++;
      else lengthPatterns[3].user++;
    });

    aiMessages.forEach(msg => {
      const length = msg.content.length;
      if (length < 100) lengthPatterns[0].ai++;
      else if (length < 500) lengthPatterns[1].ai++;
      else if (length < 1500) lengthPatterns[2].ai++;
      else lengthPatterns[3].ai++;
    });

    return { typeDistribution, lengthPatterns, avgUserLength, avgAiLength };
  }, [conversation.messages, colors]);

  // Quality metrics
  const qualityData = useMemo(() => {
    const aiMessages = conversation.messages.filter(m => m.role === 'assistant');
    
    if (aiMessages.length === 0) return [];

    let totalFormatting = 0;
    let totalStructure = 0;
    let totalResponsiveness = 0;
    let totalCompleteness = 0;

    aiMessages.forEach(msg => {
      // Formatting score (code blocks, bold, lists)
      const hasCode = msg.content.includes('```') ? 25 : 0;
      const hasBold = msg.content.includes('**') ? 20 : 0;
      const hasLists = /[-*]\s|\d+\.\s/.test(msg.content) ? 25 : 0;
      const hasHeaders = /#{1,6}\s/.test(msg.content) ? 30 : 0;
      totalFormatting += Math.min(100, hasCode + hasBold + hasLists + hasHeaders);

      // Structure score (paragraphs, organization)
      const paragraphs = msg.content.split('\n\n').length;
      const hasStructure = paragraphs > 1 ? 80 : 50;
      const hasNumbers = /\d+\./.test(msg.content) ? 20 : 0;
      totalStructure += Math.min(100, hasStructure + hasNumbers);

      // Responsiveness (length appropriateness)
      const length = msg.content.length;
      let responsivenessScore = 50;
      if (length > 100 && length < 2000) responsivenessScore = 90;
      else if (length > 50) responsivenessScore = 70;
      totalResponsiveness += responsivenessScore;

      // Completeness (detailed responses)
      const hasExamples = /example|for instance|such as/i.test(msg.content) ? 30 : 0;
      const hasExplanation = msg.content.length > 200 ? 40 : 20;
      const hasMultiplePoints = paragraphs > 2 ? 30 : 10;
      totalCompleteness += Math.min(100, hasExamples + hasExplanation + hasMultiplePoints);
    });

    return [
      { metric: 'Formatting', score: Math.round(totalFormatting / aiMessages.length) },
      { metric: 'Structure', score: Math.round(totalStructure / aiMessages.length) },
      { metric: 'Responsiveness', score: Math.round(totalResponsiveness / aiMessages.length) },
      { metric: 'Completeness', score: Math.round(totalCompleteness / aiMessages.length) },
    ];
  }, [conversation.messages]);

  const TabButton = ({ id, label, isActive, onClick }: { id: string; label: string; isActive: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px',
        background: isActive ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
        border: 'none',
        borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
        color: isActive ? 'var(--primary)' : 'var(--gray-med)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 600,
        transition: 'all 0.2s ease',
        borderRadius: '6px 6px 0 0',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '20px',
      }}>
        <TabButton 
          id="flow" 
          label="Conversation Flow" 
          isActive={activeTab === 'flow'} 
          onClick={() => setActiveTab('flow')} 
        />
        <TabButton 
          id="models" 
          label="Model Analysis" 
          isActive={activeTab === 'models'} 
          onClick={() => setActiveTab('models')} 
        />
        <TabButton 
          id="patterns" 
          label="Communication Patterns" 
          isActive={activeTab === 'patterns'} 
          onClick={() => setActiveTab('patterns')} 
        />
        <TabButton 
          id="quality" 
          label="Quality Metrics" 
          isActive={activeTab === 'quality'} 
          onClick={() => setActiveTab('quality')} 
        />
      </div>

      {/* Flow Analysis */}
      {activeTab === 'flow' && (
        <div>
          <h4 style={{ color: 'var(--gray-light)', fontSize: '16px', marginBottom: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Conversation Flow & Dynamics
          </h4>
          {flowData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={flowData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis
                    dataKey="index"
                    stroke="var(--gray-med)"
                    tick={{ fill: 'var(--gray-med)', fontSize: 12 }}
                    label={{ value: 'Exchange #', position: 'insideBottom', offset: -5, fill: 'var(--gray-med)' }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="var(--gray-med)"
                    tick={{ fill: 'var(--gray-med)', fontSize: 12 }}
                    label={{ value: 'Message Length', angle: -90, position: 'insideLeft', fill: 'var(--gray-med)' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="var(--gray-med)"
                    tick={{ fill: 'var(--gray-med)', fontSize: 12 }}
                    label={{ value: 'Response Time (ms)', angle: 90, position: 'insideRight', fill: 'var(--gray-med)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--darker-bg)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="userLength"
                    stroke={colors.blue}
                    strokeWidth={3}
                    name="User Message Length"
                    dot={{ fill: colors.blue, r: 5 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="aiLength"
                    stroke={colors.teal}
                    strokeWidth={3}
                    name="AI Response Length"
                    dot={{ fill: colors.teal, r: 5 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="responseTime"
                    stroke={colors.orange}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Response Time"
                    dot={{ fill: colors.orange, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{
                marginTop: '16px',
                fontSize: '12px',
                color: 'var(--gray-med)',
                textAlign: 'center',
              }}>
                Showing {flowData.length} user-AI exchanges over time
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-med)' }}>
              Not enough conversation data for flow analysis
            </div>
          )}
        </div>
      )}

      {/* Model Analysis */}
      {activeTab === 'models' && (
        <div>
          <h4 style={{ color: 'var(--gray-light)', fontSize: '16px', marginBottom: '16px', fontWeight: 600 }}>
            🤖 AI Model Performance
          </h4>
          {modelData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={modelData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis
                    dataKey="model"
                    stroke="var(--gray-med)"
                    tick={{ fill: 'var(--gray-med)', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="var(--gray-med)"
                    tick={{ fill: 'var(--gray-med)', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--darker-bg)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" name="Messages" fill={colors.purple} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgTokens" name="Avg Tokens" fill={colors.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              
              {/* Model Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginTop: '20px',
              }}>
                {modelData.map((model, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}>
                    <div style={{ color: 'var(--gray-light)', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                      {model.model}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-med)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>Messages: <span style={{ color: colors.teal }}>{model.count}</span></div>
                      <div>Avg Response: <span style={{ color: colors.teal }}>{model.avgTime > 0 ? `${(model.avgTime / 1000).toFixed(1)}s` : 'N/A'}</span></div>
                      <div>Total Tokens: <span style={{ color: colors.teal }}>{model.totalTokens.toLocaleString()}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-med)' }}>
              No AI model data available in this conversation
            </div>
          )}
        </div>
      )}

      {/* Communication Patterns */}
      {activeTab === 'patterns' && (
        <div>
          <h4 style={{ color: 'var(--gray-light)', fontSize: '16px', marginBottom: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Communication Patterns
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Message Distribution Pie Chart */}
            <div>
              <h5 style={{ fontSize: '14px', color: 'var(--gray-light)', marginBottom: '12px', fontWeight: 500 }}>
                Message Distribution
              </h5>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={patternsData.typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {patternsData.typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Average Lengths */}
            <div>
              <h5 style={{ fontSize: '14px', color: 'var(--gray-light)', marginBottom: '12px', fontWeight: 500 }}>
                Average Message Length
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', height: '200px' }}>
                <div style={{
                  padding: '16px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--gray-med)' }}>User Messages</div>
                  <div style={{ fontSize: '24px', color: colors.blue, fontWeight: 600 }}>
                    {patternsData.avgUserLength}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-med)' }}>characters avg</div>
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(0, 230, 230, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 230, 230, 0.2)',
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--gray-med)' }}>AI Responses</div>
                  <div style={{ fontSize: '24px', color: colors.teal, fontWeight: 600 }}>
                    {patternsData.avgAiLength}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-med)' }}>characters avg</div>
                </div>
              </div>
            </div>
          </div>

          {/* Message Length Patterns */}
          <h5 style={{ fontSize: '14px', color: 'var(--gray-light)', marginBottom: '12px', fontWeight: 500 }}>
            Message Length Distribution
          </h5>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={patternsData.lengthPatterns} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis
                dataKey="category"
                stroke="var(--gray-med)"
                tick={{ fill: 'var(--gray-med)', fontSize: 12 }}
              />
              <YAxis
                stroke="var(--gray-med)"
                tick={{ fill: 'var(--gray-med)', fontSize: 12 }}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="user" name="User" fill={colors.blue} radius={[4, 4, 0, 0]} />
              <Bar dataKey="ai" name="AI" fill={colors.teal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quality Metrics */}
      {activeTab === 'quality' && (
        <div>
          <h4 style={{ color: 'var(--gray-light)', fontSize: '16px', marginBottom: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            Response Quality Analysis
          </h4>
          {qualityData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={qualityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis
                    dataKey="metric"
                    stroke="var(--gray-med)"
                    tick={{ fill: 'var(--gray-med)', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="var(--gray-med)"
                    tick={{ fill: 'var(--gray-med)', fontSize: 12 }}
                    domain={[0, 100]}
                    label={{ value: 'Quality Score', angle: -90, position: 'insideLeft', fill: 'var(--gray-med)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--darker-bg)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                    {qualityData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === 0 ? colors.green : index === 1 ? colors.blue : index === 2 ? colors.orange : colors.pink} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Quality Breakdown */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginTop: '20px',
              }}>
                {qualityData.map((metric, index) => (
                  <div key={metric.metric} style={{
                    padding: '16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}>
                    <div style={{ 
                      color: 'var(--gray-light)', 
                      fontWeight: 600, 
                      fontSize: '14px', 
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {metric.metric}
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: metric.score >= 80 ? colors.green : metric.score >= 60 ? colors.orange : colors.pink
                      }}>
                        {metric.score}%
                      </div>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${metric.score}%`,
                        height: '100%',
                        background: metric.score >= 80 ? colors.green : metric.score >= 60 ? colors.orange : colors.pink,
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-med)' }}>
              No AI responses to analyze in this conversation
            </div>
          )}
        </div>
      )}
    </div>
  );
}