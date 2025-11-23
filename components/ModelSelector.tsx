'use client';

import { useState, useRef, useEffect } from 'react';
import type { Model } from '@/types';

interface ModelSelectorProps {
  models: Model[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export default function ModelSelector({ models, selectedModel, onSelectModel }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredModel, setHoveredModel] = useState<Model | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Group models by provider
  const openrouterModels = models.filter(m => m.provider === 'openrouter');
  const groqModels = models.filter(m => m.provider === 'groq');
  const openaiModels = models.filter(m => m.provider === 'openai');
  const claudeModels = models.filter(m => m.provider === 'claude');
  const cohereModels = models.filter(m => m.provider === 'cohere');
  const ollamaModels = models.filter(m => m.provider === 'ollama');

  // Get current selected model
  const currentModel = models.find(m => m.id === selectedModel);

  // Format context window size
  const formatContextWindow = (tokens?: number) => {
    if (!tokens) return '';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  // SVG Icons
  const FreeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );

  const FastIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );

  const LocalIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );

  const BrainIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginLeft: '4px', verticalAlign: 'middle' }}>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );

  const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginLeft: '4px', verticalAlign: 'middle' }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const OpenAIIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );

  const ClaudeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
      <polyline points="7.5 19.79 7.5 14.6 3 12" />
      <polyline points="21 12 16.5 14.6 16.5 19.79" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );

  const CohereIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="10" opacity="0.5" />
    </svg>
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHoveredModel(null); // Clear tooltip when dropdown closes
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Clear tooltip when dropdown closes or model changes
  useEffect(() => {
    if (!isOpen) {
      setHoveredModel(null);
    }
  }, [isOpen]);

  // Clear tooltip when selected model changes
  useEffect(() => {
    setHoveredModel(null);
  }, [selectedModel]);

  const handleMouseEnter = (model: Model, element: HTMLDivElement) => {
    setHoveredModel(model);
    const rect = element.getBoundingClientRect();
    const dropdownRect = dropdownRef.current?.getBoundingClientRect();

    // Position tooltip to the left of dropdown with better visibility
    setTooltipPosition({
      top: rect.top,
      left: dropdownRect ? dropdownRect.left - 280 : rect.left - 280,
    });
  };

  const ModelTooltip = ({ model }: { model: Model }) => (
    <div
      style={{
        position: 'fixed',
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
        background: '#1a1a1a',
        border: '2px solid #40E0D0',
        borderRadius: '8px',
        padding: '12px',
        width: '260px',
        zIndex: 99999,
        boxShadow: '0 4px 12px rgba(64, 224, 208, 0.3)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--primary)', fontSize: '14px' }}>
        {model.name}
      </div>

      {model.description && (
        <div style={{ marginBottom: '8px', opacity: 0.85, fontSize: '12px', lineHeight: '1.4' }}>
          {model.description}
        </div>
      )}

      <div style={{ fontSize: '11px', opacity: 0.75, lineHeight: '1.5' }}>
        {model.contextWindow && (
          <div style={{ marginBottom: '4px' }}>
            Context: {formatContextWindow(model.contextWindow)} tokens
          </div>
        )}

        {model.hasThinkingMode && (
          <div style={{ marginBottom: '4px' }}>
            Thinking mode: Yes
          </div>
        )}

        <div style={{ marginBottom: '4px' }}>
          Vision: {model.supportsVision ? 'Yes' : 'No'}
        </div>

        {model.isFree && (
          <div style={{ marginBottom: '4px' }}>
            Cost: Free
          </div>
        )}

        <div style={{ marginTop: '6px', opacity: 0.6, fontSize: '10px' }}>
          Provider: {model.provider}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="model-selector"
        style={{
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <span>
            {currentModel ? currentModel.name : 'Select a model...'}
            {currentModel?.contextWindow && ` [${formatContextWindow(currentModel.contextWindow)}]`}
          </span>
          {currentModel?.hasThinkingMode && <BrainIcon />}
          {currentModel?.supportsVision && <EyeIcon />}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            minWidth: '350px',
            marginTop: '4px',
            background: 'var(--darker-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontSize: '11px',
          }}
          className="custom-scrollbar"
        >
          {/* Free Models Section */}
          {openrouterModels.length > 0 && (
            <div
              onMouseEnter={() => setExpandedSection('openrouter')}
              onMouseLeave={() => setExpandedSection(null)}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: 'rgba(64, 224, 208, 0.1)',
                  color: '#40E0D0',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <FreeIcon /> Free Models (OpenRouter)
              </div>
              {expandedSection === 'openrouter' && openrouterModels.map((model) => (
                <div
                  key={model.id}
                  ref={(el) => {
                    if (el) optionRefs.current.set(model.id, el);
                  }}
                  onMouseEnter={(e) => handleMouseEnter(model, e.currentTarget)}
                  onMouseLeave={() => setHoveredModel(null)}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                    setHoveredModel(null); // Clear tooltip when model is selected
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: model.id === selectedModel ? '#40E0D0' : 'transparent',
                    color: model.id === selectedModel ? '#000' : 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  className="hover:bg-[var(--hover-bg)]"
                >
                  <span>
                    {model.name}
                    {model.contextWindow && ` [${formatContextWindow(model.contextWindow)}]`}
                  </span>
                  {model.hasThinkingMode && <BrainIcon />}
                  {model.supportsVision && <EyeIcon />}
                </div>
              ))}
            </div>
          )}

          {/* Fast Models Section */}
          {groqModels.length > 0 && (
            <div
              onMouseEnter={() => setExpandedSection('groq')}
              onMouseLeave={() => setExpandedSection(null)}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: 'rgba(64, 224, 208, 0.1)',
                  color: '#40E0D0',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <FastIcon /> Fast Models (Groq)
              </div>
              {expandedSection === 'groq' && groqModels.map((model) => (
                <div
                  key={model.id}
                  ref={(el) => {
                    if (el) optionRefs.current.set(model.id, el);
                  }}
                  onMouseEnter={(e) => handleMouseEnter(model, e.currentTarget)}
                  onMouseLeave={() => setHoveredModel(null)}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                    setHoveredModel(null); // Clear tooltip when model is selected
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: model.id === selectedModel ? '#40E0D0' : 'transparent',
                    color: model.id === selectedModel ? '#000' : 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  className="hover:bg-[var(--hover-bg)]"
                >
                  <span>
                    {model.name}
                    {model.contextWindow && ` [${formatContextWindow(model.contextWindow)}]`}
                  </span>
                  {model.hasThinkingMode && <BrainIcon />}
                  {model.supportsVision && <EyeIcon />}
                </div>
              ))}
            </div>
          )}

          {/* OpenAI Models Section */}
          {openaiModels.length > 0 && (
            <div
              onMouseEnter={() => setExpandedSection('openai')}
              onMouseLeave={() => setExpandedSection(null)}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: 'rgba(64, 224, 208, 0.1)',
                  color: '#40E0D0',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <OpenAIIcon /> OpenAI Models
              </div>
              {expandedSection === 'openai' && openaiModels.map((model) => (
                <div
                  key={model.id}
                  ref={(el) => {
                    if (el) optionRefs.current.set(model.id, el);
                  }}
                  onMouseEnter={(e) => handleMouseEnter(model, e.currentTarget)}
                  onMouseLeave={() => setHoveredModel(null)}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                    setHoveredModel(null); // Clear tooltip when model is selected
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: model.id === selectedModel ? '#40E0D0' : 'transparent',
                    color: model.id === selectedModel ? '#000' : 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  className="hover:bg-[var(--hover-bg)]"
                >
                  <span>
                    {model.name}
                    {model.contextWindow && ` [${formatContextWindow(model.contextWindow)}]`}
                  </span>
                  {model.hasThinkingMode && <BrainIcon />}
                  {model.supportsVision && <EyeIcon />}
                </div>
              ))}
            </div>
          )}

          {/* Claude Models Section */}
          {claudeModels.length > 0 && (
            <div
              onMouseEnter={() => setExpandedSection('claude')}
              onMouseLeave={() => setExpandedSection(null)}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: 'rgba(64, 224, 208, 0.1)',
                  color: '#40E0D0',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <ClaudeIcon /> Claude Models
              </div>
              {expandedSection === 'claude' && claudeModels.map((model) => (
                <div
                  key={model.id}
                  ref={(el) => {
                    if (el) optionRefs.current.set(model.id, el);
                  }}
                  onMouseEnter={(e) => handleMouseEnter(model, e.currentTarget)}
                  onMouseLeave={() => setHoveredModel(null)}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                    setHoveredModel(null); // Clear tooltip when model is selected
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: model.id === selectedModel ? '#40E0D0' : 'transparent',
                    color: model.id === selectedModel ? '#000' : 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  className="hover:bg-[var(--hover-bg)]"
                >
                  <span>
                    {model.name}
                    {model.contextWindow && ` [${formatContextWindow(model.contextWindow)}]`}
                  </span>
                  {model.hasThinkingMode && <BrainIcon />}
                  {model.supportsVision && <EyeIcon />}
                </div>
              ))}
            </div>
          )}

          {/* Cohere Models Section */}
          {cohereModels.length > 0 && (
            <div
              onMouseEnter={() => setExpandedSection('cohere')}
              onMouseLeave={() => setExpandedSection(null)}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: 'rgba(64, 224, 208, 0.1)',
                  color: '#40E0D0',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <CohereIcon /> Cohere Models
              </div>
              {expandedSection === 'cohere' && cohereModels.map((model) => (
                <div
                  key={model.id}
                  ref={(el) => {
                    if (el) optionRefs.current.set(model.id, el);
                  }}
                  onMouseEnter={(e) => handleMouseEnter(model, e.currentTarget)}
                  onMouseLeave={() => setHoveredModel(null)}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                    setHoveredModel(null); // Clear tooltip when model is selected
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: model.id === selectedModel ? '#40E0D0' : 'transparent',
                    color: model.id === selectedModel ? '#000' : 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  className="hover:bg-[var(--hover-bg)]"
                >
                  <span>
                    {model.name}
                    {model.contextWindow && ` [${formatContextWindow(model.contextWindow)}]`}
                  </span>
                  {model.hasThinkingMode && <BrainIcon />}
                  {model.supportsVision && <EyeIcon />}
                </div>
              ))}
            </div>
          )}

          {/* Local Models Section */}
          {ollamaModels.length > 0 && (
            <div
              onMouseEnter={() => setExpandedSection('ollama')}
              onMouseLeave={() => setExpandedSection(null)}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: 'rgba(64, 224, 208, 0.1)',
                  color: '#40E0D0',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <LocalIcon /> Local Models (Ollama)
              </div>
              {expandedSection === 'ollama' && ollamaModels.map((model) => (
                <div
                  key={model.id}
                  ref={(el) => {
                    if (el) optionRefs.current.set(model.id, el);
                  }}
                  onMouseEnter={(e) => handleMouseEnter(model, e.currentTarget)}
                  onMouseLeave={() => setHoveredModel(null)}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                    setHoveredModel(null); // Clear tooltip when model is selected
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: model.id === selectedModel ? '#40E0D0' : 'transparent',
                    color: model.id === selectedModel ? '#000' : 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  className="hover:bg-[var(--hover-bg)]"
                >
                  <span>
                    {model.name}
                    {model.contextWindow && ` [${formatContextWindow(model.contextWindow)}]`}
                  </span>
                  {model.hasThinkingMode && <BrainIcon />}
                  {model.supportsVision && <EyeIcon />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hoveredModel && <ModelTooltip model={hoveredModel} />}
    </div>
  );
}
