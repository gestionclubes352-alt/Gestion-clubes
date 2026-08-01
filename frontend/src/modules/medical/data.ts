/**
 * @fileoverview Datos médicos de demostración compartidos
 * Estos datos se usan tanto en las vistas médicas como en el AI Mode
 */

import type { Injury, MedicalRecord, MedicalCheckup, RehabProgram, FitnessTest } from './types';

// ============================================================================
// Perfiles fitness (incluyen tests)
// ============================================================================

export interface FitnessProfile {
  playerId: string;
  playerName: string;
  weight: number;
  height: number;
  bodyFat: number;
  vo2max: number;
  tests: FitnessTest[];
}

// ============================================================================
// DATOS DE DEMO
// ============================================================================

export const DEMO_INJURIES: Injury[] = [
  { id: 'inj-1', playerId: 'p1', playerName: 'Ander Martínez', type: 'Esguince', bodyPart: 'TOBILLO', side: 'DERECHO', severity: 'MODERADA', status: 'ACTIVA', dateOccurred: '2026-01-25', estimatedReturn: '2026-02-20', notes: 'Esguince grado II en entrenamiento' },
  { id: 'inj-2', playerId: 'p2', playerName: 'Gorka López', type: 'Rotura fibrilar', bodyPart: 'ISQUIOTIBIAL', side: 'IZQUIERDO', severity: 'GRAVE', status: 'EN_REHABILITACIÓN', dateOccurred: '2026-01-10', estimatedReturn: '2026-03-01', notes: 'Rotura fibrilar grado II' },
  { id: 'inj-3', playerId: 'p3', playerName: 'Mikel Etxeberria', type: 'Contusión', bodyPart: 'RODILLA', side: 'DERECHO', severity: 'LEVE', status: 'RECUPERADO', dateOccurred: '2026-01-28', actualReturn: '2026-02-03' },
  { id: 'inj-4', playerId: 'p4', playerName: 'Jon Agirre', type: 'Sobrecarga muscular', bodyPart: 'GEMELO', side: 'DERECHO', severity: 'LEVE', status: 'ACTIVA', dateOccurred: '2026-02-05', estimatedReturn: '2026-02-12' },
];

export const DEMO_MEDICAL_RECORDS: MedicalRecord[] = [
  { id: 'mr-1', playerId: 'p1', playerName: 'Ander Martínez', bloodType: 'A+', allergies: ['Ibuprofeno'], medications: [], previousInjuries: [], notes: 'Sin antecedentes relevantes' },
  { id: 'mr-2', playerId: 'p2', playerName: 'Gorka López', bloodType: 'O-', allergies: [], medications: ['Omeprazol'], previousInjuries: [], notes: 'Operado de menisco (2023)' },
  { id: 'mr-3', playerId: 'p3', playerName: 'Mikel Etxeberria', bloodType: 'B+', allergies: ['Penicilina'], medications: [], previousInjuries: [], notes: '' },
  { id: 'mr-4', playerId: 'p4', playerName: 'Jon Agirre', bloodType: 'AB+', allergies: [], medications: [], previousInjuries: [], notes: 'Asma leve controlada' },
  { id: 'mr-5', playerId: 'p5', playerName: 'Unai Zabala', bloodType: 'A-', allergies: [], medications: [], previousInjuries: [], notes: '' },
];

export const DEMO_CHECKUPS: MedicalCheckup[] = [
  { id: 'ch-1', playerId: 'p1', playerName: 'Ander Martínez', type: 'PERIÓDICO', status: 'PENDIENTE', scheduledDate: '2026-02-15', doctor: 'Dr. García' },
  { id: 'ch-2', playerId: 'p2', playerName: 'Gorka López', type: 'POST_LESIÓN', status: 'PENDIENTE', scheduledDate: '2026-02-20', doctor: 'Dr. Arana' },
  { id: 'ch-3', playerId: 'p3', playerName: 'Mikel Etxeberria', type: 'PERIÓDICO', status: 'COMPLETADO', scheduledDate: '2026-01-20', completedDate: '2026-01-20', doctor: 'Dr. García', result: 'Apto' },
  { id: 'ch-4', playerId: 'p4', playerName: 'Jon Agirre', type: 'RETORNO', status: 'PENDIENTE', scheduledDate: '2026-02-12', doctor: 'Dr. Arana' },
  { id: 'ch-5', playerId: 'p5', playerName: 'Unai Zabala', type: 'PERIÓDICO', status: 'VENCIDO', scheduledDate: '2026-01-10', doctor: 'Dr. García' },
];

