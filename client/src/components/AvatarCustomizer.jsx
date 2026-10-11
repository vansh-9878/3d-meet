import React from 'react';
import { Palette, X, Scissors, Glasses, Sparkles } from 'lucide-react';

export const AVATAR_PRESETS = [
  {
    id: 'executive_navy',
    name: 'Executive Navy',
    suitColor: '#1e3a8a',
    shirtColor: '#ffffff',
    tieColor: '#dc2626',
    pantsColor: '#172554',
    skinColor: '#f3d2b8', // Natural warm beige skin tone
    hairColor: '#3a2312',
    hairStyle: 'executive',
    accessory: 'glasses',
    shoeColor: '#1e1b18'
  },
  {
    id: 'charcoal_minimal',
    name: 'Charcoal Minimal',
    suitColor: '#334155',
    shirtColor: '#f8fafc',
    tieColor: '#0ea5e9',
    pantsColor: '#0f172a',
    skinColor: '#eed2bd', // Fair peach skin tone
    hairColor: '#1c1917',
    hairStyle: 'crop',
    accessory: 'none',
    shoeColor: '#09090b'
  },
  {
    id: 'emerald_modern',
    name: 'Emerald Modern',
    suitColor: '#065f46',
    shirtColor: '#ffffff',
    tieColor: '#f59e0b',
    pantsColor: '#022c22',
    skinColor: '#c68642', // Warm amber tan skin tone
    hairColor: '#292524',
    hairStyle: 'bob',
    accessory: 'glasses',
    shoeColor: '#27272a'
  },
  {
    id: 'burgundy_luxe',
    name: 'Burgundy Luxe',
    suitColor: '#881337',
    shirtColor: '#ffffff',
    tieColor: '#fbbf24',
    pantsColor: '#4c0519',
    skinColor: '#8d5524', // Deep chestnut skin tone
    hairColor: '#1c1917',
    hairStyle: 'executive',
    accessory: 'none',
    shoeColor: '#451a03'
  },
  {
    id: 'cyber_slate',
    name: 'Cyber Slate',
    suitColor: '#4f46e5',
    shirtColor: '#1e1b4b',
    tieColor: '#10b981',
    pantsColor: '#312e81',
    skinColor: '#e0ac69', // Golden honey skin tone
    hairColor: '#2e1065',
    hairStyle: 'crop',
    accessory: 'glasses',
    shoeColor: '#18181b'
  },
];

export function AvatarCustomizer({
  currentConfig,
  onChange,
  isOpen,
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-20 right-6 z-50 w-96 max-h-[85vh] overflow-y-auto bg-white border border-gray-300 rounded-3xl p-6 shadow-2xl text-gray-900 font-sans transition-all duration-200">
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2.5">
          <Palette className="w-5 h-5 text-blue-600" />
          <h3 className="font-extrabold text-base text-gray-900">Customize Avatar</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-4 space-y-5">
        {/* Style Presets */}
        <div>
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Curated Executive Looks
          </label>
          <div className="grid grid-cols-1 gap-2">
            {AVATAR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onChange(preset)}
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                  currentConfig.suitColor === preset.suitColor
                    ? 'bg-blue-50 border-2 border-blue-600 text-blue-900 shadow-sm'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
                    style={{ backgroundColor: preset.suitColor }}
                  />
                  <span>{preset.name}</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: preset.tieColor }} />
                  <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: preset.pantsColor }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Hairstyle Selection */}
        <div className="pt-3 border-t border-gray-200">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-blue-600" /> Hairstyle
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'executive', label: 'Executive' },
              { id: 'crop', label: 'Crop Cut' },
              { id: 'bob', label: 'Chic Bob' }
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => onChange({ ...currentConfig, hairStyle: style.id })}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                  (currentConfig.hairStyle || 'executive') === style.id
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Eyewear / Accessories */}
        <div className="pt-3 border-t border-gray-200">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
            <Glasses className="w-3.5 h-3.5 text-blue-600" /> Eyewear
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'glasses', label: 'Designer Glasses' },
              { id: 'none', label: 'No Glasses' }
            ].map((acc) => (
              <button
                key={acc.id}
                onClick={() => onChange({ ...currentConfig, accessory: acc.id })}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                  (currentConfig.accessory || 'glasses') === acc.id
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fine-Tuning Colors */}
        <div className="space-y-3 pt-3 border-t border-gray-200">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Palette Colors</label>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-800">Suit Blazer</span>
            <input
              type="color"
              value={currentConfig.suitColor || '#1e3a8a'}
              onChange={(e) => onChange({ ...currentConfig, suitColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-gray-300 cursor-pointer bg-white"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-800">Tie Accent</span>
            <input
              type="color"
              value={currentConfig.tieColor || '#dc2626'}
              onChange={(e) => onChange({ ...currentConfig, tieColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-gray-300 cursor-pointer bg-white"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-800">Shirt / Collar</span>
            <input
              type="color"
              value={currentConfig.shirtColor || '#ffffff'}
              onChange={(e) => onChange({ ...currentConfig, shirtColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-gray-300 cursor-pointer bg-white"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-800">Trousers</span>
            <input
              type="color"
              value={currentConfig.pantsColor || '#172554'}
              onChange={(e) => onChange({ ...currentConfig, pantsColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-gray-300 cursor-pointer bg-white"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-800">Hair Color</span>
            <input
              type="color"
              value={currentConfig.hairColor || '#451a03'}
              onChange={(e) => onChange({ ...currentConfig, hairColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-gray-300 cursor-pointer bg-white"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-800">Skin Tone</span>
            <input
              type="color"
              value={currentConfig.skinColor || '#fcd34d'}
              onChange={(e) => onChange({ ...currentConfig, skinColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-gray-300 cursor-pointer bg-white"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-800">Leather Shoes</span>
            <input
              type="color"
              value={currentConfig.shoeColor || '#1e1b18'}
              onChange={(e) => onChange({ ...currentConfig, shoeColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-gray-300 cursor-pointer bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
