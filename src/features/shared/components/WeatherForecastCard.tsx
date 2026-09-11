import React, { useState } from 'react';
import { getMultiDayForecast, predictWeatherRisk, type DailyForecast } from '../../../utils/weatherMlEngine';
import type { CropStage, ResourceCategory } from '../../../types';

interface WeatherForecastCardProps {
  cropStage?: CropStage;
  resourceCategory?: ResourceCategory;
  lat?: number;
  lng?: number;
  selectedDayOffset?: number;
  onSelectDayOffset?: (dayOffset: number) => void;
  interactive?: boolean;
}

export default function WeatherForecastCard({
  cropStage = 'harvesting',
  resourceCategory = 'harvester',
  lat = 12.5222,
  lng = 76.8978,
  selectedDayOffset = 0,
  onSelectDayOffset,
  interactive = true,
}: WeatherForecastCardProps) {
  const [internalDay, setInternalDay] = useState(selectedDayOffset);
  const activeDay = onSelectDayOffset ? selectedDayOffset : internalDay;

  const forecast = getMultiDayForecast(7, cropStage, resourceCategory, lat, lng);
  const selectedForecast = forecast[activeDay] || forecast[0];

  const handleSelectDay = (offset: number) => {
    if (onSelectDayOffset) {
      onSelectDayOffset(offset);
    } else {
      setInternalDay(offset);
    }
  };

  return (
    <div className="card p-5 border-2 border-sky-100 bg-gradient-to-br from-sky-50/40 via-white to-teal-50/30">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h3 className="font-bold text-text-primary text-base">ML Weather Forecast & Agricultural Advisory</h3>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Logistic regression model · Confidence: <strong className="text-primary-700">{selectedForecast.mlConfidence}%</strong> · Offline-synced
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
          selectedForecast.precipitationProbability >= 65
            ? 'bg-red-100 text-red-800 border border-red-200'
            : selectedForecast.precipitationProbability >= 35
            ? 'bg-amber-100 text-amber-800 border border-amber-200'
            : 'bg-green-100 text-green-800 border border-green-200'
        }`}>
          <span>{selectedForecast.conditionIcon}</span>
          <span>{selectedForecast.condition}</span>
        </span>
      </div>

      {/* 7-Day Forecast Strip */}
      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {forecast.map(day => {
          const isSelected = day.dayOffset === activeDay;
          return (
            <button
              key={day.dayOffset}
              type="button"
              disabled={!interactive}
              onClick={() => handleSelectDay(day.dayOffset)}
              className={`p-2 rounded-xl text-center transition-all ${
                isSelected
                  ? 'bg-primary-700 text-white shadow-md scale-105'
                  : 'bg-white hover:bg-sky-50 border border-border text-text-secondary'
              }`}
            >
              <div className={`text-[11px] font-semibold ${isSelected ? 'text-white' : 'text-text-muted'}`}>
                {day.dayName}
              </div>
              <div className="text-xl my-1">{day.conditionIcon}</div>
              <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                {day.temperatureCelsius}°C
              </div>
              <div className={`text-[10px] mt-0.5 ${
                isSelected
                  ? 'text-sky-100 font-medium'
                  : day.precipitationProbability > 50
                  ? 'text-blue-600 font-semibold'
                  : 'text-text-muted'
              }`}>
                💧{day.precipitationProbability}%
              </div>
            </button>
          );
        })}
      </div>

      {/* Key Meteorological Parameters */}
      <div className="grid grid-cols-4 gap-2 mb-4 bg-white/80 p-3 rounded-xl border border-sky-100 text-center">
        <div>
          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">Precipitation</span>
          <span className={`text-sm font-bold ${
            selectedForecast.precipitationProbability >= 60 ? 'text-red-600' : 'text-text-primary'
          }`}>
            {selectedForecast.precipitationProbability}%
          </span>
        </div>
        <div>
          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">Humidity</span>
          <span className="text-sm font-bold text-text-primary">{selectedForecast.humidityPercent}%</span>
        </div>
        <div>
          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">Barometer</span>
          <span className="text-sm font-bold text-text-primary">{selectedForecast.pressureHpa} hPa</span>
        </div>
        <div>
          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">Wind Speed</span>
          <span className="text-sm font-bold text-text-primary">{selectedForecast.windSpeedKmh} km/h</span>
        </div>
      </div>

      {/* Actionable Agricultural Advisory & Weather Risk Score */}
      <div className="p-3 bg-white rounded-xl border border-sky-100 space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <span>🌱</span> Farm Decision Advisory ({selectedForecast.dayName}):
          </span>
          <span className="text-xs font-extrabold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
            Priority Engine Weather Impact: +{selectedForecast.weatherRiskScore}/25 pts
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          {selectedForecast.agriculturalAdvisory}
        </p>
      </div>

      {/* Explainable AI Feature Weights */}
      <div className="pt-2 border-t border-sky-100/80">
        <div className="text-[11px] font-semibold text-text-muted mb-2 flex items-center justify-between">
          <span>Explainable ML Attribution (Decision Drivers)</span>
          <span className="text-[10px] text-primary-700 font-normal">Deterministic Model</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {selectedForecast.featureImportances.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-[11px]">
              <span className="text-text-secondary truncate max-w-[170px]">{f.feature}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      f.influence === 'elevates_risk' ? 'bg-red-500' : 'bg-primary-600'
                    }`}
                    style={{ width: `${f.weightPercent}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-text-muted">{f.weightPercent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
