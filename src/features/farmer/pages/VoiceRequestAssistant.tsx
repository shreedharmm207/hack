/**
 * FarmGrid Voice Request Assistant — Kannada + English
 * Bilingual AI assistant that understands Kannada and English speech.
 * Uses Web Speech API with kn-IN locale for Kannada recognition.
 * TTS responses in both Kannada and English.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { submitRequest } from '../farmerSlice';
import SidebarLayout from '../../shared/layouts/SidebarLayout';
import PriorityScoreCard from '../../shared/components/PriorityScoreCard';
import { calculatePriority } from '../../../utils/priorityEngine';
import { RESOURCE_CATEGORIES, RESOURCE_CATEGORY_ICONS } from '../../../utils/constants';
import type { ResourceCategory, CropStage, UrgencyLevel } from '../../../types';

const FARMER_NAV = [
  { path: '/farmer/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/farmer/request', label: 'New Request', icon: '📝' },
  { path: '/farmer/voice-request', label: 'Voice Request', icon: '🎙️' },
  { path: '/farmer/requests', label: 'My Requests', icon: '📋' },
  { path: '/farmer/schedule', label: 'My Schedule', icon: '📅' },
  { path: '/farmer/what-if', label: 'What-If', icon: '🔮' },
  { path: '/farmer/fairness', label: 'Fairness', icon: '⚖️' },
  { path: '/farmer/profile', label: 'Profile', icon: '👤' },
];

// ─── Kannada NLU Dictionaries ─────────────────────────────────────────────────

const RESOURCE_KEYWORDS_KN: Array<{ keywords: string[]; type: ResourceCategory }> = [
  { keywords: ['ಟ್ರಾಕ್ಟರ್', 'ಟ್ರ್ಯಾಕ್ಟರ್', 'tractor', 'ಉಳುಮೆ ಯಂತ್ರ'], type: 'tractor' },
  { keywords: ['ಹಾರ್ವೆಸ್ಟರ್', 'ಕೊಯ್ಲು ಯಂತ್ರ', 'harvester', 'combine', 'ಕೊಯ್ಲು'], type: 'harvester' },
  { keywords: ['ಪಂಪ್', 'ನೀರಿನ ಪಂಪ್', 'pump', 'water pump', 'ನೀರು ಪಂಪ್'], type: 'portable_pump' },
  { keywords: ['ಡ್ರಿಪ್', 'ತೊಟ್ಟಿಕ್ಕು', 'drip', 'drip irrigation'], type: 'drip_irrigation' },
  { keywords: ['ಸ್ಪ್ರಿಂಕ್ಲರ್', 'sprinkler', 'ನೀರು ಚಿಮ್ಮಣ'], type: 'sprinkler' },
  { keywords: ['ಡ್ರೋನ್', 'drone', 'ಸ್ಪ್ರೇ ಡ್ರೋನ್', 'crop sprayer'], type: 'drone_spraying' },
  { keywords: ['ಕಾರ್ಮಿಕರು', 'ಕೂಲಿ', 'labour', 'labor', 'workers', 'ಕೆಲಸಗಾರರು'], type: 'labour_team' },
  { keywords: ['ಸಸಿ ನಾಟಿ', 'seeder', 'seed drill', 'ಬಿತ್ತನೆ ಯಂತ್ರ'], type: 'seeder' },
];

const CROP_KEYWORDS_KN: Record<string, string> = {
  'ಭತ್ತ': 'Rice', 'rice': 'Rice', 'ಅಕ್ಕಿ': 'Rice',
  'ಗೋಧಿ': 'Wheat', 'wheat': 'Wheat',
  'ಹತ್ತಿ': 'Cotton', 'cotton': 'Cotton',
  'ಸೋಯಾ': 'Soybean', 'soybean': 'Soybean', 'ಸೋಯಾಬೀನ್': 'Soybean',
  'ಕಬ್ಬು': 'Sugarcane', 'sugarcane': 'Sugarcane',
  'ಮೆಕ್ಕೆ': 'Maize', 'maize': 'Maize', 'corn': 'Maize',
  'ಟೊಮೇಟೊ': 'Tomato', 'tomato': 'Tomato',
  'ಈರುಳ್ಳಿ': 'Onion', 'onion': 'Onion',
  'ಆಲೂ': 'Potato', 'potato': 'Potato',
  'ನೆಲಗಡಲೆ': 'Groundnut', 'groundnut': 'Groundnut',
};

const STAGE_KEYWORDS_KN: Record<CropStage, string[]> = {
  harvesting: ['ಕೊಯ್ಲು', 'harvest', 'harvesting', 'ಪಕ್ವ', 'ready', 'ripe', 'ಹಣ್ಣಾಗಿದೆ'],
  flowering: ['ಹೂ', 'ಹೂಬಿಡುವ', 'flowering', 'bloom', 'ಅರಳುವ'],
  vegetative: ['ಬೆಳೆ', 'ಬೆಳೆಯುತ್ತಿದೆ', 'vegetative', 'growing', 'ಭೂಮಿ ತಯಾರಿ', 'preparation'],
  seedling: ['ಸಸಿ', 'seedling', 'nursery', 'ಮೊಳಕೆ'],
  post_harvest: ['ಕೊಯ್ಲು ನಂತರ', 'post harvest', 'after harvest'],
};

const URGENCY_KEYWORDS_KN: Record<UrgencyLevel, string[]> = {
  critical: ['ತುರ್ತು', 'ಅತ್ಯವಶ್ಯ', 'urgent', 'emergency', 'immediately', 'asap', 'critical', 'ಮಳೆ ಬರುತ್ತದೆ'],
  high: ['ಶೀಘ್ರ', 'soon', 'quickly', 'high', 'ಮುಖ್ಯ', 'important'],
  medium: ['ಮಧ್ಯಮ', 'medium', 'moderate', 'sometime'],
  low: ['ನಿಧಾನ', 'flexible', 'no rush', 'low', 'later'],
};

// Bilingual assistant responses
const RESPONSES = {
  greeting: {
    kn: 'ನಮಸ್ಕಾರ! ನಾನು FarmGrid ಸಹಾಯಕ. ನಿಮಗೆ ಯಾವ ಸಂಪನ್ಮೂಲ ಬೇಕು ಎಂದು ಕನ್ನಡದಲ್ಲಿ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಹೇಳಿ.',
    en: "Hello! I'm your FarmGrid assistant. Tell me what resource you need — speak in Kannada or English.",
  },
  askResourceType: {
    kn: 'ನಿಮಗೆ ಯಾವ ರೀತಿಯ ಯಂತ್ರ / ಸಂಪನ್ಮೂಲ ಬೇಕು?',
    en: 'What type of resource do you need?',
  },
  askCropStage: {
    kn: 'ನಿಮ್ಮ ಬೆಳೆ ಯಾವ ಹಂತದಲ್ಲಿದೆ?',
    en: 'What stage is your crop at?',
  },
  askDate: {
    kn: 'ಯಾವಾಗ ಬೇಕು?',
    en: 'When do you need the resource?',
  },
  askDuration: {
    kn: 'ಎಷ್ಟು ದಿನ ಬೇಕು?',
    en: 'How many days do you need it?',
  },
  confirming: {
    kn: 'ಎಲ್ಲ ಮಾಹಿತಿ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ದೃಢೀಕರಿಸಿ.',
    en: 'I have all the information. Please confirm your request.',
  },
  submitting: {
    kn: 'ನಿಮ್ಮ ವಿನಂತಿ FarmGrid ಗೆ ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ...',
    en: 'Submitting your request to FarmGrid...',
  },
};

interface ExtractedFields {
  resourceType?: ResourceCategory;
  crop?: string;
  cropStage?: CropStage;
  durationDays?: number;
  urgencyLevel?: UrgencyLevel;
  dateOffset?: number;
  resourceNeeded?: string;
  additionalNotes?: string;
}

function extractFields(text: string): ExtractedFields {
  const lower = text.toLowerCase();
  const fields: ExtractedFields = {};

  // Resource type (check Kannada + English keywords)
  for (const item of RESOURCE_KEYWORDS_KN) {
    if (item.keywords.some(k => lower.includes(k.toLowerCase()))) {
      fields.resourceType = item.type;
      break;
    }
  }

  // Crop
  for (const [key, val] of Object.entries(CROP_KEYWORDS_KN)) {
    if (lower.includes(key.toLowerCase())) { fields.crop = val; break; }
  }

  // Crop stage
  for (const [stage, keywords] of Object.entries(STAGE_KEYWORDS_KN) as [CropStage, string[]][]) {
    if (keywords.some(k => lower.includes(k.toLowerCase()))) { fields.cropStage = stage; break; }
  }

  // Duration (e.g., "3 days", "ಮೂರು ದಿನ", "3 ದಿನ")
  const durMatch = lower.match(/(\d+)\s*(?:days?|ದಿನ)/);
  if (durMatch) fields.durationDays = parseInt(durMatch[1]);

  // Date offset
  if (lower.includes('today') || lower.includes('ಇಂದು')) fields.dateOffset = 0;
  else if (lower.includes('tomorrow') || lower.includes('ನಾಳೆ')) fields.dateOffset = 1;
  else {
    const daysMatch = lower.match(/in\s+(\d+)\s*days?/);
    if (daysMatch) fields.dateOffset = parseInt(daysMatch[1]);
    else if (lower.includes('this week') || lower.includes('ಈ ವಾರ')) fields.dateOffset = 2;
    else if (lower.includes('next week') || lower.includes('ಮುಂದಿನ ವಾರ')) fields.dateOffset = 7;
  }

  // Urgency
  for (const [level, kws] of Object.entries(URGENCY_KEYWORDS_KN) as [UrgencyLevel, string[]][]) {
    if (kws.some(k => lower.includes(k.toLowerCase()))) { fields.urgencyLevel = level; break; }
  }

  if (fields.resourceType) {
    const parts = [RESOURCE_CATEGORIES[fields.resourceType]];
    if (fields.crop) parts.push(`for ${fields.crop}`);
    fields.resourceNeeded = parts.join(' ');
  }

  return fields;
}

function getMissingQuestions(fields: ExtractedFields) {
  const questions: Array<{
    field: keyof ExtractedFields;
    question: string; questionKn: string;
    type: 'text' | 'choice';
    choices?: Array<{ label: string; labelKn: string; value: string }>;
  }> = [];

  if (!fields.resourceType) questions.push({
    field: 'resourceType', type: 'choice',
    question: 'What type of resource do you need?',
    questionKn: 'ನಿಮಗೆ ಯಾವ ಸಂಪನ್ಮೂಲ ಬೇಕು?',
    choices: [
      { label: '🚜 Tractor', labelKn: '🚜 ಟ್ರಾಕ್ಟರ್', value: 'tractor' },
      { label: '🌾 Harvester', labelKn: '🌾 ಕೊಯ್ಲು ಯಂತ್ರ', value: 'harvester' },
      { label: '💧 Water Pump', labelKn: '💧 ನೀರಿನ ಪಂಪ್', value: 'portable_pump' },
      { label: '🚁 Drone Spray', labelKn: '🚁 ಡ್ರೋನ್ ಸ್ಪ್ರೇ', value: 'drone_spraying' },
      { label: '👷 Labour Team', labelKn: '👷 ಕಾರ್ಮಿಕರ ತಂಡ', value: 'labour_team' },
      { label: '🪣 Drip Irrigation', labelKn: '🪣 ಡ್ರಿಪ್ ನೀರಾವರಿ', value: 'drip_irrigation' },
    ],
  });

  if (!fields.cropStage) questions.push({
    field: 'cropStage', type: 'choice',
    question: 'What stage is your crop at?',
    questionKn: 'ನಿಮ್ಮ ಬೆಳೆ ಯಾವ ಹಂತದಲ್ಲಿದೆ?',
    choices: [
      { label: '🌱 Seedling', labelKn: '🌱 ಸಸಿ ಹಂತ', value: 'seedling' },
      { label: '🌿 Vegetative', labelKn: '🌿 ಬೆಳವಣಿಗೆ ಹಂತ', value: 'vegetative' },
      { label: '🌸 Flowering', labelKn: '🌸 ಹೂ ಹಂತ', value: 'flowering' },
      { label: '🌾 Harvest Ready', labelKn: '🌾 ಕೊಯ್ಲು ಸಿದ್ಧ', value: 'harvesting' },
      { label: '🌾 Post Harvest', labelKn: '🌾 ಕೊಯ್ಲು ನಂತರ', value: 'post_harvest' },
    ],
  });

  if (fields.dateOffset === undefined) questions.push({
    field: 'dateOffset', type: 'choice',
    question: 'When do you need it?',
    questionKn: 'ಯಾವಾಗ ಬೇಕು?',
    choices: [
      { label: 'Today', labelKn: 'ಇಂದು', value: '0' },
      { label: 'Tomorrow', labelKn: 'ನಾಳೆ', value: '1' },
      { label: 'In 2 days', labelKn: '2 ದಿನಗಳಲ್ಲಿ', value: '2' },
      { label: 'This week', labelKn: 'ಈ ವಾರ', value: '3' },
      { label: 'Next week', labelKn: 'ಮುಂದಿನ ವಾರ', value: '7' },
    ],
  });

  if (!fields.durationDays) questions.push({
    field: 'durationDays', type: 'choice',
    question: 'How many days do you need it?',
    questionKn: 'ಎಷ್ಟು ದಿನ ಬೇಕು?',
    choices: [
      { label: '1 day', labelKn: '1 ದಿನ', value: '1' },
      { label: '2 days', labelKn: '2 ದಿನ', value: '2' },
      { label: '3 days', labelKn: '3 ದಿನ', value: '3' },
      { label: '5 days', labelKn: '5 ದಿನ', value: '5' },
      { label: '1 week', labelKn: '1 ವಾರ', value: '7' },
    ],
  });

  return questions;
}

type Stage = 'idle' | 'listening' | 'clarifying' | 'confirming' | 'submitting' | 'done' | 'error';
type Lang = 'kn' | 'en';

interface Message { from: 'assistant' | 'user'; text: string; textKn?: string; timestamp: Date; }

// TTS helper
function speak(text: string, lang: string = 'en-IN') {
  if (!('speechSynthesis' in window)) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}

export default function VoiceRequestAssistant() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector(s => s.auth);
  const { profile, isLoading } = useAppSelector(s => s.farmer);

  const [stage, setStage] = useState<Stage>('idle');
  const [lang, setLang] = useState<Lang>('kn');
  const [messages, setMessages] = useState<Message[]>([]);
  const [fields, setFields] = useState<ExtractedFields>({});
  const [urgencyReason, setUrgencyReason] = useState('');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [missingQuestions, setMissingQuestions] = useState<ReturnType<typeof getMissingQuestions>>([]);
  const [textInput, setTextInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [previewScore, setPreviewScore] = useState<ReturnType<typeof calculatePriority> | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [allocationResult, setAllocationResult] = useState<any>(null);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setSpeechSupported(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (fields.resourceType && fields.cropStage && fields.dateOffset !== undefined && fields.durationDays) {
      const mockReq = {
        id: 'preview',
        farmerId: profile?.id || 'f1', farmerName: profile?.name || 'Farmer',
        resourceType: fields.resourceType, resourceNeeded: fields.resourceNeeded || '',
        earliestStart: new Date(Date.now() + (fields.dateOffset || 0) * 86400000).toISOString(),
        latestEnd: new Date(Date.now() + ((fields.dateOffset || 0) + (fields.durationDays || 1) + 3) * 86400000).toISOString(),
        durationDays: fields.durationDays, cropStage: fields.cropStage,
        urgencyLevel: fields.urgencyLevel || 'medium', urgencyReason: '',
        lat: profile?.lat || 20.5937, lng: profile?.lng || 78.9629,
        additionalNotes: '', status: 'submitted', createdAt: new Date().toISOString(),
      };
      setPreviewScore(calculatePriority(mockReq as any));
    }
  }, [fields, profile]);

  const addMsg = (from: 'assistant' | 'user', text: string, textKn?: string) => {
    setMessages(prev => [...prev, { from, text, textKn, timestamp: new Date() }]);
    if (from === 'assistant' && ttsEnabled) {
      speak(lang === 'kn' && textKn ? textKn : text, lang === 'kn' ? 'kn-IN' : 'en-IN');
    }
  };

  const startConversation = () => {
    setMessages([]);
    setFields({});
    setUrgencyReason('');
    addMsg('assistant',
      RESPONSES.greeting.en,
      RESPONSES.greeting.kn
    );
    setStage('listening');
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !speechSupported) return;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error === 'not-allowed') {
        addMsg('assistant', '🎙️ Microphone access denied. Please type your request below.', '🎙️ ಮೈಕ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಟೈಪ್ ಮಾಡಿ.');
      }
    };
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      handleUserInput(transcript);
    };
    recognition.start();
  };

  const stopListening = () => { recognitionRef.current?.stop(); setIsListening(false); };

  const handleUserInput = (input: string) => {
    if (!input.trim()) return;
    addMsg('user', input);
    setTextInput('');
    processInput(input);
  };

  const processInput = (input: string) => {
    if (stage === 'clarifying' && missingQuestions[currentQuestionIdx]) {
      // Text answer to a clarifying question
      const q = missingQuestions[currentQuestionIdx];
      const extracted = extractAnswerForField(q.field, input);
      const newFields = { ...fields, ...extracted };
      setFields(newFields);
      const missing = getMissingQuestions(newFields);
      const nextIdx = currentQuestionIdx + 1;
      if (nextIdx < missing.length) {
        setCurrentQuestionIdx(nextIdx);
        setMissingQuestions(missing);
        addMsg('assistant', missing[nextIdx].question, missing[nextIdx].questionKn);
      } else {
        proceedToConfirmation(newFields);
      }
    } else {
      const extracted = extractFields(input);
      const newFields = { ...fields, ...extracted };
      setFields(newFields);
      const missing = getMissingQuestions(newFields);
      if (missing.length === 0) {
        proceedToConfirmation(newFields);
      } else {
        setMissingQuestions(missing);
        setCurrentQuestionIdx(0);
        addMsg('assistant', missing[0].question, missing[0].questionKn);
        setStage('clarifying');
      }
    }
  };

  const extractAnswerForField = (field: keyof ExtractedFields, answer: string): Partial<ExtractedFields> => {
    const lower = answer.toLowerCase();
    switch (field) {
      case 'resourceType': {
        for (const item of RESOURCE_KEYWORDS_KN) {
          if (item.keywords.some(k => lower.includes(k.toLowerCase()))) return { resourceType: item.type };
        }
        return {};
      }
      case 'cropStage': {
        for (const [stage, kws] of Object.entries(STAGE_KEYWORDS_KN) as [CropStage, string[]][]) {
          if (kws.some(k => lower.includes(k.toLowerCase()))) return { cropStage: stage };
        }
        return {};
      }
      case 'dateOffset': {
        const match = answer.match(/\d+/);
        if (match) return { dateOffset: parseInt(match[0]) };
        if (lower.includes('today') || lower.includes('ಇಂದು')) return { dateOffset: 0 };
        if (lower.includes('tomorrow') || lower.includes('ನಾಳೆ')) return { dateOffset: 1 };
        return { dateOffset: 1 };
      }
      case 'durationDays': {
        const match = answer.match(/\d+/);
        if (match) return { durationDays: parseInt(match[0]) };
        return { durationDays: 1 };
      }
      default: return {};
    }
  };

  const handleChoiceAnswer = (field: keyof ExtractedFields, value: string, label: string) => {
    addMsg('user', label);
    let extracted: Partial<ExtractedFields> = {};
    if (field === 'resourceType') extracted = { resourceType: value as ResourceCategory };
    if (field === 'cropStage') extracted = { cropStage: value as CropStage };
    if (field === 'dateOffset') extracted = { dateOffset: parseInt(value) };
    if (field === 'durationDays') extracted = { durationDays: parseInt(value) };
    const newFields = { ...fields, ...extracted };
    setFields(newFields);
    const missing = getMissingQuestions(newFields);
    const nextIdx = currentQuestionIdx + 1;
    if (nextIdx < missing.length) {
      setCurrentQuestionIdx(nextIdx);
      setMissingQuestions(missing);
      addMsg('assistant', missing[nextIdx].question, missing[nextIdx].questionKn);
    } else {
      proceedToConfirmation(newFields);
    }
  };

  const proceedToConfirmation = (finalFields: ExtractedFields) => {
    addMsg('assistant',
      'I have all the information. Please confirm your request below.',
      'ಎಲ್ಲ ಮಾಹಿತಿ ಸಿದ್ಧ. ದಯವಿಟ್ಟು ದೃಢೀಕರಿಸಿ.'
    );
    setFields(finalFields);
    setStage('confirming');
  };

  const handleConfirm = async () => {
    if (!profile) return;
    setStage('submitting');
    addMsg('assistant',
      'Submitting your request to FarmGrid...',
      'ನಿಮ್ಮ ವಿನಂತಿ FarmGrid ಗೆ ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ...'
    );

    const dateOffset = fields.dateOffset ?? 1;
    const durationDays = fields.durationDays ?? 1;
    const earliestStart = new Date(Date.now() + dateOffset * 86400000).toISOString();
    const latestEnd = new Date(Date.now() + (dateOffset + durationDays + 3) * 86400000).toISOString();

    const result = await dispatch(submitRequest({
      farmer_id: profile.id,
      farmer_profile: profile as any,
      resource_type: fields.resourceType || 'tractor',
      resource_needed: fields.resourceNeeded || `${RESOURCE_CATEGORIES[fields.resourceType || 'tractor']} for ${fields.crop || 'crop'}`,
      organization_id: 'o2222222-2222-2222-2222-222222222222',
      earliest_start: earliestStart,
      latest_end: latestEnd,
      duration_days: durationDays,
      crop_stage: fields.cropStage || 'vegetative',
      urgency_level: fields.urgencyLevel || 'medium',
      urgency_reason: urgencyReason || `Needed for ${fields.cropStage || 'farming'} operations.`,
      farm_lat: profile.lat || 12.5222,
      farm_lng: profile.lng || 76.8978,
      additional_notes: '',
      voice_request: true,
    }));

    if (submitRequest.fulfilled.match(result)) {
      setAllocationResult(result.payload.allocationResult);
      setSubmitted(true);
      setStage('done');
    } else {
      setStage('error');
      addMsg('assistant', 'Something went wrong. Please try again.', 'ತಪ್ಪು ಸಂಭವಿಸಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.');
    }
  };

  // Success screen
  if (submitted && allocationResult) {
    return (
      <SidebarLayout navItems={FARMER_NAV} portalName="Farmer Portal" portalColor="bg-primary-700" logoIcon="🌾">
        <div className="p-6 flex items-center justify-center min-h-[70vh]">
          <div className="text-center max-w-lg animate-slide-up">
            {allocationResult.success ? (
              <>
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">✅</div>
                <h2 className="text-2xl font-bold text-text-primary mb-1">Resource Allocated!</h2>
                <p className="text-primary-700 font-medium mb-2">ಸಂಪನ್ಮೂಲ ಹಂಚಿಕೆಯಾಗಿದೆ!</p>
                <p className="text-text-muted mb-4">FarmGrid automatically found and allocated a resource for you.</p>
                <div className="card p-5 text-left mb-6">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between"><span className="text-text-muted">Resource</span><span className="font-semibold">{allocationResult.resource_name}</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Method</span><span className="badge badge-success">Auto-Allocated ⚡</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Priority Score</span><span className="font-bold text-primary-700">{allocationResult.priority_score}/100</span></div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">⏳</div>
                <h2 className="text-2xl font-bold text-text-primary mb-1">Request Submitted</h2>
                <p className="text-amber-600 font-medium mb-2">ವಿನಂತಿ ಸಲ್ಲಿಸಲಾಗಿದೆ</p>
                <p className="text-text-muted mb-4">{allocationResult.message}</p>
              </>
            )}
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate('/farmer/requests')} className="btn-primary">View My Requests</button>
              <button onClick={() => { setSubmitted(false); setStage('idle'); setMessages([]); setFields({}); }} className="btn-secondary">New Request</button>
            </div>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout navItems={FARMER_NAV} portalName="Farmer Portal" portalColor="bg-primary-700" logoIcon="🌾">
      <div className="p-6 animate-fade-in">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              🎙️ Voice Request Assistant
              <span className="text-sm font-normal text-text-muted">/ ಧ್ವನಿ ಸಹಾಯಕ</span>
            </h1>
            <p className="text-text-muted text-sm mt-1">
              Speak or type in <strong>Kannada</strong> or English to create a resource request.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button onClick={() => setLang('kn')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${lang === 'kn' ? 'bg-white shadow text-primary-700' : 'text-text-muted'}`}>
                ಕನ್ನಡ
              </button>
              <button onClick={() => setLang('en')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${lang === 'en' ? 'bg-white shadow text-primary-700' : 'text-text-muted'}`}>
                EN
              </button>
            </div>
            {/* TTS toggle */}
            <button onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`px-3 py-2 rounded-lg text-xs border transition-all ${ttsEnabled ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-text-muted border-border'}`}
              title={ttsEnabled ? 'Disable voice responses' : 'Enable voice responses'}>
              {ttsEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2 space-y-4">
            {messages.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="text-6xl mb-4">🎙️</div>
                <h2 className="text-xl font-bold text-text-primary mb-1">
                  {lang === 'kn' ? 'ನಿಮ್ಮ ಅಗತ್ಯ ತಿಳಿಸಿ' : 'Tell FarmGrid What You Need'}
                </h2>
                <p className="text-text-muted text-sm mb-6">
                  {lang === 'kn'
                    ? 'ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ'
                    : 'Speak or type naturally in Kannada or English'}
                </p>
                <div className="space-y-2 mb-8 text-left max-w-sm mx-auto">
                  {lang === 'kn' ? [
                    '"ನಾಳೆ ಟ್ರಾಕ್ಟರ್ ಬೇಕು ಕೊಯ್ಲಿಗೆ"',
                    '"3 ದಿನ ನೀರಿನ ಪಂಪ್ ಬೇಕು ಭತ್ತಕ್ಕೆ"',
                    '"ತುರ್ತಾಗಿ ಡ್ರೋನ್ ಬೇಕು 5 ಎಕರೆಗೆ"',
                  ] : [
                    '"I need a tractor tomorrow for harvesting"',
                    '"Need water pump 3 days for rice field"',
                    '"Urgent drone spray for 5 acres cotton"',
                  ].map(ex => (
                    <div key={ex} className="p-2 bg-slate-50 rounded text-sm text-text-secondary italic border border-border">{ex}</div>
                  ))}
                </div>
                <button onClick={startConversation} className="btn-primary btn-lg gap-2">
                  🎙️ {lang === 'kn' ? 'ಮಾತನಾಡಲು ಪ್ರಾರಂಭಿಸಿ' : 'Start Conversation'}
                </button>
              </div>
            ) : (
              <>
                <div className="card p-4 h-80 overflow-y-auto space-y-3">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.from === 'assistant' && (
                        <div className="w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center text-white text-xs mr-2 flex-shrink-0 mt-0.5">🌿</div>
                      )}
                      <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${msg.from === 'user'
                        ? 'bg-primary-700 text-white rounded-br-none'
                        : 'bg-slate-100 text-text-primary rounded-bl-none'}`}>
                        {msg.from === 'assistant' && lang === 'kn' && msg.textKn
                          ? <><div>{msg.textKn}</div><div className="text-xs opacity-70 mt-1 pt-1 border-t border-white/20">{msg.text}</div></>
                          : msg.text
                        }
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Choice buttons */}
                {stage === 'clarifying' && missingQuestions[currentQuestionIdx]?.type === 'choice' && (
                  <div className="card p-4">
                    <p className="text-sm font-medium text-text-primary mb-3">
                      {lang === 'kn' && missingQuestions[currentQuestionIdx].questionKn
                        ? missingQuestions[currentQuestionIdx].questionKn
                        : missingQuestions[currentQuestionIdx].question}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {missingQuestions[currentQuestionIdx].choices?.map(choice => (
                        <button key={choice.value}
                          onClick={() => handleChoiceAnswer(
                            missingQuestions[currentQuestionIdx].field,
                            choice.value,
                            lang === 'kn' ? choice.labelKn : choice.label
                          )}
                          className="px-3 py-2 bg-white border border-border rounded-lg text-sm hover:border-primary-700 hover:bg-teal-50 transition-all font-medium">
                          <div>{lang === 'kn' ? choice.labelKn : choice.label}</div>
                          {lang === 'kn' && <div className="text-xs text-text-muted">{choice.label}</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirmation screen */}
                {stage === 'confirming' && (
                  <div className="card p-5 border-2 border-primary-700">
                    <h3 className="font-bold text-text-primary mb-1 flex items-center gap-2">📋 Request Summary</h3>
                    <p className="text-xs text-primary-700 mb-4">ವಿನಂತಿ ಸಾರಾಂಶ — ದಯವಿಟ್ಟು ದೃಢೀಕರಿಸಿ</p>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="text-text-muted">Resource / ಸಂಪನ್ಮೂಲ</span>
                        <span className="font-semibold">{fields.resourceType ? `${RESOURCE_CATEGORY_ICONS[fields.resourceType]} ${RESOURCE_CATEGORIES[fields.resourceType]}` : '—'}</span>
                      </div>
                      {fields.crop && <div className="flex justify-between py-1 border-b border-border"><span className="text-text-muted">Crop / ಬೆಳೆ</span><span className="font-semibold">{fields.crop}</span></div>}
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="text-text-muted">Starts / ಪ್ರಾರಂಭ</span>
                        <span className="font-semibold">{fields.dateOffset === 0 ? 'Today / ಇಂದು' : fields.dateOffset === 1 ? 'Tomorrow / ನಾಳೆ' : `In ${fields.dateOffset} days`}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="text-text-muted">Duration / ಅವಧಿ</span>
                        <span className="font-semibold">{fields.durationDays} day{(fields.durationDays || 0) > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="text-text-muted">Crop Stage / ಬೆಳೆ ಹಂತ</span>
                        <span className="font-semibold capitalize">{fields.cropStage?.replace('_', ' ') || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-text-muted">Urgency / ತುರ್ತು</span>
                        <span className="font-semibold capitalize">{fields.urgencyLevel || 'medium'}</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="field-label">Urgency reason (optional) / ತುರ್ತು ಕಾರಣ</label>
                      <textarea rows={2} className="field-input resize-none text-sm"
                        placeholder="ಮಳೆ ಬರಲಿದೆ / Rain forecast..."
                        value={urgencyReason} onChange={e => setUrgencyReason(e.target.value)} />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleConfirm} disabled={isLoading || !profile} className="btn-primary flex-1 btn-lg">
                        {isLoading ? '⏳ Processing...' : '✅ Confirm & Find Resource / ದೃಢೀಕರಿಸಿ'}
                      </button>
                      <button onClick={() => { setStage('listening'); setFields({}); addMsg('assistant', 'Let me start over.', 'ಮತ್ತೆ ಪ್ರಾರಂಭಿಸೋಣ.'); }} className="btn-secondary">Edit</button>
                    </div>
                  </div>
                )}

                {/* Input area */}
                {(stage === 'listening' || stage === 'clarifying') && missingQuestions[currentQuestionIdx]?.type !== 'choice' && (
                  <div className="card p-4">
                    <div className="flex gap-2">
                      <input type="text" className="field-input flex-1 text-sm"
                        placeholder={lang === 'kn' ? 'ಕನ್ನಡದಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ...' : 'Type your response...'}
                        value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUserInput(textInput)}
                      />
                      {speechSupported && (
                        <button
                          onClick={isListening ? stopListening : startListening}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-semibold text-sm ${isListening
                            ? 'bg-red-50 border-red-400 text-red-600 animate-pulse'
                            : 'bg-primary-50 border-primary-700 text-primary-700 hover:bg-primary-100'}`}>
                          {isListening ? '🔴 Stop' : '🎙️'}
                        </button>
                      )}
                      <button onClick={() => handleUserInput(textInput)} disabled={!textInput.trim()} className="btn-primary px-4">Send</button>
                    </div>
                    {isListening && (
                      <p className="text-xs mt-2 animate-pulse">
                        {lang === 'kn' ? '🔴 ಕೇಳುತ್ತಿದೆ... ಮಾತನಾಡಿ' : '🔴 Listening... speak now'}
                        <span className="text-text-muted ml-2">({lang === 'kn' ? 'Kannada' : 'English'} mode)</span>
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {previewScore && (
              <div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg mb-2">
                  <p className="text-xs font-semibold text-amber-700">Live Priority Preview / ಆದ್ಯತಾ ಮಟ್ಟ</p>
                </div>
                <PriorityScoreCard breakdown={previewScore} />
              </div>
            )}
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">💡 {lang === 'kn' ? 'ಉದಾಹರಣೆ ವಾಕ್ಯಗಳು' : 'Example Phrases'}</h3>
              <div className="space-y-2 text-xs text-text-muted">
                {lang === 'kn' ? [
                  'ನಾಳೆ ಟ್ರಾಕ್ಟರ್ ಬೇಕು ಕೊಯ್ಲಿಗೆ',
                  '3 ದಿನ ನೀರಿನ ಪಂಪ್ ಬೇಕು ಭತ್ತಕ್ಕೆ',
                  'ತುರ್ತಾಗಿ ಡ್ರೋನ್ ಸ್ಪ್ರೇ ಬೇಕು',
                  'ಕಾರ್ಮಿಕರ ತಂಡ ಬೇಕು ಗೋಧಿ ಕೊಯ್ಲಿಗೆ',
                ] : [
                  'I need a tractor tomorrow for harvesting',
                  'Need water pump 3 days for rice',
                  'Urgent drone spray for 5 acres',
                  'Labour team for wheat harvesting',
                ].map(ex => (
                  <div key={ex} onClick={() => { if (stage === 'listening') handleUserInput(ex); }}
                    className="p-2 bg-slate-50 rounded border border-border italic cursor-pointer hover:border-primary-700 hover:bg-teal-50 transition-all">
                    "{ex}"
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">🔒 AI Safety / AI ಸುರಕ್ಷತೆ</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                The AI assistant only helps you create a structured request. All scheduling decisions are made
                by the deterministic FarmGrid engine — not by AI.
                <br /><br />
                <span className="text-primary-700">AI ಸಹಾಯಕ ಮಾಹಿತಿ ಸಂಗ್ರಹಿಸುತ್ತದೆ. ಹಂಚಿಕೆ FarmGrid ಯಂತ್ರ ಮಾಡುತ್ತದೆ.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