export const DEMO_REHAB_PROGRAMS: RehabProgram[] = [
  {
    id: 'rh-1', playerId: 'p2', playerName: 'Gorka López', injuryId: 'inj-2',
    phase: 'FASE_2', progressPercent: 55, startDate: '2026-01-15', estimatedEndDate: '2026-03-01',
    exercises: ['Isométricos de isquiotibiales', 'Bicicleta estática 20min', 'Propiocepción en bostú', 'Carrera suave en línea recta'],
    physiotherapistNotes: 'Buena evolución. Inicio de carrera controlada.'
  },
  {
    id: 'rh-2', playerId: 'p1', playerName: 'Ander Martínez', injuryId: 'inj-1',
    phase: 'FASE_1', progressPercent: 25, startDate: '2026-01-28', estimatedEndDate: '2026-02-20',
    exercises: ['Movilidad articular de tobillo', 'Fortalecimiento con banda elástica', 'Hidroterapia'],
    physiotherapistNotes: 'Inflamación reducida. Seguimos con protocolo conservador.'
  },
];

export const DEMO_FITNESS_PROFILES: FitnessProfile[] = [
  {
    playerId: 'p1', playerName: 'Ander Martínez', weight: 74, height: 178, bodyFat: 11.2, vo2max: 56.3,
    tests: [
      { id: 'ft-1', playerId: 'p1', playerName: 'Ander Martínez', date: '2026-01-10', type: 'Yo-Yo IR1', value: 2120, unit: 'm', notes: 'Nivel 19.4' },
      { id: 'ft-2', playerId: 'p1', playerName: 'Ander Martínez', date: '2026-01-10', type: 'Sprint 30m', value: 4.12, unit: 's', notes: '' },
    ]
  },
  {
    playerId: 'p2', playerName: 'Gorka López', weight: 79, height: 183, bodyFat: 12.5, vo2max: 54.1,
    tests: [
      { id: 'ft-3', playerId: 'p2', playerName: 'Gorka López', date: '2026-01-10', type: 'Yo-Yo IR1', value: 1960, unit: 'm', notes: 'Nivel 18.2' },
      { id: 'ft-4', playerId: 'p2', playerName: 'Gorka López', date: '2026-01-10', type: 'Sprint 30m', value: 4.28, unit: 's', notes: '' },
    ]
  },
  {
    playerId: 'p3', playerName: 'Mikel Etxeberria', weight: 71, height: 175, bodyFat: 10.8, vo2max: 58.7,
    tests: [
      { id: 'ft-5', playerId: 'p3', playerName: 'Mikel Etxeberria', date: '2026-01-10', type: 'Yo-Yo IR1', value: 2280, unit: 'm', notes: 'Nivel 20.1' },
      { id: 'ft-6', playerId: 'p3', playerName: 'Mikel Etxeberria', date: '2026-01-10', type: 'Sprint 30m', value: 4.05, unit: 's', notes: 'Mejor marca' },
    ]
  },
  {
    playerId: 'p4', playerName: 'Jon Agirre', weight: 82, height: 186, bodyFat: 13.1, vo2max: 52.4,
    tests: [
      { id: 'ft-7', playerId: 'p4', playerName: 'Jon Agirre', date: '2026-01-10', type: 'Yo-Yo IR1', value: 1840, unit: 'm', notes: '' },
      { id: 'ft-8', playerId: 'p4', playerName: 'Jon Agirre', date: '2026-01-10', type: 'Sprint 30m', value: 4.35, unit: 's', notes: '' },
    ]
  },
];
