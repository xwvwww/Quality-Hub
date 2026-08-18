'use client';
import { useEffect, useState } from 'react';
export type Locale = 'ru' | 'kk' | 'en';
export const localeChangedEvent = 'quality-hub-locale-changed';
const dictionaries = {
  ru: { workspace:'QA Workspace',overview:'Обзор',projects:'Проекты',cases:'Тест-кейсы',plans:'Тест-планы',runs:'Тест-раны',defects:'Дефекты',requirements:'Требования',reports:'Отчёты',analytics:'Аналитика',integrations:'Интеграции',admin:'Администрирование',logout:'Выйти',profile:'Профиль' },
  kk: { workspace:'QA жұмыс кеңістігі',overview:'Шолу',projects:'Жобалар',cases:'Тест-кейстер',plans:'Тест-жоспарлар',runs:'Тест іске қосулары',defects:'Ақаулар',requirements:'Талаптар',reports:'Есептер',analytics:'Аналитика',integrations:'Интеграциялар',admin:'Басқару',logout:'Шығу',profile:'Профиль' },
  en: { workspace:'QA Workspace',overview:'Overview',projects:'Projects',cases:'Test cases',plans:'Test plans',runs:'Test runs',defects:'Defects',requirements:'Requirements',reports:'Reports',analytics:'Analytics',integrations:'Integrations',admin:'Administration',logout:'Sign out',profile:'Profile' },
} as const;
function savedLocale(): Locale { if(typeof window==='undefined')return 'ru';const value=localStorage.getItem('quality-hub-locale');return value==='kk'||value==='en'?value:'ru'; }
export function useI18n(){const[locale,setLocale]=useState<Locale>('ru');useEffect(()=>{const update=()=>setLocale(savedLocale());update();window.addEventListener(localeChangedEvent,update);window.addEventListener('storage',update);return()=>{window.removeEventListener(localeChangedEvent,update);window.removeEventListener('storage',update)}},[]);return{locale,t:dictionaries[locale]}}
