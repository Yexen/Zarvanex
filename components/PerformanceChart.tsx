'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { Message } from '@/types';

interface PerformanceChartProps {
  message: Message;
  allMessages?: Message[]; // All messages in the conversation for historical trends
}

export default function PerformanceChart({ message, allMessages = [] }: PerformanceChartProps) {
  const [activeTab, setActiveTab] = useState<'breakdown' | 'comparison' | 'trends'>('breakdown');

  // Extract performance data
  const performance = message.performance;
  const responseTime = performance?.responseTime || 0;
  const tokenCount = performance?.tokenCount || 0;

  // Calculate quality scores (simplified for now)
  const qualityScores = useMemo(() => {
    const length = message.content.length;
    const hasFormatting = message.content.includes('**') || message.content.includes('```');
    const hasStructure = message.content.includes('\n\n');

    return {
      completeness: Math.min(100, (length / 500) * 100), // Based on response length
      clarity: hasFormatting ? 85 : 70, // Higher if well-formatted
      structure: hasStructure ? 90 : 60, // Higher if well-structured
      speed: responseTime > 0 ? Math.max(0, 100 - (responseTime / 100)) : 75, // Faster = better
    };
  }, [message.content, responseTime]);

  // Performance breakdown data
  const breakdownData = [
    { metric: 'Completeness', score: qualityScores.completeness },
    { metric: 'Clarity', score: qualityScores.clarity },
    { metric: 'Structure', score: qualityScores.structure },
    { metric: 'Speed', score: qualityScores.speed },
  ];

  // Model comparison data (comparing with other messages in conversation)
  const comparisonData = useMemo(() => {
    const assistantMessages = allMessages.filter(m => m.role === 'assistant' && m.performance);

    if (assistantMessages.length === 0) return [];

    const modelStats: Record<string, { totalTime: number; totalTokens: number; count: number; name: string }> = {};

    assistantMessages.forEach(msg => {
      const modelId = msg.modelId || 'unknown';
      const modelName = msg.modelName || modelId;
      if (!modelStats[modelId]) {
        modelStats[modelId] = { totalTime: 0, totalTokens: 0, count: 0, name: modelName };
      }
      modelStats[modelId].totalTime += msg.performance?.responseTime || 0;
      modelStats[modelId].totalTokens += msg.performance?.tokenCount || 0;
      modelStats[modelId].count += 1;
    });

    return Object.entries(modelStats).map(([id, stats]) => ({
      model: stats.name.length > 20 ? stats.name.slice(0, 20) + '...' : stats.name,
      avgTime: Math.round(stats.totalTime / stats.count),
      avgTokens: Math.round(stats.totalTokens / stats.count),
      count: stats.count,
    }));
  }, [allMessages]);

  // Historical trends data (last 10 messages from this model)
  const trendsData = useMemo(() => {
    const modelMessages = allMessages
      .filter(m => m.role === 'assistant' && m.modelId === message.modelId && m.performance)
      .slice(-10); // Last 10 messages

    return modelMessages.map((msg, index) => ({
      index: index + 1,
      time: msg.performance?.responseTime || 0,
      tokens: msg.performance?.tokenCount || 0,
    }));
  }, [allMessages, message.modelId]);

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '16px',
      }}>
        <button
          onClick={() => setActiveTab('breakdown')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'breakdown' ? 'rgba(0, 230, 230, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'breakdown' ? '2px solid var(--teal-bright)' : '2px solid transparent',
            color: activeTab === 'breakdown' ? 'var(--teal-bright)' : 'var(--gray-med)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
        >
          Performance
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'comparison' ? 'rgba(0, 230, 230, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'comparison' ? '2px solid var(--teal-bright)' : '2px solid transparent',
            color: activeTab === 'comparison' ? 'var(--teal-bright)' : 'var(--gray-med)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
        >
          Comparison
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'trends' ? 'rgba(0, 230, 230, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'trends' ? '2px solid var(--teal-bright)' : '2px solid transparent',
            color: activeTab === 'trends' ? 'var(--teal-bright)' : 'var(--gray-med)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
        >
          Trends
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'breakdown' && (
        <div>
          <h4 style={{ color: 'var(--gray-light)', fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>
            Quality Metrics
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={breakdownData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis
                dataKey="metric"
                stroke="var(--gray-med)"
                tick={{ fill: 'var(--gray-med)', fontSize: 11 }}
              />
              <YAxis
                stroke="var(--gray-med)"
                tick={{ fill: 'var(--gray-med)', fontSize: 11 }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--darker-bg)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'var(--gray-light)' }}
              />
              <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                {breakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="var(--teal-bright)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div style={{
            marginTop: '16px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            fontSize: '12px',
            color: 'var(--gray-med)',
          }}>
            <div style={{
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
            }}>
              <div style={{ color: 'var(--gray-light)', fontWeight: 500 }}>Response Time</div>
              <div style={{ fontSize: '18px', color: 'var(--teal-bright)', marginTop: '4px' }}>
                {responseTime > 0 ? `${(responseTime / 1000).toFixed(2)}s` : 'N/A'}
              </div>
            </div>
            <div style={{
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
            }}>
              <div style={{ color: 'var(--gray-light)', fontWeight: 500 }}>Token Count</div>
              <div style={{ fontSize: '18px', color: 'var(--teal-bright)', marginTop: '4px' }}>
                {tokenCount > 0 ? tokenCount.toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div>
          <h4 style={{ color: 'var(--gray-light)', fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>
            Model Comparison
          </h4>
          {comparisonData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={comparisonData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis
                    dataKey="model"
                    stroke="var(--gray-med)"
                    tick={{ fill: 'var(--gray-med)', fontSize: 10 }}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="var(--gray-med)"
                    tick={{ fill: 'var(--gray-med)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--darker-bg)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'var(--gray-light)' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="circle"
                  />
                  <Bar dataKey="avgTime" name="Avg Time (ms)" fill="var(--teal-bright)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="avgTokens" name="Avg Tokens" fill="rgba(0, 230, 230, 0.5)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{
                marginTop: '12px',
                fontSize: '11px',
                color: 'var(--gray-med)',
                textAlign: 'center',
              }}>
                Based on {comparisonData.reduce((sum, d) => sum + d.count, 0)} messages in this conversation
              </div>
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--gray-med)',
              fontSize: '13px',
            }}>
              Not enough data for comparison. Send more messages to see model performance comparison.
            </div>
          )}
        </div>
      )}

      {activeTab === 'trends' && (
        <div>
          <h4 style={{ color: 'var(--gray-light)', fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>
            Historical Performance
          </h4>
          {trendsData.length >= 2 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendsData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis
                    dataKey="index"
                    stroke="var(--gray-med)"
                    tick={{ fill: 'var(--gray-med)', fontSize: 11 }}
                    label={{ value: 'Message #', position: 'insideBottom', offset: -5, fill: 'var(--gray-med)', fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="var(--gray-med)"
                    tick={{ fill: 'var(--gray-med)', fontSize: 11 }}
                    label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', fill: 'var(--gray-med)', fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="var(--gray-med)"
                    tick={{ fill: 'var(--gray-med)', fontSize: 11 }}
                    label={{ value: 'Tokens', angle: 90, position: 'insideRight', fill: 'var(--gray-med)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--darker-bg)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'var(--gray-light)' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="circle"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="time"
                    stroke="var(--teal-bright)"
                    strokeWidth={2}
                    name="Response Time (ms)"
                    dot={{ fill: 'var(--teal-bright)', r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="tokens"
                    stroke="rgba(0, 230, 230, 0.5)"
                    strokeWidth={2}
                    name="Token Count"
                    dot={{ fill: 'rgba(0, 230, 230, 0.5)', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{
                marginTop: '12px',
                fontSize: '11px',
                color: 'var(--gray-med)',
                textAlign: 'center',
              }}>
                Showing last {trendsData.length} messages from {message.modelName || message.modelId}
              </div>
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--gray-med)',
              fontSize: '13px',
            }}>
              Not enough data for trends. Send more messages with this model to see performance trends.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
