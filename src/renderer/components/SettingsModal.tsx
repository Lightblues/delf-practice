import { useState, useEffect } from 'react'
import type { AppConfig } from '../../shared/types'

interface SettingsModalProps {
  onClose: () => void
}

const DEFAULT_TEXT_MODELS = [
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-opus-4.5',
  'openai/gpt-5.2',
  'google/gemini-3-flash-preview',
  'google/gemini-3-pro-preview',
]

const DEFAULT_VOICE_MODELS = [
  'google/gemini-3-flash-preview',
  'google/gemini-3-pro-preview',
]

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [textModel, setTextModel] = useState(DEFAULT_TEXT_MODELS[0])
  const [voiceModel, setVoiceModel] = useState(DEFAULT_VOICE_MODELS[0])
  const [customTextModels, setCustomTextModels] = useState<string[]>([])
  const [customVoiceModels, setCustomVoiceModels] = useState<string[]>([])
  const [newTextModel, setNewTextModel] = useState('')
  const [newVoiceModel, setNewVoiceModel] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    window.electronAPI.getConfig().then(cfg => {
      setApiKey(cfg.openrouter_api_key || '')
      setTextModel(cfg.openrouter_model || DEFAULT_TEXT_MODELS[0])
      setVoiceModel(cfg.openrouter_voice_model || DEFAULT_VOICE_MODELS[0])
      setCustomTextModels(cfg.custom_text_models || [])
      setCustomVoiceModels(cfg.custom_voice_models || [])
    })
  }, [])

  const allTextModels = [...DEFAULT_TEXT_MODELS, ...customTextModels]
  const allVoiceModels = [...DEFAULT_VOICE_MODELS, ...customVoiceModels]

  const handleAddTextModel = () => {
    const model = newTextModel.trim()
    if (model && !allTextModels.includes(model)) {
      setCustomTextModels([...customTextModels, model])
      setNewTextModel('')
    }
  }

  const handleAddVoiceModel = () => {
    const model = newVoiceModel.trim()
    if (model && !allVoiceModels.includes(model)) {
      setCustomVoiceModels([...customVoiceModels, model])
      setNewVoiceModel('')
    }
  }

  const handleRemoveTextModel = (model: string) => {
    setCustomTextModels(customTextModels.filter(m => m !== model))
    if (textModel === model) setTextModel(DEFAULT_TEXT_MODELS[0])
  }

  const handleRemoveVoiceModel = (model: string) => {
    setCustomVoiceModels(customVoiceModels.filter(m => m !== model))
    if (voiceModel === model) setVoiceModel(DEFAULT_VOICE_MODELS[0])
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await window.electronAPI.setConfig({
        openrouter_api_key: apiKey || undefined,
        openrouter_model: textModel,
        openrouter_voice_model: voiceModel,
        custom_text_models: customTextModels.length > 0 ? customTextModels : undefined,
        custom_voice_models: customVoiceModels.length > 0 ? customVoiceModels : undefined,
      })
      setMessage({ type: 'success', text: 'Settings saved!' })
      setTimeout(() => onClose(), 1000)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="apiKey">OpenRouter API Key</label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
            />
            <p className="form-help">
              Required for AI evaluation (Part C & D).{' '}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
                Get your API key
              </a>
            </p>
          </div>

          <div className="form-section">
            <h3>Part C - Writing (Text Model)</h3>
            <div className="form-group">
              <label htmlFor="textModel">Model</label>
              <select
                id="textModel"
                value={textModel}
                onChange={e => setTextModel(e.target.value)}
              >
                {allTextModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group model-add">
              <input
                type="text"
                value={newTextModel}
                onChange={e => setNewTextModel(e.target.value)}
                placeholder="provider/model-name"
                onKeyDown={e => e.key === 'Enter' && handleAddTextModel()}
              />
              <button type="button" onClick={handleAddTextModel}>Add</button>
            </div>
            {customTextModels.length > 0 && (
              <div className="custom-models">
                {customTextModels.map(m => (
                  <span key={m} className="model-tag">
                    {m}
                    <button onClick={() => handleRemoveTextModel(m)}>&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Part D - Speaking (Voice Model)</h3>
            <div className="form-group">
              <label htmlFor="voiceModel">Model (must support audio input)</label>
              <select
                id="voiceModel"
                value={voiceModel}
                onChange={e => setVoiceModel(e.target.value)}
              >
                {allVoiceModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group model-add">
              <input
                type="text"
                value={newVoiceModel}
                onChange={e => setNewVoiceModel(e.target.value)}
                placeholder="provider/model-name"
                onKeyDown={e => e.key === 'Enter' && handleAddVoiceModel()}
              />
              <button type="button" onClick={handleAddVoiceModel}>Add</button>
            </div>
            {customVoiceModels.length > 0 && (
              <div className="custom-models">
                {customVoiceModels.map(m => (
                  <span key={m} className="model-tag">
                    {m}
                    <button onClick={() => handleRemoveVoiceModel(m)}>&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {message && (
            <div className={`form-message ${message.type}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
